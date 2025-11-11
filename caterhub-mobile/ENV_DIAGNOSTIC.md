# 🔍 Environment Variables Diagnostic Guide

## Current Status Check

### 1. Check if .env file exists
The `.env` file should be in your project root (same folder as `package.json`).

**Location:**
```
caterhub-mobile/
├── .env              ← Should be here!
├── package.json
├── app.json
└── src/
```

### 2. Required Environment Variables

For PayMongo to work, you need:

```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_key_here
```

**Important:**
- ✅ Must start with `EXPO_PUBLIC_` (Expo requirement)
- ✅ No spaces around `=`
- ✅ No quotes around the value
- ✅ File must be named exactly `.env` (not `.env.txt` or `.env.local`)

### 3. How Expo Loads Environment Variables

Expo automatically loads `.env` files, but:
- Variables must start with `EXPO_PUBLIC_` to be accessible in the app
- You MUST restart Expo after creating/modifying `.env`
- Variables are embedded at build time, not runtime

### 4. Verification Steps

1. **Check if .env exists:**
   ```bash
   # In project root
   ls -la .env
   # or on Windows
   dir .env
   ```

2. **Check file contents:**
   ```bash
   cat .env
   # or on Windows
   type .env
   ```

3. **Verify in app:**
   - Open PaymentScreen
   - Check console logs
   - Should see: `✅ Public Key found: pk_test_...`

### 5. Common Issues

#### Issue: Variable not loading
**Solution:**
- ✅ Restart Expo server (stop with Ctrl+C, then `npm start`)
- ✅ Clear cache: `expo start -c`
- ✅ Check variable name starts with `EXPO_PUBLIC_`
- ✅ Check file is in project root

#### Issue: "Public Key is missing" error
**Solution:**
- ✅ Create `.env` file in project root
- ✅ Add: `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...`
- ✅ Restart Expo server

#### Issue: Variable shows as undefined
**Solution:**
- ✅ Check spelling: `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY` (not `PAYMONGO_PUBLIC_KEY`)
- ✅ No spaces: `KEY=value` (not `KEY = value`)
- ✅ No quotes: `KEY=value` (not `KEY="value"`)

### 6. No Backend Required

**Important:** This is a mobile app, not a backend server. All PayMongo calls are made directly from the mobile app using the public key. This is safe because:
- Public keys are meant to be exposed in client apps
- PayMongo validates requests server-side
- Secret keys are NOT used in mobile app (only for webhooks/backend)

### 7. Quick Fix Checklist

- [ ] `.env` file exists in project root
- [ ] File contains: `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_...`
- [ ] Variable name is correct (starts with `EXPO_PUBLIC_`)
- [ ] No spaces around `=`
- [ ] No quotes around value
- [ ] Expo server restarted after creating `.env`
- [ ] Check console logs for key validation

### 8. Create .env File (If Missing)

If `.env` doesn't exist, create it:

**Windows:**
```cmd
cd C:\Users\chano\Documents\caterfinal\Caterhub\caterhub-mobile
echo EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_key_here > .env
```

**Mac/Linux:**
```bash
cd /path/to/caterhub-mobile
echo "EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_key_here" > .env
```

Then:
1. Edit `.env` and replace `pk_test_your_key_here` with your actual key
2. Restart Expo: `npm start`

