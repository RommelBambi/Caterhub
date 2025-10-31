import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function LandingScreen() {
  const navigation = useNavigation<any>();

  const handleLoginPress = () => {
    navigation.navigate('Login');
  };

  const handleSignupPress = () => {
    navigation.navigate('Register');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Image
          source={require('../../../assets/blacklogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.heroTitle}>Welcome to CaterHub</Text>
        <Text style={styles.heroSubtitle}>
          Your all-in-one platform for managing catering services, orders, and delivering exceptional culinary experiences.
        </Text>
        
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleLoginPress}
          >
            <Text style={styles.primaryButtonText}>Login as Cater</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleSignupPress}
          >
            <Text style={styles.secondaryButtonText}>Create Partner Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Why Choose CaterHub?</Text>
        
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📦</Text>
            <Text style={styles.featureTitle}>Manage Packages</Text>
            <Text style={styles.featureDescription}>
              Create and customize your catering packages with ease. Add sections, dishes, and inclusions.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📋</Text>
            <Text style={styles.featureTitle}>Track Orders</Text>
            <Text style={styles.featureDescription}>
              Monitor all your bookings in real-time. Stay on top of order status and customer details.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>💼</Text>
            <Text style={styles.featureTitle}>Professional Dashboard</Text>
            <Text style={styles.featureDescription}>
              Access comprehensive analytics and insights to grow your catering business.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureTitle}>Streamlined Workflow</Text>
            <Text style={styles.featureDescription}>
              Simplify your operations with our intuitive interface designed for catering professionals.
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 CaterHub • All rights reserved</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flexGrow: 1,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 80,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 600,
    marginBottom: 40,
  },
  ctaContainer: {
    width: '100%',
    maxWidth: 400,
  },
  primaryButton: {
    backgroundColor: '#C836F9',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#C836F9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C836F9',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#C836F9',
    fontSize: 18,
    fontWeight: '700',
  },
  featuresSection: {
    paddingHorizontal: 24,
    paddingVertical: 80,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 48,
  },
  featuresGrid: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    backgroundColor: '#f9fafb',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    width: '48%',
    marginBottom: 24,
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

