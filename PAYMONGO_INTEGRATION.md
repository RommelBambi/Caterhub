# PayMongo Integration Guide for CaterHub

## Overview
PayMongo is fully compatible with your CaterHub system. This guide covers the complete integration process.

## ✅ Compatibility Check

### Current System Stack
- **Frontend**: React Native (Expo)
- **Backend**: Supabase
- **Payment Flow**: Booking → Payment Selection → Processing
- **Supported Methods**: Cash, GCash, Bank Transfer (currently manual)

### PayMongo Compatibility
✅ **React Native**: Fully supported via REST API  
✅ **Expo**: Works with Expo (no native modules needed)  
✅ **Supabase**: Can store payment data and webhooks  
✅ **Web & Mobile**: Works on both platforms  

## 🚀 Setup Instructions

### 1. Install Dependencies

PayMongo doesn't require additional packages - we use `axios` (already installed):

```bash
# Already in your package.json
npm install axios
```

### 2. Environment Variables

Create `.env` file in `caterhub-mobile/`:

```env
# PayMongo API Keys
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_YOUR_PUBLIC_KEY_HERE
PAYMONGO_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

**Security Notes:**
- ✅ Public key: Safe to use in frontend (for creating payment intents)
- ⚠️ Secret key: Should ONLY be used in backend/Supabase Edge Functions
- 🔒 Never commit `.env` to git (already in `.gitignore`)

### 3. Update Database Schema

Add payment tracking columns to your `bookings` table:

```sql
-- Add payment columns to bookings table
ALTER TABLE bookings
ADD COLUMN payment_method VARCHAR(50),
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN payment_intent_id VARCHAR(255),
ADD COLUMN payment_source_id VARCHAR(255),
ADD COLUMN transaction_id VARCHAR(255),
ADD COLUMN paid_at TIMESTAMP;

-- Create index for faster payment queries
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_payment_intent ON bookings(payment_intent_id);
```

### 4. Files Created

I've created the following files for you:

1. **`src/services/paymongo.ts`** - PayMongo API service
   - Payment Intent creation
   - Payment Method handling
   - Payment Source for GCash/GrabPay
   - Helper functions

2. **`src/screens/customer/PaymentScreen.tsx`** - Payment UI
   - Payment method selection
   - GCash, GrabPay, PayMaya, Cash options
   - Payment processing flow
   - Redirect handling

## 📱 Payment Flow

### User Journey

```
1. Customer creates booking
   ↓
2. Navigate to Payment Screen
   ↓
3. Select payment method (GCash/GrabPay/Cash)
   ↓
4. If online payment:
   - Create Payment Intent
   - Create Payment Source
   - Redirect to PayMongo checkout
   - Return to app after payment
   ↓
5. Verify payment status
   ↓
6. Update booking status
```

### Integration Points

#### A. From BookingForm
Update `BookingForm.tsx` to navigate to payment screen after booking creation:

```typescript
// After successful booking creation
navigation.navigate('Payment', {
  bookingId: bookingData.id,
  amount: total,
  description: `${service.name} - ${pkg?.name || 'Custom Package'}`,
});
```

#### B. Add Payment Route
Add to your navigation stack:

```typescript
// In MainTabs or CustomerNav
<Stack.Screen 
  name="Payment" 
  component={PaymentScreen}
  options={{ headerShown: false }}
/>
```

## 💳 Supported Payment Methods

### 1. GCash (Recommended)
- Most popular in Philippines
- Instant payment confirmation
- QR code or mobile app redirect
- **Fee**: 2.5% + ₱15 per transaction

### 2. GrabPay
- Popular for ride-hailing users
- Mobile app redirect
- **Fee**: 2.5% + ₱15 per transaction

### 3. PayMaya
- Digital wallet
- Card-like experience
- **Fee**: 2.5% + ₱15 per transaction

### 4. Credit/Debit Card
- Visa, Mastercard, JCB
- Requires additional PCI compliance
- **Fee**: 3.5% + ₱15 per transaction

### 5. Cash on Delivery
- No online processing
- Manual confirmation
- **Fee**: None

## 🔧 Configuration

### Test Mode vs Live Mode

**Test Mode** (Development):
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...
PAYMONGO_SECRET_KEY=sk_test_...
```

**Live Mode** (Production):
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_live_...
PAYMONGO_SECRET_KEY=sk_live_...
```

### Test Cards (Test Mode Only)

```
Success: 4343 4343 4343 4345
Declined: 4571 7360 0000 0008
Insufficient: 4571 7360 0000 0016

CVV: Any 3 digits
Expiry: Any future date
```

## 🔔 Webhooks Setup

### 1. Create Webhook Endpoint

Create Supabase Edge Function for webhooks:

```typescript
// supabase/functions/paymongo-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const signature = req.headers.get('paymongo-signature')
  const payload = await req.json()

  // Verify webhook signature
  // Update booking status based on payment event
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (payload.data.attributes.type === 'payment.paid') {
    const paymentIntentId = payload.data.attributes.data.attributes.payment_intent_id
    
    await supabase
      .from('bookings')
      .update({
        payment_status: 'COMPLETED',
        paid_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

### 2. Register Webhook in PayMongo Dashboard

1. Go to PayMongo Dashboard → Developers → Webhooks
2. Add webhook URL: `https://your-project.supabase.co/functions/v1/paymongo-webhook`
3. Select events:
   - `payment.paid`
   - `payment.failed`
   - `source.chargeable`

## 🧪 Testing

### Test Payment Flow

1. **Start app**: `npm start`
2. **Create booking** with test data
3. **Select GCash** as payment method
4. **Use test credentials**:
   - Mobile: 09123456789
   - OTP: 123456
5. **Verify** booking status updates

### Test Scenarios

- ✅ Successful payment
- ❌ Failed payment
- ⏱️ Pending payment
- 🔄 Payment timeout
- 📱 App backgrounding during payment

## 📊 Admin Dashboard Updates

### Payment Tracking

Update `PaymentsPage.tsx` to show real PayMongo data:

```typescript
// Fetch from bookings with payment data
const { data: payments } = await supabase
  .from('bookings')
  .select('*, payment_intent_id, payment_status, transaction_id')
  .not('payment_intent_id', 'is', null)
```

### Payment Status Display

```typescript
const statusColors = {
  PENDING: '#f59e0b',
  COMPLETED: '#22c55e',
  FAILED: '#dc2626',
  REFUNDED: '#6366f1',
}
```

## 🔒 Security Best Practices

### 1. API Key Management
- ✅ Store in environment variables
- ✅ Never commit to git
- ✅ Use different keys for test/live
- ✅ Rotate keys periodically

### 2. Payment Verification
- ✅ Always verify payment on backend
- ✅ Use webhooks for status updates
- ✅ Don't trust client-side status
- ✅ Implement idempotency

### 3. Error Handling
- ✅ Log all payment errors
- ✅ Show user-friendly messages
- ✅ Provide retry mechanism
- ✅ Handle network failures

## 💰 Pricing & Fees

### PayMongo Fees

| Payment Method | Fee Structure |
|---------------|---------------|
| GCash | 2.5% + ₱15 |
| GrabPay | 2.5% + ₱15 |
| PayMaya | 2.5% + ₱15 |
| Credit Card | 3.5% + ₱15 |
| Installment | 3.5% + ₱15 + installment fee |

### Example Calculation

```
Booking Amount: ₱10,000
GCash Fee: (₱10,000 × 2.5%) + ₱15 = ₱265
You Receive: ₱10,000 - ₱265 = ₱9,735
```

## 🚨 Common Issues & Solutions

### Issue 1: "Invalid API Key"
**Solution**: Check environment variables are loaded correctly
```bash
# Restart Expo dev server after adding .env
npm start --clear
```

### Issue 2: Payment redirect not working
**Solution**: Configure proper return URLs
```typescript
// Use deep links for mobile
success: 'caterhub://payment/success',
failed: 'caterhub://payment/failed',
```

### Issue 3: Webhook not receiving events
**Solution**: 
- Check webhook URL is publicly accessible
- Verify webhook signature validation
- Check Supabase Edge Function logs

## 📚 Resources

- [PayMongo Documentation](https://developers.paymongo.com/docs)
- [PayMongo API Reference](https://developers.paymongo.com/reference)
- [PayMongo Dashboard](https://dashboard.paymongo.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## 🎯 Next Steps

1. ✅ Add your API keys to `.env`
2. ✅ Test payment flow in development
3. ✅ Set up webhooks
4. ✅ Update database schema
5. ✅ Add payment screen to navigation
6. ✅ Test with real PayMongo test credentials
7. ✅ Deploy to production with live keys

## 📞 Support

- **PayMongo Support**: support@paymongo.com
- **PayMongo Slack**: [Join Community](https://paymongo.com/slack)
- **Documentation Issues**: Create issue in this repo

---

**Status**: ✅ Ready for Integration  
**Last Updated**: November 7, 2025  
**Version**: 1.0.0
