# Caterer Withdrawal Feature Implementation

## Overview
This document describes the withdrawal feature implementation for caterers using Xendit Disbursements API. The feature allows caterers to withdraw their earnings (after platform fees) to GCash or PayMaya accounts.

## Features Implemented

### 1. Wallet Screen Updates
- **Earnings Display**: Shows total earnings after platform fees have been deducted
- **Available Balance**: Automatically deducts pending/processing withdrawals from available balance
- **Transaction History**: Lists all completed bookings with payout amounts
- **Withdraw Money Button**: Always visible, disabled when balance is ₱0.00

### 2. Two-Step Modal Flow

#### Step 1: Method Selection Modal (`WithdrawalMethodModal.tsx`)
- Select withdrawal method: GCash or PayMaya
- Clean, modern UI with method icons
- Information note about processing time

#### Step 2: Details Modal (`WithdrawalDetailsModal.tsx`)
- **Amount Input**: 
  - Currency-formatted input
  - "Withdraw All" button to fill available balance
  - Real-time validation
  - Minimum: ₱100.00
  - Maximum: Available balance
- **Account Details**:
  - Account Name (required, min 2 characters)
  - GCash/PayMaya Number (required, validated Philippine phone format)
- **Validation**:
  - Real-time error messages
  - Phone number format validation (09XXXXXXXXX or +639XXXXXXXXX)
  - Amount validation against available balance
- **Confirmation**: Shows summary before submission

### 3. Xendit Integration

#### Edge Function: `create-xendit-payout`
- **Location**: `supabase/functions/create-xendit-payout/index.ts`
- **Purpose**: Securely creates Xendit Disbursement using server-side API key
- **API Used**: Xendit Disbursements API
- **Flow**:
  1. Validates user authentication
  2. Verifies withdrawal request ownership
  3. Creates Xendit Disbursement with:
     - Bank code: `GCASH` or `PAYMAYA`
     - Account holder name
     - Account number (mobile number)
     - Amount in PHP
  4. Updates withdrawal request status to `PROCESSING`
  5. Stores Xendit payout ID and external ID

#### Service: `withdrawalEdgeFunction.ts`
- **Location**: `src/services/withdrawalEdgeFunction.ts`
- **Purpose**: Client-side service to call the Edge Function
- **Authentication**: Uses Supabase session token
- **Error Handling**: Comprehensive error messages

### 4. Database Schema

The `withdrawal_requests` table should have these columns:
- `id` (serial, primary key)
- `caterer_id` (uuid, foreign key to users)
- `amount` (numeric)
- `payment_method` (varchar: 'gcash' or 'paymaya')
- `payment_details` (jsonb: stores account name and number)
- `status` (varchar: 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')
- `xendit_payout_id` (varchar, nullable) - Xendit disbursement ID
- `xendit_external_id` (varchar, nullable) - External reference ID
- `error_message` (text, nullable) - Error details if failed
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `processed_at` (timestamp, nullable)

### 5. Withdrawal Flow

1. **User clicks "Withdraw Money"** → Opens method selection modal
2. **User selects GCash or PayMaya** → Opens details modal
3. **User enters details**:
   - Amount (with "Withdraw All" option)
   - Account name
   - Account number
4. **Validation** → Real-time validation with error messages
5. **Confirmation** → Alert shows summary
6. **Submission**:
   - Creates withdrawal request in database (status: PENDING)
   - Calls Edge Function to create Xendit Disbursement
   - Updates withdrawal request (status: PROCESSING)
   - Refreshes wallet data
   - Shows success message
7. **Processing** → Xendit processes the disbursement (1-3 business days)
8. **Completion** → Status updated via webhook or polling (to be implemented)

## Platform Compatibility

### Web
- Modals work as overlays
- Responsive design
- Full functionality

### Mobile
- Bottom sheet style modals
- Touch-optimized inputs
- Native keyboard handling
- Works with React Native WebView (if needed for future features)

## Security Features

1. **Server-Side Processing**: Xendit secret key never exposed to client
2. **Authentication**: All requests require valid Supabase session
3. **Authorization**: Users can only create withdrawals for themselves
4. **Validation**: Multiple layers of validation (client + server)
5. **Error Handling**: Comprehensive error messages without exposing sensitive data

## Future Enhancements

1. **Webhook Handler**: Create webhook endpoint to update withdrawal status automatically
2. **Status Polling**: Poll Xendit API to check disbursement status
3. **Saved Payment Methods**: Allow caterers to save GCash/PayMaya details
4. **Withdrawal Limits**: Implement daily/weekly limits
5. **Email Notifications**: Send email when withdrawal is processed
6. **Admin Dashboard**: Allow admins to view and manage withdrawals
7. **Transaction History**: Enhanced withdrawal history with more details

## Testing Checklist

- [ ] Withdraw with available balance
- [ ] Withdraw all available funds
- [ ] Validation: Amount exceeds balance
- [ ] Validation: Invalid phone number format
- [ ] Validation: Missing required fields
- [ ] GCash withdrawal flow
- [ ] PayMaya withdrawal flow
- [ ] Error handling: Xendit API failure
- [ ] Error handling: Network failure
- [ ] Button disabled when balance is ₱0
- [ ] Modal closes on success
- [ ] Wallet refreshes after withdrawal
- [ ] Pending withdrawals deducted from available balance

## Deployment Notes

1. **Deploy Edge Function**:
   ```bash
   supabase functions deploy create-xendit-payout
   ```

2. **Environment Variables** (in Supabase Dashboard):
   - `XENDIT_SECRET_KEY`: Your Xendit secret key
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key

3. **Database Migration** (if needed):
   ```sql
   ALTER TABLE withdrawal_requests 
   ADD COLUMN IF NOT EXISTS xendit_payout_id VARCHAR(255),
   ADD COLUMN IF NOT EXISTS xendit_external_id VARCHAR(255),
   ADD COLUMN IF NOT EXISTS error_message TEXT;
   ```

4. **Xendit Setup**:
   - Ensure Xendit account is verified
   - Enable Disbursements API in Xendit Dashboard
   - Test with Xendit test mode first

## API Reference

### Xendit Disbursements API
- **Endpoint**: `POST https://api.xendit.co/disbursements`
- **Authentication**: Basic Auth with secret key
- **Required Fields**:
  - `external_id`: Unique identifier
  - `bank_code`: 'GCASH' or 'PAYMAYA'
  - `account_holder_name`: Account holder name
  - `account_number`: Mobile number (for e-wallets)
  - `amount`: Amount in PHP
  - `description`: Transaction description

### Edge Function
- **Endpoint**: `POST /functions/v1/create-xendit-payout`
- **Authentication**: Bearer token (Supabase session)
- **Request Body**:
  ```json
  {
    "withdrawalRequestId": 123,
    "amount": 1000.00,
    "paymentMethod": "gcash",
    "accountName": "John Doe",
    "accountNumber": "09123456789"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "payoutId": "disb_xxx",
    "referenceId": "withdrawal_123_xxx",
    "status": "PENDING",
    "amount": 1000.00,
    "currency": "PHP"
  }
  ```

