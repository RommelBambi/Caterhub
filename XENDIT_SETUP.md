# Xendit Integration Setup Guide

## Overview
This guide helps you set up Xendit payment processing for CaterHub, replacing the previous PayMongo integration.

## 1. Get Xendit API Keys

1. **Sign up for Xendit account**: https://dashboard.xendit.co/register
2. **Go to Settings > Developers**: https://dashboard.xendit.co/settings/developers
3. **Get your API keys**:
   - **Test Mode**: `xnd_public_development_...` and `xnd_development_...`
   - **Live Mode**: `xnd_public_production_...` and `xnd_production_...`

## 2. Environment Variables

### Mobile App (.env file)
```bash
# Xendit Public Key (for mobile app)
EXPO_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_development_your_key_here

# Supabase (existing)
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Edge Functions (Supabase Secrets)
```bash
# Set these in Supabase Dashboard > Settings > Edge Functions > Secrets
XENDIT_SECRET_KEY=xnd_development_your_secret_key_here
XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token
```

## 3. Database Schema Updates

Add these columns to your `bookings` table:

```sql
-- Add Xendit-specific columns
ALTER TABLE bookings 
ADD COLUMN xendit_invoice_id TEXT,
ADD COLUMN xendit_charge_id TEXT,
ADD COLUMN xendit_external_id TEXT;

-- Update payment_webhooks table for Xendit
ALTER TABLE payment_webhooks 
ADD COLUMN xendit_invoice_id TEXT,
ADD COLUMN xendit_charge_id TEXT,
ADD COLUMN external_id TEXT;
```

## 4. Deploy Edge Functions

Deploy the new Xendit edge functions:

```bash
# Deploy payment creation function
supabase functions deploy create-xendit-payment

# Deploy webhook handler
supabase functions deploy xendit-webhook

# Deploy redirect handler
supabase functions deploy xendit-redirect
```

## 5. Configure Xendit Webhooks

1. **Go to Xendit Dashboard > Settings > Webhooks**
2. **Add webhook URL**: `https://your-supabase-url.supabase.co/functions/v1/xendit-webhook`
3. **Select events**:
   - `invoice.paid`
   - `invoice.expired`
   - `ewallet.charge.succeeded`
   - `ewallet.charge.failed`
4. **Set webhook token** (use same as XENDIT_WEBHOOK_TOKEN in Supabase secrets)

## 6. Supported Payment Methods

### Direct eWallet Integration
- **GCash**: Direct integration with GCash app
- **PayMaya**: Direct integration with PayMaya app
- **GrabPay**: Direct integration with GrabPay app

### Invoice Checkout (Recommended)
- **GCash & PayMaya**: E-wallet payments
- **Online Banking**: BPI, BDO, UnionBank, RCBC, etc.
- **Over-the-Counter**: 7-Eleven, Cebuana, M.Lhuillier
- **DragonPay**: Additional payment channels

## 7. Testing

### Test Mode
- Use test API keys (`xnd_public_development_...`)
- Use test payment methods provided by Xendit
- No real money is processed

### Test Payment Methods
- **GCash**: Use test mobile numbers provided by Xendit
- **PayMaya**: Use test credentials from Xendit docs
- **Bank Transfer**: Use test bank account numbers

## 8. Go Live

1. **Get production API keys** from Xendit dashboard
2. **Update environment variables** with production keys
3. **Update webhook URLs** to production endpoints
4. **Test with small amounts** before full deployment

## 9. Key Differences from PayMongo

| Feature | PayMongo | Xendit |
|---------|----------|---------|
| **Amount Format** | Centavos (₱100 = 10000) | PHP (₱100 = 100) |
| **Transaction Limit** | ₱100,000 | ₱1,000,000 |
| **Payment Methods** | GCash, PayMaya only | GCash, PayMaya, Banks, OTC |
| **Fees** | ~3.5% | ~2.9% |
| **Checkout Experience** | Payment Intent flow | Invoice/eWallet flow |

## 10. Migration Checklist

- [ ] Get Xendit API keys
- [ ] Set environment variables
- [ ] Update database schema
- [ ] Deploy edge functions
- [ ] Configure webhooks
- [ ] Test payment flow
- [ ] Update mobile app
- [ ] Go live with production keys

## 11. Support

- **Xendit Documentation**: https://developers.xendit.co/
- **Xendit Support**: support@xendit.co
- **Test Environment**: https://dashboard.xendit.co/

## 12. Security Notes

- **Never expose secret keys** in mobile app or frontend
- **Use webhook verification** to validate webhook authenticity
- **Use HTTPS** for all webhook endpoints
- **Validate payment amounts** on server side
- **Log all transactions** for audit purposes
