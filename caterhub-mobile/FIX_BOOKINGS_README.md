# Fix Bookings After Services Table Deletion

## Problem
After deleting the `services` table, bookings are failing because:
1. Foreign key constraint `bookings_service_id_fkey` still references the deleted `services` table
2. Views `caterer_earnings` and `caterer_ratings` reference the `services` table
3. Code tries to join with `services` table when fetching bookings

## Solution

### Step 1: Run SQL Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the SQL from `FIX_BOOKINGS_AFTER_SERVICES_DELETE.sql`
3. Run the SQL

This will:
- Drop the foreign key constraint on `bookings.service_id`
- Recreate `caterer_earnings` view to use `packages` instead of `services`
- Recreate `caterer_ratings` view to use `reviews` directly
- Drop foreign key constraints on `reviews.service_id` and `favorites.service_id`
- **Fix `calculate_booking_amounts()` function** - Recreates it to use `packages` instead of `services` (this was causing the "relation services does not exist" error)
- **Fix `update_caterer_gmv()` function** - Recreates it to get `caterer_id` from `packages` instead of `services`

### Step 2: Code Updates (Already Done)
The following files have been updated:
- `src/services/services.ts`:
  - `createBooking()`: Sets `service_id` to `null` (services table no longer exists)
  - `fetchMyBookings()`: Fetches packages instead of services
- `src/screens/customer/BookingsList.tsx`: Updated to display package names
- `src/screens/caterer/PartnerDashboardScreen.tsx`: Removed services table references
- `src/screens/caterer/PartnerOrdersScreen.tsx`: Removed services table references

### Step 3: Test
After running the SQL:
1. Try creating a booking as a customer
2. Check that bookings appear in customer's booking list
3. Check that bookings appear in caterer's dashboard/orders

## Important Notes
- `service_id` in `bookings` table is now always `null` (kept for backward compatibility)
- All bookings are now linked via `package_id` to the `packages` table
- The `packages` table links to `caterer_id` (user_id) to identify which caterer owns the package
- Views now use `packages` and `reviews` tables directly instead of `services`

