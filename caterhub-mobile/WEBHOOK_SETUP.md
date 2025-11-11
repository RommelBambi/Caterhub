# 🔔 PayMongo Webhook Setup Guide

## Overview

The `payment_webhooks` table stores PayMongo webhook events and automatically updates booking status when payments are processed.

## Database Schema

The table is already created with the following structure:
- `id` - Auto-incrementing ID
- `event_id` - Unique PayMongo event ID
- `event_type` - Type of event (e.g., `payment.succeeded`)
- `payment_intent_id` - PayMongo payment intent ID
- `payment_source_id` - PayMongo payment source ID
- `status` - Payment status
- `payload` - Full webhook payload (JSONB)
- `processed` - Whether the webhook has been processed
- `processed_at` - Timestamp when processed
- `created_at` - When webhook was received

## RLS Policies

Based on your Supabase dashboard, you have:
1. **Service role can manage webhooks** - Allows backend to insert/update
2. **Users can view their payment webhooks** - Allows authenticated users to view

## Setup Steps

### 1. Deploy Supabase Edge Function

The webhook handler is in `supabase/functions/paymongo-webhook/index.ts`

**Deploy it:**
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy paymongo-webhook
```

### 2. Set Environment Secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

Add:
- `PAYMONGO_SECRET_KEY` - Your PayMongo secret key (starts with `sk_test_` or `sk_live_`)

### 3. Get Webhook URL

After deployment, get your function URL:
```
https://your-project-ref.supabase.co/functions/v1/paymongo-webhook
```

### 4. Configure PayMongo Webhook

1. Go to [PayMongo Dashboard](https://dashboard.paymongo.com/)
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Enter your Supabase function URL
5. Select events to listen for:
   - `payment.succeeded`
   - `payment.failed`
   - `payment.refunded`
   - `payment.pending`
   - `payment_intent.succeeded`
   - `payment_intent.failed`

### 5. Test Webhook

PayMongo will send a test webhook. Check:
- Supabase Edge Function logs
- `payment_webhooks` table for new entry
- Booking status should update automatically

## How It Works

1. **PayMongo sends webhook** → Supabase Edge Function receives it
2. **Function saves webhook** → Inserts into `payment_webhooks` table
3. **Function processes webhook** → Updates booking status based on event type
4. **Marks as processed** → Sets `processed = true`

## Event Types Handled

| Event Type | Booking Status Update |
|------------|----------------------|
| `payment.succeeded` | `payment_status: 'COMPLETED'`, `deposit_paid: true`, `status: 'CONFIRMED'` |
| `payment.failed` | `payment_status: 'FAILED'`, `deposit_paid: false` |
| `payment.refunded` | `payment_status: 'REFUNDED'`, `status: 'CANCELLED'` |
| `payment.pending` | `payment_status: 'PENDING'` |

## Manual Processing

If a webhook fails to process, you can manually retry:

```typescript
import { retryUnprocessedWebhooks } from './services/webhooks';

// Retry all unprocessed webhooks
await retryUnprocessedWebhooks();
```

## Monitoring

Check webhook status:
```sql
-- View all webhooks
SELECT * FROM payment_webhooks ORDER BY created_at DESC;

-- View unprocessed webhooks
SELECT * FROM payment_webhooks WHERE processed = false;

-- View webhooks by event type
SELECT event_type, COUNT(*) 
FROM payment_webhooks 
GROUP BY event_type;
```

## Troubleshooting

### Webhook not received
- ✅ Check PayMongo webhook settings
- ✅ Verify function URL is correct
- ✅ Check Supabase Edge Function logs
- ✅ Ensure `PAYMONGO_SECRET_KEY` is set in Supabase secrets

### Webhook received but not processed
- ✅ Check `payment_webhooks` table for the entry
- ✅ Verify `payment_intent_id` matches booking
- ✅ Check Edge Function logs for errors
- ✅ Manually retry: `retryUnprocessedWebhooks()`

### Booking not updating
- ✅ Verify booking has `payment_intent_id` set
- ✅ Check webhook `event_type` is handled
- ✅ Review Edge Function logs
- ✅ Check RLS policies allow updates

## Security Notes

- ✅ Webhook signature verification (optional but recommended)
- ✅ Use service role key for database operations
- ✅ RLS policies restrict access appropriately
- ✅ Webhook payload is stored for audit trail

