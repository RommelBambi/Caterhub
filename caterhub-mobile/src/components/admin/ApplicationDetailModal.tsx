import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable, Alert, Linking, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { WebView } from 'react-native-webview';

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
  onApprove: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
}

const extractStoragePath = (docPath: string) =>
  docPath?.startsWith(DTI_PREFIX) ? docPath.slice(DTI_PREFIX.length) : docPath;

export default function ApplicationDetailModal({ application, visible, onClose, onApprove, onReject }: Props) {
  if (!application) return null;

  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Debug: Log when component renders
  console.log('[ApplicationDetailModal] Component rendered', {
    visible,
    applicationId: application.id,
    status: application.status,
    onApproveType: typeof onApprove,
    onRejectType: typeof onReject,
    onApproveFunction: onApprove?.toString?.()?.substring(0, 100) || 'N/A',
  });

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
      // Try to get a signed URL (works for both public and private buckets)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('partner-documents')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry
      
      if (signedError) {
        console.error('Error getting signed URL:', signedError);
        const errorMessage = signedError.message || '';
        // If bucket doesn't exist, show helpful error
        if (errorMessage.includes('Bucket not found') || errorMessage.includes('404') || errorMessage.includes('not found')) {
          Alert.alert(
            'Storage Bucket Not Found',
            'The "partner-documents" storage bucket does not exist.\n\nPlease create it in your Supabase dashboard:\n1. Go to Storage\n2. Click "New bucket"\n3. Name it "partner-documents"\n4. Make it public or private (signed URLs will work for both)'
          );
          return null;
        }
        // Try public URL as fallback
        const { data: publicData } = await supabase.storage
          .from('partner-documents')
          .getPublicUrl(storagePath);
        return publicData.publicUrl;
      }
      
      return signedData?.signedUrl || null;
    } catch (error: any) {
      console.error('Error getting document URL:', error);
      if (error?.message?.includes('Bucket not found') || error?.statusCode === 404) {
        Alert.alert(
          'Storage Bucket Not Found',
          'The "partner-documents" storage bucket does not exist.\n\nPlease create it in your Supabase dashboard:\n1. Go to Storage\n2. Click "New bucket"\n3. Name it "partner-documents"\n4. Make it public or private (signed URLs will work for both)'
        );
      }
      return null;
    }
  };

  const handleViewDocument = async (docPath: string) => {
    try {
      setLoadingPdf(true);
      const storagePath = extractStoragePath(docPath);
      const url = await getDocumentUrl(storagePath);
      if (url) {
        // Show PDF in modal
        setPdfUrl(url);
        setPdfModalVisible(true);
      } else {
        Alert.alert('Error', 'Unable to load document');
      }
    } catch (error: any) {
      console.error('Error opening document:', error);
      Alert.alert('Error', error?.message || 'Unable to open document');
    } finally {
      setLoadingPdf(false);
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
        <View 
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Application Details</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </Pressable>
          </View>

          <ScrollView 
            style={styles.scrollContent}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
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
              <TouchableOpacity
                style={[styles.modalActionButton, styles.rejectButton]}
                onPress={() => {
                  console.log('[ApplicationDetailModal] REJECT BUTTON CLICKED - onPress fired!');
                  Alert.alert('Button Clicked!', 'Reject button was pressed!');
                  
                  if (!onReject) {
                    console.error('[ApplicationDetailModal] onReject is not defined!');
                    Alert.alert('Error', 'onReject function is not defined!');
                    return;
                  }
                  
                  console.log('[ApplicationDetailModal] Calling onReject with ID:', application.id);
                  const result = onReject(application.id);
                  
                  if (result instanceof Promise) {
                    result.then(() => {
                      console.log('[ApplicationDetailModal] onReject promise resolved');
                      Alert.alert('Success', 'Application rejected!');
                      onClose();
                    }).catch((error: any) => {
                      console.error('[ApplicationDetailModal] Error in onReject:', error);
                      Alert.alert('Error', 'Failed to reject: ' + (error?.message || 'Unknown error'));
                    });
                  } else {
                    console.log('[ApplicationDetailModal] onReject completed (synchronous)');
                    onClose();
                  }
                }}
                onPressIn={() => {
                  console.log('[ApplicationDetailModal] Reject onPressIn triggered');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.approveButton]}
                onPress={() => {
                  // IMMEDIATE TEST - This should fire first
                  console.log('[ApplicationDetailModal] BUTTON CLICKED - onPress fired!');
                  Alert.alert('Button Clicked!', 'Approve button was pressed!');
                  
                  if (!onApprove) {
                    console.error('[ApplicationDetailModal] onApprove is not defined!');
                    Alert.alert('Error', 'onApprove function is not defined!');
                    return;
                  }
                  
                  // Call onApprove
                  console.log('[ApplicationDetailModal] Calling onApprove with ID:', application.id);
                  console.log('[ApplicationDetailModal] onApprove function type:', typeof onApprove);
                  console.log('[ApplicationDetailModal] onApprove function:', onApprove);
                  
                  if (!onApprove) {
                    console.error('[ApplicationDetailModal] onApprove is null or undefined!');
                    Alert.alert('Error', 'onApprove function is not available!');
                    return;
                  }
                  
                  try {
                    console.log('[ApplicationDetailModal] About to call onApprove...');
                    const result = onApprove(application.id);
                    console.log('[ApplicationDetailModal] onApprove returned:', result);
                    console.log('[ApplicationDetailModal] Is result a Promise?', result instanceof Promise);
                    
                    if (result instanceof Promise) {
                      console.log('[ApplicationDetailModal] Waiting for promise to resolve...');
                      result.then(() => {
                        console.log('[ApplicationDetailModal] onApprove promise resolved successfully');
                        Alert.alert('Success', 'Application approved!');
                        onClose();
                      }).catch((error: any) => {
                        console.error('[ApplicationDetailModal] Error in onApprove promise:', error);
                        console.error('[ApplicationDetailModal] Error code:', error?.code);
                        console.error('[ApplicationDetailModal] Error message:', error?.message);
                        console.error('[ApplicationDetailModal] Error details:', JSON.stringify(error, null, 2));
                        Alert.alert('Error', 'Failed to approve: ' + (error?.message || 'Unknown error'));
                      });
                    } else {
                      console.log('[ApplicationDetailModal] onApprove completed (synchronous)');
                      onClose();
                    }
                  } catch (error: any) {
                    console.error('[ApplicationDetailModal] Exception calling onApprove:', error);
                    console.error('[ApplicationDetailModal] Exception type:', typeof error);
                    console.error('[ApplicationDetailModal] Exception details:', JSON.stringify(error, null, 2));
                    Alert.alert('Error', 'Exception calling onApprove: ' + (error?.message || 'Unknown error'));
                  }
                }}
                onPressIn={() => {
                  console.log('[ApplicationDetailModal] onPressIn triggered');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Allow changing approved applications back to rejected */}
          {application.status === 'Approved' && (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.rejectButton]}
                onPress={() => {
                  console.log('[ApplicationDetailModal] Change to Rejected button clicked');
                  Alert.alert(
                    'Change Status to Rejected',
                    'Are you sure you want to change this approved application back to rejected? This will revoke the caterer\'s access.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Change to Rejected',
                        style: 'destructive',
                        onPress: async () => {
                          console.log('[ApplicationDetailModal] Alert "Change to Rejected" button pressed');
                          console.log('[ApplicationDetailModal] Calling onReject from Approved status');
                          console.log('[ApplicationDetailModal] Application ID:', application.id);
                          
                          if (!onReject) {
                            console.error('[ApplicationDetailModal] onReject is null or undefined!');
                            Alert.alert('Error', 'onReject function is not available!');
                            return;
                          }
                          
                          try {
                            console.log('[ApplicationDetailModal] About to call onReject...');
                            const result = onReject(application.id);
                            console.log('[ApplicationDetailModal] onReject returned:', result);
                            
                            if (result instanceof Promise) {
                              console.log('[ApplicationDetailModal] Waiting for promise to resolve...');
                              await result;
                              console.log('[ApplicationDetailModal] onReject promise resolved successfully');
                              Alert.alert('Success', 'Application rejected!');
                              onClose();
                            } else {
                              console.log('[ApplicationDetailModal] onReject completed (synchronous)');
                              onClose();
                            }
                          } catch (error: any) {
                            console.error('[ApplicationDetailModal] Exception calling onReject:', error);
                            console.error('[ApplicationDetailModal] Error details:', JSON.stringify(error, null, 2));
                            Alert.alert('Error', 'Exception calling onReject: ' + (error?.message || 'Unknown error'));
                          }
                        }
                      }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.rejectButtonText}>Change to Rejected</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Allow changing rejected applications back to approved */}
          {application.status === 'Rejected' && (
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.approveButton]}
                onPress={() => {
                  console.log('[ApplicationDetailModal] Approve from Rejected button clicked');
                  Alert.alert(
                    'Change Status to Approved',
                    'Are you sure you want to approve this previously rejected application?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Approve',
                        onPress: async () => {
                          console.log('[ApplicationDetailModal] Alert "Approve" button pressed');
                          console.log('[ApplicationDetailModal] Calling onApprove from Rejected status');
                          console.log('[ApplicationDetailModal] Application ID:', application.id);
                          console.log('[ApplicationDetailModal] onApprove function:', onApprove);
                          
                          if (!onApprove) {
                            console.error('[ApplicationDetailModal] onApprove is null or undefined!');
                            Alert.alert('Error', 'onApprove function is not available!');
                            return;
                          }
                          
                          try {
                            console.log('[ApplicationDetailModal] About to call onApprove...');
                            const result = onApprove(application.id);
                            console.log('[ApplicationDetailModal] onApprove returned:', result);
                            console.log('[ApplicationDetailModal] Is result a Promise?', result instanceof Promise);
                            
                            if (result instanceof Promise) {
                              console.log('[ApplicationDetailModal] Waiting for promise to resolve...');
                              await result;
                              console.log('[ApplicationDetailModal] onApprove promise resolved successfully');
                              Alert.alert('Success', 'Application approved!');
                              onClose();
                            } else {
                              console.log('[ApplicationDetailModal] onApprove completed (synchronous)');
                              onClose();
                            }
                          } catch (error: any) {
                            console.error('[ApplicationDetailModal] Exception calling onApprove:', error);
                            console.error('[ApplicationDetailModal] Error code:', error?.code);
                            console.error('[ApplicationDetailModal] Error message:', error?.message);
                            console.error('[ApplicationDetailModal] Exception details:', JSON.stringify(error, null, 2));
                            Alert.alert('Error', 'Exception calling onApprove: ' + (error?.message || 'Unknown error'));
                          }
                        }
                      }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.approveButtonText}>Approve Application</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* PDF Viewer Modal */}
      <Modal
        visible={pdfModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPdfModalVisible(false)}
      >
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalContent}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>Document Viewer</Text>
              <Pressable 
                onPress={() => {
                  setPdfModalVisible(false);
                  setPdfUrl(null);
                }} 
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>
            {loadingPdf ? (
              <View style={styles.pdfLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS_ADMIN.primary} />
                <Text style={styles.pdfLoadingText}>Loading document...</Text>
              </View>
            ) : pdfUrl ? (
              <View style={styles.pdfViewerContainer}>
                {Platform.OS === 'web' ? (
                  <PdfIframeViewer url={pdfUrl} />
                ) : (
                  <WebView
                    source={{ uri: pdfUrl }}
                    style={styles.webView}
                    startInLoadingState={true}
                    renderLoading={() => (
                      <View style={styles.pdfLoadingContainer}>
                        <ActivityIndicator size="large" color={COLORS_ADMIN.primary} />
                        <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
                      </View>
                    )}
                  />
                )}
              </View>
            ) : (
              <View style={styles.pdfErrorContainer}>
                <Text style={styles.pdfErrorText}>Unable to load document</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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

// PDF Iframe Viewer for Web
function PdfIframeViewer({ url }: { url: string }) {
  const containerRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && containerRef.current && typeof document !== 'undefined') {
      const container = containerRef.current;
      // Clear any existing iframe
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      // Create new iframe
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.title = 'PDF Viewer';
      container.appendChild(iframe);
    }
  }, [url]);

  return (
    <View 
      ref={containerRef}
      style={styles.webView}
    />
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
    flexDirection: 'column',
    overflow: 'hidden',
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
    flex: 1,
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
    backgroundColor: COLORS_ADMIN.white,
    zIndex: 10,
    elevation: 5, // For Android
    ...Platform.select({
      web: {
        position: 'relative' as const,
        pointerEvents: 'auto' as const,
        touchAction: 'manipulation' as const,
      },
    }),
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Ensure minimum touch target size
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
      },
    }),
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
  pdfModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfModalContent: {
    backgroundColor: COLORS_ADMIN.white,
    borderRadius: 16,
    width: '95%',
    height: '90%',
    maxWidth: 1200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  pdfModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_ADMIN.border,
  },
  pdfModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS_ADMIN.text,
  },
  pdfViewerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pdfLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  pdfLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS_ADMIN.textLight,
  },
  pdfErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  pdfErrorText: {
    fontSize: 16,
    color: COLORS_ADMIN.danger,
    fontWeight: '500',
  },
});


