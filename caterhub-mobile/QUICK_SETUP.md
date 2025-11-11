# 🚀 Quick PayMongo GCash Setup

## ✅ Your app already has GCash payment! Just need to add API keys.

### Step 1: Get PayMongo Keys
1. Go to https://dashboard.paymongo.com/
2. Sign up/Login
3. Go to **Settings** → **API Keys**
4. Copy your **Public Key** (starts with `pk_test_` or `pk_live_`)

### Step 2: Create `.env` file
Create a file named `.env` in your project root with:

```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_your_actual_key_here
```

**Important:** 
- Replace `pk_test_your_actual_key_here` with your real key from PayMongo
- Use `pk_test_` keys for testing (development)
- Use `pk_live_` keys for production

### Step 3: Restart your app
```bash
# Stop your current Expo server (Ctrl+C)
# Then restart:
npm start
# or
expo start
```

### Step 4: Test it!
1. Create a booking
2. Go to payment screen
3. Select **GCash**
4. Complete the payment flow

## 🎉 That's it!

Your GCash payment is now working!

## ❓ Need Help?

- Check `PAYMONGO_SETUP_GUIDE.md` for detailed instructions
- Check console logs for error messages
- Make sure your `.env` file is in the project root (same folder as `package.json`)

