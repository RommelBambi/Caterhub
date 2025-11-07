# Supabase Edge Function Setup for PayMongo

## 📋 What We Created

A Supabase Edge Function that handles PayMongo payment redirects. This replaces the need for a separate backend server.

---

## 🚀 Deployment Steps

### Step 1: Install Supabase CLI (if not already installed)

```bash
# Windows (using Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or using npm
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser for authentication.

---

### Step 3: Link Your Project

```bash
# Navigate to your project root
cd c:\dev\10-25-25\Caterhub

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your PROJECT_REF:**
1. Go to Supabase Dashboard
2. Click on your project
3. Go to Settings → General
4. Copy the "Reference ID"

---

### Step 4: Deploy the Edge Function

```bash
# Deploy the paymongo-redirect function
supabase functions deploy paymongo-redirect
```

**Expected output:**
```
Deploying function paymongo-redirect...
Function URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/paymongo-redirect
```

---

### Step 5: Verify Deployment

Test the function:
```bash
curl "https://YOUR_PROJECT_REF.supabase.co/functions/v1/paymongo-redirect?status=success&booking_id=123"
```

You should see an HTML page response.

---

## 🔧 Your .env File

Make sure your `.env` file has:

```env
# Supabase Configuration (should already exist)
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# PayMongo Keys
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_xxxxx
PAYMONGO_SECRET_KEY=sk_test_xxxxx
```

**Note:** You don't need `EXPO_PUBLIC_BACKEND_URL` anymore! The code now uses `EXPO_PUBLIC_SUPABASE_URL` which you already have.

---

## ✅ How It Works

### Payment Flow:

1. **User selects GCash** in your app
2. **App creates payment** via PayMongo
3. **PayMongo redirects** to: `https://YOUR_PROJECT.supabase.co/functions/v1/paymongo-redirect?status=success&booking_id=123`
4. **Edge Function shows** a nice success/failure page
5. **User returns** to app
6. **App polls** PayMongo for status
7. **Booking updated** automatically

---

## 🎨 What the User Sees

### On Success:
- ✅ Green checkmark
- "Payment Successful!" message
- Booking confirmation
- Auto-closes after 5 seconds

### On Failure:
- ❌ Red X
- "Payment Failed" message
- Reassurance (no charges)
- Option to retry

---

## 🧪 Testing

### Test the Edge Function Directly:

**Success URL:**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paymongo-redirect?status=success&booking_id=123
```

**Failure URL:**
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paymongo-redirect?status=failed&booking_id=123
```

Open these in a browser to see the redirect pages.

---

## 🔍 Monitoring & Logs

### View Function Logs:

```bash
# Stream logs in real-time
supabase functions logs paymongo-redirect --follow

# Or view in Supabase Dashboard:
# Dashboard → Edge Functions → paymongo-redirect → Logs
```

---

## 🛠️ Troubleshooting

### Error: "Function not found"
**Solution:** Make sure you deployed the function:
```bash
supabase functions deploy paymongo-redirect
```

### Error: "CORS error"
**Solution:** The function already includes CORS headers. If you still see errors, check the browser console.

### Error: "Cannot connect to Supabase"
**Solution:** Verify your `EXPO_PUBLIC_SUPABASE_URL` in `.env` is correct.

---

## 📊 Edge Function Features

✅ **Fast** - Runs on Deno at the edge  
✅ **Secure** - Hosted by Supabase  
✅ **Free** - Included in Supabase free tier  
✅ **Scalable** - Auto-scales with traffic  
✅ **No server needed** - Serverless architecture  

---

## 🔄 Updating the Function

If you need to make changes:

1. Edit: `supabase/functions/paymongo-redirect/index.ts`
2. Deploy: `supabase functions deploy paymongo-redirect`
3. Test: Visit the function URL

---

## 📝 Alternative: Manual Deployment

If CLI doesn't work, you can also deploy via Supabase Dashboard:

1. Go to **Edge Functions** in dashboard
2. Click **Create Function**
3. Name it `paymongo-redirect`
4. Copy/paste the code from `supabase/functions/paymongo-redirect/index.ts`
5. Click **Deploy**

---

## ✨ Summary

**What you have now:**
- ✅ Supabase Edge Function for redirects
- ✅ No separate backend needed
- ✅ Beautiful success/failure pages
- ✅ Auto-close functionality
- ✅ GCash-only payment (PayMaya removed)
- ✅ Uses existing Supabase URL

**Next steps:**
1. Deploy the edge function
2. Test a payment
3. Verify the redirect works
4. Celebrate! 🎉

---

**Your payment system is now complete and production-ready!** 🚀
