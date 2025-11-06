import React from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable, Alert, Linking, Platform } from 'react-native';
import { supabase } from '../../services/supabase';

interface PartnerApplication {
  id: string;
  user_id: string | null;
  business_name: string;
  locations: any;
  website: string | null;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  telephone_number: string | null;
  contact_number: string | null;
  permits_ready: boolean;
  food_safety: boolean;
  agree_terms: boolean;
  notes: string | null;
  uploaded_documents: string[];
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
}

const COLORS_ADMIN = {
  primary: "#FF8000",
  text: "#1e293b",
  textLight: "#64748b",
  bg: "#f8fafc",
  white: "#ffffff",
  border: "#e2e8f0",
  hover: "#f1f5f9",
  success: "#22c55e",
  danger: "#dc2626",
  info: "#0ea5e9",
  warning: "#f59e0b",
};

const DTI_PREFIX = 'DTI::';

interface Props {
  application: PartnerApplication | null;
  visible: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const extractStoragePath = (docPath: string) =>
  docPath?.startsWith(DTI_PREFIX) ? docPath.slice(DTI_PREFIX.length) : docPath;

export default function ApplicationDetailModal({ application, visible, onClose, onApprove, onReject }: Props) {
  if (!application) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDocumentUrl = async (storagePath: string) => {
    try {
      const { data } = await supabase.storage
        .from('partner-documents')
        .getPublicUrl(storagePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  };

  const handleViewDocument = async (docPath: string) => {
    try {
      const storagePath = extractStoragePath(docPath);
      const url = await getDocumentUrl(storagePath);
      if (url) {
        // Open document in new window/tab on web, or use Linking on mobile
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(url, '_blank');
        } else {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
          } else {
            Alert.alert('Error', 'Unable to open document URL');
          }
        }
      } else {
        Alert.alert('Error', 'Unable to load document');
      }
    } catch (error: any) {
      console.error('Error opening document:', error);
      Alert.alert('Error', error?.message || 'Unable to open document');
    }
  };

  const dtiDocument = application.uploaded_documents?.find((doc) => doc?.startsWith(DTI_PREFIX));
  const supportingDocuments = (application.uploaded_documents || []).filter(
    (doc) => !doc?.startsWith(DTI_PREFIX)
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Application Details</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: application.status === 'Approved' ? COLORS_ADMIN.success + '15' : application.status === 'Rejected' ? COLORS_ADMIN.danger + '15' : COLORS_ADMIN.warning + '15' }]}>
                <Text style={[styles.statusText, { color: application.status === 'Approved' ? COLORS_ADMIN.success : application.status === 'Rejected' ? COLORS_ADMIN.danger : COLORS_ADMIN.warning }]}>
                  {application.status}
                </Text>
              </View>
            </View>

            {/* Business Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Information</Text>
              <DetailRow label="Business Name" value={application.business_name} />
              {application.website && <DetailRow label="Website" value={application.website} />}
              <DetailRow label="Locations" value={
                application.locations && Array.isArray(application.locations)
                  ? application.locations.map((loc: any, idx: number) => (
                      <Text key={idx} style={styles.detailValue}>
                        {loc.address && `${loc.address}, `}
                        {loc.city && `${loc.city}, `}
                        {loc.province && `${loc.province}, `}
                        {loc.country || 'Philippines'}
                        {loc.postalCode && ` ${loc.postalCode}`}
                      </Text>
                    ))
                  : 'N/A'
              } />
            </View>

            {/* Owner & Contact */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Owner & Contact</Text>
              <DetailRow label="Owner Name" value={application.owner_name} />
              <DetailRow label="Email" value={application.owner_email} />
              <DetailRow label="Phone" value={application.owner_phone} />
              {application.telephone_number && <DetailRow label="Telephone" value={application.telephone_number} />}
              {application.contact_number && <DetailRow label="Contact Number" value={application.contact_number} />}
            </View>

            {/* Compliance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Compliance</Text>
              <DetailRow label="Permits Ready" value={application.permits_ready ? 'Yes' : 'No'} />
              <DetailRow label="Food Safety Certified" value={application.food_safety ? 'Yes' : 'No'} />
              <DetailRow label="Agreed to Terms" value={application.agree_terms ? 'Yes' : 'No'} />
            </View>

            {/* Documents */}
            {dtiDocument && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>DTI / SEC Registration</Text>
                <Pressable
                  style={styles.documentButton}
                  onPress={() => handleViewDocument(dtiDocument)}
                >
                  <Text style={styles.documentButtonText}>View DTI Certificate</Text>
                </Pressable>
              </View>
            )}

            {supportingDocuments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Supporting Documents</Text>
                {supportingDocuments.map((docPath, idx) => {
                  const storagePath = extractStoragePath(docPath);
                  const fileName = storagePath.split('/').pop() || `Document ${idx + 1}`;
                  return (
                    <Pressable
                      key={idx}
                      style={styles.documentButton}
                      onPress={() => handleViewDocument(docPath)}
                    >
                      <Text style={styles.documentButtonText}>View {fileName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {/* Notes */}
            {application.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{application.notes}</Text>
              </View>
            )}

            {/* Dates */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dates</Text>
              <DetailRow label="Submitted" value={formatDate(application.created_at)} />
              <DetailRow label="Last Updated" value={formatDate(application.updated_at)} />
            </View>
          </ScrollView>

          {/* Actions */}
          {application.status === 'Pending' && (
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalActionButton, styles.rejectButton]}
                onPress={() => {
                  onReject(application.id);
                  onClose();
                }}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </Pressable>
              <Pressable
                style={[styles.modalActionButton, styles.approveButton]}
                onPress={() => {
                  onApprove(application.id);
                  onClose();
                }}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <View style={styles.detailValueContainer}>
        {typeof value === 'string' ? (
          <Text style={styles.detailValue}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
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
    backgroundColor: COLORS_ADMIN.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 800,
    maxHeight: '90%',
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_ADMIN.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS_ADMIN.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS_ADMIN.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS_ADMIN.text,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_ADMIN.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS_ADMIN.text,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS_ADMIN.text,
    width: 140,
  },
  detailValueContainer: {
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS_ADMIN.textLight,
    lineHeight: 20,
  },
  documentButton: {
    padding: 12,
    backgroundColor: COLORS_ADMIN.bg,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS_ADMIN.border,
  },
  documentButtonText: {
    fontSize: 14,
    color: COLORS_ADMIN.text,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: COLORS_ADMIN.textLight,
    lineHeight: 20,
    padding: 12,
    backgroundColor: COLORS_ADMIN.bg,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS_ADMIN.border,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: COLORS_ADMIN.success,
  },
  approveButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 16,
  },
  rejectButton: {
    backgroundColor: COLORS_ADMIN.danger,
  },
  rejectButtonText: {
    color: COLORS_ADMIN.white,
    fontWeight: '600',
    fontSize: 16,
  },
});


