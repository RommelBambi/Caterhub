import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";
import InteractiveMapPicker from "../../components/InteractiveMapPicker";
import { Dropdown } from "../../components/ui/Dropdown";
import { Field } from "../../components/ui/Field";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";
import { isWeb } from "../../utils/platform";
import { Platform } from "react-native";
import { supabase } from "../../services/supabase";
import { BusinessLocation } from "../../types/admin";
import { COUNTRIES, PROVINCES_PH, getCitiesByProvince } from "../../constants/locations";
import { COLORS } from "../../constants/colors";

const DTI_PREFIX = 'DTI::';

// Extra business profile data aside from what's in user
// We persist this separately so you can extend it later.
type CatererProfile = {
  contactNumber: string;
  email?: string;
  website?: string;
  address: string;
  about: string;
  facebook?: string;
  instagram?: string;
  profileImageUrl?: string;
  sampleImages?: string[]; // Array of sample image URLs
};

// Load profile data from Supabase
async function loadProfileFromSupabase(userId: string): Promise<CatererProfile | null> {
  try {
    const { data, error } = await supabase
      .from('caterer_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      contactNumber: data.contact_number || "",
      email: data.email || undefined,
      website: data.website || undefined,
      address: data.address || "",
      about: data.about || "",
      facebook: data.facebook || undefined,
      instagram: data.instagram || undefined,
      sampleImages: (data.sample_images as string[]) || undefined,
    };
  } catch (e) {
    console.warn("loadProfileFromSupabase error", e);
    return null;
  }
}

// Save profile data to Supabase
async function saveProfileToSupabase(userId: string, data: CatererProfile): Promise<void> {
  try {
    // Check if profile exists
    const { data: existing } = await supabase
      .from('caterer_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing profile
      const { error } = await supabase
        .from('caterer_profiles')
        .update({
          contact_number: data.contactNumber,
          email: data.email || null,
          website: data.website || null,
          address: data.address,
          about: data.about,
          facebook: data.facebook || null,
          instagram: data.instagram || null,
          sample_images: data.sampleImages || null,
        })
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      // Insert new profile
      const { error } = await supabase
        .from('caterer_profiles')
        .insert({
          user_id: userId,
          contact_number: data.contactNumber,
          email: data.email || null,
          website: data.website || null,
          address: data.address,
          about: data.about,
          facebook: data.facebook || null,
          instagram: data.instagram || null,
          sample_images: data.sampleImages || null,
        });

      if (error) throw error;
    }
  } catch (e) {
    console.error("saveProfileToSupabase error", e);
    throw e;
  }
}

export default function PartnerSettingsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user, logout, changePassword, refreshUser } = useAuth();

  // editable fields
  const [businessName, setBusinessName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [about, setAbout] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  // Owner information from partner_applications
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [telephoneNumber, setTelephoneNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Location/Branch management
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);

  // Document management
  type UploadedFile = {
    name: string;
    size: number;
    storagePath: string;
    isRemote: boolean;
    uploadedAt?: string; // ISO timestamp when file was uploaded
  };
  const [dtiFile, setDtiFile] = useState<UploadedFile | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dtiUploading, setDtiUploading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null); // Track when documents were last saved

  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'locations' | 'documents' | 'account'>('profile');

  // Change email state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [emailVerificationPassword, setEmailVerificationPassword] = useState("");
  const [emailPasswordError, setEmailPasswordError] = useState("");
  const [emailPasswordVerified, setEmailPasswordVerified] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [verifyingEmailPassword, setVerifyingEmailPassword] = useState(false);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [verifyingCurrentPassword, setVerifyingCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [updatingPassword, setUpdatingPassword] = useState(false);
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailVerificationPassword, setShowEmailVerificationPassword] = useState(false);

  // Delete account state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountPasswordError, setDeleteAccountPasswordError] = useState("");

  // Save confirmation and success modals
  const [showSaveConfirmationModal, setShowSaveConfirmationModal] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  
  // Locations/Documents save confirmation and success modals
  const [showLocationsSaveConfirmationModal, setShowLocationsSaveConfirmationModal] = useState(false);
  const [showLocationsSaveSuccessModal, setShowLocationsSaveSuccessModal] = useState(false);
  const [savingLocations, setSavingLocations] = useState(false);
  
  // Email and Password change success modals
  const [showEmailSuccessModal, setShowEmailSuccessModal] = useState(false);
  const [showPasswordSuccessModal, setShowPasswordSuccessModal] = useState(false);
  const [showDeleteAccountSuccessModal, setShowDeleteAccountSuccessModal] = useState(false);

  // Profile image state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // Sample images state
  const [sampleImages, setSampleImages] = useState<string[]>([]);
  const [uploadingSampleImage, setUploadingSampleImage] = useState(false);

  // Load current user + profile + application data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        navigation.replace("PartnerDashboard");
        return;
      }

      let isActive = true;

      (async () => {
        try {
          // Load profile data
          if (isActive) {
            setBusinessName(user.username || "");
            setEmail(user.email || "");
          }

          // Load profile from Supabase
          const prof = await loadProfileFromSupabase(user.id);
          if (isActive) {
            if (prof) {
              setContactNumber(prof.contactNumber ?? "");
              setEmail(prof.email ?? user.email ?? "");
              setWebsite(prof.website ?? "");
              setAddress(prof.address ?? "");
              setAbout(prof.about ?? "");
              setFacebook(prof.facebook ?? "");
              setInstagram(prof.instagram ?? "");
              setSampleImages(prof.sampleImages || []);
            } else {
              // Default values if no profile exists
              setContactNumber("");
              setWebsite("");
              setAddress("");
              setAbout("");
              setFacebook("");
              setInstagram("");
              setSampleImages([]);
            }
          }

          // Load profile image from Supabase users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('profile_image_url')
            .eq('id', user.id)
            .single();

          if (isActive) {
            if (userData && !userError && userData.profile_image_url) {
              setProfileImage(userData.profile_image_url);
            } else {
              setProfileImage(null);
            }
          }

          // Load partner application data from Supabase
          const { data: application, error } = await supabase
            .from('partner_applications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (isActive && application && !error) {
            // Load business name and owner information from partner_applications
            if (application.business_name) {
              setBusinessName(application.business_name);
            }
            if (application.owner_name) {
              setOwnerName(application.owner_name);
            }
            if (application.owner_phone) {
              setOwnerPhone(application.owner_phone);
            }
            if (application.owner_email) {
              setOwnerEmail(application.owner_email);
            }
            if (application.telephone_number) {
              setTelephoneNumber(application.telephone_number);
            }
            if (application.contact_number) {
              setContactNumber(application.contact_number);
            }

            // Track last save time for determining new vs old files
            setLastSavedAt(application.updated_at || application.created_at || null);

            // Load locations
            if (application.locations && Array.isArray(application.locations)) {
              setLocations(application.locations as BusinessLocation[]);
            }

            // Load documents
            if (application.uploaded_documents && Array.isArray(application.uploaded_documents)) {
              const docs = application.uploaded_documents;
              const dtiEntry = docs.find((doc: string) => doc?.startsWith(DTI_PREFIX));
              if (dtiEntry) {
                const storagePath = dtiEntry.slice(DTI_PREFIX.length);
                setDtiFile({
                  name: storagePath.split('/').pop() || 'DTI Document',
                  size: 0,
                  storagePath,
                  isRemote: true,
                  // Files loaded from database are old (previously uploaded)
                  uploadedAt: application.updated_at || application.created_at,
                });
              }
              const otherEntries = docs.filter((doc: string) => !doc?.startsWith(DTI_PREFIX));
              if (otherEntries.length) {
                setSupportingFiles(
                  otherEntries.map((storagePath: string) => ({
                    name: storagePath.split('/').pop() || 'Document',
                    size: 0,
                    storagePath,
                    isRemote: true,
                    // Files loaded from database are old (previously uploaded)
                    uploadedAt: application.updated_at || application.created_at,
                  }))
                );
              }
            }
          }

          if (isActive) {
            setLoaded(true);
          }
        } catch (error) {
          console.error('Error loading settings:', error);
          if (isActive) {
            setLoaded(true);
          }
        }
      })();

      return () => {
        isActive = false;
      };
    }, [user?.id])
  );

  // Location management functions
  const addLocation = () => {
    const newLocation: BusinessLocation = {
      id: Date.now().toString(),
      country: '',
      province: '',
      city: '',
      postalCode: '',
      address: '',
    };
    setLocations([...locations, newLocation]);
  };

  const updateLocation = (index: number, field: keyof BusinessLocation, value: any) => {
    setLocations(locations.map((loc, i) => (i === index ? { ...loc, [field]: value } : loc)));
  };

  const removeLocation = (index: number) => {
    Alert.alert(
      "Remove Location",
      "Are you sure you want to remove this location?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setLocations(locations.filter((_, i) => i !== index));
          }
        }
      ]
    );
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

  const getAvailableCities = (province: string) => {
    return getCitiesByProvince(province);
  };

  // Document management functions
  const deleteStorageFile = async (path?: string) => {
    if (!path) return;
    try {
      const { error } = await supabase.storage
        .from('partner-documents')
        .remove([path]);
      if (error) {
        console.error('Error deleting file from storage:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      throw error;
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

      let fileData: Blob | { uri: string; type: string; name: string };

      if (Platform.OS === 'web') {
        // Web: Use fetch().blob()
        const response = await fetch(fileUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        fileData = await response.blob();
      } else {
        // Mobile: Supabase storage accepts file objects with uri property
        fileData = {
          uri: fileUri,
          type: mimeType || 'application/pdf',
          name: fileName,
        } as any;
      }

      const { error } = await supabase.storage
        .from('partner-documents')
        .upload(storagePath, fileData as any, {
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
        copyToCacheDirectory: Platform.OS !== 'web',
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setDtiUploading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        Alert.alert('Authentication Required', 'Please log in to upload files.');
        setDtiUploading(false);
        return;
      }

      const file = result.assets[0];
      const storagePath = await uploadFileToStorage(
        file.uri,
        file.name,
        authUser.id,
        file.mimeType || undefined,
      );

      if (storagePath) {
        // Delete old DTI file if exists
        if (dtiFile?.storagePath) {
          await deleteStorageFile(dtiFile.storagePath);
        }
        const now = new Date().toISOString();
        setDtiFile({
          name: file.name,
          size: file.size || 0,
          storagePath,
          isRemote: false,
          uploadedAt: now, // Track upload time
        });
        await saveLocationsAndDocuments();
        // Update last saved time after saving
        setLastSavedAt(now);
      }
    } catch (error) {
      console.error('Error picking DTI document:', error);
      Alert.alert('Error', 'Failed to upload DTI certificate. Please try again.');
    } finally {
      setDtiUploading(false);
    }
  };

  const removeDtiFile = async () => {
    Alert.alert(
      "Remove DTI Document",
      "Are you sure you want to remove this DTI certificate?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (dtiFile?.storagePath) {
              await deleteStorageFile(dtiFile.storagePath);
            }
            setDtiFile(null);
            await saveLocationsAndDocuments();
          }
        }
      ]
    );
  };

  const pickSupportingDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
        copyToCacheDirectory: Platform.OS !== 'web',
      });

      if (!result.canceled && result.assets) {
        setUploading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          Alert.alert('Authentication Required', 'Please log in to upload files.');
          setUploading(false);
          return;
        }

        const newFiles: UploadedFile[] = [];
        const now = new Date().toISOString();
        for (const file of result.assets) {
          try {
            const storagePath = await uploadFileToStorage(
              file.uri,
              file.name,
              authUser.id,
              file.mimeType || undefined,
            );
            if (storagePath) {
              newFiles.push({
                name: file.name,
                size: file.size || 0,
                storagePath,
                isRemote: false,
                uploadedAt: now, // Track upload time
              });
            }
          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            Alert.alert('Upload Error', `Failed to upload ${file.name}. Please try again.`);
          }
        }

        setSupportingFiles([...supportingFiles, ...newFiles]);
        await saveLocationsAndDocuments();
        // Update last saved time after saving
        setLastSavedAt(now);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      setUploading(false);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeSupportingFile = async (index: number) => {
    const file = supportingFiles[index];
    Alert.alert(
      "Remove Document",
      `Are you sure you want to remove "${file.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            if (file.storagePath) {
              await deleteStorageFile(file.storagePath);
            }
            setSupportingFiles(supportingFiles.filter((_, i) => i !== index));
            await saveLocationsAndDocuments();
          }
        }
      ]
    );
  };

  // Save locations and documents to Supabase
  const saveLocationsAndDocuments = async () => {
    if (!user) return;

    try {
      // Get the most recent application (could be pending or approved)
      const { data: applications, error: queryError } = await supabase
        .from('partner_applications')
        .select('id, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (queryError) {
        console.error('Error fetching application:', queryError);
        throw queryError;
      }

      if (!applications || applications.length === 0) {
        // No application found - this shouldn't happen for a caterer, but handle gracefully
        console.warn('No partner application found for user');
        return;
      }

      const application = applications[0];

      // Build uploaded documents array (text[] format)
      const uploadedDocs: string[] = [];
      if (dtiFile?.storagePath) {
        uploadedDocs.push(`${DTI_PREFIX}${dtiFile.storagePath}`);
      }
      supportingFiles.forEach((file) => {
        if (file.storagePath) {
          uploadedDocs.push(file.storagePath);
        }
      });

      // Update partner application with locations (jsonb) and uploaded_documents (text[])
      const { error: updateError } = await supabase
        .from('partner_applications')
        .update({
          locations: locations as any, // JSONB format
          uploaded_documents: uploadedDocs, // text[] format
          updated_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (updateError) {
        console.error('Error updating application:', updateError);
        // Check if it's an RLS policy issue
        if (updateError.code === '42501' || updateError.message.includes('permission')) {
          console.warn('RLS policy may be blocking update. Application status:', application.status);
          Alert.alert(
            'Update Restricted',
            'Unable to update locations and documents. Please ensure you have the necessary permissions or contact support.'
          );
          return;
        }
        throw updateError;
      }
    } catch (error) {
      console.error('Error saving locations and documents:', error);
      throw error;
    }
  };

  // Show locations save confirmation modal
  const handleSaveLocationsClick = () => {
    if (!user) return;
    setShowLocationsSaveConfirmationModal(true);
  };

  // Confirm and save locations
  const confirmSaveLocations = async () => {
    if (!user) return;

    setShowLocationsSaveConfirmationModal(false);
    setSavingLocations(true);
    try {
      await saveLocationsAndDocuments();
      // Update last saved time after saving
      setLastSavedAt(new Date().toISOString());
      // Show success modal
      setShowLocationsSaveSuccessModal(true);
    } catch (error) {
      console.error("Error saving locations:", error);
      Alert.alert("Error", "Failed to save locations. Please try again.");
    } finally {
      setSavingLocations(false);
    }
  };

  // Helper function to determine if a file is new or old based on upload date
  const isFileNew = (file: UploadedFile): boolean => {
    if (!file.uploadedAt || !lastSavedAt) {
      // If no timestamps, consider remote files as old, new files as new
      return !file.isRemote;
    }
    // File is new if it was uploaded after the last save
    return new Date(file.uploadedAt) > new Date(lastSavedAt);
  };

  // Show save confirmation modal
  const handleSaveClick = () => {
    if (!user) return;

    if (!businessName.trim()) {
      Alert.alert(
        "Missing business name",
        "Please enter your catering business name."
      );
      return;
    }

    setShowSaveConfirmationModal(true);
  };

  // Confirm and save profile
  const confirmSaveProfile = async () => {
    if (!user) return;

    setShowSaveConfirmationModal(false);
    setSaving(true);
    try {
      // Save profile data to Supabase (caterer_profiles table)
      const newProfile: CatererProfile = {
        contactNumber: contactNumber.trim(),
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim(),
        about: about.trim(),
        facebook: facebook.trim() || undefined,
        instagram: instagram.trim() || undefined,
        sampleImages: sampleImages.length > 0 ? sampleImages : undefined
      };
      await saveProfileToSupabase(user.id, newProfile);

      // Save business name and owner information to partner_applications table
      const { data: applications, error: appError } = await supabase
        .from('partner_applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (appError) {
        console.error('Error fetching application:', appError);
        throw appError;
      }

      if (applications && applications.length > 0) {
        const { error: updateError } = await supabase
          .from('partner_applications')
          .update({
            business_name: businessName.trim(),
            owner_name: ownerName.trim() || null,
            owner_phone: ownerPhone.trim() || null,
            owner_email: ownerEmail.trim() || null,
            telephone_number: telephoneNumber.trim() || null,
            contact_number: contactNumber.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', applications[0].id);

        if (updateError) {
          console.error('Error updating partner application:', updateError);
          throw updateError;
        }
      }

      // Save locations and documents to Supabase
      await saveLocationsAndDocuments();

      // Show success modal
      setShowSaveSuccessModal(true);
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Verify password for email change
  const verifyEmailPassword = async () => {
    if (!emailVerificationPassword.trim()) {
      setEmailPasswordError("Password is required");
      return;
    }

    setVerifyingEmailPassword(true);
    setEmailPasswordError("");
    try {
      // Re-authenticate to verify password
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: emailVerificationPassword,
      });

      if (loginError || !loginData.session) {
        setEmailPasswordError("Incorrect password. Please try again.");
        setVerifyingEmailPassword(false);
        return;
      }

      setEmailPasswordVerified(true);
      setEmailPasswordError("");
    } catch (error: any) {
      setEmailPasswordError(error?.message || "Failed to verify password. Please try again.");
    } finally {
      setVerifyingEmailPassword(false);
    }
  };

  // Change email functions
  const validateEmail = () => {
    if (!newEmail.trim()) {
      setEmailError("Please enter a new email address.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    if (newEmail.trim() === user?.email) {
      setEmailError("New email must be different from current email.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleChangeEmail = async () => {
    if (!validateEmail()) return;

    setUpdatingEmail(true);
    try {
      // Call Supabase Edge Function to update email
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const { data, error } = await supabase.functions.invoke('update-email', {
        body: {
          newEmail: newEmail.trim(),
          password: emailVerificationPassword,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to update email. Please try again.');
      }

      if (data?.error) {
        console.error('Email update error:', data.error);
        let errorMessage = data.error || 'Failed to update email. Please try again.';
        
        // Handle specific error cases
        if (data.error.includes('already registered') || 
            data.error.includes('already exists') ||
            data.error.includes('already been registered')) {
          errorMessage = 'This email address is already in use. Please use a different email.';
        } else if (data.error.includes('Invalid password')) {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (data.error.includes('Invalid email')) {
          errorMessage = `Invalid email address: ${newEmail.trim()}. Please enter a valid email address.`;
        }
        
        throw new Error(errorMessage);
      }

      // Refresh user data
      refreshUser();

      // Reset form
      setNewEmail("");
      setShowChangeEmail(false);
      setEmailVerificationPassword("");
      setEmailPasswordError("");
      setEmailPasswordVerified(false);
      setShowEmailVerificationPassword(false);

      // Show success modal
      setShowEmailSuccessModal(true);
    } catch (error: any) {
      console.error('Email change error:', error);
      Alert.alert("Error", error?.message || "Failed to update email. Please try again.");
    } finally {
      setUpdatingEmail(false);
    }
  };

  // Verify current password before allowing new password
  const verifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setPasswordErrors({ ...passwordErrors, currentPassword: "Current password is required" });
      return;
    }

    setVerifyingCurrentPassword(true);
    setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
    try {
      // Re-authenticate to verify password
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (loginError || !loginData.session) {
        setPasswordErrors({ ...passwordErrors, currentPassword: "Incorrect password. Please try again." });
        setVerifyingCurrentPassword(false);
        return;
      }

      setCurrentPasswordVerified(true);
      setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
    } catch (error: any) {
      setPasswordErrors({ ...passwordErrors, currentPassword: error?.message || "Failed to verify password. Please try again." });
    } finally {
      setVerifyingCurrentPassword(false);
    }
  };

  // Change password functions
  const validatePassword = () => {
    const errors: {
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!newPassword) {
      errors.newPassword = "Enter a new password.";
    } else if (newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters.";
    }
    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your new password.";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
    setCurrentPasswordVerified(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChangePassword = async () => {
    if (!changePassword) return;
    if (!validatePassword()) return;

    setUpdatingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      resetPasswordForm();
      setShowChangePassword(false);
      
      // Show success modal
      setShowPasswordSuccessModal(true);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update password. Please try again.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Profile image functions
  const uploadImageToStorage = async (
    imageUri: string,
    userId: string,
    mimeType?: string
  ): Promise<string | null> => {
    try {
      // Refresh session before upload to fix "Invalid Refresh Token" error
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        // Try to refresh the session
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          throw new Error('Please log in again to upload images.');
        }
      }
      
      // Ensure we have a valid session
      if (!session) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          throw new Error('Please log in again to upload images.');
        }
      }

      const timestamp = Date.now();
      const uniqueFileName = `profile-${timestamp}.jpg`;
      const storagePath = `profiles/${userId}/${uniqueFileName}`;

      let imageData: Blob | { uri: string; type: string; name: string };

      if (Platform.OS === 'web') {
        // Web: Use fetch().blob()
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        imageData = await response.blob();
      } else {
        // Mobile: Supabase storage accepts file objects with uri property
        imageData = {
          uri: imageUri,
          type: mimeType || 'image/jpeg',
          name: uniqueFileName,
        } as any;
      }

      // Delete old profile image if exists
      if (profileImage) {
        try {
          // Extract path from URL - format: .../avatars/profiles/userId/filename
          const urlParts = profileImage.split('/');
          const bucketIndex = urlParts.findIndex(part => part === 'avatars');
          if (bucketIndex >= 0 && bucketIndex < urlParts.length - 1) {
            // Get path after bucket name
            const oldPath = urlParts.slice(bucketIndex + 1).join('/');
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (error) {
          console.warn('Error deleting old profile image:', error);
          // Don't fail the upload if deletion fails
        }
      }

      // Upload with upsert: true to allow overwriting existing files
      const { error, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(storagePath, imageData as any, {
          contentType: mimeType || 'image/jpeg',
          upsert: true, // Allow overwriting if file exists
        });

      if (error) {
        console.error('Upload error:', error);
        console.error('Upload error details:', JSON.stringify(error, null, 2));
        
        // Check if it's an RLS policy error
        if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
          throw new Error('Storage permission denied. Please check your storage bucket RLS policies. Users should be able to upload to their own profile folder.');
        }
        
        throw error;
      }

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const pickProfileImage = async () => {
    try {
      console.log('pickProfileImage called, Platform.OS:', Platform.OS);
      
      // Request permissions (not needed on web)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile image.');
          return;
        }
      }

      // On web, expo-image-picker should work, but we need to ensure it's properly configured
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any, // Use string format for web compatibility
        allowsEditing: Platform.OS === 'web' ? false : true, // Editing might not work well on web
        aspect: Platform.OS === 'web' ? undefined : [1, 1], // Aspect ratio might not work on web
        quality: 0.8,
        base64: false,
      });

      console.log('ImagePicker result:', result);

      if (result.canceled || !result.assets || result.assets.length === 0) {
        console.log('Image picker was canceled or no assets');
        return;
      }

      setUploadingImage(true);
      
      // Refresh session before upload to fix "Invalid Refresh Token" error
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn('Session error, trying to refresh:', sessionError);
      }
      
      // If no session, try to get user (this will refresh if needed)
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

      if (!authUser || userError) {
        Alert.alert(
          'Authentication Required', 
          'Your session has expired. Please log in again to upload images.'
        );
        setUploadingImage(false);
        return;
      }
      
      // If session is expired, try to refresh it
      if (!session && authUser) {
        console.log('No active session, refreshing...');
        // The getUser() call above should have refreshed the session
        // But we can also explicitly refresh if needed
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (!newSession) {
          Alert.alert(
            'Session Expired',
            'Please log in again to continue.'
          );
          setUploadingImage(false);
          return;
        }
      }

      const asset = result.assets[0];
      console.log('Selected asset:', { uri: asset.uri, mimeType: asset.mimeType, width: asset.width, height: asset.height });
      
      const imageUrl = await uploadImageToStorage(
        asset.uri,
        authUser.id,
        asset.mimeType || undefined
      );

      if (imageUrl) {
        setProfileImage(imageUrl);
        // Save to Supabase users table
        const { error: updateError } = await supabase
          .from('users')
          .update({ profile_image_url: imageUrl })
          .eq('id', authUser.id);

        if (updateError) {
          console.error('Error updating profile image URL:', updateError);
          Alert.alert("Error", "Failed to save profile image URL. Please try again.");
        } else {
          Alert.alert("Success", "Profile image updated successfully.");
        }
      }
    } catch (error: any) {
      console.error('Error picking profile image:', error);
      Alert.alert('Error', error?.message || 'Failed to upload profile image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    Alert.alert(
      "Remove Profile Image",
      "Are you sure you want to remove your profile image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              if (!profileImage) {
                Alert.alert("Error", "No profile image to remove.");
                return;
              }

              // Verify session
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              if (sessionError || !session) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                  Alert.alert("Error", "Please log in again to delete images.");
                  return;
                }
              }

              const currentUserId = session?.user?.id || user?.id;
              if (!currentUserId) {
                Alert.alert("Error", "User ID not found. Please log in again.");
                return;
              }

              // Extract path from URL - format: .../avatars/profiles/userId/filename
              let oldPath: string | null = null;
              
              console.log('[DELETE LOGO] Attempting to extract path from URL:', profileImage);
              console.log('[DELETE LOGO] Current user ID:', currentUserId);
              
              const urlParts = profileImage.split('/');
              const avatarsIndex = urlParts.findIndex(part => part === 'avatars');
              
              if (avatarsIndex >= 0 && avatarsIndex < urlParts.length - 1) {
                oldPath = urlParts.slice(avatarsIndex + 1).join('/');
                console.log('[DELETE LOGO] Extracted path:', oldPath);
              } else {
                // Try finding 'profiles' directly
                const profilesIndex = urlParts.findIndex(part => part === 'profiles');
                if (profilesIndex >= 0 && profilesIndex < urlParts.length - 1) {
                  oldPath = urlParts.slice(profilesIndex).join('/');
                  console.log('[DELETE LOGO] Extracted path (method 2):', oldPath);
                }
              }

              if (!oldPath) {
                console.error('[DELETE LOGO] Could not extract path from URL:', profileImage);
                Alert.alert("Error", `Could not determine file path from URL.\n\nPlease check the browser console for details.`);
                return;
              }

              // Remove query parameters
              oldPath = oldPath.split('?')[0].split('#')[0];
              console.log('[DELETE LOGO] Final path to delete:', oldPath);
              console.log('[DELETE LOGO] Expected pattern: profiles/' + currentUserId + '/%');

              // Delete from storage
              console.log('[DELETE LOGO] Calling supabase.storage.from("avatars").remove([...])');
              const { data: deleteData, error: deleteError } = await supabase.storage
                .from('avatars')
                .remove([oldPath]);

              if (deleteError) {
                console.error('[DELETE LOGO] Storage delete error:', deleteError);
                console.error('[DELETE LOGO] Delete error details:', JSON.stringify(deleteError, null, 2));
                console.error('[DELETE LOGO] Attempted path:', oldPath);
                
                const errorMessage = deleteError.message || '';
                const errorCode = (deleteError as any)?.code || '';
                
                if (errorMessage.includes('row-level security') || 
                    errorMessage.includes('RLS') ||
                    errorMessage.includes('permission') ||
                    errorCode === 'PGRST301' ||
                    errorCode === '42501') {
                  Alert.alert(
                    "Permission Denied", 
                    `Cannot delete logo. The file path may not match the RLS policy.\n\nPath: ${oldPath}\n\nExpected: profiles/${currentUserId}/%\n\nPlease check your Supabase storage RLS policies for DELETE operations on profiles folder.`
                  );
                  return;
                }
                
                if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
                  console.log('[DELETE LOGO] File not found, assuming already deleted');
                  // Continue to update database
                } else {
                  throw deleteError;
                }
              } else {
                console.log('[DELETE LOGO] File deleted successfully:', deleteData);
              }
              
              // Update database
              setProfileImage(null);
              const { error: updateError } = await supabase
                .from('users')
                .update({ profile_image_url: null })
                .eq('id', currentUserId);

              if (updateError) {
                console.error('[DELETE LOGO] Error removing profile image URL:', updateError);
                Alert.alert("Error", "Failed to remove profile image URL. Please try again.");
              } else {
                console.log('[DELETE LOGO] Database updated successfully');
                Alert.alert("Success", "Profile image removed successfully.");
              }
            } catch (error: any) {
              console.error('[DELETE LOGO] Error removing profile image:', error);
              console.error('[DELETE LOGO] Error stack:', error?.stack);
              const errorMessage = error?.message || 'Failed to remove profile image. Please try again.';
              Alert.alert("Error", errorMessage);
            }
          }
        }
      ]
    );
  };

  // Sample images functions
  const uploadSampleImageToStorage = async (
    imageUri: string,
    userId: string,
    mimeType?: string
  ): Promise<string | null> => {
    try {
      // Refresh session before upload to fix "Invalid Refresh Token" error
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        // Try to refresh the session
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          throw new Error('Please log in again to upload images.');
        }
      }
      
      // Ensure we have a valid session
      if (!session) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          throw new Error('Please log in again to upload images.');
        }
      }

      const timestamp = Date.now();
      const uniqueFileName = `sample-${timestamp}.jpg`;
      const storagePath = `sample-images/${userId}/${uniqueFileName}`;

      let imageData: Blob | { uri: string; type: string; name: string };

      if (Platform.OS === 'web') {
        // Web: Use fetch().blob()
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        imageData = await response.blob();
      } else {
        // Mobile: Supabase storage accepts file objects with uri property
        imageData = {
          uri: imageUri,
          type: mimeType || 'image/jpeg',
          name: uniqueFileName,
        } as any;
      }

      // Upload with upsert: false to prevent overwriting
      const { error, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(storagePath, imageData as any, {
          contentType: mimeType || 'image/jpeg',
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        console.error('Upload error:', error);
        console.error('Upload error details:', JSON.stringify(error, null, 2));
        
        // Check if it's an RLS policy error
        if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
          throw new Error('Storage permission denied. Please check your storage bucket RLS policies. Users should be able to upload to their own sample-images folder.');
        }
        
        throw error;
      }

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(storagePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading sample image:', error);
      throw error;
    }
  };

  const pickSampleImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      if (!user?.id) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      setUploadingSampleImage(true);
      const imageUrl = await uploadSampleImageToStorage(result.assets[0].uri, user.id);
      
      if (imageUrl) {
        const newSampleImages = [...sampleImages, imageUrl];
        setSampleImages(newSampleImages);
        
        console.log('Saving sample images to database:', newSampleImages);
        
        // Save to database
        const prof = await loadProfileFromSupabase(user.id);
        if (prof) {
          const updatedProfile = {
            ...prof,
            sampleImages: newSampleImages,
          };
          console.log('Updating profile with sample images:', updatedProfile);
          await saveProfileToSupabase(user.id, updatedProfile);
          
          // Verify it was saved
          const verifyProf = await loadProfileFromSupabase(user.id);
          console.log('Verified saved profile sample images:', verifyProf?.sampleImages);
        } else {
          // Create new profile if it doesn't exist
          await saveProfileToSupabase(user.id, {
            contactNumber: contactNumber || '',
            address: address || '',
            about: about || '',
            sampleImages: newSampleImages,
          });
        }
        
        Alert.alert("Success", "Sample image uploaded successfully.");
      }
    } catch (error: any) {
      console.error('Error picking sample image:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Provide more detailed error message
      let errorMessage = 'Failed to upload sample image. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }
      
      // Check for specific error types
      if (errorMessage.includes('row-level security') || errorMessage.includes('RLS')) {
        errorMessage = 'Storage permission denied. Please check your Supabase storage bucket RLS policies. You may need to run the FIX_STORAGE_SAMPLE_IMAGES_RLS.sql script.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        errorMessage = 'Permission denied. Please ensure your Supabase storage bucket allows uploads to the sample-images folder.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setUploadingSampleImage(false);
    }
  };

  const removeSampleImage = async (index: number) => {
    Alert.alert(
      "Remove Sample Image",
      "Are you sure you want to remove this sample image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const imageUrl = sampleImages[index];
              if (!imageUrl) {
                Alert.alert("Error", "Image URL not found.");
                return;
              }

              // Verify session and get user ID
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              if (sessionError || !session) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) {
                  Alert.alert("Error", "Please log in again to delete images.");
                  return;
                }
              }

              const currentUserId = session?.user?.id || user?.id;
              if (!currentUserId) {
                Alert.alert("Error", "User ID not found. Please log in again.");
                return;
              }

              // Extract path from URL - handle different URL formats
              let oldPath: string | null = null;
              
              console.log('[DELETE] Attempting to extract path from URL:', imageUrl);
              console.log('[DELETE] Current user ID:', currentUserId);
              
              const urlParts = imageUrl.split('/');
              const avatarsIndex = urlParts.findIndex(part => part === 'avatars');
              
              if (avatarsIndex >= 0 && avatarsIndex < urlParts.length - 1) {
                // Get path after 'avatars' - this is the storage path we need
                oldPath = urlParts.slice(avatarsIndex + 1).join('/');
                console.log('[DELETE] Extracted path (method 1):', oldPath);
              } else {
                // If URL doesn't contain 'avatars', check if it's already a relative path
                if (imageUrl.startsWith('sample-images/')) {
                  oldPath = imageUrl;
                  console.log('[DELETE] Using URL as direct path:', oldPath);
                } else {
                  // Try to find 'public' and get path after it
                  const publicIndex = urlParts.findIndex(part => part === 'public');
                  if (publicIndex >= 0 && publicIndex < urlParts.length - 1) {
                    // Skip 'public' and get everything after
                    oldPath = urlParts.slice(publicIndex + 1).join('/');
                    console.log('[DELETE] Extracted path (method 2):', oldPath);
                  }
                }
              }

              if (!oldPath) {
                console.error('[DELETE] Could not extract path from URL:', imageUrl);
                console.error('[DELETE] URL parts:', urlParts);
                Alert.alert("Error", `Could not determine file path from URL.\n\nURL: ${imageUrl.substring(0, 100)}...\n\nPlease check the browser console for details.`);
                return;
              }
              
              // Ensure the path doesn't have query parameters or fragments
              oldPath = oldPath.split('?')[0].split('#')[0];
              
              // Verify the path contains the user's ID (security check)
              if (!oldPath.includes(currentUserId)) {
                console.warn('[DELETE] Path does not contain user ID. Path:', oldPath, 'User ID:', currentUserId);
                // Still try to delete, but log the warning
              }
              
              console.log('[DELETE] Final path to delete:', oldPath);
              console.log('[DELETE] Expected pattern: sample-images/' + currentUserId + '/%');

              // Delete from storage
              console.log('[DELETE] Calling supabase.storage.from("avatars").remove([...])');
              const { data: deleteData, error: deleteError } = await supabase.storage
                .from('avatars')
                .remove([oldPath]);

              if (deleteError) {
                console.error('[DELETE] Storage delete error:', deleteError);
                console.error('[DELETE] Delete error details:', JSON.stringify(deleteError, null, 2));
                console.error('[DELETE] Attempted path:', oldPath);
                console.error('[DELETE] User ID:', currentUserId);
                console.error('[DELETE] Expected pattern: sample-images/' + currentUserId + '/%');
                
                // Check if it's an RLS policy error
                const errorMessage = deleteError.message || '';
                const errorCode = (deleteError as any)?.code || '';
                
                if (errorMessage.includes('row-level security') || 
                    errorMessage.includes('RLS') ||
                    errorMessage.includes('permission') ||
                    errorCode === 'PGRST301' ||
                    errorCode === '42501') {
                  Alert.alert(
                    "Permission Denied", 
                    `Cannot delete image. The file path may not match the RLS policy.\n\nPath: ${oldPath}\n\nExpected: sample-images/${currentUserId}/%\n\nPlease check your Supabase storage RLS policies.`
                  );
                  return;
                }
                
                // Check for file not found
                if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
                  // File might already be deleted, just update the UI
                  console.log('[DELETE] File not found, assuming already deleted');
                  const newSampleImages = sampleImages.filter((_, i) => i !== index);
                  setSampleImages(newSampleImages);
                  
                  // Save to database
                  const prof = await loadProfileFromSupabase(user?.id || '');
                  if (prof && user?.id) {
                    await saveProfileToSupabase(user.id, {
                      ...prof,
                      sampleImages: newSampleImages,
                    });
                  }
                  
                  Alert.alert("Success", "Sample image removed successfully.");
                  return;
                }
                
                throw deleteError;
              }
              
              console.log('[DELETE] File deleted successfully:', deleteData);
              
              // Update local state
              const newSampleImages = sampleImages.filter((_, i) => i !== index);
              setSampleImages(newSampleImages);
              
              // Save to database
              const prof = await loadProfileFromSupabase(user?.id || '');
              if (prof && user?.id) {
                await saveProfileToSupabase(user.id, {
                  ...prof,
                  sampleImages: newSampleImages,
                });
                console.log('[DELETE] Database updated successfully');
              }
              
              Alert.alert("Success", "Sample image removed successfully.");
            } catch (error: any) {
              console.error('[DELETE] Error removing sample image:', error);
              console.error('[DELETE] Error stack:', error?.stack);
              const errorMessage = error?.message || 'Failed to remove sample image. Please try again.';
              Alert.alert("Error", errorMessage);
            }
          }
        }
      ]
    );
  };

  // Delete account function
  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(true);
    setDeleteAccountPassword("");
    setDeleteAccountPasswordError("");
  };

  const validateDeleteAccountPassword = () => {
    if (!deleteAccountPassword.trim()) {
      setDeleteAccountPasswordError("Password is required to delete your account");
      return false;
    }
    setDeleteAccountPasswordError("");
    return true;
  };

  const confirmDeleteAccount = async () => {
    if (!validateDeleteAccountPassword()) return;

    setDeletingAccount(true);
    try {
      // Call Supabase Edge Function to delete account
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session. Please log in again.');
      }

      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {
          password: deleteAccountPassword,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to delete account. Please try again.');
      }

      if (data?.error) {
        console.error('Account deletion error:', data.error);
        let errorMessage = data.error || 'Failed to delete account. Please try again.';
        
        // Handle specific error cases
        if (data.error.includes('Invalid password')) {
          errorMessage = 'Incorrect password. Please try again.';
        }
        
        throw new Error(errorMessage);
      }

      // Close delete account modal
      setShowDeleteAccountModal(false);
      setDeleteAccountPassword('');
      setDeleteAccountPasswordError('');

      // Show success modal
      setShowDeleteAccountSuccessModal(true);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setDeleteAccountPasswordError(error?.message || "Failed to delete account. Please try again.");
      setDeletingAccount(false);
    }
  };

  async function handleLogout() {
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: "PartnerDashboard" }]
    });
  }

  if (!user) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: "#6b6b6b" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}

      <View style={styles.mainArea}>
        <TopBar title="Catering Profile" />

        {!loaded ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#FF8000" />
            <Text style={{ color: "#6b6b6b", marginTop: 12 }}>Loading settings…</Text>
          </View>
        ) : (
        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.pageHeaderRow}>
            <View style={styles.pageHeaderLeft}>
              <Text style={styles.pageTitle}>Settings</Text>
              <Text style={styles.pageSubTitle}>
                Manage your business profile and account settings
              </Text>
            </View>
            </View>

          {/* Tabs Navigation */}
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
              onPress={() => setActiveTab('profile')}
            >
              <Ionicons
                name={activeTab === 'profile' ? 'person' : 'person-outline'}
                size={18}
                color={activeTab === 'profile' ? COLORS.primary : COLORS.textLight}
              />
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
                Profile
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'locations' && styles.tabActive]}
              onPress={() => setActiveTab('locations')}
            >
              <Ionicons
                name={activeTab === 'locations' ? 'location' : 'location-outline'}
                size={18}
                color={activeTab === 'locations' ? COLORS.primary : COLORS.textLight}
              />
              <Text style={[styles.tabText, activeTab === 'locations' && styles.tabTextActive]}>
                Locations
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'documents' && styles.tabActive]}
              onPress={() => setActiveTab('documents')}
            >
              <Ionicons
                name={activeTab === 'documents' ? 'document-text' : 'document-text-outline'}
                size={18}
                color={activeTab === 'documents' ? COLORS.primary : COLORS.textLight}
              />
              <Text style={[styles.tabText, activeTab === 'documents' && styles.tabTextActive]}>
                Documents
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'account' && styles.tabActive]}
              onPress={() => setActiveTab('account')}
            >
              <Ionicons
                name={activeTab === 'account' ? 'settings' : 'settings-outline'}
                size={18}
                color={activeTab === 'account' ? COLORS.primary : COLORS.textLight}
              />
              <Text style={[styles.tabText, activeTab === 'account' && styles.tabTextActive]}>
                Account
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          {activeTab === 'profile' && (
            <>
              {/* Business Logo Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Business Logo</Text>
                <Text style={styles.cardSubtitle}>
                  Upload a logo for your business.
                </Text>

                <View style={styles.profileImageSection}>
                  <Pressable
                    onPress={pickProfileImage}
                    style={styles.profileImageContainer}
                    disabled={uploadingImage}
                  >
                    {profileImage ? (
                      <Image
                        source={{ uri: profileImage }}
                        style={styles.profileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.profileImagePlaceholder}>
                        <Ionicons name="camera" size={48} color={COLORS.textLight} />
                        <Text style={styles.profileImagePlaceholderText}>Tap to upload</Text>
                      </View>
                    )}
                    {uploadingImage && (
                      <View style={styles.profileImageOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={styles.profileImageOverlayText}>Uploading...</Text>
                      </View>
                    )}
                    {!uploadingImage && profileImage && (
                      <View style={styles.profileImageEditBadge}>
                        <Ionicons name="camera" size={16} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                  <View style={styles.profileImageActions}>
                    <Pressable
                      onPress={pickProfileImage}
                      style={[styles.imageActionButton, uploadingImage && styles.imageActionButtonDisabled]}
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <>
                          <ActivityIndicator size="small" color={COLORS.primary} />
                          <Text style={styles.imageActionButtonText}>Uploading...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name={profileImage ? "refresh" : "cloud-upload"} size={18} color={COLORS.primary} />
                          <Text style={styles.imageActionButtonText}>
                            {profileImage ? "Replace Image" : "Upload Image"}
                          </Text>
                        </>
                      )}
                    </Pressable>

                    {profileImage && (
                      <Pressable
                        onPress={removeProfileImage}
                        style={[styles.imageActionButton, styles.imageActionButtonDanger]}
                        disabled={uploadingImage}
                      >
                        <Ionicons name="trash" size={18} color={COLORS.danger || "#ef4444"} />
                        <Text style={[styles.imageActionButtonText, styles.imageActionButtonTextDanger]}>
                          Remove
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>

              {/* Sample Images Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sample Images</Text>
                <Text style={styles.cardSubtitle}>
                  Upload sample images of your catering work. These will appear in the image carousel on your service details page for customers to browse.
                </Text>

                <View style={styles.sampleImagesSection}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.sampleImagesScroll}
                    contentContainerStyle={styles.sampleImagesContainer}
                  >
                    {sampleImages.map((imageUrl, index) => (
                      <View key={index} style={styles.sampleImageWrapper}>
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.sampleImage}
                          resizeMode="cover"
                        />
                        <Pressable
                          style={styles.sampleImageRemoveButton}
                          onPress={() => removeSampleImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      style={styles.sampleImageAddButton}
                      onPress={pickSampleImage}
                      disabled={uploadingSampleImage}
                    >
                      {uploadingSampleImage ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <>
                          <Ionicons name="add" size={32} color={COLORS.primary} />
                          <Text style={styles.sampleImageAddText}>Add Image</Text>
                        </>
                      )}
                    </Pressable>
                  </ScrollView>
                </View>
              </View>

              {/* Business Information Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Business Information</Text>
                <Text style={styles.cardSubtitle}>
                  This information will be shown to customers when they view your catering service.
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Catering / Business Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sevilla's Catering"
              placeholderTextColor="#9ca3af"
              value={businessName}
              onChangeText={setBusinessName}
            />
                </View>

                <View style={styles.formGroup}>
            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 0917 123 4567"
              placeholderTextColor="#9ca3af"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
            />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Telephone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. (02) 1234-5678"
                    placeholderTextColor="#9ca3af"
                    value={telephoneNumber}
                    onChangeText={setTelephoneNumber}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. contact@yourcatering.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Website</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. www.yourcatering.com"
                    placeholderTextColor="#9ca3af"
                    value={website}
                    onChangeText={setWebsite}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
            <Text style={styles.label}>Address / Service Area</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Tayabas / Lucena / nearby areas"
              placeholderTextColor="#9ca3af"
              value={address}
              onChangeText={setAddress}
            />
                </View>

                <View style={styles.formGroup}>
            <Text style={styles.label}>About / Description</Text>
            <TextInput
              style={[styles.input, styles.aboutInput]}
              placeholder="Describe your specialties, capacity, style of service..."
              placeholderTextColor="#9ca3af"
              multiline
              value={about}
              onChangeText={setAbout}
            />
                </View>
              </View>

              {/* Owner Information Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Owner Information</Text>
                <Text style={styles.cardSubtitle}>
                  Information about the business owner or primary contact person.
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Owner Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Juan Dela Cruz"
                    placeholderTextColor="#9ca3af"
                    value={ownerName}
                    onChangeText={setOwnerName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Owner Phone *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 0917 123 4567"
                    placeholderTextColor="#9ca3af"
                    value={ownerPhone}
                    onChangeText={setOwnerPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Owner Email *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. owner@yourcatering.com"
                    placeholderTextColor="#9ca3af"
                    value={ownerEmail}
                    onChangeText={setOwnerEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Social Media Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Social Media</Text>
                <Text style={styles.cardSubtitle}>
                  Add your social media links to help customers find you online.
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Facebook</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. facebook.com/yourcatering"
                    placeholderTextColor="#9ca3af"
                    value={facebook}
                    onChangeText={setFacebook}
                    autoCapitalize="none"
                  />
          </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Instagram</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. instagram.com/yourcatering"
                    placeholderTextColor="#9ca3af"
                    value={instagram}
                    onChangeText={setInstagram}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Preview Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Preview for Customers</Text>
                <Text style={styles.cardSubtitle}>
                  This is how your business will appear to customers.
                </Text>
                <View style={styles.previewCard}>
            <View style={styles.previewHeaderRow}>
                    {profileImage ? (
                      <Image
                        source={{ uri: profileImage }}
                        style={styles.previewAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
              <View style={styles.previewAvatar}>
                <Text style={styles.previewAvatarText}>
                  {businessName
                    ? businessName.charAt(0).toUpperCase()
                    : "?"}
                </Text>
              </View>
                    )}
                    <View style={styles.previewHeaderInfo}>
                <Text style={styles.previewNameText}>
                  {businessName || "Your Catering"}
                </Text>
                      {contactNumber && (
                        <Text style={styles.previewMetaText}>📞 {contactNumber}</Text>
                      )}
                      {email && (
                        <Text style={styles.previewMetaText}>✉️ {email}</Text>
                      )}
                      {address && (
                        <Text style={styles.previewMetaText}>📍 {address}</Text>
                      )}
                      {website && (
                        <Text style={styles.previewMetaText}>🌐 {website}</Text>
                      )}
                    </View>
                  </View>

                  {about && (
                    <>
                      <View style={styles.previewDivider} />
                      <Text style={styles.previewAboutHeader}>About</Text>
                      <Text style={styles.previewAboutText}>{about}</Text>
                    </>
                  )}

                  {(facebook || instagram) && (
                    <>
                      <View style={styles.previewDivider} />
                      <View style={styles.previewSocialRow}>
                        {facebook && (
                          <Text style={styles.previewSocialText}>📘 Facebook</Text>
                        )}
                        {instagram && (
                          <Text style={styles.previewSocialText}>📷 Instagram</Text>
                        )}
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* Save Changes Button */}
              <Pressable
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSaveClick}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </Pressable>
            </>
          )}

          {activeTab === 'locations' && (
            <>
              {/* Location/Branch Management Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Business Locations / Branches</Text>
                <Text style={styles.cardSubtitle}>
                  Manage your business locations and branches. Add, update, or remove locations.
                </Text>

                {locations.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="location-outline" size={48} color={COLORS.textLight} />
                    <Text style={styles.emptyStateText}>No locations added yet</Text>
                    <Text style={styles.emptyStateSubtext}>Add your first business location to get started</Text>
              </View>
                ) : (
                  locations.map((location, index) => (
                  <View key={location.id} style={styles.locationCard}>
                    <View style={styles.locationHeader}>
                      <Text style={styles.locationTitle}>Location {index + 1}</Text>
                      {locations.length > 1 && (
                        <Pressable onPress={() => removeLocation(index)} style={styles.removeButton}>
                          <Ionicons name="trash" size={18} color={COLORS.danger || "#ef4444"} />
                        </Pressable>
                      )}
            </View>

                    <View style={styles.formGroup}>
                      <Dropdown
                        label="Country *"
                        value={location.country}
                        options={COUNTRIES}
                        onSelect={(value) => updateLocation(index, 'country', value)}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Dropdown
                        label="Province *"
                        value={location.province}
                        options={PROVINCES_PH}
                        onSelect={(value) => {
                          updateLocation(index, 'province', value);
                          updateLocation(index, 'city', '');
                        }}
                        searchable
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Dropdown
                        label="City *"
                        value={location.city}
                        options={getAvailableCities(location.province)}
                        onSelect={(value) => updateLocation(index, 'city', value)}
                        searchable
                        placeholder={!location.province ? "Select province first" : "Select city"}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Field
                        label="Postal Code *"
                        value={location.postalCode}
                        onChangeText={(value) => updateLocation(index, 'postalCode', value)}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Field
                        label="Address *"
                        value={location.address}
                        onChangeText={(value) => updateLocation(index, 'address', value)}
                        multiline
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Field
                        label="Service Radius (km)"
                        value={location.serviceRadiusKm !== undefined ? String(location.serviceRadiusKm) : ''}
                        onChangeText={(value) => {
                          const n = parseFloat(value);
                          updateLocation(index, 'serviceRadiusKm', Number.isFinite(n) ? n : undefined);
                        }}
                        keyboardType="numeric"
                        placeholder="e.g., 10"
                      />
                    </View>

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
                  ))
                )}

                <Pressable onPress={addLocation} style={styles.addButton}>
                  <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                  <Text style={styles.addButtonText}>Add Another Location / Branch</Text>
                </Pressable>

                <Pressable
                  style={[styles.saveBtn, savingLocations && styles.saveBtnDisabled]}
                  onPress={handleSaveLocationsClick}
                  disabled={savingLocations}
                >
                  <Text style={styles.saveBtnText}>
                    {savingLocations ? "Saving..." : "Save Locations"}
            </Text>
                </Pressable>
          </View>
            </>
          )}

          {activeTab === 'documents' && (
            <>
              {/* Documents Management Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Documents</Text>
                <Text style={styles.cardSubtitle}>
                  Manage your business documents. Upload, update, or remove DTI/SEC and supporting documents.
                </Text>

                {/* DTI/SEC Document */}
                <View style={styles.documentSection}>
                  <View style={styles.documentHeader}>
                    <Ionicons name="document-text" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.documentTitle}>DTI / SEC Registration (Required)</Text>
                  </View>
                  <Text style={styles.documentSubtitle}>
                    Upload your DTI or SEC certificate (PDF or images). This is required.
                  </Text>

                  {dtiFile && (
                    <View style={styles.fileItem}>
                      <View style={styles.fileItemLeft}>
                        <Ionicons name="document" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
                        <View style={styles.fileItemInfo}>
                          <Text style={styles.fileItemName} numberOfLines={1}>{dtiFile.name}</Text>
                          <View style={styles.fileItemMeta}>
                            <Text style={styles.fileItemSize}>
                              {dtiFile.size > 0 ? `${(dtiFile.size / 1024).toFixed(1)} KB` : 'Uploaded'}
                            </Text>
                            {isFileNew(dtiFile) ? (
                              <View style={[styles.fileStatusBadge, styles.fileStatusBadgeNew]}>
                                <Ionicons name="add-circle" size={12} color={COLORS.primary} />
                                <Text style={[styles.fileStatusBadgeText, styles.fileStatusBadgeTextNew]}>New</Text>
                              </View>
                            ) : (
                              <View style={styles.fileStatusBadge}>
                                <Ionicons name="checkmark-circle" size={12} color={COLORS.success || "#22c55e"} />
                                <Text style={styles.fileStatusBadgeText}>Previously Uploaded</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <View style={styles.dtiBadge}>
                        <Text style={styles.dtiBadgeText}>Required</Text>
                      </View>
                      <Pressable onPress={removeDtiFile} style={styles.fileRemoveButton} disabled={dtiUploading}>
                        <Ionicons name="trash" size={18} color={COLORS.danger || "#ef4444"} />
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
                        <ActivityIndicator size="small" color={COLORS.primary} />
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

                {/* Supporting Documents */}
                <View style={styles.documentSection}>
                  <View style={styles.documentHeader}>
                    <Text style={styles.documentTitle}>Supporting Documents (Optional)</Text>
                  </View>
                  <Text style={styles.documentSubtitle}>
                    Upload permits, certificates, or other supporting documents (PDF or images).
                  </Text>

                  {supportingFiles.length === 0 ? (
                    <View style={styles.emptyFilesState}>
                      <Ionicons name="document-outline" size={32} color={COLORS.textLight} />
                      <Text style={styles.emptyFilesText}>No supporting documents uploaded yet</Text>
                      <Text style={styles.emptyFilesSubtext}>Upload permits, certificates, or other supporting documents</Text>
                    </View>
                  ) : (
                    supportingFiles.map((file, index) => (
                      <View key={index} style={styles.fileItem}>
                        <View style={styles.fileItemLeft}>
                          <Ionicons name="document" size={20} color={COLORS.primary} style={{ marginRight: 10 }} />
                          <View style={styles.fileItemInfo}>
                            <Text style={styles.fileItemName} numberOfLines={1}>{file.name}</Text>
                            <View style={styles.fileItemMeta}>
                              <Text style={styles.fileItemSize}>
                                {file.size > 0 ? `${(file.size / 1024).toFixed(1)} KB` : 'Uploaded'}
                              </Text>
                              {isFileNew(file) ? (
                                <View style={[styles.fileStatusBadge, styles.fileStatusBadgeNew]}>
                                  <Ionicons name="add-circle" size={12} color={COLORS.primary} />
                                  <Text style={[styles.fileStatusBadgeText, styles.fileStatusBadgeTextNew]}>New</Text>
                                </View>
                              ) : (
                                <View style={styles.fileStatusBadge}>
                                  <Ionicons name="checkmark-circle" size={12} color={COLORS.success || "#22c55e"} />
                                  <Text style={styles.fileStatusBadgeText}>Previously Uploaded</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        <Pressable onPress={() => removeSupportingFile(index)} style={styles.fileRemoveButton} disabled={uploading}>
                          <Ionicons name="trash" size={18} color={COLORS.danger || "#ef4444"} />
                        </Pressable>
                      </View>
                    ))
                  )}

                  <Pressable
                    onPress={pickSupportingDocuments}
                    style={[
                      styles.filePickerButton,
                      uploading && styles.filePickerButtonDisabled,
                    ]}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={styles.filePickerButtonText}>Uploading...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={20} color={COLORS.primary} />
                        <Text style={styles.filePickerButtonText}>Upload Supporting Documents</Text>
                      </>
                    )}
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.saveBtn, savingLocations && styles.saveBtnDisabled]}
                  onPress={handleSaveLocationsClick}
                  disabled={savingLocations}
                >
                  <Text style={styles.saveBtnText}>
                    {savingLocations ? "Saving..." : "Save Documents"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {activeTab === 'account' && (
            <>
              {/* Account Settings Card */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Account Settings</Text>
                
                <View style={styles.accountInfoRow}>
                  <View style={styles.accountInfoLeft}>
                    <Text style={styles.accountInfoLabel}>Email</Text>
                    <Text style={styles.accountInfoValue}>{user.email || "Not set"}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setShowChangeEmail(!showChangeEmail);
                      setShowChangePassword(false);
                      setNewEmail("");
                      setEmailError("");
                      setEmailVerificationPassword("");
                      setEmailPasswordError("");
                      setEmailPasswordVerified(false);
                      setShowEmailVerificationPassword(false);
                    }}
                    style={styles.changeButton}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    <Text style={styles.changeButtonText}>
                      {showChangeEmail ? "Cancel" : "Change"}
                    </Text>
                  </Pressable>
                </View>

                {showChangeEmail && (
                  <View style={styles.changeForm}>
                    {!emailPasswordVerified ? (
                      <>
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Verify Password *</Text>
                          <Text style={styles.labelSubtext}>
                            Please enter your current password to verify your identity
                          </Text>
                          <View style={styles.passwordInputContainer}>
                            <TextInput
                              style={[styles.passwordInput, emailPasswordError && styles.inputError]}
                              placeholder="Enter your current password"
                              placeholderTextColor="#9ca3af"
                              value={emailVerificationPassword}
                              onChangeText={(text) => {
                                setEmailVerificationPassword(text);
                                setEmailPasswordError("");
                              }}
                              secureTextEntry={!showEmailVerificationPassword}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                            <Pressable
                              style={styles.passwordToggle}
                              onPress={() => setShowEmailVerificationPassword(!showEmailVerificationPassword)}
                            >
                              <Ionicons
                                name={showEmailVerificationPassword ? 'eye' : 'eye-off'}
                                size={20}
                                color={COLORS.textLight}
                              />
                            </Pressable>
                          </View>
                          {emailPasswordError ? (
                            <Text style={styles.errorText}>{emailPasswordError}</Text>
                          ) : null}
                        </View>
                        <Pressable
                          style={[styles.saveBtn, verifyingEmailPassword && styles.saveBtnDisabled]}
                          onPress={verifyEmailPassword}
                          disabled={verifyingEmailPassword}
                        >
                          <Text style={styles.saveBtnText}>
                            {verifyingEmailPassword ? "Verifying..." : "Verify Password"}
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>New Email Address *</Text>
                          <TextInput
                            style={[styles.input, emailError && styles.inputError]}
                            placeholder="Enter new email address"
                            placeholderTextColor="#9ca3af"
                            value={newEmail}
                            onChangeText={(text) => {
                              setNewEmail(text);
                              setEmailError("");
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          {emailError ? (
                            <Text style={styles.errorText}>{emailError}</Text>
                          ) : null}
                        </View>
                        <Pressable
                          style={[styles.saveBtn, updatingEmail && styles.saveBtnDisabled]}
                          onPress={handleChangeEmail}
                          disabled={updatingEmail}
                        >
                          <Text style={styles.saveBtnText}>
                            {updatingEmail ? "Updating..." : "Update Email"}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}

                <View style={styles.accountInfoRow}>
                  <View style={styles.accountInfoLeft}>
                    <Text style={styles.accountInfoLabel}>Password</Text>
                    <Text style={styles.accountInfoValue}>••••••••</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setShowChangePassword(!showChangePassword);
                      setShowChangeEmail(false);
                      resetPasswordForm();
                    }}
                    style={styles.changeButton}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    <Text style={styles.changeButtonText}>
                      {showChangePassword ? "Cancel" : "Change"}
                    </Text>
                  </Pressable>
                </View>

                {showChangePassword && (
                  <View style={styles.changeForm}>
                    {!currentPasswordVerified ? (
                      <>
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Current Password *</Text>
                          <Text style={styles.labelSubtext}>
                            Please enter your current password to verify your identity
                          </Text>
                          <View style={styles.passwordInputContainer}>
                            <TextInput
                              style={[styles.passwordInput, passwordErrors.currentPassword && styles.inputError]}
                              placeholder="Enter current password"
                              placeholderTextColor="#9ca3af"
                              value={currentPassword}
                              onChangeText={(text) => {
                                setCurrentPassword(text);
                                setPasswordErrors({ ...passwordErrors, currentPassword: undefined });
                              }}
                              secureTextEntry={!showCurrentPassword}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                            <Pressable
                              style={styles.passwordToggle}
                              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              <Ionicons
                                name={showCurrentPassword ? 'eye' : 'eye-off'}
                                size={20}
                                color={COLORS.textLight}
                              />
                            </Pressable>
                          </View>
                          {passwordErrors.currentPassword ? (
                            <Text style={styles.errorText}>{passwordErrors.currentPassword}</Text>
                          ) : null}
                        </View>
                        <Pressable
                          style={[styles.saveBtn, verifyingCurrentPassword && styles.saveBtnDisabled]}
                          onPress={verifyCurrentPassword}
                          disabled={verifyingCurrentPassword}
                        >
                          <Text style={styles.saveBtnText}>
                            {verifyingCurrentPassword ? "Verifying..." : "Verify Password"}
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.success || "#22c55e"} />
                          <Text style={styles.verifiedText}>Password verified</Text>
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>New Password *</Text>
                          <View style={styles.passwordInputContainer}>
                            <TextInput
                              style={[styles.passwordInput, passwordErrors.newPassword && styles.inputError]}
                              placeholder="Enter new password (min. 8 characters)"
                              placeholderTextColor="#9ca3af"
                              value={newPassword}
                              onChangeText={(text) => {
                                setNewPassword(text);
                                setPasswordErrors({ ...passwordErrors, newPassword: undefined });
                              }}
                              secureTextEntry={!showNewPassword}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                            <Pressable
                              style={styles.passwordToggle}
                              onPress={() => setShowNewPassword(!showNewPassword)}
                            >
                              <Ionicons
                                name={showNewPassword ? 'eye' : 'eye-off'}
                                size={20}
                                color={COLORS.textLight}
                              />
                            </Pressable>
                          </View>
                          {passwordErrors.newPassword ? (
                            <Text style={styles.errorText}>{passwordErrors.newPassword}</Text>
                          ) : null}
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Confirm New Password *</Text>
                          <View style={styles.passwordInputContainer}>
                            <TextInput
                              style={[styles.passwordInput, passwordErrors.confirmPassword && styles.inputError]}
                              placeholder="Confirm new password"
                              placeholderTextColor="#9ca3af"
                              value={confirmPassword}
                              onChangeText={(text) => {
                                setConfirmPassword(text);
                                setPasswordErrors({ ...passwordErrors, confirmPassword: undefined });
                              }}
                              secureTextEntry={!showConfirmPassword}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                            <Pressable
                              style={styles.passwordToggle}
                              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              <Ionicons
                                name={showConfirmPassword ? 'eye' : 'eye-off'}
                                size={20}
                                color={COLORS.textLight}
                              />
                            </Pressable>
                          </View>
                          {passwordErrors.confirmPassword ? (
                            <Text style={styles.errorText}>{passwordErrors.confirmPassword}</Text>
                          ) : null}
                        </View>

                        <Pressable
                          style={[styles.saveBtn, updatingPassword && styles.saveBtnDisabled]}
                          onPress={handleChangePassword}
                          disabled={updatingPassword}
                        >
                          <Text style={styles.saveBtnText}>
                            {updatingPassword ? "Updating..." : "Update Password"}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}

                <View style={styles.accountInfoRow}>
                  <View style={styles.accountInfoLeft}>
                    <Text style={styles.accountInfoLabel}>Account Status</Text>
                    <Text style={[styles.accountInfoValue, styles.accountStatusActive]}>
                      {user.role === "CATER" ? "✓ Verified" : "Pending Verification"}
                    </Text>
                  </View>
                </View>

                {!isWeb && (
                  <>
                    <View style={styles.logoutSection}>
                      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                        <Text style={styles.logoutBtnText}>Log Out</Text>
                      </Pressable>
                    </View>

                    {/* Separator */}
                    <View style={styles.dangerZoneSeparator} />
                  </>
                )}

                {isWeb && (
                  <View style={styles.dangerZoneSeparator} />
                )}

                <View style={styles.deleteAccountSection}>
                  <View style={styles.deleteAccountHeader}>
                    <View style={styles.deleteAccountIconContainer}>
                      <Ionicons name="warning" size={24} color={COLORS.danger || "#ef4444"} />
                    </View>
                    <View style={styles.deleteAccountHeaderText}>
                      <Text style={styles.deleteAccountTitle}>Danger Zone</Text>
                      <Text style={styles.deleteAccountWarning}>
                        Once you delete your account, there is no going back. All your data, including bookings, packages, and documents, will be permanently deleted.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.deleteAccountBtn, deletingAccount && styles.deleteAccountBtnDisabled]}
                    onPress={handleDeleteAccount}
                    disabled={deletingAccount}
                  >
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.deleteAccountBtnText}>Delete My Account</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </ScrollView>
        )}
      </View>
      {!isWeb && <BottomNav />}

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!deletingAccount) {
            setShowDeleteAccountModal(false);
            setDeleteAccountPassword("");
            setDeleteAccountPasswordError("");
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <Pressable
                onPress={() => {
                  if (!deletingAccount) {
                    setShowDeleteAccountModal(false);
                    setDeleteAccountPassword("");
                    setDeleteAccountPasswordError("");
                  }
                }}
                style={styles.modalCloseButton}
                disabled={deletingAccount}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <Text style={styles.modalWarning}>
              ⚠️ This action cannot be undone. All your data will be permanently deleted.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Enter Password to Confirm *</Text>
              <Text style={styles.labelSubtext}>
                Please enter your password to confirm account deletion
              </Text>
              <TextInput
                style={[styles.input, deleteAccountPasswordError && styles.inputError]}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={deleteAccountPassword}
                onChangeText={(text) => {
                  setDeleteAccountPassword(text);
                  setDeleteAccountPasswordError("");
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!deletingAccount}
              />
              {deleteAccountPasswordError ? (
                <Text style={styles.errorText}>{deleteAccountPasswordError}</Text>
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalCancelButton]}
                onPress={() => {
                  if (!deletingAccount) {
                    setShowDeleteAccountModal(false);
                    setDeleteAccountPassword("");
                    setDeleteAccountPasswordError("");
                  }
                }}
                disabled={deletingAccount}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalDeleteButton, deletingAccount && styles.modalDeleteButtonDisabled]}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.modalDeleteButtonText}>Deleting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="trash" size={18} color="#fff" />
                    <Text style={styles.modalDeleteButtonText}>Delete Account</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Confirmation Modal */}
      <Modal
        visible={showSaveConfirmationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!saving) {
            setShowSaveConfirmationModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Changes</Text>
              <Pressable
                onPress={() => {
                  if (!saving) {
                    setShowSaveConfirmationModal(false);
                  }
                }}
                style={styles.modalCloseButton}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <Text style={styles.modalWarning}>
              Are you sure you want to save these changes? This will update your business profile information.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalCancelButton]}
                onPress={() => {
                  if (!saving) {
                    setShowSaveConfirmationModal(false);
                  }
                }}
                disabled={saving}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
                onPress={confirmSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.modalSaveButtonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Success Modal */}
      <Modal
        visible={showSaveSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSaveSuccessModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success || "#22c55e"} />
              </View>
            </View>

            <Text style={styles.successTitle}>Changes Saved Successfully!</Text>
            <Text style={styles.successMessage}>
              Your profile has been updated successfully. All changes have been saved.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalSuccessButton]}
                onPress={() => {
                  setShowSaveSuccessModal(false);
                }}
              >
                <Text style={styles.modalSuccessButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Locations/Documents Save Confirmation Modal */}
      <Modal
        visible={showLocationsSaveConfirmationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!savingLocations) {
            setShowLocationsSaveConfirmationModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Changes</Text>
              <Pressable
                onPress={() => {
                  if (!savingLocations) {
                    setShowLocationsSaveConfirmationModal(false);
                  }
                }}
                style={styles.modalCloseButton}
                disabled={savingLocations}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <Text style={styles.modalWarning}>
              Are you sure you want to save these changes? This will update your business locations and documents.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalCancelButton]}
                onPress={() => {
                  if (!savingLocations) {
                    setShowLocationsSaveConfirmationModal(false);
                  }
                }}
                disabled={savingLocations}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveButton, savingLocations && styles.modalSaveButtonDisabled]}
                onPress={confirmSaveLocations}
                disabled={savingLocations}
              >
                {savingLocations ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.modalSaveButtonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Locations/Documents Save Success Modal */}
      <Modal
        visible={showLocationsSaveSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowLocationsSaveSuccessModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success || "#22c55e"} />
              </View>
            </View>

            <Text style={styles.successTitle}>Changes Saved Successfully!</Text>
            <Text style={styles.successMessage}>
              Your business locations and documents have been updated successfully. All changes have been saved.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalSuccessButton]}
                onPress={() => {
                  setShowLocationsSaveSuccessModal(false);
                }}
              >
                <Text style={styles.modalSuccessButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Change Success Modal */}
      <Modal
        visible={showEmailSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowEmailSuccessModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success || "#22c55e"} />
              </View>
            </View>

            <Text style={styles.successTitle}>Email Updated Successfully!</Text>
            <Text style={styles.successMessage}>
              Your email address has been updated successfully.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalSuccessButton]}
                onPress={() => {
                  setShowEmailSuccessModal(false);
                }}
              >
                <Text style={styles.modalSuccessButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Change Success Modal */}
      <Modal
        visible={showPasswordSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordSuccessModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success || "#22c55e"} />
              </View>
            </View>

            <Text style={styles.successTitle}>Password Updated Successfully!</Text>
            <Text style={styles.successMessage}>
              Your password has been updated successfully. Please use your new password to sign in next time.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalSuccessButton]}
                onPress={() => {
                  setShowPasswordSuccessModal(false);
                }}
              >
                <Text style={styles.modalSuccessButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Success Modal */}
      <Modal
        visible={showDeleteAccountSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // Don't allow closing without navigating
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success || "#22c55e"} />
              </View>
            </View>

            <Text style={styles.successTitle}>Account Deleted Successfully!</Text>
            <Text style={styles.successMessage}>
              Your account has been permanently deleted. You will be signed out and redirected to the login screen.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalSuccessButton]}
                onPress={async () => {
                  setShowDeleteAccountSuccessModal(false);
                  // Sign out and clear local data
                  await logout();
                  // Navigate to login
                  if (isWeb) {
                    window.location.href = '/';
                  } else {
                    // Navigate to login screen
                    navigation.getParent()?.reset({
                      index: 0,
                      routes: [{ name: 'Auth' as any }],
                    });
                  }
                }}
              >
                <Text style={styles.modalSuccessButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Map Picker Modal (Mobile only) */}
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
            locations[editingLocationIndex]?.latitude &&
            locations[editingLocationIndex]?.longitude
              ? {
                  latitude: locations[editingLocationIndex].latitude!,
                  longitude: locations[editingLocationIndex].longitude!,
                  address: locations[editingLocationIndex].address,
                }
              : undefined
          }
        />
      )}
    </View>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    backgroundColor: "#f9fafb"
  },
  mainArea: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },

  scrollRegion: {
    flex: 1
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: Platform.OS === 'web' ? 80 : 100
  },

  loadingWrap: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },

  pageHeaderRow: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24
  },
  pageHeaderLeft: {
    flex: 1
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8
  },
  pageSubTitle: {
    color: "#6b7280",
    fontSize: Platform.OS === 'web' ? 14 : 13,
    lineHeight: 20
  },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    padding: Platform.OS === 'web' ? 20 : 16,
    marginBottom: Platform.OS === 'web' ? 24 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 10 : 2 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 20 : 4,
    elevation: 2
  },
  cardTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 18
  },

  formGroup: {
    marginBottom: Platform.OS === 'web' ? 16 : 14
  },
  label: {
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 13 : 14,
    color: "#111827",
    marginBottom: 6
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 14,
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: "#111827"
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingRight: Platform.OS === 'web' ? 12 : 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 14,
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: "#111827"
  },
  passwordToggle: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutInput: {
    minHeight: Platform.OS === 'web' ? 100 : 120,
    textAlignVertical: "top"
  },

  saveBtn: {
    backgroundColor: "#FF8000",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    alignSelf: Platform.OS === 'web' ? "flex-start" : "stretch",
    width: Platform.OS === 'web' ? 'auto' : '100%',
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 8 : 2 },
    shadowOpacity: 0.15,
    shadowRadius: Platform.OS === 'web' ? 12 : 4,
    elevation: 3,
    marginTop: Platform.OS === 'web' ? 8 : 12,
    alignItems: "center",
    justifyContent: "center"
  },
  saveBtnDisabled: {
    opacity: 0.6
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 14 : 15
  },

  previewCard: {
    backgroundColor: "#f9fafb",
    borderRadius: Platform.OS === 'web' ? 8 : 12,
    padding: Platform.OS === 'web' ? 16 : 14,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  previewHeaderRow: {
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    alignItems: Platform.OS === 'web' ? "flex-start" : "center",
    marginBottom: Platform.OS === 'web' ? 16 : 12
  },
  previewAvatar: {
    width: Platform.OS === 'web' ? 56 : 64,
    height: Platform.OS === 'web' ? 56 : 64,
    borderRadius: 9999,
    backgroundColor: "#FF8000",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Platform.OS === 'web' ? 16 : 0,
    marginBottom: Platform.OS === 'web' ? 0 : 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3
  },
  previewAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: Platform.OS === 'web' ? 20 : 24
  },
  previewHeaderInfo: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? "flex-start" : "center"
  },
  previewNameText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: Platform.OS === 'web' ? 18 : 20,
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    textAlign: Platform.OS === 'web' ? "left" : "center"
  },
  previewMetaText: {
    color: "#6b7280",
    fontSize: Platform.OS === 'web' ? 13 : 14,
    marginTop: Platform.OS === 'web' ? 4 : 3,
    textAlign: Platform.OS === 'web' ? "left" : "center"
  },
  previewDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: Platform.OS === 'web' ? 16 : 12
  },
  previewAboutHeader: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8
  },
  previewAboutText: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    color: "#4b5563",
    lineHeight: Platform.OS === 'web' ? 20 : 22
  },
  previewSocialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  previewSocialText: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    color: "#6b7280",
    fontWeight: "500"
  },

  // Account Settings
  accountInfoRow: {
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  accountInfoLeft: {
    flex: 1
  },
  accountInfoLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 4
  },
  accountInfoValue: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: "#111827",
    fontWeight: "600",
    flex: 1
  },
  accountStatusActive: {
    color: "#10b981"
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '15'
  },
  changeButtonText: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 4
  },
  changeForm: {
    marginTop: Platform.OS === 'web' ? 12 : 10,
    paddingTop: Platform.OS === 'web' ? 16 : 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb"
  },
  inputError: {
    borderColor: COLORS.danger || "#ef4444"
  },
  errorText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: COLORS.danger || "#ef4444",
    marginTop: 4,
    marginLeft: 4
  },
  logoutSection: {
    marginTop: Platform.OS === 'web' ? 16 : 20,
    paddingTop: Platform.OS === 'web' ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginBottom: Platform.OS === 'web' ? 24 : 20
  },
  dangerZoneSeparator: {
    height: Platform.OS === 'web' ? 32 : 28,
    width: "100%"
  },
  logoutBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 14,
    alignSelf: Platform.OS === 'web' ? "flex-start" : "stretch",
    width: Platform.OS === 'web' ? 'auto' : '100%',
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  logoutBtnText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 14 : 15
  },

  // Location/Branch Management Styles
  locationCard: {
    backgroundColor: "#f9fafb",
    borderRadius: Platform.OS === 'web' ? 8 : 12,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Platform.OS === 'web' ? 12 : 10
  },
  locationTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
    fontWeight: "700",
    color: "#111827"
  },
  removeButton: {
    padding: 6,
    borderRadius: 6
  },
  mapPinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary + '15',
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 16,
    marginTop: Platform.OS === 'web' ? 8 : 10
  },
  mapPinButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 13 : 14,
    marginLeft: 8
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 18,
    marginTop: Platform.OS === 'web' ? 8 : 10,
    marginBottom: Platform.OS === 'web' ? 16 : 14
  },
  addButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 13 : 14,
    marginLeft: 8
  },

  // Document Management Styles
  documentSection: {
    marginBottom: Platform.OS === 'web' ? 24 : 20,
    paddingBottom: Platform.OS === 'web' ? 24 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8
  },
  documentTitle: {
    fontSize: Platform.OS === 'web' ? 15 : 16,
    fontWeight: "700",
    color: "#111827"
  },
  documentSubtitle: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    color: "#6b7280",
    marginBottom: Platform.OS === 'web' ? 12 : 14,
    lineHeight: 18
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    padding: Platform.OS === 'web' ? 12 : 14,
    marginBottom: Platform.OS === 'web' ? 8 : 10,
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  fileItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12
  },
  fileItemInfo: {
    flex: 1
  },
  fileItemName: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  fileItemSize: {
    fontSize: Platform.OS === 'web' ? 11 : 12,
    color: "#6b7280"
  },
  fileItemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Platform.OS === 'web' ? 8 : 10,
    marginTop: 2
  },
  fileStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: (COLORS.success || "#22c55e") + '15',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4
  },
  fileStatusBadgeNew: {
    backgroundColor: COLORS.primary + '15'
  },
  fileStatusBadgeText: {
    fontSize: Platform.OS === 'web' ? 10 : 11,
    fontWeight: "600",
    color: COLORS.success || "#22c55e"
  },
  fileStatusBadgeTextNew: {
    color: COLORS.primary
  },
  emptyFilesState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === 'web' ? 32 : 28,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    marginBottom: Platform.OS === 'web' ? 12 : 10
  },
  emptyFilesText: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 4
  },
  emptyFilesSubtext: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    color: COLORS.textLight,
    textAlign: "center"
  },
  dtiBadge: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8
  },
  dtiBadgeText: {
    fontSize: Platform.OS === 'web' ? 10 : 11,
    fontWeight: "600",
    color: COLORS.primary
  },
  fileRemoveButton: {
    padding: 6,
    borderRadius: 6
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 18,
    marginTop: Platform.OS === 'web' ? 8 : 10
  },
  filePickerButtonDisabled: {
    opacity: 0.6
  },
  filePickerButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 13 : 14,
    marginLeft: 8
  },

  // Empty State Styles
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === 'web' ? 40 : 32,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16
  },
  emptyStateText: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 12,
    marginBottom: 4
  },
  emptyStateSubtext: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    color: "#6b7280",
    textAlign: "center"
  },

  // Tabs Navigation Styles
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    padding: Platform.OS === 'web' ? 4 : 6,
    marginBottom: Platform.OS === 'web' ? 24 : 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: Platform.OS === 'web' ? 2 : 1 },
    shadowOpacity: 0.05,
    shadowRadius: Platform.OS === 'web' ? 4 : 2,
    elevation: 2
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 8,
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    marginHorizontal: Platform.OS === 'web' ? 2 : 3
  },
  tabActive: {
    backgroundColor: COLORS.primary + '15'
  },
  tabText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: "600",
    color: COLORS.textLight,
    marginLeft: Platform.OS === 'web' ? 6 : 4
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: "700"
  },

  // Profile Image Styles
  profileImageSection: {
    alignItems: "center",
    marginBottom: Platform.OS === 'web' ? 16 : 14
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
    } as any)
  },
  profileImage: {
    width: Platform.OS === 'web' ? 120 : 100,
    height: Platform.OS === 'web' ? 120 : 100,
    borderRadius: Platform.OS === 'web' ? 60 : 50,
    borderWidth: 3,
    borderColor: COLORS.primary
  },
  profileImagePlaceholder: {
    width: Platform.OS === 'web' ? 120 : 100,
    height: Platform.OS === 'web' ? 120 : 100,
    borderRadius: Platform.OS === 'web' ? 60 : 50,
    backgroundColor: COLORS.bg,
    borderWidth: 3,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center"
  },
  profileImagePlaceholderText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: COLORS.textLight,
    marginTop: 8,
    fontWeight: "500"
  },
  profileImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: Platform.OS === 'web' ? 60 : 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  profileImageOverlayText: {
    color: "#fff",
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: "600"
  },
  profileImageEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  profileImageActions: {
    flexDirection: "row",
    gap: Platform.OS === 'web' ? 12 : 10,
    flexWrap: "wrap",
    justifyContent: "center"
  },
  imageActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 14,
    minWidth: Platform.OS === 'web' ? 140 : 120
  },
  imageActionButtonDisabled: {
    opacity: 0.6
  },
  imageActionButtonDanger: {
    backgroundColor: (COLORS.danger || "#ef4444") + '15',
    borderColor: COLORS.danger || "#ef4444"
  },
  imageActionButtonText: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 6
  },
  imageActionButtonTextDanger: {
    color: COLORS.danger || "#ef4444"
  },
  sampleImagesSection: {
    marginTop: Platform.OS === 'web' ? 16 : 14,
  },
  sampleImagesScroll: {
    marginHorizontal: Platform.OS === 'web' ? -16 : -14,
  },
  sampleImagesContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 14,
    gap: 12,
    alignItems: 'center',
  },
  sampleImageWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sampleImage: {
    width: '100%',
    height: '100%',
  },
  sampleImageRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
  },
  sampleImageAddButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sampleImageAddText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  previewAvatarImage: {
    width: Platform.OS === 'web' ? 56 : 64,
    height: Platform.OS === 'web' ? 56 : 64,
    borderRadius: Platform.OS === 'web' ? 28 : 32,
    borderWidth: 2,
    borderColor: COLORS.primary
  },

  // Verification Badge
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: (COLORS.success || "#22c55e") + '15',
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 10 : 12,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 16,
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    gap: 8
  },
  verifiedText: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    fontWeight: "600",
    color: COLORS.success || "#22c55e"
  },
  labelSubtext: {
    fontSize: Platform.OS === 'web' ? 11 : 12,
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 8
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Platform.OS === 'web' ? 20 : 16
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    width: Platform.OS === 'web' ? 500 : "100%",
    maxWidth: Platform.OS === 'web' ? 500 : "100%",
    padding: Platform.OS === 'web' ? 24 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Platform.OS === 'web' ? 16 : 14
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 22,
    fontWeight: "700",
    color: "#111827"
  },
  modalCloseButton: {
    padding: 4
  },
  modalWarning: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    color: COLORS.danger || "#ef4444",
    marginBottom: Platform.OS === 'web' ? 20 : 18,
    lineHeight: 20
  },
  modalActions: {
    flexDirection: "row",
    gap: Platform.OS === 'web' ? 12 : 10,
    marginTop: Platform.OS === 'web' ? 20 : 18
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 18,
    alignItems: "center",
    justifyContent: "center"
  },
  modalCancelButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 14 : 15
  },
  modalDeleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.danger || "#ef4444",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 18,
    gap: 8
  },
  modalDeleteButtonDisabled: {
    opacity: 0.6
  },
  modalDeleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 14 : 15
  },
  modalSaveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 18,
    gap: 8
  },
  modalSaveButtonDisabled: {
    opacity: 0.6
  },
  modalSaveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 14 : 15
  },
  modalSuccessButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 18
  },
  modalSuccessButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 14 : 15
  },
  successIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    width: "100%"
  },
  successTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: Platform.OS === 'web' ? 12 : 10
  },
  successMessage: {
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: Platform.OS === 'web' ? 22 : 24,
    marginBottom: Platform.OS === 'web' ? 20 : 18
  },

  // Delete Account Section Styles
  deleteAccountSection: {
    marginTop: 0,
    paddingTop: Platform.OS === 'web' ? 24 : 20,
    borderTopWidth: 2,
    borderTopColor: "#fee2e2",
    backgroundColor: "#fef2f2",
    borderRadius: Platform.OS === 'web' ? 12 : 16,
    padding: Platform.OS === 'web' ? 20 : 16,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: Platform.OS === 'web' ? 24 : 20
  },
  deleteAccountHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    gap: Platform.OS === 'web' ? 12 : 10
  },
  deleteAccountIconContainer: {
    width: Platform.OS === 'web' ? 40 : 36,
    height: Platform.OS === 'web' ? 40 : 36,
    borderRadius: Platform.OS === 'web' ? 20 : 18,
    backgroundColor: (COLORS.danger || "#ef4444") + '20',
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  deleteAccountHeaderText: {
    flex: 1
  },
  deleteAccountTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 18,
    fontWeight: "700",
    color: COLORS.danger || "#ef4444",
    marginBottom: Platform.OS === 'web' ? 6 : 4
  },
  deleteAccountWarning: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    color: "#991b1b",
    lineHeight: Platform.OS === 'web' ? 20 : 22
  },
  deleteAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.danger || "#ef4444",
    borderRadius: Platform.OS === 'web' ? 8 : 10,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 18,
    width: "100%",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  deleteAccountBtnDisabled: {
    opacity: 0.6
  },
  deleteAccountBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: Platform.OS === 'web' ? 14 : 15
  }
});

