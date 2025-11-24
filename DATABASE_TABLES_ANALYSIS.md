# Database Tables Analysis

## Summary
This document analyzes which database tables are actively used in the CaterHub application and identifies any unused tables.

## Used Tables ✅

### Core Tables
- **users** - User accounts (customers, caterers, admins)
- **partner_applications** - Caterer registration applications (replaces the old `services` table)
- **packages** - Catering packages offered by caterers
- **bookings** - Customer bookings/orders
- **caterer_profiles** - Caterer business profiles
- **caterer_monthly_gmv** - Monthly GMV tracking for tiered platform fee system
- **caterer_earnings** (view) - Aggregated earnings view
- **caterer_ratings** (view) - Aggregated ratings view

### Payment & Financial
- **caterer_subscriptions** - Subscription plans for caterers
- **withdrawal_requests** - Caterer withdrawal requests
- **payment_webhooks** - Xendit payment webhook logs

### User Features
- **favorites** - User favorite services (uses `service_id` which is a hash-based ID from `partner_applications`)
- **user_locations** - Customer saved locations
- **reviews** - Customer reviews/ratings
- **notifications** - User notifications

### Admin & Support
- **support_tickets** - Customer support tickets
- **terms_conditions** - Terms and conditions versions
- **user_terms_acceptance** - User acceptance tracking

### Views
- **payment_analytics_v2** - Payment analytics view
- **payment_status_view** - Payment status view
- **user_locations_with_distance** - Location view with distance

## Potentially Unused Tables ⚠️

### services (Table Not Present in Schema)
- **Status**: Table does not exist in the provided schema
- **Note**: The codebase explicitly mentions "services table no longer exists" and uses `partner_applications` instead
- **Action**: No action needed - table was already removed

### service_id References
- **Status**: `service_id` column exists in `bookings` and `favorites` tables but is nullable
- **Note**: 
  - In `bookings`, `service_id` is set to `NULL` in the code (see `createBooking` function)
  - In `favorites`, `service_id` is used but represents a hash-based ID from `partner_applications`, not a foreign key
- **Action**: These columns can remain for backward compatibility but are not actively used as foreign keys

## Schema Changes Needed for Tiered Platform Fee

### ✅ Completed
1. Default platform fee changed from 15% to 3%
2. Tiered fee system implemented:
   - BASE: 3% (default, < 300k GMV)
   - TIER_1: 2% (300k+ GMV reached, applies next month)
   - TIER_2: 1% (500k+ GMV reached, applies next month)
3. Database functions created:
   - `get_platform_fee_percentage()` - Gets fee based on caterer's GMV tier
   - `calculate_booking_amounts()` - Calculates platform fee and payout
   - `update_caterer_gmv()` - Updates GMV and sets next month's fee tier
4. Frontend updated to show dynamic platform fee revenue

### Migration File
- `supabase/migrations/20251126_implement_tiered_platform_fee.sql`

## Recommendations

1. **Keep `service_id` columns**: They're nullable and don't cause issues. Removing them would require a migration and could break existing data.

2. **Monitor `favorites.service_id`**: This uses hash-based IDs from `partner_applications`. Consider renaming to `partner_application_id` or `caterer_service_id` for clarity in the future.

3. **All other tables are actively used** and should be kept.

