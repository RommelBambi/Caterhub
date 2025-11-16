# Withdrawal Button Troubleshooting Guide

## Issue: Withdrawal button not working

## Debugging Steps

### 1. Check Console Logs
When you click the withdrawal button, you should see these logs in the browser console:
- `[PartnerWalletScreen] Withdraw button clicked` - Confirms button was clicked
- `[PartnerWalletScreen] Opening method modal` - Confirms modal should open
- `[WithdrawalMethodModal] Method selected: gcash/paymaya` - When you select a method

### 2. Check Button State
The button might be disabled if:
- `earnings` is `null` or `undefined`
- `earnings.total_earnings` is `0` or `null`

Check the console for the earnings value when the button is clicked.

### 3. Check Modal Visibility
The modal might not be showing due to:
- Z-index issues on web
- Modal component not rendering
- State not updating

### 4. Common Issues and Fixes

#### Issue: Button is disabled (grayed out)
**Cause**: No earnings available (`total_earnings` is 0 or null)
**Fix**: Complete bookings first to generate earnings

#### Issue: Button click does nothing
**Possible causes**:
1. Button is disabled (check `disabled` prop)
2. JavaScript error preventing execution
3. Modal component not imported correctly

**Check**:
- Open browser console (F12)
- Look for JavaScript errors
- Check if console logs appear when clicking

#### Issue: Modal doesn't appear
**Possible causes**:
1. Modal state not updating
2. Z-index issues on web
3. Modal component rendering issue

**Fix**: Check browser console for errors

### 5. Manual Testing

1. **Check Earnings**:
   ```javascript
   // In browser console, check:
   // The earnings value should be > 0
   ```

2. **Force Modal Open**:
   ```javascript
   // In React DevTools or console:
   // Set showMethodModal to true
   ```

3. **Check Modal Component**:
   - Verify `WithdrawalMethodModal` is imported
   - Check if modal is rendered in the component tree

### 6. Quick Fixes

#### If button is disabled:
- Complete a booking first
- Wait for earnings to be calculated
- Refresh the wallet screen

#### If modal doesn't show:
- Check browser console for errors
- Try refreshing the page
- Check if modal component is properly imported

## Expected Behavior

1. Click "Withdraw Money" or "Withdraw Now" button
2. Modal should appear with GCash and PayMaya options
3. Select a payment method
4. Second modal appears with withdrawal form
5. Fill in details and submit
6. Withdrawal request is created

## Debug Information

The code now includes console logs at these points:
- Button click
- Modal open/close
- Method selection
- Form submission

Check the browser console (F12) to see what's happening.

