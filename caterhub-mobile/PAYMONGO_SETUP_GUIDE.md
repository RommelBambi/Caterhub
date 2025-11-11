# PayMongo GCash Payment Setup Guide

## ✅ Current Status
Your app **already has GCash payment integration** implemented! You just need to configure your PayMongo API keys.

## 📋 Step-by-Step Setup

### 1. Get PayMongo API Keys

1. Go to [PayMongo Dashboard](https://dashboard.paymongo.com/)
2. Sign up or log in
3. Navigate to **Settings** → **API Keys**
4. You'll see two types of keys:
   - **Public Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 2. Create `.env` File

1. Copy `.env.example` to `.env` in your project root:
   ```bash
   cp .env.example .env
   ```

2. Add your PayMongo keys:
   ```env
   EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_actual_public_key_here
   PAYMONGO_SECRET_KEY=sk_test_your_actual_secret_key_here
   ```

### 3. Test vs Live Keys

- **Test Keys** (for development):
  - Start with `pk_test_` and `sk_test_`
  - Use PayMongo's test mode
  - No real money is charged
  - Perfect for testing

- **Live Keys** (for production):
  - Start with `pk_live_` and `sk_live_`
  - Real payments are processed
  - Only use after thorough testing

### 4. How GCash Payment Works

1. **Customer selects GCash** on payment screen
2. **App creates Payment Source** via PayMongo
3. **Customer is redirected** to PayMongo checkout page
4. **Customer completes payment** in GCash app
5. **App polls for payment status** every 3 seconds
6. **Booking is confirmed** when payment succeeds

### 5. Testing GCash Payments

#### Test Mode:
- Use PayMongo test keys
- PayMongo provides test payment flows
- No real GCash account needed for testing

#### Test Payment Flow:
1. Select GCash as payment method
2. You'll be redirected to PayMongo test page
3. Follow test instructions (usually just click "Pay")
4. Payment should be confirmed within a few seconds

### 6. Current Implementation Details

✅ **What's Already Working:**
- GCash payment method selection
- Payment Source creation via PayMongo
- Redirect to PayMongo checkout
- Payment status polling
- Booking confirmation on success
- Error handling

📝 **Payment Flow:**
```
Customer → Select GCash → Create Payment Source → 
Redirect to PayMongo → Complete Payment → 
Poll Status → Confirm Booking
```

### 7. Troubleshooting

#### Issue: "Failed to create payment intent"
- **Solution**: Check your `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` is correct
- Make sure the key starts with `pk_test_` or `pk_live_`

#### Issue: Payment redirect doesn't work
- **Solution**: Check if `Linking.canOpenURL()` works on your device
- Make sure you have internet connection

#### Issue: Payment status stuck on "pending"
- **Solution**: Check PayMongo dashboard for actual payment status
- Verify webhook is configured (if using webhooks)

#### Issue: "Cannot open payment URL"
- **Solution**: Make sure your device can open URLs
- Check if PayMongo checkout URL is accessible

### 8. Environment Variables

**Required for Mobile App:**
- `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` - Used in `src/services/paymongo.ts`

**Optional (for backend/webhooks):**
- `PAYMONGO_SECRET_KEY` - Only use in Supabase Edge Functions or backend

### 9. Security Notes

⚠️ **Important:**
- **Public Key** is safe to use in mobile app (it's in the name!)
- **Secret Key** should NEVER be in your mobile app
- Secret Key should only be used in:
  - Supabase Edge Functions
  - Your backend server
  - Server-side webhook handlers

### 10. Next Steps

1. ✅ Create `.env` file with your PayMongo keys
2. ✅ Restart your Expo app (`npm start` or `expo start`)
3. ✅ Test payment flow with test keys
4. ✅ Switch to live keys when ready for production

### 11. Additional Resources

- [PayMongo Documentation](https://developers.paymongo.com/)
- [PayMongo API Reference](https://developers.paymongo.com/reference)
- [PayMongo Dashboard](https://dashboard.paymongo.com/)

## 🎉 You're All Set!

Once you add your PayMongo keys to `.env`, GCash payments should work immediately!

