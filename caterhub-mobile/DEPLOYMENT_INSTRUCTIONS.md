# Withdrawal Feature Deployment Instructions

## Step 1: Create the Database Table

Run the SQL migration file in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of CREATE_WITHDRAWAL_REQUESTS_TABLE.sql
```

Or execute it via Supabase Dashboard:
1. Go to SQL Editor
2. Paste the contents of `CREATE_WITHDRAWAL_REQUESTS_TABLE.sql`
3. Click "Run"

This will create:
- `withdrawal_requests` table
- All necessary indexes
- RLS policies for caterers and admins
- Update trigger for `updated_at`

## Step 2: Deploy the Edge Function

Deploy the Xendit payout edge function:

```bash
cd supabase/functions/create-xendit-payout
supabase functions deploy create-xendit-payout
```

Or via Supabase Dashboard:
1. Go to Edge Functions
2. Create new function: `create-xendit-payout`
3. Copy contents from `supabase/functions/create-xendit-payout/index.ts`
4. Deploy

## Step 3: Set Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

Add:
- `XENDIT_SECRET_KEY`: Your Xendit secret key (from Xendit Dashboard)

## Step 4: Verify RLS Policies

After creating the table, verify the policies were created:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'withdrawal_requests';
```

You should see:
- "Caterers can view their own withdrawal requests" (SELECT)
- "Caterers can create their own withdrawal requests" (INSERT)
- "Caterers can update their own pending withdrawal requests" (UPDATE)
- "Admins can view all withdrawal requests" (SELECT)
- "Admins can update all withdrawal requests" (UPDATE)

## Step 5: Test the Feature

1. **Test as Caterer**:
   - Login as a caterer
   - Go to Wallet screen
   - Click "Withdraw Money" button
   - Select GCash or PayMaya
   - Fill withdrawal details
   - Submit withdrawal

2. **Verify in Database**:
   ```sql
   SELECT * FROM withdrawal_requests 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Check Xendit Dashboard**:
   - Go to Xendit Dashboard → Disbursements
   - Verify the payout was created

## Troubleshooting

### Issue: "Table withdrawal_requests does not exist"
**Solution**: Run the SQL migration file first

### Issue: "Permission denied" when creating withdrawal
**Solution**: Check RLS policies are created correctly

### Issue: "Xendit API error"
**Solution**: 
- Verify `XENDIT_SECRET_KEY` is set correctly
- Check Xendit account is verified
- Ensure Disbursements API is enabled in Xendit Dashboard

### Issue: Button not visible
**Solution**: 
- Check if earnings data is loading
- Verify `earnings.total_earnings` is calculated correctly
- Button should be visible but disabled if balance is ₱0

## Xendit API Notes

The implementation uses Xendit Disbursements API:
- **Endpoint**: `POST https://api.xendit.co/disbursements`
- **Bank Codes**: 
  - GCash: `GCASH`
  - PayMaya: `PAYMAYA`
- **Account Number**: Mobile number (e.g., 09123456789)

If you encounter issues with the API format, you may need to:
1. Check Xendit's latest documentation
2. Verify your Xendit account supports Disbursements
3. Contact Xendit support for PHP-specific bank codes

## Next Steps (Optional Enhancements)

1. **Webhook Handler**: Create webhook endpoint to update withdrawal status automatically
2. **Status Polling**: Poll Xendit API periodically to check disbursement status
3. **Email Notifications**: Send email when withdrawal is processed
4. **Admin Dashboard**: Add withdrawal management in admin panel

