# 🧪 Local Testing Guide

## Current Setup

Your app is configured to use **production Edge Functions**:
- `https://qiudzzioqgdusoyylktr.supabase.co/functions/v1/create-payment`
- `https://qiudzzioqgdusoyylktr.supabase.co/functions/v1/check-payment-status`

This is **perfect for local testing** - you can test your code changes while using the deployed Edge Functions.

## ✅ Testing Checklist

### 1. Start Your Local Supabase Functions (Optional)
If you want to test Edge Function code changes locally:

```bash
# In one terminal
supabase functions serve

# This will show:
# Listening on http://localhost:9999/
```

**Note:** If you're testing Edge Function code locally, you'll need to:
- Update `src/services/paymentEdgeFunction.ts` to use `http://localhost:9999` (or your local IP)
- Make sure your phone/emulator can reach your computer's IP address
- Or use a tunneling service like ngrok

**For now, keep using production Edge Functions** - it's simpler!

### 2. Test Payment Flow

1. **Start your Expo app:**
   ```bash
   npm start
   # or
   expo start
   ```

2. **Create a booking:**
   - Navigate to a service
   - Select a package
   - Fill in booking details
   - Submit booking

3. **Go to payment screen:**
   - Select GCash or PayMaya
   - Click "Pay Deposit"

4. **Watch the console logs:**
   You should see:
   ```
   LOG  Creating payment via Edge Function...
   LOG  [createPaymentViaEdgeFunction] Calling Edge Function: https://qiudzzioqgdusoyylktr.supabase.co/functions/v1/create-payment
   LOG  [createPaymentViaEdgeFunction] Request payload: {...}
   LOG  [createPaymentViaEdgeFunction] Response status: 200 OK
   LOG  [createPaymentViaEdgeFunction] Success response: {...}
   LOG  Payment created via Edge Function: {...}
   LOG  Opening checkout URL in Chrome: https://secure-authentication.paymongo.com/...
   ```

### 3. Check Edge Function Logs

**In Supabase Dashboard:**
1. Go to **Edge Functions** → **Logs**
2. You should see logs when you create a payment
3. Look for:
   - Function invocations
   - Payment Intent creation
   - Any errors

**If testing locally with `supabase functions serve`:**
- Check the terminal where you ran `supabase functions serve`
- You'll see request logs there

### 4. Expected Behavior

✅ **Success Flow:**
1. Payment screen loads
2. Select payment method
3. Click "Pay Deposit"
4. Console shows Edge Function call
5. Checkout URL opens in Chrome
6. Complete payment in PayMongo
7. Return to app
8. PaymentPendingScreen checks status
9. Booking confirmed

❌ **Common Issues:**

**Issue: "Failed to create payment"**
- Check Supabase Dashboard → Edge Functions → Secrets
- Make sure `PAYMONGO_SECRET_KEY` is set
- Check Edge Function logs for errors

**Issue: "Function not found" or 404**
- Make sure Edge Functions are deployed:
  ```bash
  supabase functions deploy create-payment
  supabase functions deploy check-payment-status
  ```

**Issue: "Unauthorized" or 401**
- Check if user is logged in
- Verify session token is valid
- Check Edge Function logs

**Issue: No logs in console**
- Make sure you're looking at the right console (Expo/Metro bundler)
- Check if Edge Function is actually being called
- Verify network requests in browser dev tools (if testing on web)

## 🔍 Debugging Tips

### Check Network Requests
1. Open browser dev tools (if testing on web)
2. Go to Network tab
3. Look for requests to `/functions/v1/create-payment`
4. Check request/response details

### Check Supabase Logs
1. Go to Supabase Dashboard
2. Edge Functions → Logs
3. Filter by function name
4. Check for errors or warnings

### Check Console Logs
Look for these prefixes:
- `[createPaymentViaEdgeFunction]` - Payment creation
- `[checkPaymentStatusViaEdgeFunction]` - Status checking
- `[PaymentScreen]` - Payment screen events
- `[PaymentPendingScreen]` - Status polling

## 📝 What to Test

1. ✅ Payment creation (should call Edge Function)
2. ✅ Checkout URL opens correctly
3. ✅ Payment status checking (after payment)
4. ✅ Booking confirmation on success
5. ✅ Error handling (try canceling payment)

## 🚀 Next Steps

Once local testing works:
1. Deploy Edge Functions to production (if you made changes)
2. Test on a real device
3. Test with real PayMongo test payments
4. Verify webhook integration (if using webhooks)

Happy testing! 🎉

