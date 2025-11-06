import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Pressable, Alert, Platform, KeyboardAvoidingView, Image, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Field, Label } from '../../components/ui/Field';
import { Dropdown } from '../../components/ui/Dropdown';
import { Stepper } from '../../components/ui/Stepper';
import { COLORS } from '../../constants/colors';
import { PartnerForm, StepKey, BusinessLocation } from '../../types/admin';
import { EMPTY_PARTNER_FORM } from '../../constants/storage';
import { loadForm, saveForm, clearForm, sendApplicationToRecruitment } from '../../utils/storage';
import { COUNTRIES, PROVINCES_PH, CITIES_BY_PROVINCE } from '../../constants/locations';
import InteractiveMapPicker from '../../components/InteractiveMapPicker';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../store/auth';
import { isWeb } from '../../utils/platform';

// Enhanced Square navigation button component
const SquareNavButton = ({
  label,
  onPress,
  variant = "solid",
  icon,
  iconPosition = "right",
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: "solid" | "outline";
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  disabled?: boolean;
}) => (
  <Pressable
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.navButton,
      variant === "outline" ? styles.navButtonOutline : styles.navButtonSolid,
      disabled &&
        (variant === "outline"
          ? styles.navButtonDisabledOutline
          : styles.navButtonDisabledSolid),
      !disabled && pressed && styles.navButtonPressed,
    ]}
  >
    {icon && iconPosition === "left" && (
      <Ionicons
        name={icon}
        size={18}
        color={
          variant === "solid"
            ? "#fff"
            : disabled
            ? COLORS.textLight
            : COLORS.primary
        }
        style={{ marginRight: 8 }}
      />
    )}
    <Text
      style={[
        styles.navButtonText,
        variant === "outline"
          ? styles.navButtonTextOutline
          : styles.navButtonTextSolid,
        disabled &&
          (variant === "outline"
            ? styles.navButtonTextOutlineDisabled
            : styles.navButtonTextSolidDisabled),
      ]}
    >
      {label}
    </Text>
    {icon && iconPosition === "right" && (
      <Ionicons
        name={icon}
        size={18}
        color={
          variant === "solid"
            ? "#fff"
            : disabled
            ? COLORS.textLight
            : COLORS.primary
        }
        style={{ marginLeft: 8 }}
      />
    )}
  </Pressable>
);

const DTI_PREFIX = 'DTI::';

// Enhanced Hero Component
function Hero({ onStart }: { onStart: () => void }) {
  const handleStart = () => {
    console.log('Start Application clicked');
    onStart();
  };

  return (
    <View style={styles.heroContainer}>
      <View style={styles.heroBackground}>
        <View style={styles.heroOverlay} />
      </View>
      <Container>
        <Card pad={48} style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="restaurant" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.heroTitle}>Become a CaterHub Partner</Text>
            <Text style={styles.heroSubtitle}>
              Join our platform and grow your catering business. We'll guide you through a quick application process.
            </Text>
            <View style={styles.heroBenefits}>
              <View style={[styles.heroBenefitItem, { marginBottom: 16 }]}>
                <View style={styles.heroBenefitIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.heroBenefitContent}>
                  <Text style={styles.heroBenefitTitle}>Reach thousands of customers</Text>
                  <Text style={styles.heroBenefitDesc}>Get discovered by customers in your area</Text>
                </View>
              </View>
              <View style={[styles.heroBenefitItem, { marginBottom: 16 }]}>
                <View style={styles.heroBenefitIcon}>
                  <Ionicons name="calendar" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.heroBenefitContent}>
                  <Text style={styles.heroBenefitTitle}>Easy booking management</Text>
                  <Text style={styles.heroBenefitDesc}>Simple tools to manage your orders</Text>
                </View>
              </View>
              <View style={styles.heroBenefitItem}>
                <View style={styles.heroBenefitIcon}>
                  <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.heroBenefitContent}>
                  <Text style={styles.heroBenefitTitle}>Secure payment processing</Text>
                  <Text style={styles.heroBenefitDesc}>Get paid reliably and on time</Text>
                </View>
              </View>
            </View>
            <View style={styles.heroButtonContainer}>
              <SquareNavButton
                label="Start Application"
                onPress={handleStart}
                icon="arrow-forward"
                iconPosition="right"
              />
            </View>
          </View>
        </Card>
      </Container>
    </View>
  );
}

// Step 1: Business Profile
function Step1({
  form,
  setForm,
  back,
  next,
}: {
  form: PartnerForm;
  setForm: React.Dispatch<React.SetStateAction<PartnerForm>>;
  back: () => void;
  next: () => void;
}) {
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);

  const addLocation = () => {
    const newLocation: BusinessLocation = {
      id: Date.now().toString(),
      country: '',
      province: '',
      city: '',
      postalCode: '',
      address: '',
    };
    setForm((s) => ({ ...s, locations: [...s.locations, newLocation] }));
  };

  const updateLocation = (index: number, field: keyof BusinessLocation, value: any) => {
    setForm((s) => ({
      ...s,
      locations: s.locations.map((loc, i) => (i === index ? { ...loc, [field]: value } : loc)),
    }));
  };

  const removeLocation = (index: number) => {
    setForm((s) => ({
      ...s,
      locations: s.locations.filter((_, i) => i !== index),
    }));
  };

  const getAvailableCities = (province: string) => {
    return CITIES_BY_PROVINCE[province] || [];
  };

  const handleLocationSelect = (location: { latitude: number; longitude: number; address: string }) => {
    if (editingLocationIndex !== null) {
      updateLocation(editingLocationIndex, 'latitude', location.latitude);
      updateLocation(editingLocationIndex, 'longitude', location.longitude);
      updateLocation(editingLocationIndex, 'address', location.address);
    }
    setMapPickerVisible(false);
    setEditingLocationIndex(null);
  };

  const canProceed = useMemo(() => {
    if (!form.businessName?.trim()) return false;
    if (form.locations.length === 0) return false;
    return form.locations.every(
      (loc) => loc.country && loc.province && loc.city && loc.address
    );
  }, [form.businessName, form.locations]);

  const handleNext = () => {
    if (!canProceed) {
      Alert.alert("Step 1", "Please complete all required fields.");
      return;
    }
    next();
  };

  return (
    <>
      <Card pad={32} style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepHeaderIcon}>
            <Ionicons name="business" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.stepHeaderText}>
            <Text style={styles.stepTitle}>Business Profile</Text>
            <Text style={styles.stepSubtitle}>Tell us about your business. Fields marked * are required.</Text>
          </View>
        </View>

        <Field label="Business name *" value={form.businessName} onChangeText={(t) => setForm((s) => ({ ...s, businessName: t }))} />

        <Field
          label="Website"
          value={form.website}
          onChangeText={(t) => setForm((s) => ({ ...s, website: t }))}
          placeholder="https://yourcatering.ph"
          keyboardType="url"
        />

        <View style={styles.sectionDivider} />
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Business Locations *</Text>
        </View>

        {form.locations.map((location, index) => (
          <View key={location.id} style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>Location {index + 1}</Text>
              {form.locations.length > 1 && (
                <Pressable onPress={() => removeLocation(index)} style={styles.removeButton}>
                  <Ionicons name="trash" size={18} color={COLORS.danger} />
                </Pressable>
              )}
            </View>

            <Dropdown
              label="Country *"
              value={location.country}
              options={COUNTRIES}
              onSelect={(value) => updateLocation(index, 'country', value)}
            />

            <Dropdown
              label="Province *"
              value={location.province}
              options={PROVINCES_PH}
              onSelect={(value) => {
                updateLocation(index, 'province', value);
                updateLocation(index, 'city', ''); // Reset city when province changes
              }}
              searchable
            />

            <Dropdown
              label="City *"
              value={location.city}
              options={getAvailableCities(location.province)}
              onSelect={(value) => updateLocation(index, 'city', value)}
              searchable
              placeholder={!location.province ? "Select province first" : "Select city"}
            />

            <Field
              label="Postal Code *"
              value={location.postalCode}
              onChangeText={(value) => updateLocation(index, 'postalCode', value)}
              keyboardType="numeric"
            />

            <Field
              label="Address *"
              value={location.address}
              onChangeText={(value) => updateLocation(index, 'address', value)}
              multiline
            />

            <Field
              label="Service radius (km)"
              value={location.serviceRadiusKm !== undefined ? String(location.serviceRadiusKm) : ''}
              onChangeText={(value) => {
                const n = parseFloat(value);
                updateLocation(index, 'serviceRadiusKm', Number.isFinite(n) ? n : undefined);
              }}
              keyboardType="numeric"
              placeholder="e.g., 10"
            />

            {Platform.OS !== 'web' && (
              <Pressable
                onPress={() => {
                  setEditingLocationIndex(index);
                  setMapPickerVisible(true);
                }}
                style={styles.mapPinButton}
              >
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={styles.mapPinButtonText}>Set Location on Map</Text>
                {location.latitude && location.longitude && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={{ marginLeft: 8 }} />
                )}
              </Pressable>
            )}
          </View>
        ))}

        <Pressable onPress={addLocation} style={styles.addButton}>
          <Ionicons name="add-circle" size={20} color={COLORS.primary} />
          <Text style={styles.addButtonText}>Add an another location if you have an another branch</Text>
        </Pressable>

        <View style={styles.navButtons}>
          <SquareNavButton label="Back" variant="outline" onPress={back} icon="arrow-back" iconPosition="left" />
          <SquareNavButton
            label="Next"
            onPress={() => {
              if (!validate()) {
                Alert.alert("Step 1", "Please complete all required fields including at least one location.");
                return;
              }
              next();
            }}
            icon="arrow-forward"
            iconPosition="right"
          />
        </View>
      </Card>

      {Platform.OS !== 'web' && (
        <InteractiveMapPicker
          visible={mapPickerVisible}
          onClose={() => {
            setMapPickerVisible(false);
            setEditingLocationIndex(null);
          }}
          onLocationSelect={handleLocationSelect}
          currentLocation={
            editingLocationIndex !== null &&
            form.locations[editingLocationIndex]?.latitude &&
            form.locations[editingLocationIndex]?.longitude
              ? {
                  latitude: form.locations[editingLocationIndex].latitude!,
                  longitude: form.locations[editingLocationIndex].longitude!,
                  address: form.locations[editingLocationIndex].address,
                }
              : undefined
          }
        />
      )}
      {Platform.OS === 'web' && mapPickerVisible && (
        <Modal
          visible={mapPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setMapPickerVisible(false);
            setEditingLocationIndex(null);
          }}
        >
          <View style={styles.webMapNotice}>
            <View style={{ backgroundColor: COLORS.white, padding: 24, borderRadius: 12, maxWidth: 400, width: '100%' }}>
              <Text style={styles.webMapNoticeText}>
                Map picker is only available on mobile. Please enter the address manually in the address field above.
              </Text>
              <Pressable
                onPress={() => {
                  setMapPickerVisible(false);
                  setEditingLocationIndex(null);
                }}
                style={styles.webMapNoticeButton}
              >
                <Text style={styles.webMapNoticeButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

// Step 2: Owner & Contact
function Step2({
  form,
  setForm,
  back,
  next,
}: {
  form: PartnerForm;
  setForm: React.Dispatch<React.SetStateAction<PartnerForm>>;
  back: () => void;
  next: () => void;
}) {
  const canProceed = useMemo(
    () =>
      !!form.ownerName?.trim() &&
      !!form.ownerPhone?.trim() &&
      !!form.ownerEmail?.trim(),
    [form.ownerName, form.ownerPhone, form.ownerEmail]
  );

  const handleNext = () => {
    if (!canProceed) {
      Alert.alert("Step 2", "Please complete all required fields.");
      return;
    }
    next();
  };

  return (
    <Card pad={32} style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepHeaderIcon}>
          <Ionicons name="person" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.stepHeaderText}>
          <Text style={styles.stepTitle}>Owner & Contact</Text>
          <Text style={styles.stepSubtitle}>Your primary point of contact for bookings and support.</Text>
        </View>
      </View>

      <Field label="Owner full name *" value={form.ownerName} onChangeText={(t) => setForm((s) => ({ ...s, ownerName: t }))} />

      <View style={styles.row}>
        <View style={[styles.col, styles.col1]}>
          <Field label="Phone *" value={form.ownerPhone} onChangeText={(t) => setForm((s) => ({ ...s, ownerPhone: t }))} keyboardType="phone-pad" />
        </View>
        <View style={[styles.col, styles.col1]}>
          <Field label="Telephone Number" value={form.telephoneNumber || ''} onChangeText={(t) => setForm((s) => ({ ...s, telephoneNumber: t }))} keyboardType="phone-pad" />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.col, styles.col1]}>
          <Field label="Contact Number" value={form.contactNumber || ''} onChangeText={(t) => setForm((s) => ({ ...s, contactNumber: t }))} keyboardType="phone-pad" />
        </View>
        <View style={[styles.col, styles.col1]}>
          <Field label="Email *" value={form.ownerEmail} onChangeText={(t) => setForm((s) => ({ ...s, ownerEmail: t }))} keyboardType="email-address" />
        </View>
      </View>

        <View style={styles.navButtons}>
          <SquareNavButton label="Back" variant="outline" onPress={back} icon="arrow-back" iconPosition="left" />
          <SquareNavButton
            label="Next"
            onPress={handleNext}
            icon="arrow-forward"
            iconPosition="right"
            disabled={!canProceed}
          />
        </View>
      </Card>
  );
}

// Step 3: Compliance & Policies (Menu & Packages step removed)
function Step3Compliance({
  form,
  setForm,
  back,
  next,
}: {
  form: PartnerForm;
  setForm: React.Dispatch<React.SetStateAction<PartnerForm>>;
  back: () => void;
  next: () => void;
}) {
  type UploadedFile = {
    name: string;
    size: number;
    uri: string;
    mimeType?: string;
    storagePath?: string;
    isRemote?: boolean;
  };

  const [dtiFile, setDtiFile] = useState<UploadedFile | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dtiUploading, setDtiUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;
    const docs = form.uploadedDocuments || [];
    const dtiEntry = docs.find((doc) => doc?.startsWith(DTI_PREFIX));
    if (dtiEntry) {
      const storagePath = dtiEntry.slice(DTI_PREFIX.length);
      setDtiFile({
        name: storagePath.split('/').pop() || 'DTI Document',
        size: 0,
        uri: '',
        storagePath,
        isRemote: true,
      });
    }
    const otherEntries = docs.filter((doc) => !doc?.startsWith(DTI_PREFIX));
    if (otherEntries.length) {
      setSupportingFiles(
        otherEntries.map((storagePath) => ({
          name: storagePath.split('/').pop() || 'Document',
          size: 0,
          uri: '',
          storagePath,
          isRemote: true,
        }))
      );
    }
    setInitialized(true);
  }, [form.uploadedDocuments, initialized]);

  useEffect(() => {
    if (!initialized) return;
    const identifiers: string[] = [];
    if (dtiFile?.storagePath) {
      identifiers.push(`${DTI_PREFIX}${dtiFile.storagePath}`);
    }
    supportingFiles.forEach((file) => {
      if (file.storagePath) {
        identifiers.push(file.storagePath);
      }
    });
    setForm((prev) => ({
      ...prev,
      uploadedDocuments: identifiers,
    }));
  }, [initialized, dtiFile, supportingFiles, setForm]);

  const deleteStorageFile = async (path?: string) => {
    if (!path) return;
    try {
      const { error } = await supabase.storage
        .from('partner-documents')
        .remove([path]);
      if (error) {
        console.error('Error deleting file from storage:', error);
      }
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  };

  const uploadFileToStorage = async (
    fileUri: string,
    fileName: string,
    userId: string,
    mimeType?: string
  ): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
      const storagePath = `${userId}/${uniqueFileName}`;

      const response = await fetch(fileUri);
      const fileBlob = await response.blob();

      const { error } = await supabase.storage
        .from('partner-documents')
        .upload(storagePath, fileBlob, {
          contentType: mimeType || 'application/pdf',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      return storagePath;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const uploadDtiDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setDtiUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(
          'Authentication Required',
          'Please create your account first before uploading files.',
        );
        setDtiUploading(false);
        return;
      }

      const file = result.assets[0];
      const storagePath = await uploadFileToStorage(
        file.uri,
        file.name,
        user.id,
        file.mimeType || undefined,
      );

      if (storagePath) {
        await deleteStorageFile(dtiFile?.storagePath);
        setDtiFile({
          name: file.name,
          size: file.size || 0,
          uri: file.uri,
          mimeType: file.mimeType || undefined,
          storagePath,
        });
      }
    } catch (error) {
      console.error('Error picking DTI document:', error);
      Alert.alert(
        'Error',
        'Failed to upload DTI certificate. Please try again.',
      );
    } finally {
      setDtiUploading(false);
    }
  };

  const removeDtiFile = async () => {
    if (dtiFile?.storagePath) {
      await deleteStorageFile(dtiFile.storagePath);
    }
    setDtiFile(null);
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        setUploading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          Alert.alert(
            'Authentication Required',
            'Please create your account first before uploading files.',
          );
          setUploading(false);
          return;
        }

        const newFiles: UploadedFile[] = [];

        for (const file of result.assets) {
          try {
            const storagePath = await uploadFileToStorage(
              file.uri,
              file.name,
              user.id,
              file.mimeType || undefined,
            );

            if (storagePath) {
              newFiles.push({
                name: file.name,
                size: file.size || 0,
                uri: file.uri,
                mimeType: file.mimeType || undefined,
                storagePath,
              });
            }
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            Alert.alert('Upload Error', `Failed to upload ${file.name}. Please try again.`);
          }
        }

        if (newFiles.length > 0) {
          setSupportingFiles((prev) => [...prev, ...newFiles]);
        }

        setUploading(false);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      setUploading(false);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };

  const removeSupportingFile = async (index: number) => {
    const fileToRemove = supportingFiles[index];
    if (fileToRemove?.storagePath) {
      await deleteStorageFile(fileToRemove.storagePath);
    }
    setSupportingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Stored in account';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const Toggle = ({
    label,
    value,
    onToggle,
    detail,
    bullets,
    icon,
  }: {
    label: string;
    value: boolean;
    onToggle: () => void;
    detail?: string;
    bullets?: string[];
    icon?: keyof typeof Ionicons.glyphMap;
  }) => (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        styles.toggle,
        value && styles.toggleActive,
      ]}
    >
      <View style={styles.toggleHeader}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={value ? COLORS.primary : COLORS.textLight}
            style={{ marginRight: 12 }}
          />
        )}
        <Text
          style={[
            styles.toggleLabel,
            value && styles.toggleLabelActive,
          ]}
        >
          {label}
        </Text>
        <Ionicons
          name={value ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={value ? COLORS.primary : COLORS.border}
        />
      </View>
      {detail && (
        <View style={styles.toggleContent}>
          <Text style={styles.toggleDetail}>{detail}</Text>
          {bullets && bullets.length > 0 && (
            <View style={styles.toggleBullets}>
              {bullets.map((bullet, idx) => (
                <View key={idx} style={styles.toggleBulletItem}>
                  <Text style={styles.toggleBulletIcon}>•</Text>
                  <Text style={styles.toggleBulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const openTerms = () => {
    if (Platform.OS === "web") {
      Alert.alert("Partner Terms", "Partner terms and conditions will be available soon.");
    } else {
      Alert.alert("Partner Terms", "Open /partner-terms.html in a web browser.");
    }
  };

  const hasDti = !!(dtiFile && dtiFile.storagePath);
  const canProceed =
    form.permitsReady && form.foodSafety && form.agreeTerms && hasDti;

  const handleNext = () => {
    if (!canProceed) {
      Alert.alert(
        'Step 3',
        'Please confirm all compliance items and upload your DTI certificate.',
      );
      return;
    }
    next();
  };

  return (
    <Card pad={32} style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepHeaderIcon}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.stepHeaderText}>
          <Text style={styles.stepTitle}>Compliance & Policies</Text>
          <Text style={styles.stepSubtitle}>Quick confirmations to keep our marketplace safe and high-quality.</Text>
        </View>
      </View>

      <TouchableOpacity onPress={openTerms} style={styles.termsButton}>
        <Ionicons name="document-text" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.termsButtonText}>Review Partner Terms</Text>
        <Ionicons name="open-outline" size={16} color="#fff" style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      <Toggle
        label="I have valid permits to operate"
        value={form.permitsReady}
        onToggle={() => setForm((s) => ({ ...s, permitsReady: !s.permitsReady }))}
        detail="Current documents on file that match our profile."
        bullets={["DTI/SEC Registration"]}
        icon="document"
      />

      <Toggle
        label="We follow food safety standards (DOH / local LGU)"
        value={form.foodSafety}
        onToggle={() => setForm((s) => ({ ...s, foodSafety: !s.foodSafety }))}
        detail="Core practices required by health authorities."
        bullets={["Sanitary Permit", "Health certificates for handlers", "Cold-holding & allergen labeling"]}
        icon="medical"
      />

      <Toggle
        label="I agree to CaterHub Partner Terms"
        value={form.agreeTerms}
        onToggle={() => setForm((s) => ({ ...s, agreeTerms: !s.agreeTerms }))}
        detail="Key policies you accept by partnering with us."
        bullets={["Service levels & delivery windows", "Cancellations & refunds", "Payout schedule & fees", "Data privacy compliance"]}
        icon="checkbox"
      />

      <View style={styles.fileUploadSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="document-text" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.fileUploadTitle}>DTI / SEC Registration (Required)</Text>
        </View>
        <Text style={styles.fileUploadSubtitle}>
          Upload your DTI or SEC certificate (PDF or images). This is required to submit your application.
        </Text>

        {dtiFile && (
          <View style={[styles.fileItem, styles.dtiFileItem]}>
            <View style={styles.fileItemContent}>
              <Ionicons name="document" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
              <View style={styles.fileItemInfo}>
                <Text style={styles.fileItemName} numberOfLines={1}>{dtiFile.name}</Text>
                <Text style={styles.fileItemSize}>{formatFileSize(dtiFile.size)}</Text>
              </View>
              <View style={styles.dtiBadge}>
                <Text style={styles.dtiBadgeText}>Required</Text>
              </View>
            </View>
            <Pressable onPress={removeDtiFile} style={styles.fileRemoveButton}>
              <Ionicons name="close-circle" size={24} color={COLORS.danger} />
            </Pressable>
          </View>
        )}

        <Pressable
          onPress={uploadDtiDocument}
          style={[
            styles.filePickerButton,
            dtiUploading && styles.filePickerButtonDisabled,
          ]}
          disabled={dtiUploading}
        >
          {dtiUploading ? (
            <>
              <Ionicons name="hourglass" size={20} color={COLORS.primary} />
              <Text style={styles.filePickerButtonText}>Uploading...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color={COLORS.primary} />
              <Text style={styles.filePickerButtonText}>
                {dtiFile ? 'Replace DTI Certificate' : 'Upload DTI Certificate'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.fileUploadSection}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="attach" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.fileUploadTitle}>Supporting Documents (Optional)</Text>
        </View>
        <Text style={styles.fileUploadSubtitle}>
          Upload permits, certificates, or other supporting documents (PDF or images)
        </Text>

        <Pressable 
          onPress={pickDocuments} 
          style={[
            styles.filePickerButton,
            uploading && styles.filePickerButtonDisabled,
          ]}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Ionicons name="hourglass" size={20} color={COLORS.primary} />
              <Text style={styles.filePickerButtonText}>Uploading...</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color={COLORS.primary} />
              <Text style={styles.filePickerButtonText}>Choose Files</Text>
            </>
          )}
        </Pressable>

        {supportingFiles.length > 0 && (
          <View style={styles.fileList}>
            {supportingFiles.map((file, index) => (
              <View key={`${file.storagePath || file.uri}-${index}`} style={styles.fileItem}>
                <View style={styles.fileItemContent}>
                  <Ionicons name="document" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
                  <View style={styles.fileItemInfo}>
                    <Text style={styles.fileItemName} numberOfLines={1}>{file.name}</Text>
                    <Text style={styles.fileItemSize}>{formatFileSize(file.size)}</Text>
                  </View>
                </View>
                <Pressable onPress={() => removeSupportingFile(index)} style={styles.fileRemoveButton}>
                  <Ionicons name="close-circle" size={24} color={COLORS.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.navButtons}>
        <SquareNavButton label="Back" variant="outline" onPress={back} icon="arrow-back" iconPosition="left" />
        <SquareNavButton
          label="Next"
          onPress={handleNext}
          icon="arrow-forward"
          iconPosition="right"
          disabled={!canProceed}
        />
      </View>
    </Card>
  );
}
// Step 4: Review
function Step4Review({ 
  form, 
  back, 
  next, 
  submit 
}: { 
  form: PartnerForm; 
  back: () => void; 
  next: () => void; 
  submit: () => Promise<void>; 
}) {
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewKey}>{k}</Text>
      <View style={styles.reviewValue}>{typeof v === "string" ? <Text style={styles.reviewValueText}>{v || "�"}</Text> : v}</View>
    </View>
  );

  const Section = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: keyof typeof Ionicons.glyphMap }) => (
    <View style={styles.reviewSection}>
      <View style={styles.reviewSectionHeader}>
        {icon && <Ionicons name={icon} size={20} color={COLORS.primary} style={{ marginRight: 8 }} />}
        <Text style={styles.reviewSectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  const hasBusinessInfo =
    !!form.businessName?.trim() &&
    form.locations.length > 0 &&
    form.locations.every(
      (loc) => loc.country && loc.province && loc.city && loc.address
    );

  const hasOwnerInfo =
    !!form.ownerName?.trim() &&
    !!form.ownerPhone?.trim() &&
    !!form.ownerEmail?.trim();

  const hasDtiDocument = (form.uploadedDocuments || []).some(
    (doc) => doc?.startsWith(DTI_PREFIX)
  );

  const hasCompliance =
    form.permitsReady && form.foodSafety && form.agreeTerms && hasDtiDocument;

  const canSubmit = hasBusinessInfo && hasOwnerInfo && hasCompliance;

  return (
    <Card pad={32} style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepHeaderIcon}>
          <Ionicons name="eye" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.stepHeaderText}>
          <Text style={styles.stepTitle}>Review Your Application</Text>
          <Text style={styles.stepSubtitle}>Make sure the details below are correct before submitting.</Text>
        </View>
      </View>

      <Section title="Business" icon="business">
        <Row k="Business name" v={form.businessName} />
        <Row k="Website" v={form.website || "�"} />
            <Row k="Locations" v={
              form.locations.length > 0 
                ? form.locations.map((loc, i) => `${loc.city}, ${loc.province}`).join(", ")
                : "�"
            } />
      </Section>

      <Section title="Owner & Contact" icon="person">
        <Row k="Owner" v={form.ownerName} />
        <Row k="Phone" v={form.ownerPhone} />
        <Row k="Email" v={form.ownerEmail} />
        {form.telephoneNumber && <Row k="Telephone" v={form.telephoneNumber} />}
        {form.contactNumber && <Row k="Contact Number" v={form.contactNumber} />}
      </Section>


      <Section title="Compliance" icon="shield-checkmark">
        <Row k="Permits" v={form.permitsReady ? "Yes" : "No"} />
        <Row k="Food safety" v={form.foodSafety ? "Yes" : "No"} />
        <Row k="Agreed to Terms" v={form.agreeTerms ? "Yes" : "No"} />
      </Section>

      <View style={styles.navButtons}>
        <SquareNavButton label="Back" variant="outline" onPress={back} icon="arrow-back" iconPosition="left" />
        <SquareNavButton
          label="Submit Application"
          onPress={() => {
            if (!canSubmit) {
              Alert.alert(
                "Review",
                "Please complete all required business, owner, and compliance details, including your DTI certificate."
              );
              return;
            }
            submit();
          }}
          icon="checkmark-circle"
          iconPosition="right"
          disabled={!canSubmit}
        />
      </View>
    </Card>
  );
}

// Step 5: Account Creation
function Step5Account({
  form,
  back,
  submit,
}: {
  form: PartnerForm;
  back: () => void;
  submit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState(form.ownerEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) {
      Alert.alert('Validation', 'Email is required.');
      return false;
    }
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Validation', 'Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await submit(email, password);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setLoading(false);
    }
  };

  const canCreateAccount =
    !!email.trim() &&
    email.includes('@') &&
    email.includes('.') &&
    password.length >= 6 &&
    password === confirmPassword &&
    !loading;

  return (
    <Card pad={32} style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepHeaderIcon}>
          <Ionicons name="person-add" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.stepHeaderText}>
          <Text style={styles.stepTitle}>Create Your Account</Text>
          <Text style={styles.stepSubtitle}>Set up your login credentials to complete the application.</Text>
        </View>
      </View>

      <Field
        label="Email *"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="your@email.com"
      />

      <View>
        <Label>Password *</Label>
        <View style={styles.passwordFieldWrapper}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={COLORS.textLight}
            style={styles.passwordInput}
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={COLORS.textLight}
            />
          </Pressable>
        </View>
      </View>

      <View>
        <Label>Confirm Password *</Label>
        <View style={styles.passwordFieldWrapper}>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder="Re-enter your password"
            placeholderTextColor={COLORS.textLight}
            style={styles.passwordInput}
          />
          <Pressable
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.passwordToggle}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={20}
              color={COLORS.textLight}
            />
          </Pressable>
        </View>
      </View>

      <View style={styles.passwordHint}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.textLight} />
        <Text style={styles.passwordHintText}>
          Your account will be created and your application will be submitted for admin approval.
        </Text>
      </View>

      <View style={styles.navButtons}>
        <SquareNavButton label="Back" variant="outline" onPress={back} icon="arrow-back" iconPosition="left" />
        <SquareNavButton
          label={loading ? "Creating Account..." : "Create Account & Submit"}
          onPress={handleSubmit}
          icon="checkmark-circle"
          iconPosition="right"
          disabled={!canCreateAccount}
        />
      </View>
    </Card>
  );
}

// Waiting for Admin Approval Component
function WaitingApproval({ onBack, onGoToDashboard }: { onBack: () => void; onGoToDashboard: () => void }) {
  return (
    <View style={styles.successContainer}>
      <Card pad={48} style={styles.successCard}>
        <View style={styles.successIconContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="hourglass-outline" size={64} color={COLORS.primary} />
          </View>
        </View>
        <Text style={styles.successTitle}>Application Submitted!</Text>
        <Text style={styles.successMessage}>
          Your account has been created and your partnership application has been submitted. Our team will review your application and you'll receive an email notification once it's been approved.
        </Text>
        <View style={styles.successInfo}>
          <View style={[styles.successInfoItem, { marginBottom: 12 }]}>
            <Ionicons name="mail" size={20} color={COLORS.primary} />
            <Text style={styles.successInfoText}>Check your email for confirmation</Text>
          </View>
          <View style={styles.successInfoItem}>
            <Ionicons name="time" size={20} color={COLORS.primary} />
            <Text style={styles.successInfoText}>Review time: 2-3 business days</Text>
          </View>
          <View style={styles.successInfoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={styles.successInfoText}>You're now logged in! Services are restricted until approval</Text>
          </View>
        </View>
        <View style={styles.successButtons}>
          <SquareNavButton
            label="Go to Dashboard"
            onPress={onGoToDashboard}
            icon="grid"
            iconPosition="left"
          />
          <SquareNavButton
            label="Back to Home"
            variant="outline"
            onPress={onBack}
            icon="home"
            iconPosition="left"
          />
        </View>
      </Card>
    </View>
  );
}

// Main Component
export default function PartnerApplicationScreen() {
  const navigation = useNavigation<any>();
  const { refreshUser, user, token } = useAuth();
  const [step, setStep] = useState<StepKey>("hero");
  const [form, setForm] = useState<PartnerForm>(EMPTY_PARTNER_FORM);

  const stepNumber = useMemo(() => {
    if (step === "hero") return 0;
    if (step === "waiting") return 6;
    const num = Number(step.replace("step", ""));
    // step6=1 (account), step1=2 (business), step2=3 (owner), step4=4 (compliance), step5=5 (review)
    if (num === 6) return 1; // account (step6) is now first
    if (num === 1) return 2; // business
    if (num === 2) return 3; // owner
    if (num === 4) return 4; // compliance
    if (num === 5) return 5; // review
    return num;
  }, [step]);

  useEffect(() => {
    const loadInitialData = async () => {
      // Load form data
      const formData = await loadForm();
      setForm(formData);
      
      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && !formData.ownerEmail) {
        // User is logged in but form doesn't have email, update it
        setForm((prev) => ({
          ...prev,
          ownerEmail: user.email || '',
        }));
      }
    };
    
    loadInitialData();
  }, []);

  useEffect(() => {
    if (step !== "hero" && step !== "waiting") {
      saveForm(form);
    }
  }, [form, step]);

  const go = (s: StepKey) => setStep(s);
  const next = () => {
    if (step === "hero") return setStep("step6"); // Start with Account Creation
    if (step === "step6") return setStep("step1"); // Account goes to Business
    if (step === "step1") return setStep("step2"); // Business goes to Owner
    if (step === "step2") return setStep("step4"); // Owner goes to Compliance
    if (step === "step4") return setStep("step5"); // Compliance goes to Review
    if (step === "step5") return setStep("waiting"); // Review submits and shows waiting screen
  };

  const back = () => {
    if (step === "hero") return;
    if (step === "step6") return setStep("hero"); // Account back to hero
    if (step === "step1") return setStep("step6"); // Business back to Account
    if (step === "step2") return setStep("step1"); // Owner back to Business
    if (step === "step4") return setStep("step2"); // Compliance back to Owner
    if (step === "step5") return setStep("step4"); // Review back to Compliance
    if (step === "waiting") return setStep("hero");
  };

  const handleAccountCreation = async (email: string, password: string) => {
    try {
      // Check if user is already logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser) {
        // User is already logged in, just update the form with their email
        const userEmail = currentUser.email || email;
        const formWithEmail = {
          ...form,
          ownerEmail: userEmail,
        };
        setForm(formWithEmail);
        
        // Refresh auth state
        await refreshUser();
        
        // Proceed to next step (Business Profile)
        next();
        return;
      }

      // User is not logged in, create the account
      try {
        const { register } = await import('../../services/api');
        const userProfile = await register(email, password, form.ownerName || 'Partner', 'CATER');
        
        if (!userProfile?.id) {
          throw new Error('Failed to get user ID after registration');
        }

        // Update form with email (saveForm will be called automatically by useEffect)
        const formWithEmail = {
          ...form,
          ownerEmail: email,
        };
        setForm(formWithEmail);
        
        // Refresh auth state to ensure user is logged in
        await refreshUser();
        
        // Proceed to next step (Business Profile)
        next();
      } catch (regError: any) {
        // If account already exists, try to sign in instead
        if (regError?.message?.includes('already registered') || regError?.message?.includes('User already registered')) {
          try {
            const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            
            if (loginError || !loginData.user) {
              throw new Error('Account exists but password is incorrect. Please use the correct password or reset it.');
            }
            
            // User successfully logged in, update form
            const formWithEmail = {
              ...form,
              ownerEmail: email,
            };
            setForm(formWithEmail);
            
            // Refresh auth state
            await refreshUser();
            
            // Proceed to next step
            next();
          } catch (loginErr: any) {
            console.error('Login error:', loginErr);
            Alert.alert(
              "Account Exists",
              "An account with this email already exists. Please log in with your password, or use a different email address."
            );
            throw loginErr;
          }
        } else {
          throw regError;
        }
      }
    } catch (error: any) {
      console.error('Account creation error:', error);
      const errorMessage = error?.message || 'Failed to create account. Please try again.';
      Alert.alert("Error", errorMessage);
      throw error;
    }
  };

  const canGoBack = navigation.canGoBack();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {canGoBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color="#6b7280" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <Container>
          {step === "hero" && <Hero onStart={() => setStep("step6")} />}
          {step !== "hero" && step !== "waiting" && (
            <View style={styles.stepperContainer}>
              <Stepper current={stepNumber} />
            </View>
          )}
          {step === "step1" && <Step1 form={form} setForm={setForm} back={back} next={next} />}
          {step === "step2" && <Step2 form={form} setForm={setForm} back={back} next={next} />}
          {step === "step4" && <Step3Compliance form={form} setForm={setForm} back={back} next={next} />}
          {step === "step5" && (
            <Step4Review 
              form={form} 
              back={back} 
              next={next} 
              submit={async () => {
                try {
                  // Get current user
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user?.id) {
                    Alert.alert("Error", "Please log in to submit your application.");
                    return;
                  }

                  // Upload any remaining temp files if they exist
                  const uploadedPaths: string[] = [];
                  if (form.tempFiles && form.tempFiles.length > 0) {
                    for (const tempFile of form.tempFiles) {
                      try {
                        // Generate unique file name with timestamp
                        const timestamp = Date.now();
                        const sanitizedFileName = tempFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
                        const storagePath = `${user.id}/${uniqueFileName}`;

                        // Read file as blob
                        let fileBlob: Blob;
                        if (Platform.OS === 'web') {
                          const response = await fetch(tempFile.uri);
                          fileBlob = await response.blob();
                        } else {
                          const response = await fetch(tempFile.uri);
                          fileBlob = await response.blob();
                        }

                        // Upload to Supabase Storage
                        const { error: uploadError } = await supabase.storage
                          .from('partner-documents')
                          .upload(storagePath, fileBlob, {
                            contentType: tempFile.mimeType || 'application/pdf',
                            upsert: false,
                          });

                        if (!uploadError && storagePath) {
                          uploadedPaths.push(storagePath);
                        }
                      } catch (error) {
                        console.error(`Error uploading ${tempFile.name}:`, error);
                      }
                    }
                  }

                  // Merge uploaded paths with any existing uploadedDocuments
                  const finalUploadedDocuments = [
                    ...(form.uploadedDocuments || []),
                    ...uploadedPaths,
                  ];
                  
                  // Update form with uploaded document paths
                  const formWithUploads = {
                    ...form,
                    uploadedDocuments: finalUploadedDocuments,
                    tempFiles: undefined,
                  };
                  
                  // Submit the application
                  await sendApplicationToRecruitment(formWithUploads, user.id);
                  
                  // Refresh auth state
                  await refreshUser();
                  
                  // Clear form and show waiting screen
                  await clearForm();
                  setForm(EMPTY_PARTNER_FORM);
                  setStep("waiting");
                } catch (error: any) {
                  console.error('Submission error:', error);
                  Alert.alert("Error", error?.message || 'Failed to submit application. Please try again.');
                }
              }} 
            />
          )}
          {step === "step6" && <Step5Account form={form} back={back} submit={handleAccountCreation} />}
          {step === "waiting" && (
            <WaitingApproval 
              onBack={() => {
                if (isWeb) {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Landing' }],
                  });
                } else {
                  setStep("hero");
                }
              }}
              onGoToDashboard={async () => {
                // Refresh auth state first
                await refreshUser();
                
                // For web, reload the page to trigger RootNav re-render
                // RootNav will automatically route to PartnerNav if user is authenticated with CATER role
                if (isWeb) {
                  window.location.href = '/';
                } else {
                  // For mobile, navigate to partner dashboard
                  navigation.navigate('PartnerDashboard');
                }
              }}
            />
          )}
        </Container>
      </ScrollView>

      {step !== "hero" && step !== "waiting" && (
        <View style={styles.footer}>
          <Container>
            <Card pad={16} style={styles.footerCard}>
              <View style={styles.footerContent}>
                <Ionicons name="help-circle" size={20} color={COLORS.primary} />
                <Text style={styles.footerText}>Need help? Contact us at support@caterhub.io</Text>
              </View>
            </Card>
          </Container>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  heroContainer: {
    paddingVertical: 60,
    position: 'relative',
    zIndex: 1,
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    opacity: 0.03,
    zIndex: 0,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    opacity: 0.05,
    zIndex: 0,
  },
  heroCard: {
    maxWidth: 700,
    alignSelf: 'center',
    backgroundColor: '#fff',
    position: 'relative',
    zIndex: 1,
  },
  heroContent: {
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  heroIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 17,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    maxWidth: 550,
  },
  heroBenefits: {
    width: '100%',
    marginBottom: 40,
  },
  heroBenefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroBenefitIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  heroBenefitContent: {
    flex: 1,
  },
  heroBenefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  heroBenefitDesc: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  heroButtonContainer: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  stepperContainer: {
    marginVertical: 24,
  },
  stepCard: {
    backgroundColor: '#fff',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  stepHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepHeaderText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    color: COLORS.textLight,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  addButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  locationCard: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  removeButton: {
    padding: 4,
  },
  mapPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  mapPinButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cuisineSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  selectedCountBadge: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  selectedCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cuisineLayout: {
    flexDirection: 'row',
    minHeight: 400,
  },
  cuisineCategoriesSidebar: {
    width: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    padding: 8,
    maxHeight: 500,
    marginRight: 16,
  },
  cuisineCategoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: COLORS.white,
  },
  cuisineCategoryButtonActive: {
    backgroundColor: COLORS.primary,
  },
  cuisineCategoryButtonHasSelection: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  cuisineCategoryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cuisineCategoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
    flex: 1,
  },
  cuisineCategoryButtonTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  cuisineCategoryButtonTextHasSelection: {
    color: COLORS.primary,
  },
  cuisineCategoryButtonBadge: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 6,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  cuisineCategoryButtonBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cuisineCategoryButtonBadgeText: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
  },
  cuisineCategoryButtonBadgeTextActive: {
    color: COLORS.white,
  },
  cuisineItemsPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    padding: 20,
    maxHeight: 500,
  },
  cuisineItemsPanelHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cuisineItemsPanelTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  cuisineItemsPanelSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  cuisineItemsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    backgroundColor: COLORS.bg,
  },
  cuisineItemsEmptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
    textAlign: 'center',
  },
  cuisineCategoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cuisineCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
  },
  cuisineCategoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cuisineCategoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cuisineCategoryIconSelected: {
    backgroundColor: COLORS.primary,
  },
  cuisineCategoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  cuisineCategoryNameSelected: {
    color: COLORS.primary,
  },
  cuisineCategoryCount: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  cuisineCategoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cuisineCategoryBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuisineCategoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  cuisineItemsExpanded: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cuisineItemsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cuisineItemsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  col: {
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  col1: {
    flex: 1,
    minWidth: 200,
  },
  col2: {
    flex: 2,
    minWidth: 260,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    marginHorizontal: -6,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginRight: 12,
    marginLeft: 6,
    marginBottom: 12,
    minHeight: 40,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '0F',
  },
  chipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipCheckboxActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },
  chipTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  navButtonSolid: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  navButtonDisabledSolid: {
    backgroundColor: COLORS.primary + '55',
    shadowOpacity: 0,
  },
  navButtonDisabledOutline: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  navButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  navButtonText: {
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  navButtonTextSolid: {
    color: '#fff',
  },
  navButtonTextOutline: {
    color: COLORS.text,
  },
  navButtonTextSolidDisabled: {
    color: '#fff',
    opacity: 0.75,
  },
  navButtonTextOutlineDisabled: {
    color: COLORS.textLight,
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    marginBottom: 24,
    justifyContent: 'center',
  },
  termsButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  toggle: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  toggleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '0F',
  },
  togglePressed: {
    opacity: 0.8,
  },
  toggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
    flex: 1,
  },
  toggleLabelActive: {
    color: COLORS.primary,
  },
  toggleContent: {
    marginTop: 12,
    paddingLeft: 32,
  },
  toggleDetail: {
    color: COLORS.textLight,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  toggleBullets: {
    marginTop: 4,
  },
  toggleBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  toggleBulletIcon: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 20,
    marginRight: 6,
  },
  toggleBulletText: {
    color: COLORS.textLight,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  reviewRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reviewKey: {
    width: 180,
    color: COLORS.textLight,
    fontWeight: '700',
    fontSize: 14,
  },
  reviewValue: {
    flex: 1,
  },
  reviewValueText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  reviewSection: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    backgroundColor: COLORS.bg,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  reviewSectionTitle: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 17,
  },
  successContainer: {
    paddingVertical: 80,
  },
  successCard: {
    maxWidth: 600,
    alignSelf: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  successMessage: {
    color: COLORS.textLight,
    marginBottom: 32,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 500,
  },
  successInfo: {
    width: '100%',
    marginBottom: 32,
  },
  successInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  successInfoText: {
    marginLeft: 12,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  successButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    paddingHorizontal: 18,
  },
  footerCard: {
    backgroundColor: '#fff',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    marginLeft: 10,
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
  fileUploadSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileUploadTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  fileUploadSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  filePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  filePickerButtonText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  filePickerButtonDisabled: {
    opacity: 0.6,
  },
  fileList: {
    marginTop: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  dtiFileItem: {
    borderColor: COLORS.primary + '33',
    backgroundColor: COLORS.bg,
  },
  fileItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  fileItemInfo: {
    flex: 1,
  },
  fileItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  fileItemSize: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  dtiBadge: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary + '20',
  },
  dtiBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fileRemoveButton: {
    padding: 4,
  },
  webMapNotice: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webMapNoticeText: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  webMapNoticeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  webMapNoticeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  passwordFieldWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  passwordInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    paddingRight: 45,
    fontSize: 14,
    width: '100%',
  },
  passwordToggle: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
    zIndex: 1,
  },
  passwordHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordHintText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
});

