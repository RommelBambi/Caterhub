import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { PartnerStackParamList } from "../../navigation/caterer/PartnerNav";
import { useAuth } from "../../store/auth";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import BottomNav from "../../components/caterer/BottomNav";

import { supabase } from "../../services/supabase";
import { isWeb } from "../../utils/platform";
import { Platform } from "react-native";

type CategoryKey = "pork" | "beef" | "chicken" | "vegetable" | "beverages";

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  pork: "Pork",
  beef: "Beef",
  chicken: "Chicken",
  vegetable: "Vegetable",
  beverages: "Beverages"
};

type PackageSection = {
  category: CategoryKey;
  dishes: string[];
};

type PackageInclusion = {
  name: string;
  price: string;
};

type CateringPackage = {
  id: string;
  name: string;
  price: string;
  sections: PackageSection[];
  inclusions: PackageInclusion[];
};

export default function PartnerManagePackagesScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PartnerStackParamList>>();
  const { user } = useAuth();

  // all saved packages for that caterer
  const [packages, setPackages] = useState<CateringPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // which package are we editing (null = new)
  const [editingPackageId, setEditingPackageId] = useState<string | null>(
    null
  );

  // editable fields for current work-in-progress package
  const [pkgName, setPkgName] = useState("");
  const [pkgPrice, setPkgPrice] = useState("");

  // sections (Pork, Beef, etc.) in the order caterer added them
  const [sections, setSections] = useState<PackageSection[]>([]);

  // inclusions (add-ons with price)
  const [inclusions, setInclusions] = useState<PackageInclusion[]>([]);
  const [newInclusionName, setNewInclusionName] = useState("");
  const [newInclusionPrice, setNewInclusionPrice] = useState("");

  // temporary inputs for "add dish" per section
  // we'll store a local input string per section index
  const [newDishInputs, setNewDishInputs] = useState<Record<number, string>>(
    {}
  );

  // UI for adding a NEW section
  const [newSectionCategory, setNewSectionCategory] =
    useState<CategoryKey>("pork");

  // -------- load user + data on mount --------
  useEffect(() => {
    if (!user) {
      navigation.replace("PartnerHome" as any);
      return;
    }

    loadPackagesFromSupabase();
  }, [navigation, user]);

  // -------- Supabase storage helpers --------
  async function loadPackagesFromSupabase() {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('caterer_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading packages:', error);
        Alert.alert('Error', 'Failed to load packages');
        return;
      }

      // Transform Supabase data to CateringPackage format
      const transformedPackages: CateringPackage[] = (data || []).map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        sections: pkg.sections || [],
        inclusions: pkg.inclusions || [],
      }));

      setPackages(transformedPackages);
    } catch (err) {
      console.error('Failed to load packages', err);
      Alert.alert('Error', 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }

  // -------- editor actions --------

  // reset editor to blank new package
  const handleNewPackage = useCallback(() => {
    setEditingPackageId(null);
    setPkgName("");
    setPkgPrice("");
    setSections([]);
    setInclusions([]);
    setNewDishInputs({});
    setNewSectionCategory("pork");
    setNewInclusionName("");
    setNewInclusionPrice("");
  }, []);

  // load an existing package into the editor for editing
  const handleEditPackage = useCallback((pkg: CateringPackage) => {
    setEditingPackageId(pkg.id);
    setPkgName(pkg.name);
    setPkgPrice(pkg.price);
    setSections(pkg.sections || []);
    setInclusions(pkg.inclusions || []);
    setNewDishInputs({});
    setNewSectionCategory("pork");
    setNewInclusionName("");
    setNewInclusionPrice("");
  }, []);

  // delete a saved package
  const handleDeletePackage = useCallback(
    async (id: string) => {
      if (!user) return;

      Alert.alert(
        'Delete Package',
        'Are you sure you want to delete this package? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Soft delete by setting is_active to false
                const { error } = await supabase
                  .from('packages')
                  .update({ is_active: false })
                  .eq('id', id)
                  .eq('caterer_id', user.id);

                if (error) {
                  throw error;
                }

                // Remove from local state
                const filtered = packages.filter((p) => p.id !== id);
                setPackages(filtered);

                if (editingPackageId === id) {
                  handleNewPackage();
                }

                Alert.alert('Success', 'Package deleted successfully');
              } catch (error: any) {
                console.error('Error deleting package:', error);
                Alert.alert('Error', error?.message || 'Failed to delete package');
              }
            },
          },
        ]
      );
    },
    [editingPackageId, handleNewPackage, packages, user]
  );

  // add a new category section at the bottom
  function handleAddSection() {
    // allow duplicates (multiple Pork sections etc.) for flexibility
    const newSec: PackageSection = {
      category: newSectionCategory,
      dishes: []
    };

    setSections((prev) => [...prev, newSec]);
    setNewSectionCategory("pork");
  }

  // remove an entire section (ex: remove the whole "Pork" block)
  function handleRemoveSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));

    // also clean temporary dish input for that section index
    setNewDishInputs((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  }

  // update the text the caterer is typing for a given section's new dish
  function updateNewDishInput(sectionIndex: number, text: string) {
    setNewDishInputs((prev) => ({
      ...prev,
      [sectionIndex]: text
    }));
  }

  // add a dish line into a specific section
  function handleAddDishToSection(sectionIndex: number) {
    const dishText = (newDishInputs[sectionIndex] || "").trim();
    if (!dishText) return;

    setSections((prev) => {
      const copy = [...prev];
      const sec = { ...copy[sectionIndex] };
      sec.dishes = [...sec.dishes, dishText];
      copy[sectionIndex] = sec;
      return copy;
    });

    // clear that section's input field after adding
    setNewDishInputs((prev) => ({
      ...prev,
      [sectionIndex]: ""
    }));
  }

  // remove a specific dish from a specific section
  function handleRemoveDish(sectionIndex: number, dishIndex: number) {
    setSections((prev) => {
      const copy = [...prev];
      const sec = { ...copy[sectionIndex] };
      sec.dishes = sec.dishes.filter((_, i) => i !== dishIndex);
      copy[sectionIndex] = sec;
      return copy;
    });
  }

  // ----- inclusions logic -----
  function handleAddInclusion() {
    const name = newInclusionName.trim();
    const price = newInclusionPrice.trim();

    if (!name) {
      return;
    }

    const newInc: PackageInclusion = { name, price };
    setInclusions((prev) => [...prev, newInc]);

    setNewInclusionName("");
    setNewInclusionPrice("");
  }

  function handleRemoveInclusion(index: number) {
    setInclusions((prev) => prev.filter((_, i) => i !== index));
  }

  // save package to Supabase
  async function handleSavePackage() {
    if (!user) return;

    if (!pkgName.trim()) {
      Alert.alert("Missing name", "Please enter a package name.");
      return;
    }
    if (!pkgPrice.trim()) {
      Alert.alert("Missing price", "Please enter a package price.");
      return;
    }
    if (sections.length === 0) {
      Alert.alert(
        "No sections",
        "Please add at least one category section (like Pork or Beef)."
      );
      return;
    }

    const totalDishCount = sections.reduce(
      (sum, sec) => sum + sec.dishes.length,
      0
    );
    if (totalDishCount === 0) {
      Alert.alert(
        "No dishes",
        "Please add at least one dish in any section."
      );
      return;
    }

    try {
      const packageData = {
        caterer_id: user.id,
        name: pkgName.trim(),
        price: pkgPrice.trim(),
        sections: sections,
        inclusions: inclusions,
        is_active: true,
      };

      let savedPackage;
      if (editingPackageId) {
        // Update existing package
        const { data, error } = await supabase
          .from('packages')
          .update(packageData)
          .eq('id', editingPackageId)
          .eq('caterer_id', user.id)
          .select()
          .single();

        if (error) throw error;
        savedPackage = data;
      } else {
        // Create new package
        const { data, error } = await supabase
          .from('packages')
          .insert(packageData)
          .select()
          .single();

        if (error) throw error;
        savedPackage = data;
      }

      // Transform to CateringPackage format
      const pkgToSave: CateringPackage = {
        id: savedPackage.id,
        name: savedPackage.name,
        price: savedPackage.price,
        sections: savedPackage.sections || [],
        inclusions: savedPackage.inclusions || [],
      };

      // Update local state
      let updated: CateringPackage[];
      if (editingPackageId) {
        updated = packages.map((p) =>
          p.id === editingPackageId ? pkgToSave : p
        );
      } else {
        updated = [...packages, pkgToSave];
      }
      setPackages(updated);

      Alert.alert(
        "Saved",
        editingPackageId
          ? "Package updated successfully."
          : "New package created successfully."
      );

      // stay in edit mode with the same id
      setEditingPackageId(pkgToSave.id);
    } catch (error: any) {
      console.error('Error saving package:', error);
      Alert.alert('Error', error?.message || 'Failed to save package');
    }
  }

  // -------- subcomponents --------

  function SavedPackagesList() {
    if (loading) {
      return (
        <View style={styles.emptyBox}>
          <ActivityIndicator size="large" color="#9333ea" />
          <Text style={[styles.emptyText, { marginTop: 16 }]}>
            Loading packages...
          </Text>
        </View>
      );
    }

    if (packages.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            You have no saved packages yet.
          </Text>
          <Text style={styles.emptyText}>
            Create one using the editor below.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.savedWrapper}>
        {packages.map((pkg) => (
          <View key={pkg.id} style={styles.savedCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.savedName}>{pkg.name}</Text>
              <Text style={styles.savedPrice}>{pkg.price}</Text>

              <Text style={styles.savedSubtitle}>
                {pkg.sections.length} section
                {pkg.sections.length === 1 ? "" : "s"},{" "}
                {pkg.sections.reduce(
                  (sum, sec) => sum + sec.dishes.length,
                  0
                )}{" "}
                total dishes
              </Text>

              <Text style={styles.savedSubtitle}>
                {pkg.inclusions.length} inclusion
                {pkg.inclusions.length === 1 ? "" : "s"}
              </Text>
            </View>

            <View style={styles.savedBtnCol}>
              <TouchableOpacity
                style={[styles.smallBtn, styles.editBtn]}
                onPress={() => handleEditPackage(pkg)}
                activeOpacity={0.7}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallBtn, styles.deleteBtn]}
                onPress={() => handleDeletePackage(pkg.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // ONE section block (e.g. Pork block)
  function SectionBlock(props: {
    section: PackageSection;
    sectionIndex: number;
  }) {
    const { section, sectionIndex } = props;
    const currentDishDraft = newDishInputs[sectionIndex] || "";

    return (
      <View style={styles.sectionInnerCard}>
        {/* Section header row */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>
            {CATEGORY_LABEL[section.category]}
          </Text>

          <Pressable
            style={styles.removeSectionBtn}
            onPress={() => handleRemoveSection(sectionIndex)}
          >
            <Text style={styles.removeSectionBtnText}>
              Remove Section
            </Text>
          </Pressable>
        </View>

        {/* Dishes list */}
        {section.dishes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No dishes yet in {CATEGORY_LABEL[section.category]}.
            </Text>
            <Text style={styles.emptyText}>
              Add dishes below.
            </Text>
          </View>
        ) : (
          <View style={styles.tableWrapper}>
            <View style={[styles.row, styles.headerRow]}>
              <Text
                style={[styles.cell, styles.headerText, { flex: 1 }]}
              >
                #
              </Text>
              <Text
                style={[styles.cell, styles.headerText, { flex: 5 }]}
              >
                Dish
              </Text>
              <Text
                style={[styles.cell, styles.headerText, { flex: 2 }]}
              >
                Remove
              </Text>
            </View>

            {section.dishes.map((dish, dishIndex) => (
              <View
                key={sectionIndex + "-" + dishIndex + "-" + dish}
                style={[
                  styles.row,
                  dishIndex === section.dishes.length - 1
                    ? styles.lastRow
                    : styles.bodyRow
                ]}
              >
                <Text style={[styles.cell, { flex: 1 }]}>
                  {dishIndex + 1}
                </Text>
                <Text style={[styles.cell, { flex: 5 }]}>{dish}</Text>
                <View style={[styles.cell, { flex: 2 }]}>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() =>
                      handleRemoveDish(sectionIndex, dishIndex)
                    }
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add dish to this section */}
        <Text style={styles.label}>
          Add a dish to {CATEGORY_LABEL[section.category]}
        </Text>

        <View style={styles.addDishRow}>
          <TextInput
            style={[styles.input, styles.addDishInput]}
            placeholder={`e.g. ${
              section.category === "beverages"
                ? "Iced Tea Dispenser"
                : section.category === "pork"
                ? "Pork Adobo"
                : section.category === "beef"
                ? "Roast Beef"
                : section.category === "chicken"
                ? "Chicken BBQ"
                : "Chopsuey"
            }`}
            placeholderTextColor="#9ca3af"
            value={currentDishDraft}
            onChangeText={(txt) =>
              updateNewDishInput(sectionIndex, txt)
            }
          />

          <Pressable
            style={styles.addBtn}
            onPress={() => handleAddDishToSection(sectionIndex)}
          >
            <Text style={styles.addBtnText}>+ Add Dish</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Package editor card on the right / bottom
  function PackageEditor() {
    return (
      <View style={styles.sectionCard}>
        {/* Editor header */}
        <View style={styles.editorHeaderRow}>
          <Text style={styles.sectionTitle}>
            {editingPackageId ? "Edit Package" : "Create New Package"}
          </Text>

          <Pressable onPress={handleNewPackage} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>New / Clear</Text>
          </Pressable>
        </View>

        {/* Package name */}
        <Text style={styles.label}>Package Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Birthday Set A"
          placeholderTextColor="#9ca3af"
          value={pkgName}
          onChangeText={setPkgName}
        />

        {/* Package price */}
        <Text style={styles.label}>Base Price</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. ₱250/head or ₱12,500"
          placeholderTextColor="#9ca3af"
          value={pkgPrice}
          onChangeText={setPkgPrice}
        />

        {/* Sections */}
        <Text style={styles.label}>Food Sections in this package</Text>

        {sections.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No sections yet. Add one below.
            </Text>
            <Text style={styles.emptyText}>
              Example: Pork section, Beef section, etc.
            </Text>
          </View>
        ) : (
          <View style={{ marginBottom: 16 }}>
            {sections.map((section, idx) => (
              <SectionBlock
                key={idx + "-" + section.category}
                section={section}
                sectionIndex={idx}
              />
            ))}
          </View>
        )}

        {/* Add New Section */}
        <Text style={styles.label}>Add New Section</Text>
        <View style={styles.addSectionRow}>
          <View style={styles.categoryPickerRow}>
            {(["pork", "beef", "chicken", "vegetable", "beverages"] as CategoryKey[]).map(
              (cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.catChoiceBtn,
                    newSectionCategory === cat &&
                      styles.catChoiceBtnActive
                  ]}
                  onPress={() => setNewSectionCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catChoiceText,
                      newSectionCategory === cat &&
                        styles.catChoiceTextActive
                    ]}
                  >
                    {CATEGORY_LABEL[cat]}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <Pressable
            style={styles.addSectionMainBtn}
            onPress={handleAddSection}
          >
            <Text style={styles.addSectionMainBtnText}>
              + Add Section
            </Text>
          </Pressable>
        </View>

        {/* Inclusions / Add-ons */}
        <Text style={[styles.label, { marginTop: 20 }]}>
          Inclusions / Add-ons
        </Text>

        {inclusions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No inclusions yet. Add one below.
            </Text>
            <Text style={styles.emptyText}>
              Example: "Chairs & Tables", "Buffet Setup", "Wait Staff
              (3)".
            </Text>
          </View>
        ) : (
          <View style={styles.inclusionTableWrapper}>
            <View
              style={[
                styles.inclusionRow,
                styles.inclusionHeaderRow
              ]}
            >
              <Text
                style={[
                  styles.inclusionCell,
                  styles.inclusionHeaderText,
                  { flex: 3 }
                ]}
              >
                Inclusion
              </Text>
              <Text
                style={[
                  styles.inclusionCell,
                  styles.inclusionHeaderText,
                  { flex: 2 }
                ]}
              >
                Price
              </Text>
              <Text
                style={[
                  styles.inclusionCell,
                  styles.inclusionHeaderText,
                  { flex: 1 }
                ]}
              >
                Remove
              </Text>
            </View>

            {inclusions.map((inc, idx) => (
              <View
                key={idx + inc.name + inc.price}
                style={[
                  styles.inclusionRow,
                  idx === inclusions.length - 1
                    ? styles.inclusionLastRow
                    : styles.inclusionBodyRow
                ]}
              >
                <Text style={[styles.inclusionCell, { flex: 3 }]}>
                  {inc.name}
                </Text>
                <Text
                  style={[
                    styles.inclusionCell,
                    { flex: 2, color: "#10b981", fontWeight: "600" }
                  ]}
                >
                  {inc.price || "—"}
                </Text>
                <View style={[styles.inclusionCell, { flex: 1 }]}>
                  <Pressable
                    style={styles.removeBtnSmall}
                    onPress={() => handleRemoveInclusion(idx)}
                  >
                    <Text style={styles.removeBtnSmallText}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add Inclusion Form */}
        <Text style={styles.label}>Inclusion Name</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. "Wait Staff (3)"'
          placeholderTextColor="#9ca3af"
          value={newInclusionName}
          onChangeText={setNewInclusionName}
        />

        <Text style={styles.label}>Inclusion Price</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. ₱1,500"
          placeholderTextColor="#9ca3af"
          value={newInclusionPrice}
          onChangeText={setNewInclusionPrice}
        />

        <Pressable
          style={styles.addInclusionBtn}
          onPress={handleAddInclusion}
        >
          <Text style={styles.addInclusionBtnText}>
            + Add Inclusion
          </Text>
        </Pressable>

        {/* Save final package */}
        <Pressable style={styles.saveBtn} onPress={handleSavePackage}>
          <Text style={styles.saveBtnText}>
            {editingPackageId ? "Save Changes" : "Save Package"}
          </Text>
        </Pressable>
      </View>
    );
  }

  // render whole screen
  if (!user) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ color: "#6b6b6b" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {isWeb && <Sidebar />}

      <View style={styles.mainArea}>
        <TopBar title="Manage Packages" />

        <ScrollView
          style={styles.scrollRegion}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Page header */}
          <View style={styles.pageHeaderRow}>
            <View>
              <Text style={styles.pageTitle}>Manage Packages</Text>
              <Text style={styles.pageSubTitle}>
                Build your package: add Pork / Beef / etc dishes,
                define inclusions, and set pricing.
              </Text>
            </View>
          </View>

          {/* Stacked cards: SavedPackages first, then PackageEditor */}
          <View style={styles.stackContainer}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Saved Packages</Text>
              <Text style={styles.smallMuted}>
                Edit or delete any of your existing packages.
              </Text>

              <SavedPackagesList />
            </View>

            <PackageEditor />
          </View>
        </ScrollView>
      </View>
      {!isWeb && <BottomNav />}
    </View>
  );
}

/* --------------- STYLES --------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? "row" : "column",
    backgroundColor: "#f9fafb"
  },
  mainArea: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  scrollRegion: {
    flex: 1
  },
  scrollContent: {
    padding: Platform.OS === 'web' ? 16 : 12,
    paddingBottom: Platform.OS === 'web' ? 80 : 100
  },

  stackContainer: {
    flexDirection: "column",
    gap: 24
  },

  loadingWrap: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center"
  },

  pageHeaderRow: {
    marginBottom: 16
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8
  },
  pageSubTitle: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 4,
    maxWidth: 600,
    lineHeight: 20
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },

  sectionInnerCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827"
  },
  removeSectionBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8
  },
  removeSectionBtnText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600"
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8
  },
  smallMuted: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 12
  },

  savedWrapper: {
    gap: 12
  },
  savedCard: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  savedName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4
  },
  savedPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9333ea",
    marginTop: 2,
    marginBottom: 8
  },
  savedSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 18
  },
  savedBtnCol: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginLeft: 12
  },
  smallBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    minWidth: 80,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  editBtn: {
    backgroundColor: "#FF8000"
  },
  editBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  },
  deleteBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ef4444"
  },
  deleteBtnText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 13
  },

  editorHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  clearBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  clearBtnText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 13
  },

  label: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111827",
    marginBottom: 8,
    marginTop: 16
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    marginBottom: 4
  },

  /* add-section picker row */
  addSectionRow: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 16
  },

  categoryPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },

  catChoiceBtn: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8
  },
  catChoiceBtnActive: {
    backgroundColor: "#fdf2ff",
    borderColor: "#9333ea"
  },
  catChoiceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151"
  },
  catChoiceTextActive: {
    color: "#9333ea"
  },

  addSectionMainBtn: {
    backgroundColor: "#FF8000",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3
  },
  addSectionMainBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  },

  tableWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 12
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  headerRow: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  headerText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "700"
  },
  bodyRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  lastRow: {
    borderBottomWidth: 0
  },
  cell: {
    paddingRight: 8
  },

  removeBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignSelf: "flex-start"
  },
  removeText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600"
  },

  addDishRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    marginTop: 4
  },
  addDishInput: {
    flex: 1,
    marginRight: 8
  },
  addBtn: {
    backgroundColor: "#FF8000",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  },

  /* inclusions table */
  inclusionTableWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 16
  },
  inclusionRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  inclusionHeaderRow: {
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  inclusionHeaderText: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "700"
  },
  inclusionBodyRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  inclusionLastRow: {
    borderBottomWidth: 0
  },
  inclusionCell: {
    paddingRight: 8,
    fontSize: 13,
    color: "#111827",
    fontWeight: "500"
  },

  removeBtnSmall: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignSelf: "flex-start"
  },
  removeBtnSmallText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600"
  },

  addInclusionBtn: {
    backgroundColor: "#FF8000",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3
  },
  addInclusionBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13
  },

  saveBtn: {
    backgroundColor: "#10b981",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
    marginTop: 24,
    marginBottom: 8
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14
  },

  emptyBox: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 16,
    marginTop: 4,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18
  }
});

