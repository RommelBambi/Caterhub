import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Divider, Card, RadioButton, TextInput } from 'react-native-paper';
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

  // Get sections from raw package data (database format) or categories (legacy format)
  const sections = pkg._raw?.sections || [];
  const categories = pkg.categories || [];

  // If we have sections (new format), convert to category-like structure for selection
  const selectionCategories: PackageCategory[] = sections.length > 0
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

  const allRequiredChosen = selectionCategories.every((cat: PackageCategory) =>
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

    navigation.navigate('BookingForm', { service, pkg, picks: picked, notes });
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

        {selectionCategories.length > 0 ? (
          selectionCategories.map((cat: PackageCategory) => (
            <Card key={cat.id} style={styles.catCard}>
              <Card.Content>
                <Text style={styles.catTitle}>
                  {cat.name} {cat.required !== false ? '(required)' : '(optional)'}
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

      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          style={{ flex: 1, backgroundColor: (allRequiredChosen || selectionCategories.length === 0) ? '#FF8000' : '#ccc' }}
          onPress={goNext}
          disabled={selectionCategories.length > 0 && !allRequiredChosen}
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
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
});
