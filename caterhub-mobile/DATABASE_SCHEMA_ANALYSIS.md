# CaterHub Database Schema Analysis

## Overview
This document provides a comprehensive analysis of the CaterHub database schema, its alignment with the codebase, and recommendations for improvements.

## Table Structure

### Core Tables

#### 1. `bookings` - Main Booking Table
**Purpose**: Stores all booking transactions with comprehensive payment tracking.

**Key Fields**:
- `id` (serial) - Primary key
- `user_id` (uuid) - Customer who made the booking
- `service_id` (integer, nullable) - **DEPRECATED** - No longer used, kept for backward compatibility
- `package_id` (uuid) - **CURRENT** - Links to `packages` table
- `event_date` (date) - Event date
- `guests` (integer) - Number of guests
- `status` (text) - Booking status: PENDING, CONFIRMED, DECLINED, COMPLETED, CANCELLED
- `payment_method` (varchar) - Payment method (e.g., 'xendit_invoice', 'gcash', 'paymaya')
- `payment_status` (varchar) - PENDING, COMPLETED, FAILED
- `deposit_amount`, `remaining_amount` - Split payment support
- `deposit_paid`, `remaining_paid` - Payment tracking flags
- `delivery_fee` - Delivery fee (can be set by caterer)
- `platform_fee_percentage` (default 15.00) - Platform commission
- `platform_fee_amount` - Calculated platform fee
- `caterer_payout_amount` - Amount paid to caterer after fees
- `xendit_invoice_id`, `xendit_charge_id`, `xendit_external_id` - Xendit payment integration

**Indexes**: Comprehensive indexing on payment fields, user_id, package_id, and Xendit IDs.

**Triggers**:
- `booking_status_notification_trigger` - Sends notifications on status changes
- `trigger_calculate_booking_amounts` - Calculates platform fees and payouts
- `trigger_update_booking_on_payment` - Updates booking on payment status change
- `trigger_update_caterer_gmv` - Updates GMV when booking is completed

**Issues**:
- ⚠️ `service_id` field exists but is deprecated (codebase sets it to `null`)
- ✅ Codebase correctly uses `package_id` for all new bookings

---

#### 2. `packages` - Catering Packages
**Purpose**: Stores caterer packages with menu sections and inclusions.

**Key Fields**:
- `id` (uuid) - Primary key
- `caterer_id` (uuid) - Links to `users` table
- `name` (text) - Package name
- `price` (text) - Package price (stored as text, consider numeric)
- `sections` (jsonb) - Array of food sections with dishes
- `inclusions` (jsonb) - Array of add-ons/inclusions
- `is_active` (boolean) - Package availability

**Indexes**: `caterer_id`, `created_at`

**Triggers**:
- `packages_updated_at` - Updates `updated_at` timestamp

**Issues**:
- ⚠️ `price` stored as `text` - should be `numeric` for calculations
- ✅ Codebase correctly uses this table for package management

---

#### 3. `partner_applications` - Partner Onboarding
**Purpose**: Stores catering business applications for approval.

**Key Fields**:
- `id` (uuid) - Primary key
- `user_id` (uuid) - Links to `users` table
- `business_name` (text) - Business name
- `locations` (jsonb) - Array of business locations
- `owner_name`, `owner_phone`, `owner_email` - Owner contact info
- `status` (text) - PENDING, APPROVED, REJECTED
- `uploaded_documents` (text[]) - Array of document URLs

**Indexes**: `user_id`, `status`, `created_at`

**Triggers**:
- `partner_applications_updated_at` - Updates timestamp

**Usage**:
- ✅ Codebase uses this as the source of truth for approved caterers
- ✅ Replaces deprecated `services` table

---

#### 4. `users` - User Accounts
**Purpose**: User account information.

**Key Fields**:
- `id` (uuid) - Primary key, references `auth.users`
- `email` (text) - Unique email
- `username` (text) - Unique username
- `role` (text) - CUSTOMER, CATER, ADMIN, CUSTOM
- `location` (text) - General location
- `profile_image_url` (text) - Avatar URL
- `suspended` (boolean) - Account suspension flag
- `suspension_reason` (text) - Reason for suspension

**Indexes**: `email`, `role`, `suspended`

**Issues**:
- ✅ Well-structured, no issues found

---

#### 5. `caterer_profiles` - Caterer Business Profiles
**Purpose**: Extended profile information for caterers.

**Key Fields**:
- `id` (uuid) - Primary key
- `user_id` (uuid) - Unique reference to `users`
- `contact_number`, `email`, `website` - Contact info
- `address` (text) - Business address
- `about` (text) - Business description
- `facebook`, `instagram` - Social media links

**Indexes**: `user_id`

**Triggers**:
- `trigger_update_caterer_profiles_updated_at` - Updates timestamp

---

#### 6. `caterer_monthly_gmv` - GMV Tracking for Tiers
**Purpose**: Tracks monthly Gross Merchandise Value for tier-based fee calculation.

**Key Fields**:
- `id` (bigserial) - Primary key
- `caterer_id` (uuid) - Links to `users`
- `month` (date) - Month being tracked
- `total_gmv` (numeric) - Total GMV for the month
- `completed_orders` (integer) - Number of completed orders
- `next_month_fee_tier` (varchar) - Tier for next month (BASE, SILVER, GOLD, etc.)
- `next_month_fee_percentage` (numeric) - Fee percentage for next month

**Indexes**: `caterer_id`, `month`, `next_month_fee_tier`

**Unique Constraint**: `(caterer_id, month)` - One record per caterer per month

**Usage**:
- ✅ Used by `caterer_earnings` view
- ✅ Triggers update this when bookings are completed

---

#### 7. `favorites` - User Favorites
**Purpose**: Stores user's favorite services.

**Key Fields**:
- `id` (serial) - Primary key
- `user_id` (uuid) - Links to `users`
- `service_id` (integer) - **DEPRECATED** - Uses hash-based ID from partner_applications

**Indexes**: `user_id`, `service_id`

**Unique Constraint**: `(user_id, service_id)` - One favorite per user per service

**Issues**:
- ⚠️ **CRITICAL**: Still uses `service_id` (integer) which references deprecated services table
- ⚠️ Codebase uses hash-based IDs derived from `partner_applications.user_id`
- 🔧 **Recommendation**: Migrate to `caterer_id` (uuid) or create new `favorites_v2` table

---

#### 8. `reviews` - Customer Reviews
**Purpose**: Stores customer reviews for bookings.

**Key Fields**:
- `id` (bigserial) - Primary key
- `booking_id` (bigint) - Links to `bookings` (unique - one review per booking)
- `user_id` (uuid) - Reviewer
- `caterer_id` (uuid) - Reviewed caterer
- `service_id` (bigint) - **DEPRECATED** - Can be null
- `rating` (integer) - 1-5 stars
- `comment` (text) - Review text

**Indexes**: `caterer_id`, `user_id`, `booking_id`, `service_id`, `rating`

**Triggers**:
- `new_review_notification_trigger` - Notifies on new reviews

**Issues**:
- ⚠️ `service_id` field exists but is deprecated (codebase sets it to null)

---

#### 9. `notifications` - User Notifications
**Purpose**: In-app notifications system.

**Key Fields**:
- `id` (bigserial) - Primary key
- `user_id` (uuid) - Recipient (references `auth.users`)
- `title`, `message` (text) - Notification content
- `type` (text) - booking, payment, status, review, system
- `related_id` (bigint) - Related entity ID (e.g., booking_id)
- `read` (boolean) - Read status

**Indexes**: `user_id`, `read`, `created_at`

**Usage**:
- ✅ Codebase uses real-time subscriptions for notifications
- ✅ Triggers create notifications automatically

---

#### 10. `payment_webhooks` - Xendit Webhook Logs
**Purpose**: Stores Xendit webhook payloads for audit and processing.

**Key Fields**:
- `id` (bigserial) - Primary key
- `event_id` (varchar) - Unique Xendit event ID
- `event_type` (varchar) - Event type (invoice.paid, ewallet.charge.succeeded, etc.)
- `status` (varchar) - Payment status
- `payload` (jsonb) - Full webhook payload
- `processed` (boolean) - Processing flag
- `processed_at` (timestamp) - Processing timestamp
- `xendit_invoice_id`, `xendit_charge_id`, `external_id` - Xendit identifiers

**Indexes**: `event_id`, `xendit_invoice_id`, `xendit_charge_id`, `external_id`, `processed`

**Usage**:
- ✅ Edge Function `xendit-webhook` saves webhooks here
- ✅ Async processing updates bookings based on webhooks

---

#### 11. `support_tickets` - Support Ticket System
**Purpose**: Customer support ticket management.

**Key Fields**:
- `id` (bigserial) - Primary key
- `user_id` (uuid) - Ticket creator
- `booking_id` (bigint) - Related booking (nullable)
- `subject`, `description` (text) - Ticket content
- `type` (text) - payment, booking, caterer, food_quality, delivery, app_bug, account, other
- `status` (text) - OPEN, IN_PROGRESS, RESOLVED, CLOSED
- `priority` (text) - LOW, MEDIUM, HIGH, URGENT
- `admin_notes` (text) - Admin internal notes

**Indexes**: `user_id`, `booking_id`, `status`, `priority`, `type`, `created_at`

**Triggers**:
- `support_tickets_updated_at_trigger` - Updates timestamp
- `ticket_status_notification_trigger` - Notifies on status changes

---

#### 12. `terms_conditions` - Terms & Conditions Versioning
**Purpose**: Manages Terms & Conditions versions.

**Key Fields**:
- `id` (bigserial) - Primary key
- `version` (varchar) - Version identifier (unique)
- `title` (varchar) - Terms title
- `content` (text) - Full terms text
- `effective_date` (date) - When terms take effect
- `is_active` (boolean) - Active flag

**Indexes**: `is_active`, `effective_date`

**Usage**:
- ✅ Codebase fetches active terms and tracks user acceptance

---

#### 13. `user_terms_acceptance` - Terms Acceptance Tracking
**Purpose**: Tracks which users accepted which terms versions.

**Key Fields**:
- `id` (bigserial) - Primary key
- `user_id` (uuid) - User who accepted
- `terms_id` (bigint) - Terms version accepted
- `accepted_at` (timestamp) - Acceptance timestamp
- `ip_address`, `user_agent` - Audit fields

**Unique Constraint**: `(user_id, terms_id)` - One acceptance per user per version

---

#### 14. `user_locations` - Saved User Locations
**Purpose**: Stores user's saved delivery addresses.

**Key Fields**:
- `id` (uuid) - Primary key
- `user_id` (uuid) - Owner (references `auth.users`)
- `latitude`, `longitude` (numeric) - Coordinates
- `address` (text) - Full address
- `location_name` (text) - User-friendly name (e.g., "Home", "Office")
- `is_primary` (boolean) - Primary location flag

**Indexes**: `user_id`, `(latitude, longitude)`, `(user_id, is_primary)` where `is_primary = true`

**Triggers**:
- `trigger_ensure_single_primary_location` - Ensures only one primary location per user
- `trigger_update_user_locations_updated_at` - Updates timestamp

---

## Database Views

### 1. `caterer_earnings` - Aggregated Earnings View
**Purpose**: Provides aggregated earnings data for caterers.

**Fields**:
- `package_id`, `caterer_id`, `caterer_name`
- `total_bookings`, `completed_bookings`
- `total_deposits_received`, `total_remaining_received`
- `total_earnings`, `total_platform_fees_paid`
- `avg_fee_percentage`, `current_tier`

**Usage**:
- ✅ Used in `PartnerWalletScreen` for earnings display

---

### 2. `caterer_ratings` - Aggregated Ratings View
**Purpose**: Provides aggregated rating statistics for caterers.

**Fields**:
- `caterer_id`, `caterer_name`
- `total_reviews`, `average_rating`
- `five_star_count`, `four_star_count`, etc.

**Usage**:
- ✅ Used in `ServiceDetails` and `AllReviewsScreen` for rating display

---

### 3. `payment_analytics_v2` - Payment Analytics
**Purpose**: Aggregated payment statistics by method and status.

**Fields**:
- `payment_method`, `payment_status`
- `transaction_count`
- `total_deposits`, `total_remaining`, `total_amount`
- `total_platform_fees`, `total_caterer_payouts`
- `avg_platform_fee_percentage`

---

### 4. `payment_status_view` - Payment Status Overview
**Purpose**: Simplified payment status view.

**Fields**: Payment-related fields from `bookings` table.

---

### 5. `user_locations_with_distance` - Location with Distance
**Purpose**: Placeholder view for distance calculations (currently returns 0).

**Note**: ⚠️ Distance calculation not implemented - returns `0 as distance_km`

---

## Database Functions & Triggers (Referenced but Not Defined)

The schema references several database functions that are not provided:

1. **`notify_booking_status_change()`** - Triggered on booking status changes
2. **`calculate_booking_amounts()`** - Calculates platform fees and payouts
3. **`update_booking_on_payment()`** - Updates booking on payment status change
4. **`update_caterer_gmv()`** - Updates GMV when booking is completed
5. **`notify_new_review()`** - Creates notification on new review
6. **`notify_ticket_status_change()`** - Notifies on ticket status change
7. **`update_caterer_profiles_updated_at()`** - Updates timestamp
8. **`update_packages_updated_at()`** - Updates timestamp
9. **`update_partner_applications_updated_at()`** - Updates timestamp
10. **`update_support_ticket_updated_at()`** - Updates timestamp
11. **`update_user_locations_updated_at()`** - Updates timestamp
12. **`ensure_single_primary_location()`** - Ensures only one primary location

**Status**: ⚠️ These functions must exist in the database for triggers to work.

---

## Schema Alignment Issues

### Critical Issues

1. **`favorites.service_id` Deprecation**
   - **Problem**: `favorites` table still uses `service_id` (integer) which references deprecated `services` table
   - **Current Workaround**: Codebase uses hash-based IDs derived from `partner_applications.user_id`
   - **Impact**: Favorites system works but uses deprecated field
   - **Recommendation**: 
     - Option A: Add `caterer_id` (uuid) column and migrate data
     - Option B: Create `favorites_v2` table with `caterer_id` and migrate gradually

2. **`bookings.service_id` Deprecation**
   - **Status**: ✅ Handled correctly - codebase sets to `null`
   - **Recommendation**: Consider removing column in future migration (after ensuring no legacy data)

3. **`reviews.service_id` Deprecation**
   - **Status**: ✅ Handled correctly - codebase sets to `null`
   - **Recommendation**: Consider removing column in future migration

### Minor Issues

4. **`packages.price` Data Type**
   - **Problem**: Stored as `text` instead of `numeric`
   - **Impact**: Requires parsing for calculations
   - **Recommendation**: Migrate to `numeric(10, 2)` for proper calculations

5. **`user_locations_with_distance` View**
   - **Problem**: Distance calculation not implemented (returns 0)
   - **Impact**: Distance-based features may not work correctly
   - **Recommendation**: Implement Haversine formula in view or calculate in application code

---

## Codebase Alignment

### ✅ Correctly Implemented

1. **Bookings**: Uses `package_id` correctly, ignores `service_id`
2. **Services**: Fetches from `partner_applications` instead of deprecated `services` table
3. **Packages**: Full CRUD operations work correctly
4. **Payments**: Xendit integration uses correct fields
5. **Reviews**: Uses `caterer_id` and `booking_id`, ignores `service_id`
6. **Notifications**: Real-time subscriptions work correctly
7. **User Locations**: CRUD operations work correctly

### ⚠️ Needs Attention

1. **Favorites**: Works but uses deprecated `service_id` field
2. **Package Price**: Parsed as string in codebase (should be numeric)

---

## Recommendations

### High Priority

1. **Migrate Favorites Table**
   ```sql
   -- Add new column
   ALTER TABLE favorites ADD COLUMN caterer_id UUID REFERENCES users(id);
   
   -- Migrate data (if possible to map service_id to caterer_id)
   -- Or create new table and migrate gradually
   CREATE TABLE favorites_v2 (
     id SERIAL PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     caterer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id, caterer_id)
   );
   ```

2. **Fix Package Price Data Type**
   ```sql
   -- Add new numeric column
   ALTER TABLE packages ADD COLUMN price_numeric NUMERIC(10, 2);
   
   -- Migrate data
   UPDATE packages SET price_numeric = CAST(price AS NUMERIC(10, 2)) WHERE price ~ '^[0-9]+\.?[0-9]*$';
   
   -- Rename columns
   ALTER TABLE packages RENAME COLUMN price TO price_old;
   ALTER TABLE packages RENAME COLUMN price_numeric TO price;
   ```

### Medium Priority

3. **Remove Deprecated `service_id` Columns** (after ensuring no legacy data)
   ```sql
   ALTER TABLE bookings DROP COLUMN service_id;
   ALTER TABLE reviews DROP COLUMN service_id;
   ```

4. **Implement Distance Calculation in View**
   ```sql
   CREATE OR REPLACE VIEW user_locations_with_distance AS
   SELECT 
     id, user_id, latitude, longitude, address, location_name, 
     is_primary, created_at, updated_at,
     -- Distance calculation would go here (requires reference point)
     0 as distance_km
   FROM user_locations;
   ```

### Low Priority

5. **Add Missing Indexes** (if query performance issues arise)
   - Consider composite indexes for common query patterns
   - Review query performance in production

6. **Document Database Functions**
   - Create documentation for all trigger functions
   - Ensure functions are version-controlled

---

## Summary

The database schema is well-structured and mostly aligned with the codebase. The main issues are:

1. **Deprecated `service_id` fields** - Handled correctly in codebase but should be removed eventually
2. **Favorites table** - Needs migration from `service_id` to `caterer_id`
3. **Package price** - Should be numeric instead of text
4. **Missing function definitions** - All trigger functions must exist in database

The schema supports:
- ✅ Comprehensive payment tracking with Xendit
- ✅ Platform fee system with tier-based pricing
- ✅ GMV tracking for caterer tiers
- ✅ Real-time notifications
- ✅ Support ticket system
- ✅ Terms & conditions versioning
- ✅ User location management

Overall, the schema is production-ready with minor improvements recommended.

