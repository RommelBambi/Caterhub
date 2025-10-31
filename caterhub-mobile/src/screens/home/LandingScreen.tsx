import React from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground, Pressable, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { COLORS } from '../../constants/colors';

export default function LandingScreen() {
  const navigation = useNavigation<any>();

  const HERO_BG = "https://unsplash.com/photos/PfSWf6safqs/download?force=true&q=80&w=2000&auto=format&fit=crop";
  const PATTERN_BG = "https://unsplash.com/photos/3vwaxiyWLc0/download?force=true&q=80&w=1600&auto=format&fit=crop";

  const categories = ["Breakfast", "Lunch", "Snacks", "Desserts", "Corporate", "Wedding", "Healthy", "Kids party"];

  const goPartners = () => {
    navigation.navigate('Login');
  };

  // --- square button used only on this page ---
  const SquareButton = ({
    label,
    onPress,
    variant = "solid",
    invert,
    danger,
    size = "md",
  }: {
    label: string;
    onPress?: () => void;
    variant?: "solid" | "outline" | "ghost";
    invert?: boolean;
    danger?: boolean;
    size?: "sm" | "md" | "lg";
  }) => {
    const sizeMap = {
      sm: { pv: 8, ph: 14, fontSize: 13 },
      md: { pv: 10, ph: 16, fontSize: 14 },
      lg: { pv: 14, ph: 24, fontSize: 16 },
    };
    const { pv, ph, fontSize } = sizeMap[size];
    const solidBg = danger ? COLORS.danger : COLORS.primary;
    const bg = variant === "solid" ? solidBg : "transparent";
    const textC = variant === "solid" ? "#fff" : invert ? "#fff" : danger ? COLORS.danger : COLORS.text;
    const borderC = variant === "outline"
      ? (invert ? "#ffffff66" : danger ? COLORS.danger : COLORS.border)
      : "transparent";

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          transform: [{ scale: pressed ? 0.98 : 1 }],
          paddingVertical: pv,
          paddingHorizontal: ph,
          borderRadius: 8,
          backgroundColor: bg,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: borderC,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ color: textC, fontWeight: "800", letterSpacing: 0.2, fontSize }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Container>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/blacklogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>CaterHub</Text>
            </View>
            <View style={styles.headerButtons}>
              <Pressable
                onPress={() => Alert.alert("Contact", "Email: support@caterhub.io\nPhone: (02) 1234-5678")}
                style={({ pressed }) => [
                  styles.headerLink,
                  pressed && styles.headerLinkPressed,
                ]}
              >
                <Text style={styles.headerLinkText}>Contact</Text>
              </Pressable>
              <View style={{ marginLeft: 16 }}>
                <SquareButton
                  label="Partnership"
                  variant="solid"
                  onPress={goPartners}
                  size="md"
                />
              </View>
            </View>
          </View>
        </Container>
      </View>

      {/* Hero Section */}
      <ImageBackground
        source={{ uri: HERO_BG }}
        style={styles.heroBackground}
        imageStyle={{ resizeMode: "cover" }}
      >
        <View style={styles.heroOverlay} />
        <Container>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              Serving memories{"\n"}with hearty food.
            </Text>
            <Text style={styles.heroSubtitle}>
              Connect with the best caterers in your area. From intimate gatherings to grand celebrations, we bring exceptional culinary experiences to every event.
            </Text>
            <View style={styles.heroButtons}>
              <View style={{ marginRight: 12, marginBottom: 12 }}>
                <SquareButton
                  label="Explore Caterers"
                  onPress={() => Alert.alert("Coming Soon", "Mobile app coming soon!")}
                  size="lg"
                />
              </View>
              <View style={{ marginRight: 12, marginBottom: 12 }}>
                <SquareButton
                  label="Partner With Us"
                  variant="outline"
                  invert
                  onPress={goPartners}
                  size="lg"
                />
              </View>
            </View>
            <View style={styles.statsContainer}>
              {[
                ["2,500+", "Happy events"],
                ["450+", "Local caterers"],
                ["4.9★", "Avg. rating"],
                ["24/7", "Support"],
              ].map(([n, t]) => (
                <View key={t} style={styles.statCard}>
                  <Text style={styles.statNumber}>{n}</Text>
                  <Text style={styles.statLabel}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </Container>
      </ImageBackground>

      {/* Main Content */}
      <ImageBackground 
        source={{ uri: PATTERN_BG }} 
        style={styles.patternBackground} 
        imageStyle={{ resizeMode: "cover", opacity: 0.16 }}
      >
        <View style={styles.contentWrapper}>
          <Container>
            {/* Features Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionMainTitle}>Why Choose CaterHub?</Text>
              <Text style={styles.sectionSubtitle}>Everything you need for seamless catering experiences</Text>
            </View>

            <View style={styles.featuresGrid}>
              {[
                {
                  icon: "restaurant",
                  title: "Wide Selection",
                  description: "Browse hundreds of verified caterers offering diverse cuisines and packages for any occasion."
                },
                {
                  icon: "shield-checkmark",
                  title: "Verified Partners",
                  description: "All caterers are carefully vetted to ensure quality, reliability, and exceptional service."
                },
                {
                  icon: "time",
                  title: "Fast Booking",
                  description: "Book your catering in minutes. Compare quotes, customize packages, and confirm instantly."
                },
                {
                  icon: "card",
                  title: "Secure Payments",
                  description: "Safe and secure payment processing with multiple options including GCash and bank transfer."
                },
                {
                  icon: "location",
                  title: "Location-Based",
                  description: "Find caterers near you. We connect you with the best local options for your event."
                },
                {
                  icon: "star",
                  title: "Rated & Reviewed",
                  description: "Make informed decisions with real reviews and ratings from previous customers."
                },
              ].map((feature, idx) => (
                <Card key={idx} pad={24} style={styles.featureCard}>
                  <View style={styles.featureIconContainer}>
                    <Ionicons name={feature.icon as any} size={32} color={COLORS.primary} />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </Card>
              ))}
            </View>

            <View style={{ height: 40 }} />

            {/* Categories Section */}
            <Card pad={28} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Browse by Category</Text>
                <Text style={styles.sectionSubtitleSmall}>Find the perfect cuisine for your event</Text>
              </View>
              <View style={styles.categoriesGrid}>
                {categories.map((c) => (
                  <View key={c} style={{ marginRight: 10, marginBottom: 10 }}>
                    <SquareButton
                      label={c}
                      variant="outline"
                      onPress={() => Alert.alert(c, "Browse coming soon")}
                      size="sm"
                    />
                  </View>
                ))}
              </View>
            </Card>

            <View style={{ height: 40 }} />

            {/* Partner Benefits Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionMainTitle}>Grow Your Catering Business</Text>
              <Text style={styles.sectionSubtitle}>Join hundreds of successful partners on CaterHub</Text>
            </View>

            <View style={styles.benefitsGrid}>
              {[
                {
                  icon: "search",
                  title: "Reach New Customers",
                  description: "Be discovered across your city with search optimization and promotional features."
                },
                {
                  icon: "cash",
                  title: "Easy Payouts",
                  description: "Weekly, biweekly, or monthly bank transfer or GCash options. Get paid on time, every time."
                },
                {
                  icon: "briefcase",
                  title: "Business Tools",
                  description: "Calendar management, quote builder, analytics dashboard, and message center included."
                },
              ].map((benefit, idx) => (
                <View key={idx} style={styles.benefitCard}>
                  <Card pad={24}>
                    <View style={styles.benefitIconContainer}>
                      <Ionicons name={benefit.icon as any} size={28} color={COLORS.primary} />
                    </View>
                    <Text style={styles.benefitTitle}>{benefit.title}</Text>
                    <Text style={styles.benefitDescription}>{benefit.description}</Text>
                  </Card>
                </View>
              ))}
            </View>

            <View style={{ height: 40 }} />

            {/* How It Works Section */}
            <Card pad={28}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>How It Works</Text>
                <Text style={styles.sectionSubtitleSmall}>Getting started is simple</Text>
              </View>
              <View style={styles.howItWorksList}>
                {[
                  {
                    title: "Tell us about your event",
                    description: "Date, headcount, budget, and preferences. We'll match you with the perfect caterers."
                  },
                  {
                    title: "Compare quotes",
                    description: "Receive personalized quotes from multiple caterers. Review menus, packages, and pricing."
                  },
                  {
                    title: "Book & pay securely",
                    description: "Choose your favorite caterer and book instantly. Secure payments with fast payouts."
                  },
                ].map((step, i) => (
                  <View key={step.title} style={styles.howItWorksItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{i + 1}</Text>
                    </View>
                    <View style={styles.howItWorksContent}>
                      <Text style={styles.howItWorksTitle}>{step.title}</Text>
                      <Text style={styles.howItWorksDescription}>{step.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            <View style={{ height: 40 }} />

            {/* Testimonials Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionMainTitle}>What Our Customers Say</Text>
              <Text style={styles.sectionSubtitle}>Real experiences from real people</Text>
            </View>

            <View style={styles.testimonialsGrid}>
              {[
                {
                  name: "Maria Santos",
                  role: "Event Organizer",
                  text: "CaterHub made planning our corporate event so easy. Found the perfect caterer and the food was exceptional!",
                  rating: 5
                },
                {
                  name: "John Reyes",
                  role: "Wedding Planner",
                  text: "As a wedding planner, I trust CaterHub for all my events. The variety and quality of caterers is unmatched.",
                  rating: 5
                },
                {
                  name: "Sarah Chen",
                  role: "Corporate Events",
                  text: "The booking process was seamless and the caterer exceeded expectations. Will definitely use again!",
                  rating: 5
                },
              ].map((testimonial, idx) => (
                <Card key={idx} pad={24} style={styles.testimonialCard}>
                  <View style={styles.testimonialStars}>
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Ionicons key={i} name="star" size={16} color="#f59e0b" />
                    ))}
                  </View>
                  <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
                  <View style={styles.testimonialAuthor}>
                    <View style={styles.testimonialAvatar}>
                      <Text style={styles.testimonialAvatarText}>
                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.testimonialName}>{testimonial.name}</Text>
                      <Text style={styles.testimonialRole}>{testimonial.role}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>

            <View style={{ height: 40 }} />

            {/* FAQ Section */}
            <Card pad={28}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
              </View>
              <View style={styles.faqList}>
                {[
                  {
                    q: "How do I find caterers near me?",
                    a: "Simply browse our platform and use location filters to find caterers in your area. All caterers show their service radius and delivery options."
                  },
                  {
                    q: "Can I customize catering packages?",
                    a: "Yes! Most caterers offer customizable packages. You can modify menus, adjust quantities, and add special requests during booking."
                  },
                  {
                    q: "What payment methods are accepted?",
                    a: "We accept credit cards, debit cards, GCash, and bank transfers. Caterers receive secure payouts according to their preferred schedule."
                  },
                  {
                    q: "How do I become a partner caterer?",
                    a: "Click the 'Partnership' button in the header or click 'Become a partner' below. Complete the registration form and our team will review your application."
                  },
                ].map((faq, idx) => (
                  <View key={idx} style={styles.faqItem}>
                    <View style={styles.faqQuestion}>
                      <Ionicons name="help-circle" size={20} color={COLORS.primary} />
                      <Text style={styles.faqQuestionText}>{faq.q}</Text>
                    </View>
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <View style={{ height: 40 }} />

            {/* CTA Section */}
            <View style={styles.ctaSection}>
              <Text style={styles.ctaTitle}>
                Ready to get more bookings?
              </Text>
              <Text style={styles.ctaSubtitle}>
                Join hundreds of partners growing their business with CaterHub. Start accepting orders today!
              </Text>
              <View style={styles.ctaButtons}>
                <View style={{ marginRight: 12, marginTop: 12 }}>
                  <SquareButton
                    label="Become a Partner"
                    invert
                    variant="outline"
                    onPress={goPartners}
                    size="lg"
                  />
                </View>
                <View style={{ marginRight: 12, marginTop: 12 }}>
                  <SquareButton
                    label="Contact Sales"
                    invert
                    variant="outline"
                    onPress={() => Alert.alert("Contact Sales", "Email: sales@caterhub.io\nPhone: (02) 1234-5678")}
                    size="lg"
                  />
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.footerContent}>
                <View style={styles.footerSection}>
                  <View style={styles.footerLogoContainer}>
                    <Image
                      source={require('../../../assets/blacklogo.png')}
                      style={styles.footerLogo}
                      resizeMode="contain"
                    />
                    <Text style={styles.footerLogoText}>CaterHub</Text>
                  </View>
                  <Text style={styles.footerDescription}>
                    Connecting exceptional caterers with memorable events. Your trusted platform for all catering needs.
                  </Text>
                </View>
                <View style={styles.footerSection}>
                  <Text style={styles.footerSectionTitle}>For Customers</Text>
                  <Pressable onPress={() => Alert.alert("Browse", "Coming soon")}>
                    <Text style={styles.footerLink}>Browse Caterers</Text>
                  </Pressable>
                  <Pressable onPress={() => Alert.alert("How it works", "See above")}>
                    <Text style={styles.footerLink}>How It Works</Text>
                  </Pressable>
                  <Pressable onPress={() => Alert.alert("Support", "support@caterhub.io")}>
                    <Text style={styles.footerLink}>Help Center</Text>
                  </Pressable>
                </View>
                <View style={styles.footerSection}>
                  <Text style={styles.footerSectionTitle}>For Partners</Text>
                  <Pressable onPress={goPartners}>
                    <Text style={styles.footerLink}>Partner Login</Text>
                  </Pressable>
                  <Pressable onPress={goPartners}>
                    <Text style={styles.footerLink}>Sign Up</Text>
                  </Pressable>
                  <Pressable onPress={() => Alert.alert("Partner Resources", "Coming soon")}>
                    <Text style={styles.footerLink}>Resources</Text>
                  </Pressable>
                </View>
                <View style={styles.footerSection}>
                  <Text style={styles.footerSectionTitle}>Company</Text>
                  <Pressable onPress={() => Alert.alert("About", "CaterHub - Connecting caterers and events")}>
                    <Text style={styles.footerLink}>About Us</Text>
                  </Pressable>
                  <Pressable onPress={() => Alert.alert("Contact", "support@caterhub.io")}>
                    <Text style={styles.footerLink}>Contact</Text>
                  </Pressable>
                  <Pressable onPress={() => Alert.alert("Terms", "Terms of Service")}>
                    <Text style={styles.footerLink}>Terms</Text>
                  </Pressable>
                  <Pressable onPress={() => Alert.alert("Privacy", "Privacy Policy")}>
                    <Text style={styles.footerLink}>Privacy</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.footerBottom}>
                <Text style={styles.footerBottomText}>
                  © {new Date().getFullYear()} CaterHub. All rights reserved.
                </Text>
                <View style={styles.footerSocial}>
                  <Pressable onPress={() => Alert.alert("Facebook", "Follow us on Facebook")}>
                    <Ionicons name="logo-facebook" size={20} color={COLORS.textLight} />
                  </Pressable>
                  <Pressable onPress={() => Alert.alert("Instagram", "Follow us on Instagram")} style={{ marginLeft: 16 }}>
                    <Ionicons name="logo-instagram" size={20} color={COLORS.textLight} />
                  </Pressable>
                  <Pressable onPress={() => Alert.alert("Twitter", "Follow us on Twitter")} style={{ marginLeft: 16 }}>
                    <Ionicons name="logo-twitter" size={20} color={COLORS.textLight} />
                  </Pressable>
                </View>
              </View>
            </View>
          </Container>
        </View>
      </ImageBackground>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 16,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerLinkPressed: {
    opacity: 0.7,
  },
  headerLinkText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  heroBackground: {
    width: "100%",
    minHeight: 650,
    justifyContent: "flex-end",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000055",
  },
  heroContent: {
    paddingHorizontal: 18,
    paddingTop: 80,
    paddingBottom: 50,
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 56,
    marginBottom: 16,
    lineHeight: 62,
    letterSpacing: -1.5,
  },
  heroSubtitle: {
    color: "#ffffffd9",
    marginBottom: 32,
    fontSize: 20,
    lineHeight: 30,
    maxWidth: 600,
  },
  heroButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: -12,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 40,
    marginHorizontal: -6,
  },
  statCard: {
    backgroundColor: "#ffffff22",
    borderColor: "#ffffff55",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 140,
    marginRight: 12,
    marginBottom: 12,
    marginHorizontal: 6,
  },
  statNumber: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    color: "#ffffffd9",
    fontSize: 14,
    fontWeight: '500',
  },
  patternBackground: {
    width: "100%",
  },
  contentWrapper: {
    padding: 32,
  },
  sectionHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  sectionMainTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: COLORS.textLight,
    textAlign: 'center',
    maxWidth: 600,
  },
  sectionSubtitleSmall: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 0,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -12,
    marginBottom: -24,
  },
  featureCard: {
    width: '31%',
    minWidth: 300,
    marginHorizontal: 12,
    marginBottom: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    color: COLORS.textLight,
    lineHeight: 24,
    fontSize: 15,
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -12,
    marginBottom: -24,
  },
  benefitCard: {
    flex: 1,
    minWidth: 300,
    marginHorizontal: 12,
    marginBottom: 24,
  },
  benefitIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  benefitTitle: {
    color: COLORS.text,
    fontWeight: "900",
    marginBottom: 8,
    fontSize: 18,
  },
  benefitDescription: {
    color: COLORS.textLight,
    lineHeight: 24,
    fontSize: 15,
  },
  howItWorksList: {
    marginTop: 16,
  },
  howItWorksItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  stepNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
    flexShrink: 0,
  },
  stepNumberText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  howItWorksContent: {
    flex: 1,
    paddingTop: 4,
  },
  howItWorksTitle: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 8,
  },
  howItWorksDescription: {
    color: COLORS.textLight,
    fontSize: 16,
    lineHeight: 24,
  },
  testimonialsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -12,
    marginBottom: -24,
  },
  testimonialCard: {
    flex: 1,
    minWidth: 300,
    marginHorizontal: 12,
    marginBottom: 24,
  },
  testimonialStars: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  testimonialText: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  testimonialAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testimonialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  testimonialAvatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
  testimonialName: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  testimonialRole: {
    color: COLORS.textLight,
    fontSize: 13,
  },
  faqList: {
    marginTop: 16,
  },
  faqItem: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  faqQuestionText: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 17,
    marginLeft: 12,
    flex: 1,
  },
  faqAnswer: {
    color: COLORS.textLight,
    fontSize: 15,
    lineHeight: 24,
    marginLeft: 32,
  },
  ctaSection: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 48,
    borderWidth: 1,
    borderColor: "#ffffff22",
    alignItems: 'center',
  },
  ctaTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 32,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  ctaSubtitle: {
    color: "#ffffffd9",
    marginBottom: 32,
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 600,
  },
  ctaButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: 'center',
    marginTop: -12,
  },
  footer: {
    marginTop: 48,
    paddingTop: 48,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 32,
    marginHorizontal: -16,
  },
  footerSection: {
    width: '25%',
    minWidth: 200,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  footerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerLogo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  footerLogoText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  footerDescription: {
    color: COLORS.textLight,
    fontSize: 14,
    lineHeight: 22,
  },
  footerSectionTitle: {
    color: COLORS.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 16,
  },
  footerLink: {
    color: COLORS.textLight,
    fontSize: 14,
    marginBottom: 12,
    paddingVertical: 4,
  },
  footerBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
  },
  footerBottomText: {
    color: COLORS.textLight,
    fontSize: 13,
    marginBottom: 12,
  },
  footerSocial: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
