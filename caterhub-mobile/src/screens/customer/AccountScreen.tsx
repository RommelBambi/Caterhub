import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../store/auth';
import { supabase } from '../../services/supabase';
import {
  getUserLocations,
  saveUserLocation,
  updateUserLocation,
  deleteUserLocation,
  setPrimaryLocation,
  UserLocation,
} from '../../services/userLocations';
import InteractiveMapPicker from '../../components/InteractiveMapPicker';
import { COLORS } from '../../constants/colors';

type SnackbarState = {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
};

type TabType = 'profile' | 'locations' | 'security';

export default function AccountScreen() {
  const { user, logout, updateMe, changePassword, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Tab management
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  // Profile state
  const [displayName, setDisplayName] = useState<string>(user?.username ?? '');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ username?: string }>({});
  
  // Location management state
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);
  const [addingNewLocation, setAddingNewLocation] = useState(false);
  
  // Email change state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [emailVerificationPassword, setEmailVerificationPassword] = useState('');
  const [emailPasswordError, setEmailPasswordError] = useState('');
  const [emailPasswordVerified, setEmailPasswordVerified] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [verifyingEmailPassword, setVerifyingEmailPassword] = useState(false);
  const [showEmailVerificationPassword, setShowEmailVerificationPassword] = useState(false);
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [verifyingCurrentPassword, setVerifyingCurrentPassword] = useState(false);
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Delete account state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteAccountPasswordError, setDeleteAccountPasswordError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteAccountSuccessModal, setShowDeleteAccountSuccessModal] = useState(false);

  const navigation = useNavigation();

  // Load profile image and locations
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      
      // Load profile image
      if (user.profile_image_url) {
        setProfileImage(user.profile_image_url);
      } else {
        setProfileImage(null);
      }
      
      // Load locations
      loadLocations();
      
      // Load favorites count
    }, [user?.id, user?.profile_image_url])
  );

  useEffect(() => {
    setDisplayName(user?.username ?? '');
  }, [user?.username]);

  const loadLocations = async () => {
    try {
      setLoadingLocations(true);
      const userLocations = await getUserLocations();
      // Only show the latest location (first one since ordered by created_at desc)
      setLocations(userLocations.length > 0 ? [userLocations[0]] : []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };


  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ visible: true, message, type });
  };

  const hideSnackbar = () => setSnackbar((prev) => ({ ...prev, visible: false }));

  // Profile image upload
  const uploadImageToStorage = async (fileUri: string, userId: string): Promise<string> => {
    try {
      // Read file
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `profile_${timestamp}.jpg`;
      const storagePath = `profiles/${userId}/${filename}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(storagePath);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const pickProfileImage = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile image.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      if (!user?.id) {
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      setUploadingImage(true);
      const imageUrl = await uploadImageToStorage(result.assets[0].uri, user.id);
      
      // Update user profile_image_url
      await updateMe({ profile_image_url: imageUrl });
      await refreshUser();
      
      setProfileImage(imageUrl);
      showSnackbar('Profile image updated successfully.', 'success');
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload profile image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    Alert.alert(
      'Remove Profile Image',
      'Are you sure you want to remove your profile image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (profileImage) {
                // Extract path from URL
                const urlParts = profileImage.split('/');
                const pathIndex = urlParts.findIndex(part => part === 'profiles');
                if (pathIndex !== -1) {
                  const storagePath = urlParts.slice(pathIndex).join('/');
                  await supabase.storage.from('avatars').remove([storagePath]);
                }
              }
              
              await updateMe({ profile_image_url: null });
              await refreshUser();
              setProfileImage(null);
              showSnackbar('Profile image removed successfully.', 'success');
            } catch (error) {
              console.error('Error removing image:', error);
              Alert.alert('Error', 'Failed to remove profile image. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Profile validation and save
  const validateProfile = () => {
    const errors: { username?: string } = {};
    if (!displayName.trim()) {
      errors.username = 'Display name is required.';
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!updateMe) return;
    if (!validateProfile()) return;

    const trimmedName = displayName.trim();
    const patch: { username?: string } = {};
    
    if (trimmedName !== (user?.username ?? '')) {
      patch.username = trimmedName;
    }

    if (Object.keys(patch).length === 0) {
      showSnackbar('No changes to save.', 'error');
      return;
    }

    try {
      setSavingProfile(true);
      await updateMe(patch);
      await refreshUser();
      showSnackbar('Profile updated successfully.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile.';
      showSnackbar(message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Location management
  // Customers should only have one location - new location replaces existing one
  const handleLocationSelect = async (location: { latitude: number; longitude: number; address: string }) => {
    if (!user?.id) return;
    
    try {
      if (editingLocationIndex !== null) {
        // Update existing location
        const locationToUpdate = locations[editingLocationIndex];
        await updateUserLocation(locationToUpdate.id, {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        });
        showSnackbar('Location updated successfully.', 'success');
      } else {
        // Always replace existing location (saveUserLocation now handles this automatically)
        // If no location exists, it creates one; if one exists, it updates it
        await saveUserLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          is_primary: true, // Always set as primary since there's only one location
        });
        showSnackbar('Location saved successfully.', 'success');
      }
      
      await loadLocations();
      setMapPickerVisible(false);
      setEditingLocationIndex(null);
      setAddingNewLocation(false);
    } catch (error) {
      console.error('Error saving location:', error);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    }
  };

  const handleSetPrimary = async (locationId: string) => {
    try {
      await setPrimaryLocation(locationId);
      await loadLocations();
      showSnackbar('Primary location updated.', 'success');
    } catch (error) {
      console.error('Error setting primary location:', error);
      Alert.alert('Error', 'Failed to set primary location. Please try again.');
    }
  };

  const handleDeleteLocation = async (locationId: string, index: number) => {
    const location = locations[index];
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete "${location.location_name || location.address}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserLocation(locationId);
              await loadLocations();
              showSnackbar('Location deleted successfully.', 'success');
            } catch (error) {
              console.error('Error deleting location:', error);
              Alert.alert('Error', 'Failed to delete location. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Password change
  const verifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setPasswordErrors({ currentPassword: 'Password is required' });
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'User email not found.');
      return;
    }

    setVerifyingCurrentPassword(true);
    setPasswordErrors({});

    try {
      // Re-authenticate to verify password
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (error) {
        setPasswordErrors({ currentPassword: 'Incorrect password' });
        setCurrentPasswordVerified(false);
      } else {
        setCurrentPasswordVerified(true);
        // Sign back in with the original session
        await refreshUser();
      }
    } catch (error) {
      setPasswordErrors({ currentPassword: 'Failed to verify password' });
      setCurrentPasswordVerified(false);
    } finally {
      setVerifyingCurrentPassword(false);
    }
  };

  const validatePassword = () => {
    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPasswordVerified) {
      errors.currentPassword = 'Please verify your current password first.';
    }
    if (!newPassword) {
      errors.newPassword = 'Enter a new password.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordErrors({});
    setCurrentPasswordVerified(false);
    setShowPasswordForm(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChangePassword = async () => {
    if (!changePassword) return;
    if (!validatePassword()) return;

    try {
      setUpdatingPassword(true);
      await changePassword(currentPassword, newPassword);
      resetPasswordForm();
      showSnackbar('Password updated successfully.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update password.';
      showSnackbar(message, 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Delete account functions
  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(true);
    setDeleteAccountPassword('');
    setDeleteAccountPasswordError('');
  };

  const validateDeleteAccountPassword = () => {
    if (!deleteAccountPassword.trim()) {
      setDeleteAccountPasswordError('Password is required to delete your account');
      return false;
    }
    setDeleteAccountPasswordError('');
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
      setDeleteAccountPasswordError(error?.message || 'Failed to delete account. Please try again.');
      setDeletingAccount(false);
    }
  };

  // Email change functions
  const verifyEmailPassword = async () => {
    if (!emailVerificationPassword.trim()) {
      setEmailPasswordError('Password is required');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'User email not found.');
      return;
    }

    setVerifyingEmailPassword(true);
    setEmailPasswordError('');

    try {
      // Re-authenticate to verify password
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: emailVerificationPassword,
      });

      if (error) {
        setEmailPasswordError('Incorrect password. Please try again.');
        setEmailPasswordVerified(false);
      } else {
        setEmailPasswordVerified(true);
        // Sign back in with the original session
        await refreshUser();
      }
    } catch (error) {
      setEmailPasswordError('Failed to verify password. Please try again.');
      setEmailPasswordVerified(false);
    } finally {
      setVerifyingEmailPassword(false);
    }
  };

  const validateEmail = () => {
    const trimmedEmail = newEmail.trim();
    
    if (!trimmedEmail) {
      setEmailError('Please enter a new email address.');
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    
    // Check if email is different from current
    if (trimmedEmail.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError('New email must be different from current email.');
      return false;
    }
    
    // Additional validation: check for common invalid patterns
    if (trimmedEmail.includes('..') || trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    
    setEmailError('');
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
      await refreshUser();

      Alert.alert(
        'Email Updated',
        'Your email address has been updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              setNewEmail('');
              setShowChangeEmail(false);
              setEmailVerificationPassword('');
              setEmailPasswordError('');
              setEmailPasswordVerified(false);
              setShowEmailVerificationPassword(false);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Email change error:', error);
      const message = error?.message || 'Failed to update email. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setUpdatingEmail(false);
    }
  };

  const initials =
    (user?.username || user?.email || 'User')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={pickProfileImage} style={styles.avatarContainer} disabled={uploadingImage}>
          {uploadingImage ? (
            <View style={styles.avatarLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={16} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{user?.username || user?.email || 'Account'}</Text>
          <Text style={styles.headerEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role ?? 'Member'}</Text>
          </View>
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
          style={[styles.tab, activeTab === 'security' && styles.tabActive]}
          onPress={() => setActiveTab('security')}
        >
          <Ionicons
            name={activeTab === 'security' ? 'lock-closed' : 'lock-closed-outline'}
            size={18}
            color={activeTab === 'security' ? COLORS.primary : COLORS.textLight}
          />
          <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>
            Security
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profile Information</Text>
              <Text style={styles.cardSubtitle}>Update your account details</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Display Name *</Text>
                <TextInput
                  style={[styles.input, profileErrors.username && styles.inputError]}
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    setProfileErrors({});
                  }}
                  placeholder="Enter your display name"
                  autoCapitalize="words"
                />
                {profileErrors.username && (
                  <Text style={styles.errorText}>{profileErrors.username}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <View style={styles.emailRow}>
                  <View style={styles.emailLeft}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.emailValue}>{user?.email ?? 'Not set'}</Text>
                  </View>
                  <Pressable
                    style={styles.changeButton}
                    onPress={() => {
                      setShowChangeEmail(!showChangeEmail);
                      setShowPasswordForm(false);
                      setNewEmail('');
                      setEmailError('');
                      setEmailVerificationPassword('');
                      setEmailPasswordError('');
                      setEmailPasswordVerified(false);
                      setShowEmailVerificationPassword(false);
                    }}
                  >
                    <Ionicons name="pencil" size={16} color={COLORS.primary} />
                    <Text style={styles.changeButtonText}>
                      {showChangeEmail ? 'Cancel' : 'Change'}
                    </Text>
                  </Pressable>
                </View>

                {showChangeEmail && (
                  <View style={styles.changeForm}>
                    {!emailPasswordVerified ? (
                      <>
                        <Text style={styles.labelSubtext}>
                          Please enter your current password to verify your identity
                        </Text>
                        <View style={styles.passwordInputContainer}>
                          <TextInput
                            style={[
                              styles.passwordInput,
                              emailPasswordError && styles.inputError,
                            ]}
                            placeholder="Enter your current password"
                            value={emailVerificationPassword}
                            onChangeText={(text) => {
                              setEmailVerificationPassword(text);
                              setEmailPasswordError('');
                            }}
                            secureTextEntry={!showEmailVerificationPassword}
                            autoCapitalize="none"
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
                        {emailPasswordError && (
                          <Text style={styles.errorText}>{emailPasswordError}</Text>
                        )}
                        <Pressable
                          style={[
                            styles.verifyButton,
                            verifyingEmailPassword && styles.verifyButtonDisabled,
                          ]}
                          onPress={verifyEmailPassword}
                          disabled={verifyingEmailPassword}
                        >
                          <Text style={styles.verifyButtonText}>
                            {verifyingEmailPassword ? 'Verifying...' : 'Verify Password'}
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.success || '#22c55e'} />
                          <Text style={styles.verifiedText}>Password verified</Text>
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>New Email Address *</Text>
                          <TextInput
                            style={[styles.input, emailError && styles.inputError]}
                            placeholder="Enter new email address"
                            value={newEmail}
                            onChangeText={(text) => {
                              setNewEmail(text);
                              setEmailError('');
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                          {emailError && (
                            <Text style={styles.errorText}>{emailError}</Text>
                          )}
                        </View>

                        <Pressable
                          style={[styles.saveButton, updatingEmail && styles.saveButtonDisabled]}
                          onPress={handleChangeEmail}
                          disabled={updatingEmail}
                        >
                          <Text style={styles.saveButtonText}>
                            {updatingEmail ? 'Updating...' : 'Update Email'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </View>

              {profileImage && (
                <View style={styles.formGroup}>
                  <View style={styles.imageActions}>
                    <Pressable onPress={removeProfileImage} style={styles.removeImageButton}>
                      <Ionicons name="trash" size={16} color={COLORS.danger || '#ef4444'} />
                      <Text style={styles.removeImageText}>Remove Image</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable
                style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                <Text style={styles.saveButtonText}>
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Saved Locations</Text>
              <Text style={styles.cardSubtitle}>
                Manage your saved locations for faster booking
              </Text>

              {loadingLocations ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              ) : locations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="location-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.emptyStateText}>No locations saved yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Set your location to make booking faster
                  </Text>
                </View>
              ) : (
                locations.map((location, index) => (
                  <View key={location.id} style={styles.locationItem}>
                    <View style={styles.locationItemLeft}>
                      <Ionicons
                        name={location.is_primary ? 'star' : 'location-outline'}
                        size={20}
                        color={location.is_primary ? COLORS.primary : COLORS.textLight}
                      />
                      <View style={styles.locationItemInfo}>
                        <Text style={styles.locationItemName}>
                          {location.location_name || 'Unnamed Location'}
                        </Text>
                        <Text style={styles.locationItemAddress} numberOfLines={2}>
                          {location.address}
                        </Text>
                        {location.is_primary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.locationItemActions}>
                      <Pressable
                        onPress={() => {
                          setEditingLocationIndex(index);
                          setMapPickerVisible(true);
                        }}
                        style={styles.locationActionButton}
                      >
                        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteLocation(location.id, index)}
                        style={styles.locationActionButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger || '#ef4444'} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}

              <Pressable
                style={styles.addLocationButton}
                onPress={() => {
                  setAddingNewLocation(true);
                  setEditingLocationIndex(null);
                  setMapPickerVisible(true);
                }}
              >
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                <Text style={styles.addLocationButtonText}>
                  {locations.length > 0 ? 'Update Location' : 'Set Location'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Change Password</Text>
              <Text style={styles.cardSubtitle}>
                Update your password to keep your account secure
              </Text>

              {!showPasswordForm ? (
                <Pressable
                  style={styles.changePasswordButton}
                  onPress={() => setShowPasswordForm(true)}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.changePasswordButtonText}>Change Password</Text>
                </Pressable>
              ) : (
                <>
                  {!currentPasswordVerified ? (
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Current Password *</Text>
                      <View style={styles.passwordInputContainer}>
                        <TextInput
                          style={[
                            styles.passwordInput,
                            passwordErrors.currentPassword && styles.inputError,
                          ]}
                          value={currentPassword}
                          onChangeText={(text) => {
                            setCurrentPassword(text);
                            setPasswordErrors({});
                          }}
                          placeholder="Enter your current password"
                          secureTextEntry={!showCurrentPassword}
                          autoCapitalize="none"
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
                      {passwordErrors.currentPassword && (
                        <Text style={styles.errorText}>
                          {passwordErrors.currentPassword}
                        </Text>
                      )}
                      <Pressable
                        style={[
                          styles.verifyButton,
                          verifyingCurrentPassword && styles.verifyButtonDisabled,
                        ]}
                        onPress={verifyCurrentPassword}
                        disabled={verifyingCurrentPassword}
                      >
                        <Text style={styles.verifyButtonText}>
                          {verifyingCurrentPassword ? 'Verifying...' : 'Verify Password'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.success || '#22c55e'} />
                        <Text style={styles.verifiedText}>Password verified</Text>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>New Password *</Text>
                        <View style={styles.passwordInputContainer}>
                          <TextInput
                            style={[
                              styles.passwordInput,
                              passwordErrors.newPassword && styles.inputError,
                            ]}
                            value={newPassword}
                            onChangeText={(text) => {
                              setNewPassword(text);
                              setPasswordErrors({});
                            }}
                            placeholder="Enter new password (min. 8 characters)"
                            secureTextEntry={!showNewPassword}
                            autoCapitalize="none"
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
                        {passwordErrors.newPassword && (
                          <Text style={styles.errorText}>{passwordErrors.newPassword}</Text>
                        )}
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Confirm New Password *</Text>
                        <View style={styles.passwordInputContainer}>
                          <TextInput
                            style={[
                              styles.passwordInput,
                              passwordErrors.confirmPassword && styles.inputError,
                            ]}
                            value={confirmPassword}
                            onChangeText={(text) => {
                              setConfirmPassword(text);
                              setPasswordErrors({});
                            }}
                            placeholder="Confirm new password"
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
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
                        {passwordErrors.confirmPassword && (
                          <Text style={styles.errorText}>
                            {passwordErrors.confirmPassword}
                          </Text>
                        )}
                      </View>

                      <View style={styles.passwordActions}>
                        <Pressable
                          style={styles.cancelButton}
                          onPress={resetPasswordForm}
                          disabled={updatingPassword}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.updatePasswordButton,
                            updatingPassword && styles.updatePasswordButtonDisabled,
                          ]}
                          onPress={handleChangePassword}
                          disabled={updatingPassword}
                        >
                          <Text style={styles.updatePasswordButtonText}>
                            {updatingPassword ? 'Updating...' : 'Update Password'}
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            {/* Logout Section */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sign Out</Text>
              <Text style={styles.cardSubtitle}>
                Sign out of your account on this device
              </Text>
              <Pressable style={styles.logoutButton} onPress={logout}>
                <Ionicons name="log-out-outline" size={20} color={COLORS.danger || '#ef4444'} />
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </Pressable>
            </View>

            {/* Delete Account Section */}
            <View style={styles.card}>
              <View style={styles.dangerZoneHeader}>
                <View style={styles.dangerZoneIconContainer}>
                  <Ionicons name="warning" size={24} color={COLORS.danger || '#dc2626'} />
                </View>
                <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              </View>
              <Text style={styles.dangerZoneDescription}>
                Once you delete your account, there is no going back. This action cannot be undone.
                All your data, including saved locations, favorites, and bookings, will be permanently deleted.
              </Text>
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
        )}

      </ScrollView>

      {/* Map Picker Modal */}
      <Modal
        visible={mapPickerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setMapPickerVisible(false);
          setEditingLocationIndex(null);
          setAddingNewLocation(false);
        }}
      >
        <InteractiveMapPicker
          visible={mapPickerVisible}
          onClose={() => {
            setMapPickerVisible(false);
            setEditingLocationIndex(null);
            setAddingNewLocation(false);
          }}
          onLocationSelect={handleLocationSelect}
        />
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!deletingAccount) {
            setShowDeleteAccountModal(false);
            setDeleteAccountPassword('');
            setDeleteAccountPasswordError('');
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
                    setDeleteAccountPassword('');
                    setDeleteAccountPasswordError('');
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
                  setDeleteAccountPasswordError('');
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
                    setDeleteAccountPassword('');
                    setDeleteAccountPasswordError('');
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
                <Ionicons name="checkmark-circle" size={48} color={COLORS.success || '#22c55e'} />
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
                  navigation.getParent()?.reset({
                    index: 0,
                    routes: [{ name: 'Auth' as any }],
                  });
                }}
              >
                <Text style={styles.modalSuccessButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Snackbar */}
      {snackbar.visible && (
        <View
          style={[
            styles.snackbar,
            snackbar.type === 'success' ? styles.snackbarSuccess : styles.snackbarError,
          ]}
        >
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
          <Pressable onPress={hideSnackbar}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  avatarLoading: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginHorizontal: 3,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '15',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    marginLeft: 4,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    paddingTop: 0,
  },
  tabContent: {
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  passwordToggle: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputDisabled: {
    backgroundColor: COLORS.bg,
    color: COLORS.textLight,
  },
  inputError: {
    borderColor: COLORS.danger || '#ef4444',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger || '#ef4444',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: (COLORS.danger || '#ef4444') + '15',
  },
  removeImageText: {
    fontSize: 14,
    color: COLORS.danger || '#ef4444',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  locationItemInfo: {
    flex: 1,
  },
  locationItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  locationItemAddress: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  primaryBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '15',
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  locationActionButton: {
    padding: 8,
    borderRadius: 8,
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  addLocationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  changePasswordButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: (COLORS.success || '#22c55e') + '15',
    marginBottom: 16,
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success || '#22c55e',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  emailLeft: {
    flex: 1,
  },
  emailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: COLORS.primary + '15',
    gap: 4,
  },
  changeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  changeForm: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  labelSubtext: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
    lineHeight: 18,
  },
  passwordActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  updatePasswordButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatePasswordButtonDisabled: {
    opacity: 0.6,
  },
  updatePasswordButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.danger || '#ef4444',
    backgroundColor: COLORS.white,
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger || '#ef4444',
  },
  snackbar: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  snackbarSuccess: {
    backgroundColor: COLORS.success || '#22c55e',
  },
  snackbarError: {
    backgroundColor: COLORS.danger || '#ef4444',
  },
  snackbarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  // Delete Account Styles
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dangerZoneIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: (COLORS.danger || '#dc2626') + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.danger || '#dc2626',
  },
  dangerZoneDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 20,
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.danger || '#dc2626',
  },
  deleteAccountBtnDisabled: {
    opacity: 0.6,
  },
  deleteAccountBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal Styles
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
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  modalWarning: {
    fontSize: 14,
    color: COLORS.danger || '#dc2626',
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.danger || '#dc2626',
  },
  modalDeleteButtonDisabled: {
    opacity: 0.6,
  },
  modalDeleteButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  // Success Modal Styles
  successIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: (COLORS.success || '#22c55e') + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalSuccessButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  modalSuccessButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
