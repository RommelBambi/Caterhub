import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { register } from '../../services/api';
import PartnerApplicationScreen from './PartnerApplicationScreen';

type Form = {
  username: string;
  email: string;
  password: string;
  confirm: string;
};

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { control, handleSubmit, watch } = useForm<Form>({
    defaultValues: { username: '', email: '', password: '', confirm: '' },
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const canGoBack = navigation.canGoBack();

  // Watch fields live
  const watchUsername = watch('username');
  const watchEmail = watch('email');
  const watchPassword = watch('password');
  const watchConfirm = watch('confirm');

  const formFilled =
    watchUsername.trim() !== '' &&
    watchEmail.trim() !== '' &&
    watchPassword.trim() !== '' &&
    watchConfirm.trim() !== '';

  const onSubmit = async (d: Form) => {
    if (d.password !== d.confirm) {
      if (isWeb) {
        alert('Passwords do not match.');
      } else {
        Alert.alert('Error', 'Passwords do not match.');
      }
      return;
    }
    setLoading(true);
    try {
      // On web, default to CATER role since web is only for partners
      const role = isWeb ? 'CATER' : 'CUSTOMER';
      await register(d.email, d.password, d.username, role);
      if (isWeb) {
        alert('Account created! You can now log in.');
      } else {
        Alert.alert('Success', 'Account created! You can now log in.');
      }
      navigation.navigate('Login');
    } catch (e: any) {
      console.error('Registration error:', e);
      const errorMessage = e?.message || 'Unknown error';
      if (isWeb) {
        alert(`Registration Failed: ${errorMessage}`);
      } else {
        Alert.alert('Registration Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Web-optimized layout for partners - use multi-step application
  if (isWeb) {
    return <PartnerApplicationScreen />;
  }

  // Original web layout (not used, but kept for reference)
  if (false && isWeb) {
    return (
      <View style={styles.webContainer}>
        {canGoBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.webBackButton}
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
            <Text style={styles.webBackButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.webCentered}>
          <Card style={styles.webCard}>
            <Card.Content style={styles.webCardContent}>
              <View style={styles.webLogoContainer}>
                <Image
                  source={require('../../../assets/blacklogo.png')}
                  style={styles.webLogo}
                  resizeMode="contain"
                />
                <Text style={styles.webTitle}>Partner Sign Up</Text>
                <Text style={styles.webSubtitle}>Create your catering business account</Text>
              </View>

              <View style={styles.webForm}>
                <Controller
                  control={control}
                  name="username"
                  rules={{ required: true }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Username"
                      mode="outlined"
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                      style={styles.webInput}
                      textColor="#1f2937"
                      outlineColor="#e5e7eb"
                      activeOutlineColor="#C836F9"
                      contentStyle={styles.webInputContent}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="email"
                  rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Email"
                      mode="outlined"
                      value={value}
                      onChangeText={onChange}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.webInput}
                      textColor="#1f2937"
                      outlineColor="#e5e7eb"
                      activeOutlineColor="#C836F9"
                      contentStyle={styles.webInputContent}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  rules={{ required: true, minLength: 6 }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Password"
                      mode="outlined"
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPw}
                      right={
                        <TextInput.Icon
                          icon={showPw ? 'eye-off' : 'eye'}
                          onPress={() => setShowPw((s) => !s)}
                        />
                      }
                      style={styles.webInput}
                      textColor="#1f2937"
                      outlineColor="#e5e7eb"
                      activeOutlineColor="#C836F9"
                      contentStyle={styles.webInputContent}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="confirm"
                  rules={{ required: true }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      label="Confirm Password"
                      mode="outlined"
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPw2}
                      right={
                        <TextInput.Icon
                          icon={showPw2 ? 'eye-off' : 'eye'}
                          onPress={() => setShowPw2((s) => !s)}
                        />
                      }
                      style={styles.webInput}
                      textColor="#1f2937"
                      outlineColor="#e5e7eb"
                      activeOutlineColor="#C836F9"
                      contentStyle={styles.webInputContent}
                    />
                  )}
                />

                <Button
                  mode="contained"
                  onPress={handleSubmit(onSubmit)}
                  style={[
                    styles.webSignupBtn,
                    { backgroundColor: formFilled ? '#C836F9' : '#ccc' },
                  ]}
                  disabled={!formFilled || loading}
                  loading={loading}
                  labelStyle={styles.webButtonLabel}
                >
                  Create Partner Account
                </Button>

                <View style={styles.webDivider}>
                  <View style={styles.webLine} />
                  <Text style={styles.webDividerText}>or</Text>
                  <View style={styles.webLine} />
                </View>

                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Login')}
                  textColor="#C836F9"
                  style={styles.webLoginBtn}
                  labelStyle={styles.webLoginLabel}
                >
                  Already have an account? Log in
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </View>
    );
  }

  // Mobile layout (original design)
  return (
    <View style={styles.container}>
      {/* Top section with background and image */}
      <View style={styles.topSection}>
        <TouchableOpacity 
          style={[styles.closeButton, { top: insets.top + 10 }]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <Image
          source={require('../../../assets/blacklogo.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      {/* Bottom card section */}
      <View style={styles.bottomCard}>
        <Text style={styles.title}>Sign up</Text>
        <Controller
          control={control}
          name="username"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Username"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              style={styles.input}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Email"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: true, minLength: 6 }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Password"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showPw}
              right={
                <TextInput.Icon
                  icon={showPw ? 'eye-off' : 'eye'}
                  onPress={() => setShowPw((s) => !s)}
                />
              }
              style={styles.input}
            />
          )}
        />

        <Controller
          control={control}
          name="confirm"
          rules={{ required: true }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              label="Confirm Password"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              secureTextEntry={!showPw2}
              right={
                <TextInput.Icon
                  icon={showPw2 ? 'eye-off' : 'eye'}
                  onPress={() => setShowPw2((s) => !s)}
                />
              }
              style={styles.input}
            />
          )}
        />

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          style={[
            styles.primaryBtn,
            { backgroundColor: formFilled ? '#C836F9' : '#ccc' },
          ]}
          disabled={!formFilled || loading}
          loading={loading}
        >
          Sign up
        </Button>

        {/* Divider */}
        <View style={styles.dividerWrap}>
          <View style={styles.line} />
        </View>

        {/* Link back to login */}
        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          textColor="#C836F9"
          style={{ marginTop: 4 }}
        >
          already have an account? log in
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C836F9', position: 'relative' },
  topSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeButton: { position: 'absolute', top: 50, left: 20 },
  heroImage: { width: 450, height: 450 },
  bottomCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 45,
    marginTop: -50,
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  input: { marginTop: 10 },
  primaryBtn: { marginTop: 16, paddingVertical: 6, backgroundColor: '#C836F9' },
  dividerWrap: { marginTop: 22, marginBottom: 8 },
  line: { height: 1, backgroundColor: '#e5e7eb' },

  // Web styles
  webContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  webBackButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  webBackButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  webCentered: {
    width: '100%',
    maxWidth: 480,
  },
  webCard: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  webCardContent: {
    padding: 40,
  },
  webLogoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  webLogo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  webTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  webSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  webForm: {
    width: '100%',
  },
  webInput: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  webInputContent: {
    color: '#1f2937',
  },
  webSignupBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  webButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  webDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  webLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  webDividerText: {
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14,
  },
  webLoginBtn: {
    marginTop: 0,
  },
  webLoginLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
