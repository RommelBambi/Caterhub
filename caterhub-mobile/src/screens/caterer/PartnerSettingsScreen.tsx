// src/screens/caterer/PartnerSettingsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image,
  Alert, Platform, ScrollView, FlatList
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import Sidebar from "../../components/caterer/Sidebar";
import TopBar from "../../components/caterer/TopBar";
import supabase from "../../services/supabase";
import { useAuth } from "../../store/auth";

type GalleryItem = { path: string; url: string; created_at?: string };
type ProfileRow = {
  id: string;
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  dti_url: string | null;
  is_verified: boolean | null;
  gallery_json: GalleryItem[] | null;
};

export default function PartnerSettingsScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);

  const gallery = useMemo(() => profile?.gallery_json ?? [], [profile?.gallery_json]);

  // Load profile
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,business_name,phone,avatar_url,dti_url,is_verified,gallery_json")
        .eq("id", user.id)
        .maybeSingle();
      if (!error) setProfile(data as any);
    };
    load();
  }, [user?.id]);

  // Save basic fields
  const save = async () => {
    if (!user?.id) return;
    if (!profile?.business_name?.trim()) {
      Alert.alert("Missing business name", "Please enter your business name.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        id: user.id,
        full_name: profile?.full_name || null,
        business_name: profile?.business_name || null,
        phone: profile?.phone || null,
        avatar_url: profile?.avatar_url || null,
      };
      await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
          business_name: payload.business_name,
          phone: payload.phone,
          avatar_url: payload.avatar_url,
        },
      });
      Alert.alert("Saved", "Your profile has been updated.");
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Avatar upload
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission needed", "Allow photo access to upload an avatar.");
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.9, mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (res.canceled || !user?.id) return;
    const a = res.assets?.[0]; if (!a) return;

    try {
      setLoading(true);
      const blob = await (await fetch(a.uri)).blob();
      const ext = (a.fileName?.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, cacheControl: "3600", contentType: a.mimeType || "image/jpeg" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setProfile(p => p ? { ...p, avatar_url: data.publicUrl } : p);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      Alert.alert("Avatar updated", "Your profile photo has been uploaded.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // DTI upload/replace
  const pickDTI = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: false, type: ["application/pdf", "image/*"], copyToCacheDirectory: true,
    });
    if (result.canceled || !user?.id) return;
    const a = result.assets?.[0]; if (!a) return;

    try {
      setLoading(true);
      const blob = await (await fetch(a.uri)).blob();
      const ext = (a.name?.split(".").pop() || "pdf").toLowerCase();
      const path = `${user.id}/dti_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("dti_files")
        .upload(path, blob, { upsert: true, cacheControl: "3600", contentType: a.mimeType || "application/octet-stream" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("dti_files").getPublicUrl(path);

      setProfile(p => p ? { ...p, dti_url: data.publicUrl, is_verified: false } : p);
      await supabase.from("profiles").update({ dti_url: data.publicUrl, is_verified: false }).eq("id", user.id);
      Alert.alert("DTI uploaded", "We’ll review your DTI for verification.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Gallery add/remove
  const addPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission needed", "Allow photo access to upload pictures.");
    const res = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true, quality: 0.9, mediaTypes: ImagePicker.MediaTypeOptions.Images, selectionLimit: 10,
    });
    if (res.canceled || !user?.id) return;
    const assets = res.assets ?? []; if (!assets.length) return;

    setLoading(true);
    try {
      const uploaded: GalleryItem[] = [];
      for (const a of assets) {
        const info = await FileSystem.getInfoAsync(a.uri);
        if (info.size && info.size > 12 * 1024 * 1024) { // 12MB
          Alert.alert("File too large", "Please choose images up to 12 MB."); continue;
        }
        const blob = await (await fetch(a.uri)).blob();
        const ext = (a.fileName?.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/gallery_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("caterer_photos")
          .upload(path, blob, { upsert: true, cacheControl: "3600", contentType: a.mimeType || "image/jpeg" });
        if (upErr) continue;
        const { data } = supabase.storage.from("caterer_photos").getPublicUrl(path);
        uploaded.push({ path, url: data.publicUrl, created_at: new Date().toISOString() });
      }
      if (uploaded.length) {
        const next = [...gallery, ...uploaded];
        await supabase.from("profiles").update({ gallery_json: next }).eq("id", user.id);
        setProfile(p => p ? { ...p, gallery_json: next } : p);
      }
    } catch (e: any) {
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = async (item: GalleryItem) => {
    if (!user?.id) return;
    Alert.alert("Remove photo?", "This will permanently delete the image.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setLoading(true);
          try {
            await supabase.storage.from("caterer_photos").remove([item.path]);
            const next = gallery.filter(g => g.path !== item.path);
            await supabase.from("profiles").update({ gallery_json: next }).eq("id", user.id);
            setProfile(p => p ? { ...p, gallery_json: next } : p);
          } catch (e: any) {
            Alert.alert("Delete failed", e?.message ?? "Please try again.");
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.screen}>
      <Sidebar />
      <View style={styles.mainArea}>
        <TopBar title="Edit Profile" />
        <ScrollView contentContainerStyle={styles.content}>
          {/* Avatar */}
          <View style={styles.card}>
            <Text style={styles.label}>Avatar</Text>
            <View style={styles.row}>
              <Image
                source={{ uri: profile?.avatar_url || "https://placehold.co/100x100?text=Avatar" }}
                style={styles.avatar}
              />
              <TouchableOpacity style={styles.btn} onPress={pickAvatar} disabled={loading}>
                <Text style={styles.btnText}>{loading ? "Please wait…" : "Change Photo"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Fields */}
          <View style={styles.card}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={profile?.full_name ?? ""}
              onChangeText={(t) => setProfile(p => p ? { ...p, full_name: t } : p)}
              style={styles.input} placeholder="e.g. Juan Dela Cruz"
            />
            <Text style={styles.label}>Business Name</Text>
            <TextInput
              value={profile?.business_name ?? ""}
              onChangeText={(t) => setProfile(p => p ? { ...p, business_name: t } : p)}
              style={styles.input} placeholder="e.g. Haliraya Catering"
            />
            <Text style={styles.label}>Phone</Text>
            <TextInput
              value={profile?.phone ?? ""}
              onChangeText={(t) => setProfile(p => p ? { ...p, phone: t } : p)}
              style={styles.input} placeholder="09xx xxx xxxx" keyboardType="phone-pad"
            />
          </View>

          {/* DTI */}
          <View style={styles.card}>
            <Text style={styles.label}>DTI Document</Text>
            {profile?.dti_url
              ? <Text style={styles.note}>Current file: {profile.dti_url.split("/").pop()}</Text>
              : <Text style={styles.muted}>No DTI on file.</Text>}
            <TouchableOpacity style={styles.btnOutline} onPress={pickDTI} disabled={loading}>
              <Text style={styles.btnOutlineText}>{loading ? "Uploading…" : profile?.dti_url ? "Replace DTI" : "Upload DTI"}</Text>
            </TouchableOpacity>
            {profile?.dti_url ? <Text style={styles.muted}>Status: Pending verification after change</Text> : null}
          </View>

          {/* Gallery */}
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>Gallery</Text>
              <TouchableOpacity style={styles.addBtn} onPress={addPhotos} disabled={loading}>
                <Text style={styles.addBtnText}>{loading ? "Uploading…" : "Add Photos"}</Text>
              </TouchableOpacity>
            </View>
            {gallery.length === 0 ? (
              <Text style={{ color: "#6b7280", marginTop: 6 }}>
                Showcase your work—upload photos of your setups, dishes, and events.
              </Text>
            ) : null}
            <FlatList
              style={{ marginTop: 10 }}
              data={gallery}
              keyExtractor={(it) => it.path}
              numColumns={3}
              columnWrapperStyle={{ gap: 8 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: item.url }} style={styles.thumb} />
                  <TouchableOpacity style={styles.delBadge} onPress={() => removePhoto(item)}>
                    <Text style={styles.delText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={loading}>
            <Text style={styles.saveBtnText}>{loading ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
          <Text style={styles.disclaimer}>
            By uploading images and documents, you confirm you have rights to share them and agree to our Terms & Privacy Policy.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: "row", backgroundColor: "#f9fafb" },
  mainArea: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 14, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontWeight: "800", color: "#111827" },
  title: { fontSize: 16, fontWeight: "800", color: "#111827" },
  input: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: "#fafafa"
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#e5e7eb" },
  btn: { backgroundColor: "#111827", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "800" },
  btnOutline: { borderWidth: 1, borderColor: "#111827", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, alignSelf: "flex-start" },
  btnOutlineText: { color: "#111827", fontWeight: "800" },
  addBtn: { backgroundColor: "#111827", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "800" },
  thumbWrap: {
    position: "relative", width: "32%", aspectRatio: 1, borderRadius: 10, overflow: "hidden", backgroundColor: "#f3f4f6",
  },
  thumb: { width: "100%", height: "100%" },
  delBadge: {
    position: "absolute", top: 6, right: 6, backgroundColor: "rgba(17,24,39,0.75)",
    width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center",
  },
  delText: { color: "#fff", fontSize: 16, lineHeight: 16, fontWeight: "800" },
  saveBtn: { backgroundColor: "#4f46e5", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "900" },
  note: { color: "#374151" },
  muted: { color: "#6b7280" },
  disclaimer: { color: "#6b7280", fontSize: 12, marginTop: 8 },
});
