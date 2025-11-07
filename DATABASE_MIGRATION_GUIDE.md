# Database Migration Guide

## ⚠️ IMPORTANT: Run This Migration to Enable New Features

Your app is currently running with backward compatibility, but to unlock all new features, you need to run the database migration.

---

## 🎯 What This Migration Does

### New Columns Added to `bookings` table:
- `address` - Event address
- `deposit_amount` - 50% deposit amount
- `remaining_amount` - 50% remaining amount
- `deposit_paid` - Boolean flag for deposit payment
- `remaining_paid` - Boolean flag for remaining payment
- `remaining_paid_method` - How remaining was paid (cash/online)
- `remaining_paid_at` - Timestamp of remaining payment
- `delivery_fee` - Caterer-set delivery fee
- `delivery_fee_set_by_caterer` - Boolean flag
- `platform_fee_percentage` - Platform fee % (15%, 13%, or 10%)
- `platform_fee_amount` - Calculated platform fee
- `caterer_payout` - Amount caterer receives

### New Tables Created:
- `caterer_monthly_gmv` - Tracks monthly GMV for fee tiers
- `reviews` - Customer reviews and ratings
- `terms_conditions` - Platform T&C versions
- `user_terms_acceptance` - User T&C acceptance tracking

### Automatic Features:
- Triggers for automatic amount calculations
- GMV tracking and fee tier updates
- Analytics views for reporting
- Row Level Security (RLS) policies

---

## 📋 Step-by-Step Migration Instructions

### Step 1: Backup (Optional but Recommended)
1. Go to Supabase Dashboard
2. Navigate to Database → Backups
3. Create a manual backup (optional, Supabase auto-backs up daily)

### Step 2: Open SQL Editor
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 3: Copy Migration SQL
1. Open the file: `database_migration_payment_system.sql`
2. Copy **ALL** the contents (Ctrl+A, Ctrl+C)

### Step 4: Run Migration
1. Paste the SQL into the Supabase SQL Editor
2. Click **Run** button (or press Ctrl+Enter)
3. Wait for completion (should take 5-10 seconds)

### Step 5: Verify Success
You should see messages like:
```
ALTER TABLE
CREATE TABLE
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
CREATE VIEW
ALTER TABLE (for RLS)
INSERT 0 1
```

If you see any **ERROR** messages, copy them and let me know.

---

## ✅ What Happens After Migration

### Immediately Available:
✅ Address field will be stored in dedicated column  
✅ Deposit/remaining amounts calculated automatically  
✅ Platform fees calculated based on GMV  
✅ Reviews can be submitted and displayed  
✅ Terms & Conditions acceptance tracked  
✅ Delivery fees can be set by caterers  

### Automatic Calculations:
- When a booking is created, deposit/remaining auto-calculated
- When deposit is paid, `deposit_paid` = true
- When booking completes, GMV updated for caterer
- Next month's platform fee tier auto-determined

---

## 🔧 Troubleshooting

### Error: "relation already exists"
**Cause:** Migration was partially run before  
**Solution:** Safe to ignore, or drop the table and re-run

### Error: "column already exists"
**Cause:** Some columns were added manually  
**Solution:** Comment out those specific ALTER TABLE lines

### Error: "permission denied"
**Cause:** Not using admin/service role  
**Solution:** Make sure you're logged into Supabase dashboard as owner

### Error: "syntax error"
**Cause:** SQL not copied completely  
**Solution:** Copy the ENTIRE file contents again

---

## 📊 Verification Queries

After running the migration, verify it worked:

### Check new columns exist:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('address', 'deposit_amount', 'remaining_amount');
```

### Check new tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('caterer_monthly_gmv', 'reviews', 'terms_conditions', 'user_terms_acceptance');
```

### Check triggers exist:
```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

---

## 🎯 What to Test After Migration

### 1. Create a Booking
- Fill out booking form with address
- Check that deposit/remaining amounts are calculated
- Verify booking is created successfully

### 2. Make a Payment
- Pay 50% deposit via GCash/PayMaya
- Check that `deposit_paid` becomes true
- Verify payment status updates

### 3. Submit a Review
- Complete a booking
- Leave a review with rating
- Check review appears in database

### 4. Register New User
- Create new account
- Accept Terms & Conditions
- Verify acceptance is recorded

---

## 🚨 Current Status (Before Migration)

**Your app is working with backward compatibility:**
- ✅ Bookings can be created
- ✅ Payments work
- ✅ Address stored in notes field (temporary)
- ⏳ Deposit amounts calculated but not stored
- ⏳ Reviews can't be submitted yet
- ⏳ T&C acceptance not tracked yet
- ⏳ Platform fees not calculated yet

**After migration, everything will work fully!**

---

## 📞 Need Help?

If you encounter any issues:
1. Copy the exact error message
2. Note which line number failed
3. Check if tables/columns already exist
4. Try running migration in smaller chunks

---

## ✨ Post-Migration Benefits

Once migration is complete:
- 📊 Full payment tracking
- 💰 Automatic fee calculations
- ⭐ Review system functional
- 📋 Terms & Conditions enforced
- 📈 GMV tracking active
- 💳 Complete deposit system
- 🚚 Delivery fee management

---

**Ready to run the migration? It takes less than 1 minute!**

**File to run:** `database_migration_payment_system.sql`  
**Where to run:** Supabase Dashboard → SQL Editor  
**Time required:** ~30 seconds  
**Risk level:** Low (backward compatible)
