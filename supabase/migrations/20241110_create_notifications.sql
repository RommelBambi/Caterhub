-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('booking', 'payment', 'status', 'review', 'system')),
  related_id BIGINT, -- Can be booking_id, payment_id, etc.
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert notifications (for triggers)
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_related_id BIGINT DEFAULT NULL
)
RETURNS notifications AS $$
DECLARE
  new_notification notifications;
BEGIN
  INSERT INTO notifications (user_id, title, message, type, related_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_related_id)
  RETURNING * INTO new_notification;
  
  RETURN new_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for booking status changes
CREATE OR REPLACE FUNCTION notify_booking_status_change()
RETURNS TRIGGER AS $$
DECLARE
  customer_id UUID;
  caterer_id UUID;
  booking_id_str TEXT;
  status_message TEXT;
BEGIN
  -- Get customer and caterer IDs
  SELECT user_id INTO customer_id FROM bookings WHERE id = NEW.id;
  SELECT user_id INTO caterer_id FROM services WHERE id = NEW.service_id;
  
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
        PERFORM create_notification(
          caterer_id,
          'Booking Completed',
          'Booking ' || booking_id_str || ' has been marked as completed',
          'status',
          NEW.id
        );
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
        PERFORM create_notification(
          caterer_id,
          'Booking Cancelled',
          status_message,
          'status',
          NEW.id
        );
      WHEN 'PENDING' THEN
        -- New booking, notify caterer
        PERFORM create_notification(
          caterer_id,
          'New Booking Request',
          'You have a new booking request ' || booking_id_str,
          'booking',
          NEW.id
        );
    END CASE;
  END IF;
  
  -- Notify on payment status changes
  IF OLD.deposit_paid IS DISTINCT FROM NEW.deposit_paid AND NEW.deposit_paid = TRUE THEN
    PERFORM create_notification(
      caterer_id,
      'Payment Received',
      'Deposit payment received for booking ' || booking_id_str,
      'payment',
      NEW.id
    );
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

-- Create trigger for booking status changes
DROP TRIGGER IF EXISTS booking_status_notification_trigger ON bookings;
CREATE TRIGGER booking_status_notification_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_status_change();

-- Trigger function for new reviews
CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify caterer about new review
  PERFORM create_notification(
    NEW.caterer_id,
    'New Review Received',
    'You received a ' || NEW.rating || '-star review',
    'review',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new reviews
DROP TRIGGER IF EXISTS new_review_notification_trigger ON reviews;
CREATE TRIGGER new_review_notification_trigger
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_review();
