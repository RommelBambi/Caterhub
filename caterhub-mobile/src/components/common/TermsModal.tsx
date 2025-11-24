import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#FF8000',
  text: '#1e293b',
  textLight: '#64748b',
  bg: '#f8fafc',
  white: '#ffffff',
  border: '#e2e8f0',
};

interface TermsModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  requireAcceptance?: boolean;
}

// Static terms content
const TERMS_CONTENT = {
  title: 'Terms & Conditions',
  content: `By using CaterHub, you agree to the following terms and conditions:

1. Payment Terms
• A 50% down payment is required to confirm your booking.
• The remaining balance must be paid on the day of the event before service begins.
• We accept GCash and PayMaya for online payments.
• Cash payments are accepted for the remaining balance on the event day.

2. Cancellation Policy
• Cancellations made 14+ days before the event: Full refund of deposit
• Cancellations 7-14 days before: 50% of deposit forfeited
• Cancellations less than 7 days before: Full deposit forfeited
• No-shows will be charged the full amount

3. Changes to Booking
• Guest count changes allowed up to 7 days before the event
• Menu changes must be finalized at least 14 days before the event
• Date changes are subject to availability
• Additional charges may apply for last-minute changes

4. Service Details
• Service time includes setup and teardown
• Additional service hours available at extra cost
• Client is responsible for providing adequate space and utilities

5. Liability & Safety
• Notify us of any food allergies or dietary restrictions in advance
• We follow food safety standards but cannot guarantee allergen-free environments
• Client is responsible for any damage to equipment caused by guests

By clicking "I Agree", you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.`,
};

export default function TermsModal({
  visible,
  onAccept,
  onDecline,
  requireAcceptance = false,
}: TermsModalProps) {
  const handleAccept = () => {
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={requireAcceptance ? undefined : onDecline}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {!requireAcceptance && (
            <TouchableOpacity onPress={onDecline} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={styles.title}>{TERMS_CONTENT.title}</Text>
          <View style={styles.divider} />
          <Text style={styles.contentText}>{TERMS_CONTENT.content}</Text>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {requireAcceptance && (
            <Text style={styles.footerNote}>
              You must accept the Terms & Conditions to continue
            </Text>
          )}
          <View style={styles.buttonRow}>
            {!requireAcceptance && (
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={onDecline}
              >
                <Text style={styles.declineButtonText}>Close</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.text,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  footerNote: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  declineButton: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
