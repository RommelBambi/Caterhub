import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getActiveTerms, recordAcceptance } from '../../services/terms';

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

export default function TermsModal({
  visible,
  onAccept,
  onDecline,
  requireAcceptance = false,
}: TermsModalProps) {
  const [terms, setTerms] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadTerms();
    }
  }, [visible]);

  const loadTerms = async () => {
    try {
      setLoading(true);
      const activeTerms = await getActiveTerms();
      setTerms(activeTerms);
    } catch (error) {
      console.error('Error loading terms:', error);
      Alert.alert('Error', 'Failed to load Terms & Conditions');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!terms) return;

    try {
      setAccepting(true);
      await recordAcceptance(terms.id);
      onAccept();
    } catch (error) {
      console.error('Error recording acceptance:', error);
      Alert.alert('Error', 'Failed to record acceptance. Please try again.');
    } finally {
      setAccepting(false);
    }
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading Terms & Conditions...</Text>
          </View>
        ) : terms ? (
          <>
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.title}>{terms.title}</Text>
              <Text style={styles.version}>Version {terms.version}</Text>
              <Text style={styles.effectiveDate}>
                Effective Date: {new Date(terms.effective_date).toLocaleDateString()}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.contentText}>{terms.content}</Text>
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
                  style={[styles.button, styles.acceptButton, accepting && styles.buttonDisabled]}
                  onPress={handleAccept}
                  disabled={accepting}
                >
                  {accepting ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={COLORS.textLight} />
            <Text style={styles.errorText}>No Terms & Conditions available</Text>
            {!requireAcceptance && (
              <TouchableOpacity style={styles.button} onPress={onDecline}>
                <Text style={styles.acceptButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight,
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
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  effectiveDate: {
    fontSize: 14,
    color: COLORS.textLight,
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
  buttonDisabled: {
    opacity: 0.5,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
    marginBottom: 24,
  },
});
