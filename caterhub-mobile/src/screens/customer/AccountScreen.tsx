import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button, Card, Avatar, TextInput, Divider, HelperText, Snackbar, List, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../store/auth';
import { getMyFavorites } from '../../services/services';

type SnackbarState = {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
};

export default function AccountScreen() {
  const { user, logout, updateMe, changePassword } = useAuth();
  const [favCount, setFavCount] = React.useState<number>(0);
  const [loadingFavs, setLoadingFavs] = React.useState<boolean>(false);
  const [displayName, setDisplayName] = React.useState<string>(user?.username ?? '');
  const [location, setLocation] = React.useState<string>(user?.location ?? '');
  const [savingProfile, setSavingProfile] = React.useState<boolean>(false);
  const [profileErrors, setProfileErrors] = React.useState<{ username?: string }>(
    {},
  );
  const [currentPassword, setCurrentPassword] = React.useState<string>('');
  const [newPassword, setNewPassword] = React.useState<string>('');
  const [confirmPassword, setConfirmPassword] = React.useState<string>('');
  const [passwordErrors, setPasswordErrors] = React.useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [updatingPassword, setUpdatingPassword] = React.useState<boolean>(false);
  const [showPasswordForm, setShowPasswordForm] = React.useState<boolean>(false);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'success',
  });

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        try {
          setLoadingFavs(true);
          if (!user) {
            if (active) setFavCount(0);
            return;
          }

          const ids = await getMyFavorites();
          if (active) setFavCount(ids.length);
        } catch {
          if (active) setFavCount(0);
        } finally {
          if (active) setLoadingFavs(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  React.useEffect(() => {
    setDisplayName(user?.username ?? '');
    setLocation(user?.location ?? '');
  }, [user?.username, user?.location]);

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ visible: true, message, type });
  };

  const hideSnackbar = () => setSnackbar((prev) => ({ ...prev, visible: false }));

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
    const trimmedLocation = location.trim();

    const patch: { username?: string; location?: string | null } = {};
    if (trimmedName !== (user?.username ?? '')) {
      patch.username = trimmedName;
    }
    const normalizedCurrentLocation = (user?.location ?? '').trim();
    if (trimmedLocation !== normalizedCurrentLocation) {
      patch.location = trimmedLocation || null;
    }

    if (Object.keys(patch).length === 0) {
      showSnackbar('No changes to save.', 'error');
      return;
    }

    try {
      setSavingProfile(true);
      await updateMe(patch);
      showSnackbar('Profile updated successfully.', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update profile.';
      showSnackbar(message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const validatePassword = () => {
    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      errors.currentPassword = 'Enter your current password.';
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
  };

  const handleChangePassword = async () => {
    if (!changePassword) return;
    if (!validatePassword()) return;

    try {
      setUpdatingPassword(true);
      await changePassword(currentPassword, newPassword);
      resetPasswordForm();
      setShowPasswordForm(false);
      showSnackbar('Password updated successfully.', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update password.';
      showSnackbar(message, 'error');
    } finally {
      setUpdatingPassword(false);
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
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Avatar.Text size={64} label={initials} />
        <View style={styles.headerInfo}>
          <Text variant="titleLarge" style={styles.headerName}>
            {user?.username || user?.email || 'Account'}
          </Text>
          <Text variant="bodyMedium" style={styles.headerEmail}>
            {user?.email}
          </Text>
          <Text variant="labelSmall" style={styles.rolePill}>
            {user?.role ?? 'Member'}
          </Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Profile" subtitle="Update your account details" />
        <Card.Content>
          <TextInput
            mode="outlined"
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="done"
          />
          <HelperText type="error" visible={!!profileErrors.username}>
            {profileErrors.username}
          </HelperText>

          <TextInput
            mode="outlined"
            label="Email"
            value={user?.email ?? ''}
            disabled
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label="Location"
            value={location}
            onChangeText={setLocation}
            placeholder="City, Country"
            style={styles.input}
            returnKeyType="done"
          />
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={handleSaveProfile}
            loading={savingProfile}
            disabled={savingProfile}
          >
            Save Changes
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title
          title="Security"
          subtitle="Change your password to keep your account safe"
        />
        <Card.Content>
          {!showPasswordForm ? (
            <Text variant="bodyMedium" style={styles.securityCopy}>
              Update your password regularly to keep your account secure.
            </Text>
          ) : (
            <>
              <TextInput
                mode="outlined"
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                style={styles.input}
              />
              <HelperText
                type="error"
                visible={showPasswordForm && !!passwordErrors.currentPassword}
              >
                {passwordErrors.currentPassword}
              </HelperText>

              <TextInput
                mode="outlined"
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                style={styles.input}
              />
              <HelperText
                type="error"
                visible={showPasswordForm && !!passwordErrors.newPassword}
              >
                {passwordErrors.newPassword}
              </HelperText>

              <TextInput
                mode="outlined"
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                style={styles.input}
              />
              <HelperText
                type="error"
                visible={showPasswordForm && !!passwordErrors.confirmPassword}
              >
                {passwordErrors.confirmPassword}
              </HelperText>
            </>
          )}
        </Card.Content>
        <Card.Actions>
          {showPasswordForm
            ? [
                <Button
                  key="update-password"
                  mode="contained-tonal"
                  onPress={handleChangePassword}
                  loading={updatingPassword}
                  disabled={updatingPassword}
                >
                  Update Password
                </Button>,
                <Button
                  key="cancel-password"
                  onPress={() => {
                    resetPasswordForm();
                    setShowPasswordForm(false);
                  }}
                  disabled={updatingPassword}
                >
                  Cancel
                </Button>,
              ]
            : (
                <Button
                  mode="contained-tonal"
                  onPress={() => {
                    resetPasswordForm();
                    setShowPasswordForm(true);
                  }}
                >
                  Change Password
                </Button>
              )}
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Quick Stats" />
        <Divider />
        <List.Item
          title="Saved caterers"
          description={loadingFavs ? 'Loading favorites...' : `${favCount} caterers`}
          left={(props) => <List.Icon {...props} icon="heart" />}
          right={() =>
            loadingFavs ? <ActivityIndicator animating size="small" /> : undefined
          }
        />
      </Card>

      <Button mode="outlined" onPress={logout} style={styles.logoutButton} icon="logout">
        Log out
      </Button>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={hideSnackbar}
        duration={4000}
        style={snackbar.type === 'success' ? styles.successSnackbar : styles.errorSnackbar}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F5F6FA',
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 16,
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  headerName: {
    fontWeight: '600',
  },
  headerEmail: {
    color: '#596273',
    marginTop: 2,
  },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E9EEF7',
    color: '#1E3A8A',
    overflow: 'hidden',
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
  },
  input: {
    marginBottom: 4,
  },
  logoutButton: {
    marginTop: 8,
  },
  securityCopy: {
    color: '#596273',
  },
  successSnackbar: {
    backgroundColor: '#1B998B',
  },
  errorSnackbar: {
    backgroundColor: '#D63B3B',
  },
});
