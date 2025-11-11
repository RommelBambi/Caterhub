# 📝 .env File Setup Instructions

## ✅ Your .env file format should be:

```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_actual_public_key_here
PAYMONGO_SECRET_KEY=sk_test_your_actual_secret_key_here
```

## ⚠️ Important Notes:

### 1. Variable Name Must Start with `EXPO_PUBLIC_`
In Expo, environment variables are only accessible in your app if they start with `EXPO_PUBLIC_`

✅ **Correct:**
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_abc123...
```

❌ **Wrong:**
```env
PAYMONGO_PUBLIC_KEY=pk_test_abc123...  # Missing EXPO_PUBLIC_ prefix
PUBLIC_KEY=pk_test_abc123...           # Wrong name
```

### 2. No Spaces Around the `=` Sign
✅ **Correct:**
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_abc123
```

❌ **Wrong:**
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY = pk_test_abc123  # Has spaces
```

### 3. No Quotes Needed
✅ **Correct:**
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_abc123
```

❌ **Wrong:**
```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY="pk_test_abc123"  # Don't use quotes
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY='pk_test_abc123'  # Don't use quotes
```

### 4. File Location
The `.env` file must be in your **project root** (same folder as `package.json`)

```
caterhub-mobile/
├── .env              ← Here!
├── package.json
├── app.json
└── src/
```

### 5. Restart Required
After creating or modifying `.env`:
1. **Stop** your Expo server (Ctrl+C)
2. **Clear cache** (optional but recommended):
   ```bash
   expo start -c
   ```
3. **Restart**:
   ```bash
   npm start
   # or
   expo start
   ```

## 🔍 How to Verify It's Working

1. Open your app
2. Go to Payment Screen
3. Check the console logs - you should see:
   ```
   ✅ Public Key found: pk_test_...
   ```

If you see:
```
❌ Public Key NOT FOUND
```

Then check:
- ✅ File is named exactly `.env` (not `.env.txt` or `.env.local`)
- ✅ File is in project root
- ✅ Variable name starts with `EXPO_PUBLIC_`
- ✅ No spaces around `=`
- ✅ You restarted the Expo server

## 📋 Example .env File

```env
# PayMongo API Keys
# Get these from: https://dashboard.paymongo.com/settings/api-keys

# Public Key (safe to use in mobile app)
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_abcdefghijklmnopqrstuvwxyz1234567890

# Secret Key (NOT used in mobile app, only for backend/webhooks)
PAYMONGO_SECRET_KEY=sk_test_abcdefghijklmnopqrstuvwxyz1234567890

# Supabase (if you have these)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 🚨 Common Mistakes

1. **Wrong variable name** - Must be `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY`
2. **File in wrong location** - Must be in project root
3. **Forgot to restart** - Always restart after changing .env
4. **Using quotes** - Don't wrap values in quotes
5. **Spaces around =** - No spaces allowed

## ✅ Quick Checklist

- [ ] `.env` file exists in project root
- [ ] Variable name is `EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY`
- [ ] Value starts with `pk_test_` or `pk_live_`
- [ ] No spaces around `=` sign
- [ ] No quotes around the value
- [ ] Restarted Expo server after creating/modifying .env
- [ ] Checked console logs to verify key is loaded

