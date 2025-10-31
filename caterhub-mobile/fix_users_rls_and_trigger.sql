-- Fix RLS policies and trigger for users table
-- This ensures the trigger can create user profiles and manual inserts work

-- First, ensure the trigger function exists and has proper permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_username TEXT;
  user_role TEXT;
  final_username TEXT;
  username_exists BOOLEAN;
  counter INTEGER := 0;
BEGIN
  -- Extract username and role from metadata
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER');
  
  -- Ensure role is valid (fallback to CUSTOMER if invalid)
  IF user_role NOT IN ('CUSTOMER', 'CATER', 'ADMIN', 'CUSTOM') THEN
    user_role := 'CUSTOMER';
  END IF;
  
  -- Handle duplicate usernames by appending a number
  final_username := user_username;
  LOOP
    -- Check if username already exists (excluding current user's id if updating)
    SELECT EXISTS(
      SELECT 1 FROM public.users 
      WHERE username = final_username 
      AND id != NEW.id
    ) INTO username_exists;
    
    -- If username is available or this is an update with same username, break
    IF NOT username_exists THEN
      EXIT;
    END IF;
    
    -- Generate unique username by appending number
    counter := counter + 1;
    final_username := user_username || '_' || counter::TEXT;
    
    -- Safety check to prevent infinite loop
    IF counter > 1000 THEN
      -- Fallback to UUID-based username if too many conflicts
      final_username := user_username || '_' || substr(NEW.id::TEXT, 1, 8);
      EXIT;
    END IF;
  END LOOP;
  
  INSERT INTO public.users (id, email, username, role)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    user_role
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    username = COALESCE(final_username, users.username),
    role = COALESCE(user_role, users.role),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If still has unique constraint violation (email or username), log and return
    RAISE WARNING 'Unique constraint violation in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth user creation
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for trigger" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for new signups" ON public.users;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
    OR
    auth.role() = 'service_role'
  );

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Allow service role to do everything (for triggers and admin operations)
CREATE POLICY "Service role can manage users"
  ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow authenticated users to insert their own profile
-- This is needed as a fallback if trigger fails
CREATE POLICY "Authenticated users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Allow public inserts during signup (with proper checks)
-- This allows the trigger to work properly
CREATE POLICY "Enable insert for new signups"
  ON public.users
  FOR INSERT
  WITH CHECK (
    -- Allow if the id matches the authenticated user (for authenticated inserts)
    auth.uid() = id
    OR
    -- Allow if it's from the trigger (service role)
    auth.role() = 'service_role'
  );

