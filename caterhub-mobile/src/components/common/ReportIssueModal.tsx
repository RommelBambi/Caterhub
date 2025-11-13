import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable, 
  TextInput, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../store/auth';

const COLORS = {
  primary: "#FF8000",
  text: "#111827",
  textLight: "#6b7280",
  bg: "#f9fafb",
  white: "#ffffff",
  border: "#e5e7eb",
  hover: "#f3f4f6",
  success: "#22c55e",
  danger: "#ef4444",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

interface IssueType {
  id: string;
  label: string;
  description: string;
  icon: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

const ISSUE_TYPES: IssueType[] = [
  {
    id: 'payment',
    label: 'Payment Issue',
    description: 'Problems with payments, refunds, or billing',
    icon: 'card-outline',
    priority: 'HIGH'
  },
  {
    id: 'booking',
    label: 'Booking Problem',
    description: 'Issues with booking status, dates, or details',
    icon: 'calendar-outline',
    priority: 'HIGH'
  },
  {
    id: 'caterer',
    label: 'Caterer Issue',
    description: 'Problems with caterer communication or service',
    icon: 'restaurant-outline',
    priority: 'MEDIUM'
  },
  {
    id: 'food_quality',
    label: 'Food Quality',
    description: 'Issues with food quality, taste, or safety',
    icon: 'nutrition-outline',
    priority: 'HIGH'
  },
  {
    id: 'delivery',
    label: 'Delivery Problem',
    description: 'Late delivery, wrong location, or setup issues',
    icon: 'car-outline',
    priority: 'MEDIUM'
  },
  {
    id: 'app_bug',
    label: 'App Bug',
    description: 'Technical issues with the app or website',
    icon: 'bug-outline',
    priority: 'LOW'
  },
  {
    id: 'account',
    label: 'Account Issue',
    description: 'Problems with your account, profile, or login',
    icon: 'person-outline',
    priority: 'MEDIUM'
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Any other issue not listed above',
    icon: 'help-circle-outline',
    priority: 'LOW'
  }
];

interface ReportIssueModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId?: number;
  onSuccess?: () => void;
}

function ReportIssueModal({ 
  visible, 
  onClose, 
  bookingId,
  onSuccess 
}: ReportIssueModalProps) {
  const { user } = useAuth();
  const [selectedIssueType, setSelectedIssueType] = useState<IssueType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedIssueType(null);
    setDescription('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedIssueType) {
      Alert.alert('Error', 'Please select an issue type');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to report an issue');
      return;
    }

    setSubmitting(true);
    try {
      // Create support ticket
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          booking_id: bookingId || null,
          subject: selectedIssueType.label,
          description: description.trim(),
          type: selectedIssueType.id,
          status: 'OPEN',
          priority: selectedIssueType.priority,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Issue Reported',
        'Your issue has been submitted successfully. Our support team will review it and get back to you soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              handleClose();
              onSuccess?.();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error submitting issue:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to submit your issue. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return COLORS.danger;
      case 'HIGH': return COLORS.warning;
      case 'MEDIUM': return COLORS.info;
      case 'LOW': return COLORS.textLight;
      default: return COLORS.textLight;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report an Issue</Text>
            <Pressable 
              onPress={handleClose} 
              style={styles.closeButton}
              disabled={submitting}
            >
              <Ionicons name="close" size={24} color={COLORS.textLight} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            {/* Step 1: Issue Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What type of issue are you experiencing?</Text>
              <Text style={styles.sectionSubtitle}>Select the category that best describes your problem</Text>
              
              <View style={styles.issueTypesGrid}>
                {ISSUE_TYPES.map((issueType) => (
                  <Pressable
                    key={issueType.id}
                    style={[
                      styles.issueTypeCard,
                      selectedIssueType?.id === issueType.id && styles.issueTypeCardSelected
                    ]}
                    onPress={() => setSelectedIssueType(issueType)}
                    disabled={submitting}
                  >
                    <View style={styles.issueTypeHeader}>
                      <Ionicons 
                        name={issueType.icon as any} 
                        size={24} 
                        color={selectedIssueType?.id === issueType.id ? COLORS.primary : COLORS.textLight} 
                      />
                      <View style={[
                        styles.priorityBadge, 
                        { backgroundColor: getPriorityColor(issueType.priority) + '15' }
                      ]}>
                        <Text style={[
                          styles.priorityText, 
                          { color: getPriorityColor(issueType.priority) }
                        ]}>
                          {issueType.priority}
                        </Text>
                      </View>
                    </View>
                    <Text style={[
                      styles.issueTypeLabel,
                      selectedIssueType?.id === issueType.id && styles.issueTypeLabelSelected
                    ]}>
                      {issueType.label}
                    </Text>
                    <Text style={styles.issueTypeDescription}>
                      {issueType.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Step 2: Description */}
            {selectedIssueType && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Describe your issue</Text>
                <Text style={styles.sectionSubtitle}>
                  Please provide as much detail as possible to help us resolve your issue quickly
                </Text>
                
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Please describe what happened, when it occurred, and any steps you've already taken..."
                  placeholderTextColor={COLORS.textLight}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={1000}
                  editable={!submitting}
                />
                
                <View style={styles.characterCount}>
                  <Text style={styles.characterCountText}>
                    {description.length}/1000 characters
                  </Text>
                </View>

                {bookingId && (
                  <View style={styles.bookingInfo}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
                    <Text style={styles.bookingInfoText}>
                      This issue will be linked to booking #{bookingId}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.footerButton, styles.cancelButton]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            
            <Pressable
              style={[
                styles.footerButton, 
                styles.submitButton,
                (!selectedIssueType || !description.trim() || submitting) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={!selectedIssueType || !description.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Issue</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    maxHeight: Platform.OS === 'web' ? '95%' : '90%',
    minHeight: Platform.OS === 'web' ? 600 : 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 20,
    lineHeight: 22,
  },
  issueTypesGrid: {
    gap: 16,
  },
  issueTypeCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 20,
    backgroundColor: COLORS.white,
  },
  issueTypeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  issueTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  issueTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  issueTypeLabelSelected: {
    color: COLORS.primary,
  },
  issueTypeDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  characterCountText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.info + '10',
    borderRadius: 8,
  },
  bookingInfoText: {
    fontSize: 14,
    color: COLORS.info,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 16,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelButton: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ReportIssueModal;
