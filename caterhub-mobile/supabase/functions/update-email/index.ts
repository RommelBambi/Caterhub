// Supabase Edge Function to update user email
// This function updates both auth.users and public.users email addresses
// 
// Deploy this function to Supabase:
// 1. Create the function: supabase functions new update-email
// 2. Copy this code to supabase/functions/update-email/index.ts
// 3. Deploy: supabase functions deploy update-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const { newEmail, password } = await req.json();

    if (!newEmail || !password) {
      return new Response(
        JSON.stringify({ error: "Missing newEmail or password" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify password by re-authenticating
    const { data: authData, error: authError } =
      await supabaseClient.auth.signInWithPassword({
        email: user.email!,
        password: password,
      });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid password" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client with service role for updating auth.users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Update auth.users email directly (no confirmation email needed)
    // Since password is already verified, we can update email immediately
    // Using admin API to bypass email confirmation requirement
    // The admin API updates the email immediately without sending confirmation
    const { data: updateData, error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email: newEmail.trim(),
      });

    if (updateError) {
      console.error("Error updating auth email:", updateError);
      return new Response(
        JSON.stringify({
          error: updateError.message || "Failed to update email",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update public.users table email
    const { error: dbError } = await supabaseAdmin
      .from("users")
      .update({ email: newEmail.trim() })
      .eq("id", user.id);

    if (dbError) {
      console.error("Error updating users table:", dbError);
      // Don't fail here - auth email was updated, DB can be synced later
      // Or we can use a database trigger to sync automatically
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email updated successfully.",
        user: updateData.user,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in update-email function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

