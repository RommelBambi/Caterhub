# PayMongo Integration - Quick Setup Guide

## ✅ Integration Complete!

PayMongo has been fully integrated into your CaterHub system. Follow these steps to activate it.

---

## 🚀 Step 1: Add Your API Keys

1. **Open or create** `.env` file in `caterhub-mobile/` folder:

```env
EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_YOUR_PUBLIC_KEY_HERE
PAYMONGO_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

2. **Replace** with your actual PayMongo keys from [PayMongo Dashboard](https://dashboard.paymongo.com)

3. **Restart** your Expo dev server:
```bash
npm start --clear
```

---

## 🗄️ Step 2: Run Database Migration

1. **Go to** [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → SQL Editor

2. **Copy and paste** the contents of `database_migration_paymongo.sql`

3. **Click "Run"** to execute the migration

This will:
- ✅ Add payment columns to bookings table
- ✅ Create indexes for performance
- ✅ Set up automatic status updates
- ✅ Create payment analytics view
- ✅ Create webhooks table

---

## 📱 Step 3: Test the Payment Flow

### Test with GCash (Test Mode)

1. **Create a booking** in your app
2. **Select GCash** as payment method
3. **Use test credentials**:
   - Mobile: `09123456789`
   - OTP: `123456`
4. **Complete payment** in the PayMongo test page
5. **Return to app** - booking should be confirmed!

### Test with Cash on Delivery

1. **Create a booking**
2. **Select "Cash on Delivery"**
3. **Booking confirmed** immediately (no online payment)

---

## 🎯 What's Been Integrated

### ✅ Files Created

1. **`src/services/paymongo.ts`**
   - Complete PayMongo API service
   - Payment Intent creation
   - GCash, GrabPay, PayMaya support

2. **`src/screens/customer/PaymentScreen.tsx`**
   - Beautiful payment UI
   - Payment method selection
   - Secure payment processing

3. **`src/screens/customer/PaymentPendingScreen.tsx`**
   - Real-time payment status tracking
   - Auto-updates booking when payment succeeds
   - Retry functionality

4. **`database_migration_paymongo.sql`**
   - Complete database schema
   - Payment tracking columns
   - Analytics views

### ✅ Files Updated

1. **`src/screens/customer/BookingForm.tsx`**
   - Now navigates to PaymentScreen after booking creation
   - Passes booking details to payment flow

2. **`src/navigation/customer/MainTabs.tsx`**
   - Added PaymentScreen route
   - Added PaymentPendingScreen route

3. **`src/components/admin/PaymentsPage.tsx`**
   - Now shows real PayMongo payment data
   - Displays payment method, status, transaction ID

---

## 💳 Supported Payment Methods

| Method | Status | Fee |
|--------|--------|-----|
| GCash | ✅ Ready | 2.5% + ₱15 |
| GrabPay | ✅ Ready | 2.5% + ₱15 |
| PayMaya | ⏳ Coming Soon | 2.5% + ₱15 |
| Credit Card | ⏳ Coming Soon | 3.5% + ₱15 |
| Cash on Delivery | ✅ Ready | Free |

---

## 🔄 Payment Flow

```
Customer creates booking
         ↓
Navigate to Payment Screen
         ↓
Select payment method
         ↓
┌────────────────┬────────────────┐
│   Online Pay   │   Cash on COD  │
├────────────────┼────────────────┤
│ Create Payment │ Update booking │
│ Intent         │ status         │
│       ↓        │       ↓        │
│ Redirect to    │ Booking        │
│ PayMongo       │ confirmed      │
│       ↓        │                │
│ Customer pays  │                │
│       ↓        │                │
│ Return to app  │                │
│       ↓        │                │
│ Verify payment │                │
│       ↓        │                │
│ Update booking │                │
└────────────────┴────────────────┘
         ↓
Booking confirmed!
```

---

## 🔒 Security Notes

### ✅ Safe Practices
- Public key used in frontend (safe)
- Secret key should be in backend only (for webhooks)
- All payments processed by PayMongo (PCI compliant)
- Transaction IDs tracked in database

### ⚠️ Important
- Never commit `.env` to git
- Use test keys for development
- Use live keys only in production
- Rotate keys periodically

---

## 🧪 Testing Checklist

- [ ] API keys added to `.env`
- [ ] Database migration executed
- [ ] App restarted with `npm start --clear`
- [ ] Can create a booking
- [ ] Payment screen appears
- [ ] Can select payment method
- [ ] GCash test payment works
- [ ] Cash on delivery works
- [ ] Payment status updates correctly
- [ ] Admin can see payments

---

## 📊 Admin Dashboard

Admins can now:
- ✅ View all payments in real-time
- ✅ See payment methods used
- ✅ Track payment status (PENDING, COMPLETED, FAILED)
- ✅ View transaction IDs
- ✅ Filter by payment status
- ✅ Search by customer or transaction

---

## 🆘 Troubleshooting

### Issue: "Invalid API Key"
**Solution**: 
1. Check `.env` file has correct keys
2. Restart Expo: `npm start --clear`
3. Verify keys in PayMongo Dashboard

### Issue: Payment redirect not working
**Solution**:
1. Check internet connection
2. Verify PayMongo API is accessible
3. Check console for error messages

### Issue: Payment status not updating
**Solution**:
1. Check database migration was run
2. Verify `payment_intent_id` is saved
3. Check PaymentPendingScreen is polling

### Issue: Database columns missing
**Solution**:
1. Run `database_migration_paymongo.sql` in Supabase
2. Check SQL output for errors
3. Verify columns exist in Supabase Table Editor

---

## 🎉 You're Ready!

Your PayMongo integration is complete and ready to use. Just add your API keys and run the database migration.

### Next Steps:
1. ✅ Add API keys to `.env`
2. ✅ Run database migration
3. ✅ Test with GCash test credentials
4. ✅ Go live with production keys

### Production Checklist:
- [ ] Get live API keys from PayMongo
- [ ] Update `.env` with live keys
- [ ] Test in production environment
- [ ] Set up webhooks (optional but recommended)
- [ ] Monitor payments in admin dashboard

---

## 📞 Support

- **PayMongo Docs**: https://developers.paymongo.com
- **PayMongo Support**: support@paymongo.com
- **Integration Guide**: See `PAYMONGO_INTEGRATION.md`

---

**Status**: ✅ Ready to Use  
**Last Updated**: November 7, 2025  
**Version**: 1.0.0
