import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Divider, Card, RadioButton, TextInput, Checkbox } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Service, ServicePackage, PackageCategory, DishOption } from '../../services/services';

type ChoiceMap = Record<string, string>;

export default function CustomizePackage({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const service = route.params.service as Service;
  const pkg = route.params.pkg as ServicePackage & { _raw?: any };
  const [choices, setChoices] = React.useState<ChoiceMap>({});
  const [notes, setNotes] = React.useState('');
  const [hasAllergies, setHasAllergies] = React.useState(false);
  const [allergyDetails, setAllergyDetails] = React.useState('');

  // Get sections from raw package data (database format) or categories (legacy format)
  const sections = pkg._raw?.sections || [];
  const categories = pkg.categories || [];
  const selectionMode = pkg._raw?.selection_mode || 'CHOICE_BASED';

  // If FIXED_MENU, show all dishes as a fixed list (no selection needed)
  // If CHOICE_BASED, convert to category-like structure for selection
  const selectionCategories: PackageCategory[] = selectionMode === 'FIXED_MENU'
    ? [] // No selection needed for fixed menu
    : sections.length > 0
    ? sections.map((section: any, idx: number) => ({
        id: `section_${idx}`,
        name: section.category || 'Category',
        options: (section.dishes || []).map((dish: string, dishIdx: number) => ({
          id: `dish_${idx}_${dishIdx}`,
          name: dish,
        })),
        required: true,
        pick: 1,
      }))
    : categories;

  const select = (categoryId: string, optionId: string) => {
    setChoices(prev => ({ ...prev, [categoryId]: optionId }));
  };

  // For FIXED_MENU, no selection is required
  const allRequiredChosen = selectionMode === 'FIXED_MENU' 
    ? true 
    : selectionCategories.every((cat: PackageCategory) =>
        cat.required === false ? true : !!choices[cat.id]
      );

  const goNext = () => {
    const picked = selectionCategories.map((cat: PackageCategory) => {
      const opt = cat.options.find((o: DishOption) => o.id === choices[cat.id]);
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        optionId: opt?.id ?? '',
        optionName: opt?.name ?? '',
      };
    });

    navigation.navigate('BookingForm', { 
      service, 
      pkg, 
      picks: picked, 
      notes,
      allergies: hasAllergies ? allergyDetails : ''
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Back (scrolls) */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTap}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          {pkg.name} • {typeof pkg._raw?.price === 'string' ? pkg._raw.price : `₱${pkg.pricePerHead} / head`}
        </Text>
        <Text style={styles.subtitle}>{service.name}</Text>

        {/* Show fixed menu for FIXED_MENU packages */}
        {selectionMode === 'FIXED_MENU' && sections.length > 0 ? (
          <Card style={styles.catCard}>
            <Card.Content>
              <Text style={styles.catTitle}>Fixed Menu - All Dishes Included</Text>
              {sections.map((section: any, sectionIdx: number) => (
                <View key={sectionIdx} style={styles.fixedMenuSection}>
                  <Text style={styles.fixedMenuCategory}>
                    {String(section.category || 'Category').replace(/^\w/, (c) => c.toUpperCase())}
                  </Text>
                  {section.dishes && section.dishes.length > 0 ? (
                    <View style={styles.fixedMenuDishes}>
                      {section.dishes.map((dish: string, dishIdx: number) => (
                        <View key={dishIdx} style={styles.fixedMenuDish}>
                          <Text style={styles.fixedMenuDishText}>• {dish}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
              <Text style={styles.muted}>
                This is a fixed menu package. All listed dishes are included and cannot be changed. Continue to booking to proceed.
              </Text>
            </Card.Content>
          </Card>
        ) : selectionCategories.length > 0 ? (
          selectionCategories.map((cat: PackageCategory) => (
            <Card key={cat.id} style={styles.catCard}>
              <Card.Content>
                <Text style={styles.catTitle}>
                  {`Choice of ${String(cat.name).replace(/^\w/, (c) => c.toUpperCase())}`} {cat.required !== false ? '(required)' : '(optional)'}
                </Text>

                <RadioButton.Group
                  onValueChange={(val: string) => select(cat.id, val)}
                  value={choices[cat.id]}
                >
                  {cat.options.map((opt: DishOption) => (
                    <RadioButton.Item
                      key={opt.id}
                      value={opt.id}
                      label={opt.name}
                      position="leading"
                      style={styles.radioItem}
                      labelStyle={styles.radioLabel}
                      color="#FF8000"
                      uncheckedColor="#9ca3af"
                    />
                  ))}
                </RadioButton.Group>

                <Divider style={{ marginTop: 6 }} />
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.catCard}>
            <Card.Content>
              <Text style={styles.muted}>This package doesn't require customization. Continue to booking.</Text>
            </Card.Content>
          </Card>
        )}

        {/* Allergies and Dietary Restrictions Section */}
        <Card style={styles.catCard}>
          <Card.Content>
            <Text style={styles.catTitle}>
              Do any guests have allergies or dietary restrictions?
            </Text>

            <View style={styles.checkboxContainer}>
              <Checkbox
                status={hasAllergies ? 'checked' : 'unchecked'}
                onPress={() => {
                  setHasAllergies(!hasAllergies);
                  if (hasAllergies) {
                    setAllergyDetails('');
                  }
                }}
                color="#FF8000"
              />
              <Text style={styles.checkboxLabel}>Yes — please specify</Text>
            </View>

            {hasAllergies && (
              <View style={styles.allergyInputContainer}>
                <TextInput
                  mode="outlined"
                  placeholder="List the allergy or restriction and any details (e.g., 'allergic to shellfish,' 'no pork')"
                  value={allergyDetails}
                  onChangeText={setAllergyDetails}
                  multiline
                  numberOfLines={4}
                  style={styles.allergyInput}
                  outlineColor="#e5e7eb"
                  activeOutlineColor="#FF8000"
                />
                <Text style={styles.helperText}>
                  Note: We can only remove side ingredients or optional components. We cannot remove core ingredients of a listed dish (for example, if a dish is pork-based, we cannot remove the pork).
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          style={{ flex: 1, backgroundColor: allRequiredChosen ? '#FF8000' : '#ccc' }}
          onPress={goNext}
          disabled={!allRequiredChosen}
        >
          Continue to booking
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backTap: { padding: 6, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 1)' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 4, marginTop: 4 },
  subtitle: { color: '#6b7280', marginBottom: 12 },
  catCard: { marginBottom: 14, borderRadius: 12, backgroundColor: '#fafafa' },
  catTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  radioItem: { paddingHorizontal: 0, marginLeft: -6 },
  radioLabel: { fontSize: 14 },
  muted: { color: '#6b7280', fontSize: 14 },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  allergyInputContainer: {
    marginTop: 12,
  },
  allergyInput: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
  fixedMenuSection: {
    marginBottom: 16,
  },
  fixedMenuCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 8,
  },
  fixedMenuDishes: {
    marginLeft: 8,
  },
  fixedMenuDish: {
    marginBottom: 4,
  },
  fixedMenuDishText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});
