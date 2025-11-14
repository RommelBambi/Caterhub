-- Fix booking status notification trigger to use packages instead of services table
-- The services table has been removed, so we need to get caterer_id from packages

CREATE OR REPLACE FUNCTION notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  customer_id UUID;
  caterer_id UUID;
  booking_id_str TEXT;
  status_message TEXT;
BEGIN
  -- Get customer and caterer IDs
  customer_id := NEW.user_id;
  -- Get caterer_id from packages table (services table no longer exists)
  -- Use table qualification to avoid ambiguity with variable name
  IF NEW.package_id IS NOT NULL THEN
    SELECT packages.caterer_id INTO caterer_id FROM packages WHERE packages.id = NEW.package_id;
  ELSE
    caterer_id := NULL;
  END IF;
  
  booking_id_str := '#' || NEW.id::TEXT;
  
  -- Only notify on status change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Determine status message
    CASE NEW.status
      WHEN 'CONFIRMED' THEN
        status_message := 'Your booking ' || booking_id_str || ' has been confirmed by the caterer';
        -- Notify customer
        PERFORM create_notification(
          customer_id,
          'Booking Confirmed',
          status_message,
          'status',
          NEW.id
        );
      WHEN 'ON_THE_WAY' THEN
        status_message := 'The caterer is on the way for booking ' || booking_id_str;
        -- Notify customer
        PERFORM create_notification(
          customer_id,
          'Caterer On The Way',
          status_message,
          'status',
          NEW.id
        );
      WHEN 'COMPLETED' THEN
        status_message := 'Booking ' || booking_id_str || ' has been completed';
        -- Notify both customer and caterer
        PERFORM create_notification(
          customer_id,
          'Booking Completed',
          status_message,
          'status',
          NEW.id
        );
        IF caterer_id IS NOT NULL THEN
          PERFORM create_notification(
            caterer_id,
            'Booking Completed',
            'Booking ' || booking_id_str || ' has been marked as completed',
            'status',
            NEW.id
          );
        END IF;
      WHEN 'DECLINED' THEN
        status_message := 'Your booking ' || booking_id_str || ' has been declined';
        -- Notify customer
        PERFORM create_notification(
          customer_id,
          'Booking Declined',
          status_message,
          'status',
          NEW.id
        );
      WHEN 'CANCELLED' THEN
        status_message := 'Booking ' || booking_id_str || ' has been cancelled';
        -- Notify caterer if customer cancelled
        IF caterer_id IS NOT NULL THEN
          PERFORM create_notification(
            caterer_id,
            'Booking Cancelled',
            status_message,
            'status',
            NEW.id
          );
        END IF;
      WHEN 'PENDING' THEN
        -- New booking, notify caterer
        IF caterer_id IS NOT NULL THEN
          PERFORM create_notification(
            caterer_id,
            'New Booking Request',
            'You have a new booking request ' || booking_id_str,
            'booking',
            NEW.id
          );
        END IF;
    END CASE;
  END IF;
  
  -- Notify on payment status changes
  IF OLD.deposit_paid IS DISTINCT FROM NEW.deposit_paid AND NEW.deposit_paid = TRUE THEN
    IF caterer_id IS NOT NULL THEN
      PERFORM create_notification(
        caterer_id,
        'Payment Received',
        'Deposit payment received for booking ' || booking_id_str,
        'payment',
        NEW.id
      );
    END IF;
  END IF;
  
  IF OLD.remaining_paid IS DISTINCT FROM NEW.remaining_paid AND NEW.remaining_paid = TRUE THEN
    PERFORM create_notification(
      customer_id,
      'Payment Confirmed',
      'Remaining payment confirmed for booking ' || booking_id_str,
      'payment',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

