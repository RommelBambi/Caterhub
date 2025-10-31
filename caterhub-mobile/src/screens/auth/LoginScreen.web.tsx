import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/auth';

/**
 * Web-optimized login screen for partners
 */
export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const { control, handleSubmit, watch } = useForm({ defaultValues: { email: '', password: '' } });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const canGoBack = navigation.canGoBack();

  const watchEmail = watch('email');
  const watchPass = watch('password');
  const formFilled = watchEmail.trim() !== '' && watchPass.trim() !== '';
  const isValidEmail = watchEmail.includes('@') && watchEmail.includes('.');

  const onSubmit = async (d: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(d.email, d.password);
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err?.message || err?.error?.message || 'Invalid email or password.';
      alert(`Login Failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {canGoBack && (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#6b7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      )}
      <View style={styles.centered}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/blacklogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Partner & Admin Login</Text>
              <Text style={styles.subtitle}>Login for partners and administrators (web only)</Text>
            </View>

            <View style={styles.form}>
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
                    textColor="#1f2937"
                    outlineColor="#e5e7eb"
                    activeOutlineColor="#C836F9"
                    contentStyle={styles.inputContent}
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
                    textColor="#1f2937"
                    outlineColor="#e5e7eb"
                    activeOutlineColor="#C836F9"
                    contentStyle={styles.inputContent}
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
                labelStyle={styles.buttonLabel}
              >
                Login
              </Button>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                mode="text"
                onPress={() => navigation.navigate('Register')}
                textColor="#C836F9"
                style={styles.signupBtn}
                labelStyle={styles.signupLabel}
              >
                Create Partner Account
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
  },
  backButton: {
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
  backButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  centered: {
    width: '100%',
    maxWidth: 440,
  },
  card: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cardContent: {
    padding: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  inputContent: {
    color: '#1f2937',
  },
  loginBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14,
  },
  signupBtn: {
    marginTop: 0,
  },
  signupLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

