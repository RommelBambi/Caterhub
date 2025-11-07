import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/auth';

/**
 * Mobile-optimized login screen
 */
export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAuth();
  const { control, handleSubmit, watch } = useForm({ defaultValues: { email: '', password: '' } });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCaterer, setIsCaterer] = useState(false);
  const insets = useSafeAreaInsets();

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
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <Image
            source={require('../../../assets/blacklogo.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.bottomCard}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Log in or Sign up</Text>
          <View style={styles.segmentedControl}>
            <View
              style={[
                styles.segmentThumb,
                isCaterer ? styles.segmentThumbRight : styles.segmentThumbLeft,
              ]}
            />
            <TouchableOpacity style={styles.segmentItem} onPress={() => setIsCaterer(false)}>
              <Text style={[styles.segmentText, !isCaterer ? styles.segmentTextActive : styles.segmentTextInactive]}>Client</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.segmentItem} onPress={() => setIsCaterer(true)}>
              <Text style={[styles.segmentText, isCaterer ? styles.segmentTextActive : styles.segmentTextInactive]}>Caterer</Text>
            </TouchableOpacity>
          </View>
        </View>

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
            { backgroundColor: formFilled && isValidEmail ? '#FF8000' : '#ccc' },
          ]}
          disabled={!formFilled || !isValidEmail || loading}
          loading={loading}
        >
          Login
        </Button>

        <View style={styles.dividerWrap}>
          <View style={styles.line} />
        </View>

        <Button
          mode="text"
          onPress={() => {
            if (isCaterer) {
              // Navigate to Partner Application Screen for mobile
              navigation.navigate('PartnerApplication');
            } else {
              navigation.navigate('Register');
            }
          }}
          textColor="#FF8000"
          style={{ marginTop: 4 }}
        >
          create account
        </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FF8000' },
  scrollContent: { flexGrow: 1 },
  topSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: 550, height: 550 },
  bottomCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 45,
    marginTop: -50,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  segmentedControl: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8000',
    padding: 2,
    borderRadius: 9999,
    width: 150,
    height: 36,
  },
  segmentThumb: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: '50%',
    borderRadius: 9999,
    backgroundColor: '#ffffff',
  },
  segmentThumbLeft: { left: 2 },
  segmentThumbRight: { right: 2 },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  segmentText: { fontSize: 13 },
  segmentTextActive: { color: '#FF8000', fontWeight: '700' },
  segmentTextInactive: { color: '#ffffff', fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  input: { marginTop: 10 },
  loginBtn: { marginTop: 16, paddingVertical: 6 },
  dividerWrap: { marginTop: 22, marginBottom: 8 },
  line: { height: 1, backgroundColor: '#e5e7eb' },
});
