# ✅ Edge Function Deployment Checklist

## Before Deploying

### 1. Verify Function File
- ✅ File exists: `supabase/functions/create-payment/index.ts`
- ✅ File has correct imports (Deno URLs)
- ✅ No relative imports (no `./` or `../`)
- ✅ No TypeScript errors (Deno-specific errors are OK)

### 2. Set Supabase Secrets
Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**:

Add:
```
PAYMONGO_SECRET_KEY=sk_test_your_secret_key_here
```

### 3. Deploy Command
```bash
supabase functions deploy create-payment
```

## Common Deployment Issues

### Issue: "Module not found"
**Solution:**
- ✅ Check for relative imports (should use full URLs)
- ✅ Ensure file is named `index.ts` (not `index.tsx` or other)
- ✅ Make sure you're in the project root when deploying

### Issue: "Function not found"
**Solution:**
- ✅ Run: `supabase functions list` to see existing functions
- ✅ Check function name matches: `create-payment`
- ✅ Ensure you're linked to the correct project: `supabase link`

### Issue: "Secret key not found"
**Solution:**
- ✅ Verify `PAYMONGO_SECRET_KEY` is set in Supabase secrets
- ✅ Check spelling (case-sensitive)
- ✅ Redeploy after adding secrets

## Quick Test After Deployment

1. Get function URL from Supabase Dashboard
2. Test with curl or Postman:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/create-payment \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10000, "currency": "PHP", "description": "Test", "bookingId": "1", "userId": "user-id", "paymentMethod": "gcash"}'
```

## Success Indicators

✅ Deployment completes without errors  
✅ Function appears in Supabase Dashboard  
✅ Function URL is accessible  
✅ Secrets are loaded (check function logs)

Good luck with the deployment! 🚀

