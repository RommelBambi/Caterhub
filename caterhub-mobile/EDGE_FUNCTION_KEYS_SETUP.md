# 🔐 Edge Function Environment Keys Setup

## Keys Needed for Edge Function

### ✅ Required: PAYMONGO_SECRET_KEY
The Edge Function needs the **SECRET KEY** (not public key) because it runs on the server.

**Where to set it:**
1. Go to **Supabase Dashboard**
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add: `PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here`

### ❌ NOT Needed: EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY
The Edge Function does **NOT** need the public key because:
- Edge Functions use **secret key** for server-side operations
- Public key is only for mobile app (client-side)
- Edge Function has full API access with secret key

## Complete Setup

### Mobile App (.env file):
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...  ✅ For direct PayMongo calls (if not using Edge Function)
```

### Supabase Edge Function Secrets:
```
PAYMONGO_SECRET_KEY=sk_test_...  ✅ Required for Edge Function
```

## How It Works

**Option 1: Using Edge Function (Recommended)**
- Mobile app calls Edge Function (no PayMongo keys needed in mobile)
- Edge Function uses SECRET KEY to call PayMongo
- More secure ✅

**Option 2: Direct PayMongo (Current)**
- Mobile app uses PUBLIC KEY directly
- No Edge Function needed
- Less secure but works ✅

## Summary

| Location | Key Type | Required? |
|----------|----------|-----------|
| Mobile App (.env) | `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` | Only if using direct PayMongo calls |
| Supabase Secrets | `PAYMONGO_SECRET_KEY` | ✅ **YES** - Required for Edge Function |

## Quick Setup Steps

1. **Get your PayMongo Secret Key** from https://dashboard.paymongo.com/settings/api-keys
2. **Add to Supabase Secrets:**
   - Dashboard → Project Settings → Edge Functions → Secrets
   - Add: `PAYMONGO_SECRET_KEY=sk_test_...`
3. **Deploy Edge Function:**
   ```bash
   supabase functions deploy create-payment
   ```

That's it! The Edge Function will automatically use the secret key from Supabase secrets.

