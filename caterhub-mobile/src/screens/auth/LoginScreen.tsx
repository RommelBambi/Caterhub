import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '../../store/auth';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const { control, handleSubmit, watch } = useForm({ defaultValues: { email: '', password: '' } });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

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
      {/* Top section with background and image */}
      <View style={styles.topSection}>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C836F9' },
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
  input: { marginTop: 10 },
  loginBtn: { marginTop: 16, paddingVertical: 6 },
  dividerWrap: { marginTop: 22, marginBottom: 8 },
  line: { height: 1, backgroundColor: '#e5e7eb' },
});
