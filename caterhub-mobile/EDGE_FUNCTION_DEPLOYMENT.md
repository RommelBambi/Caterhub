# 🚀 Edge Function Deployment Guide

## ✅ What's Been Updated

1. **PaymentScreen** - Now uses Edge Function for payment creation
2. **PaymentPendingScreen** - Now uses Edge Function to check payment status
3. **New Edge Function** - `check-payment-status` created

## 📦 Deploy Both Edge Functions

### Step 1: Deploy `create-payment` Function

```bash
supabase functions deploy create-payment
```

### Step 2: Deploy `check-payment-status` Function

```bash
supabase functions deploy check-payment-status
```

### Step 3: Verify Secrets Are Set

Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**

Make sure you have:
```
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
```

## 🔍 Verify Deployment

After deployment, check the Supabase Dashboard:
- **Edge Functions** → Should see both `create-payment` and `check-payment-status`
- **Logs** → Should see function invocations when you test payments

## 🧪 Testing

1. Create a booking in the app
2. Go to payment screen
3. Select GCash or PayMaya
4. Click "Pay Deposit"
5. You should see:
   - Console log: "Creating payment via Edge Function..."
   - Console log: "Payment created via Edge Function: {...}"
   - Checkout URL opens in Chrome
6. After payment, return to app
7. PaymentPendingScreen should check status via Edge Function

## 📝 What Changed

### Before (Client-Side):
- ❌ Payment created using public key from mobile app
- ❌ Payment status checked using public key
- ❌ Secret key exposed risk (if used)
- ❌ Payment intent not found errors

### After (Edge Function):
- ✅ Payment created securely via Edge Function
- ✅ Payment status checked via Edge Function using secret key
- ✅ Secret key stays on server
- ✅ Better error handling and logging

## 🐛 Troubleshooting

### Error: "Module not found"
- Make sure you're deploying from project root
- Check that `supabase/functions/create-payment/index.ts` exists
- Check that `supabase/functions/check-payment-status/index.ts` exists

### Error: "PAYMONGO_SECRET_KEY not set"
- Go to Supabase Dashboard → Edge Functions → Secrets
- Add `PAYMONGO_SECRET_KEY` with your secret key value

### Error: "Function not found"
- Run: `supabase functions list` to see deployed functions
- Make sure function names match exactly: `create-payment` and `check-payment-status`

### Payment Intent Not Found
- This should be fixed now with Edge Function using secret key
- If still happening, check Edge Function logs in Supabase Dashboard

## ✅ Success Indicators

- ✅ Both functions deployed without errors
- ✅ Functions appear in Supabase Dashboard
- ✅ Payment creation works (checkout URL opens)
- ✅ Payment status checking works (no "not found" errors)
- ✅ Edge Function logs show activity in Supabase Dashboard

Good luck! 🎉

