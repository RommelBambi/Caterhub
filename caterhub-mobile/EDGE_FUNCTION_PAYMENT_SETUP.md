# 🔐 Using Supabase Edge Functions for Payments

## Why Use Edge Functions?

✅ **More Secure**: Secret key stays on server, never exposed to mobile app  
✅ **Centralized Logic**: All payment logic in one place  
✅ **Better Error Handling**: Server-side validation and error handling  
✅ **Easier Webhook Integration**: Same function can handle webhooks  
✅ **Follows Best Practices**: Serverless architecture pattern

## Setup Steps

### 1. Deploy Edge Function

```bash
# Install Supabase CLI if not already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy create-payment
```

### 2. Set Environment Secrets

In **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**:

Add **ONLY** the secret key:
```
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
```

**Important:**
- ✅ **DO add**: `PAYMONGO_SECRET_KEY` (required for Edge Function)
- ❌ **DON'T add**: `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` (not needed, only for mobile app)
- The Edge Function uses the **secret key** for server-side PayMongo API calls
- The public key is only needed in the mobile app's `.env` file (if using direct PayMongo calls)

### 3. Get Function URL

After deployment, your function URL will be:
```
https://your-project-ref.supabase.co/functions/v1/create-payment
```

### 4. Update Mobile App

The mobile app now has two options:

#### Option A: Use Edge Function (Recommended - More Secure)
```typescript
import { createPaymentViaEdgeFunction } from './services/paymentEdgeFunction';

const result = await createPaymentViaEdgeFunction({
  amount: 625000, // in centavos
  currency: 'PHP',
  description: 'Deposit (50%) - Booking #40',
  bookingId: '40',
  userId: user.id,
  paymentMethod: 'gcash',
  returnUrl: 'https://www.paymongo.com/success',
});

// Open checkout URL
await Linking.openURL(result.checkoutUrl);
```

#### Option B: Use Direct PayMongo (Current - Still Works)
```typescript
// Current implementation in PaymentScreen.tsx
// Uses public key directly from mobile app
```

## Benefits

### Security
- ✅ Secret key never leaves the server
- ✅ Authentication handled by Supabase
- ✅ User authorization verified server-side

### Reliability
- ✅ Centralized error handling
- ✅ Consistent payment flow
- ✅ Easier to debug and monitor

### Scalability
- ✅ Serverless - auto-scales
- ✅ No server maintenance needed
- ✅ PayMongo rate limits handled server-side

## Migration Guide

To switch from direct PayMongo calls to Edge Function:

1. **Deploy Edge Function** (steps above)
2. **Update PaymentScreen.tsx**:
   ```typescript
   // Replace direct PayMongo calls with:
   import { createPaymentViaEdgeFunction } from '../../services/paymentEdgeFunction';
   
   const result = await createPaymentViaEdgeFunction({
     amount: payMongoAmount,
     currency: 'PHP',
     description: `Deposit (50%) - ${description}`,
     bookingId: bookingId.toString(),
     userId: user?.id || '',
     paymentMethod: selectedMethod,
     returnUrl: 'https://www.paymongo.com/success',
   });
   
   // Open checkout URL
   await Linking.openURL(result.checkoutUrl);
   ```

3. **Remove Public Key from Mobile App** (optional):
   - You can remove `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` from `.env`
   - All payment calls now go through Edge Function
   - Secret key is safely stored in Supabase secrets

## Current vs Edge Function Approach

| Aspect | Current (Direct) | Edge Function |
|--------|------------------|---------------|
| **Secret Key** | ❌ Not used (public key only) | ✅ Used securely on server |
| **Security** | ⚠️ Public key in mobile app | ✅ Secret key on server |
| **Webhooks** | ⚠️ Need separate setup | ✅ Can integrate easily |
| **Error Handling** | ⚠️ Client-side only | ✅ Server-side validation |
| **Rate Limiting** | ⚠️ Client-side limits | ✅ Server-side handling |

## Recommendation

**Use Edge Function** for production! It's:
- More secure
- Better architecture
- Easier to maintain
- Follows best practices

The current direct approach works fine for development, but Edge Functions are the way to go for production.

