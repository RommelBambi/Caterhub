import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, Button } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { register } from '../../services/api';

type Form = {
  username: string;
  email: string;
  password: string;
  confirm: string;
};

export default function RegisterScreen({ navigation }: any) {
  const { control, handleSubmit, watch } = useForm<Form>({
    defaultValues: { username: '', email: '', password: '', confirm: '' },
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

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
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await register(d.email, d.password, d.username);
      Alert.alert('Success', 'Account created! You can now log in.');
      navigation.navigate('Login');
    } catch (e: any) {
      Alert.alert('Registration Failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

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
});
