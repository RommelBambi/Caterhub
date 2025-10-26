import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../store/auth';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { control, handleSubmit, watch } = useForm({ defaultValues: { email: '', password: '' } });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const watchEmail = watch('email');
  const watchPass = watch('password');
  const formFilled = watchEmail.trim() !== '' && watchPass.trim() !== '';

  // Check if email input is valid
  const isValidEmail = watchEmail.includes('@') && watchEmail.includes('.');

  const onSubmit = async (d: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(d.email, d.password);
    } catch (err: any) {
      Alert.alert('Login Failed', err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isWeb ? (
        // Web layout - side by side
        <View style={styles.webLayout}>
          {/* Left side - Branding */}
          <View style={styles.webLeftSide}>
            <TouchableOpacity 
              style={[styles.closeButton, { top: insets.top + 10 }]} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            <Image
              source={require('../../../assets/blacklogo.png')}
              style={styles.webHeroImage}
              resizeMode="contain"
            />
          </View>

          {/* Right side - Form */}
          <View style={styles.webRightSide}>
            <View style={styles.webFormCard}>
              <Text style={styles.webTitle}>Welcome Back</Text>
              <Text style={styles.webSubtitle}>Sign in to your account</Text>

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
              style={styles.input}
              outlineColor="#d1d5db"
              activeOutlineColor="#C836F9"
              textColor="#000000"
              placeholderTextColor="#9ca3af"
              selectionColor="#C836F9"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: true }}
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
              outlineColor="#d1d5db"
              activeOutlineColor="#C836F9"
              textColor="#000000"
              placeholderTextColor="#9ca3af"
              selectionColor="#C836F9"
            />
          )}
        />

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          style={[
            styles.loginBtn,
            { backgroundColor: formFilled && isValidEmail ? '#C836F9' : '#ccc' },
          ]}
          disabled={!formFilled || !isValidEmail || loading}
          loading={loading}
        >
          Login
        </Button>

        {/* Divider */}
        <View style={styles.dividerWrap}>
          <View style={styles.line} />
        </View>

              {/* Create account link */}
              <Button
                mode="text"
                onPress={() => navigation.navigate('Register')}
                textColor="#C836F9"
                style={{ marginTop: 4 }}
              >
                create account
              </Button>
            </View>
          </View>
        </View>
      ) : (
        // Mobile layout - stacked
        <>
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
            <Text style={styles.title}>Log in or Sign up</Text>

            <Controller
              control={control}
              name="email"
              rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  mode="outlined"
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  outlineColor="#d1d5db"
                  activeOutlineColor="#C836F9"
                  textColor="#000000"
                  placeholderTextColor="#9ca3af"
              selectionColor="#C836F9"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{ required: true, minLength: 6 }}
              render={({ field: { onChange, value } }) => (
                <TextInput
                  mode="outlined"
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  style={styles.input}
                  secureTextEntry={!showPw}
                  right={
                    <TextInput.Icon
                      icon={showPw ? 'eye-off' : 'eye'}
                      onPress={() => setShowPw(!showPw)}
                    />
                  }
                  outlineColor="#d1d5db"
                  activeOutlineColor="#C836F9"
                  textColor="#000000"
                  placeholderTextColor="#9ca3af"
              selectionColor="#C836F9"
                />
              )}
            />

            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[
                styles.loginBtn,
                { backgroundColor: formFilled && isValidEmail ? '#C836F9' : '#ccc' },
              ]}
              disabled={!formFilled || !isValidEmail || loading}
              loading={loading}
            >
              Login
            </Button>

            {/* Divider */}
            <View style={styles.dividerWrap}>
              <View style={styles.line} />
            </View>

            {/* Create account link */}
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              textColor="#C836F9"
              style={{ marginTop: 4 }}
            >
              create account
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C836F9' },
  
  // Web-specific styles
  webLayout: {
    flex: 1,
    flexDirection: 'row',
    minHeight: height,
  },
  webLeftSide: {
    flex: 1,
    backgroundColor: '#C836F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: height,
  },
  webRightSide: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  webFormCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  },
  webTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  webSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  webHeroImage: {
    width: 300,
    height: 300,
  },
  
  // Mobile styles
  topSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeButton: { position: 'absolute', top: 50, left: 20 },
  heroImage: { width: 550, height: 550 },
  bottomCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 45,
    marginTop: -50,
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  input: { 
    marginTop: 10,
    backgroundColor: '#ffffff',
  },
  loginBtn: { marginTop: 16, paddingVertical: 6 },
  dividerWrap: { marginTop: 22, marginBottom: 8 },
  line: { height: 1, backgroundColor: '#e5e7eb' },
});
