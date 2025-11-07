# CaterHub Payment System Implementation Plan

## Overview
This document outlines the complete implementation of the new payment system with 50% deposit, platform fees, delivery fees, and rating system.

---

## 1. Database Schema Updates

### 1.1 Bookings Table Updates
```sql
ALTER TABLE bookings
-- Payment tracking
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS remaining_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS remaining_paid_method VARCHAR(20), -- 'cash' or 'online'
ADD COLUMN IF NOT EXISTS remaining_paid_at TIMESTAMP,

-- Delivery fee
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_fee_set_by_caterer BOOLEAN DEFAULT FALSE,

-- Platform fee tracking
ADD COLUMN IF NOT EXISTS platform_fee_percentage DECIMAL(5,2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS caterer_payout_amount DECIMAL(10,2);
```

### 1.2 Create Caterer GMV Tracking Table
```sql
CREATE TABLE caterer_monthly_gmv (
  id BIGSERIAL PRIMARY KEY,
  caterer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month
  total_gmv DECIMAL(12,2) DEFAULT 0,
  next_month_fee_tier VARCHAR(20) DEFAULT 'BASE', -- BASE, GROWTH, PRO
  next_month_fee_percentage DECIMAL(5,2) DEFAULT 15.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(caterer_id, month)
);

CREATE INDEX idx_caterer_gmv_caterer ON caterer_monthly_gmv(caterer_id);
CREATE INDEX idx_caterer_gmv_month ON caterer_monthly_gmv(month);
```

### 1.3 Create Reviews Table
```sql
CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  caterer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(booking_id) -- One review per booking
);

CREATE INDEX idx_reviews_caterer ON reviews(caterer_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_booking ON reviews(booking_id);
```

### 1.4 Create Terms & Conditions Table
```sql
CREATE TABLE terms_conditions (
  id BIGSERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_terms_acceptance (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  terms_id BIGINT REFERENCES terms_conditions(id),
  accepted_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  UNIQUE(user_id, terms_id)
);
```

---

## 2. Payment Flow Changes

### 2.1 Booking Creation Flow
```
1. Client selects service/package
2. Client fills booking form
3. System calculates:
   - Total amount
   - 50% deposit
   - 50% remaining
4. Navigate to Payment Screen
5. Client pays 50% deposit (GCash/PayMaya only)
6. Booking created with status: 'PENDING_CATERER_APPROVAL'
7. Deposit marked as paid
```

### 2.2 Caterer Order Acceptance Flow
```
1. Caterer views pending order
2. Caterer sets delivery fee
3. System recalculates:
   - New total = original + delivery fee
   - New remaining = (new total / 2) if deposit already 50%
4. Caterer accepts or declines order
5. If accepted, status → 'CONFIRMED'
```

### 2.3 Remaining Payment Flow
```
1. Before/during event
2. Client can pay remaining via:
   a. Online (GCash/PayMaya) - via app
   b. Cash - caterer marks as paid
3. Caterer has button: "Mark Remaining as Paid (Cash)"
4. System updates remaining_paid = TRUE
5. Status → 'COMPLETED' (after event date)
```

### 2.4 Platform Fee Calculation
```
1. When booking is completed:
   - Check caterer's current month GMV
   - Determine fee tier for THIS booking
   - Calculate platform fee
   - Calculate caterer payout
   
2. At month end:
   - Calculate total GMV for month
   - Determine next month's tier:
     * < ₱300,000 → BASE (15%)
     * ₱300,000 - ₱499,999 → GROWTH (13%)
     * ≥ ₱500,000 → PRO (10%)
   - Update caterer_monthly_gmv table
```

---

## 3. UI/UX Changes

### 3.1 Login/Signup Screens (Mobile)
- Add KeyboardAvoidingView
- Add ScrollView
- Adjust content when keyboard appears
- ✅ COMPLETED for LoginScreen.mobile.tsx
- TODO: RegisterScreen.tsx

### 3.2 Payment Screen Updates
- Remove "Cash on Delivery" option
- Keep only: GCash, PayMaya
- Show "50% Deposit Required"
- Display deposit amount clearly
- Show remaining amount
- Add note: "Remaining 50% can be paid during event"

### 3.3 Caterer Order Management
- Add "Set Delivery Fee" input before acceptance
- Show delivery fee in order details
- Add "Mark Remaining as Paid (Cash)" button
- Show payment status:
  * Deposit: Paid/Unpaid
  * Remaining: Paid/Unpaid/Pending

### 3.4 Rating & Review System
- Add "Leave Review" button after event completion
- Star rating (1-5)
- Comment text area
- Show reviews on caterer profile
- Show average rating
- Display review count

### 3.5 Terms & Conditions
- Show during registration
- Checkbox: "I agree to Terms & Conditions"
- Link to full terms
- Show during first booking
- Track acceptance in database

---

## 4. File Changes Required

### 4.1 Database Migration Files
- `database_migration_payment_system.sql` - All schema changes

### 4.2 Service Files
- `src/services/paymongo.ts` - Update for 50% deposit
- `src/services/services.ts` - Add review functions
- `src/services/platformFees.ts` - NEW: Fee calculation logic

### 4.3 Screen Files
- `src/screens/customer/PaymentScreen.tsx` - Update for deposit
- `src/screens/customer/BookingForm.tsx` - Add T&C, calculate deposit
- `src/screens/customer/ReviewScreen.tsx` - NEW: Leave review
- `src/screens/caterer/PartnerOrderDetailsScreen.tsx` - Add delivery fee, mark paid
- `src/screens/auth/RegisterScreen.tsx` - Add keyboard avoiding, T&C
- `src/screens/auth/LoginScreen.mobile.tsx` - ✅ DONE

### 4.4 Component Files
- `src/components/customer/ServiceCard.tsx` - Show ratings
- `src/components/customer/ReviewList.tsx` - NEW: Display reviews
- `src/components/caterer/OrderCard.tsx` - Show payment status
- `src/components/admin/PaymentsPage.tsx` - Show platform fees
- `src/components/TermsConditions.tsx` - NEW: T&C display

### 4.5 Navigation Files
- `src/navigation/customer/MainTabs.tsx` - Add ReviewScreen route

---

## 5. Validation Requirements

### 5.1 Booking Validation
- ✅ All required fields filled
- ✅ Event date in future
- ✅ Guest count > 0
- ✅ Valid address
- ✅ Terms & Conditions accepted

### 5.2 Payment Validation
- ✅ Amount matches 50% of total
- ✅ Payment method selected (GCash/PayMaya only)
- ✅ Sufficient funds (PayMongo validation)
- ✅ Payment intent created successfully

### 5.3 Delivery Fee Validation
- ✅ Delivery fee >= 0
- ✅ Delivery fee is numeric
- ✅ Delivery fee set before acceptance

### 5.4 Review Validation
- ✅ Rating 1-5 stars
- ✅ Comment not empty
- ✅ Booking is completed
- ✅ User hasn't reviewed yet

---

## 6. Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Fix keyboard behavior on login/signup
2. Database schema updates
3. Update PaymentScreen for 50% deposit
4. Update BookingForm for deposit calculation

### Phase 2: Core Features
5. Implement delivery fee in caterer order acceptance
6. Add "Mark Remaining Paid" functionality
7. Platform fee calculation logic
8. GMV tracking system

### Phase 3: User Experience
9. Rating & review system
10. Terms & Conditions
11. Payment tracking dashboard
12. Validation improvements

### Phase 4: Polish
13. Error handling
14. Loading states
15. Success/failure messages
16. Testing

---

## 7. Testing Checklist

### Payment Flow
- [ ] Client can pay 50% deposit
- [ ] Deposit amount calculated correctly
- [ ] Remaining amount tracked
- [ ] GCash payment works
- [ ] PayMaya payment works
- [ ] Cash payment marking works

### Delivery Fee
- [ ] Caterer can set delivery fee
- [ ] Total recalculated with delivery fee
- [ ] Delivery fee saved to database

### Platform Fees
- [ ] Fee tier calculated correctly
- [ ] GMV tracked accurately
- [ ] Next month tier updated
- [ ] Caterer payout correct

### Reviews
- [ ] Client can leave review
- [ ] Rating saved correctly
- [ ] Reviews display on caterer profile
- [ ] Average rating calculated

### Terms & Conditions
- [ ] T&C shown during registration
- [ ] Acceptance tracked
- [ ] Cannot proceed without acceptance

---

## 8. Next Steps

1. Run database migration
2. Update PaymentScreen component
3. Implement delivery fee UI
4. Create review system
5. Add Terms & Conditions
6. Test end-to-end flow

---

**Status**: Planning Complete  
**Ready for Implementation**: Yes  
**Estimated Time**: 6-8 hours  
**Priority**: High
