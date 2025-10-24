// src/screens/common/AccountScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, View, Alert, Linking } from 'react-native';
import { Text, Button, List, Divider } from 'react-native-paper';
import { useAuth } from '../../store/auth';
import { getMyFavorites } from '../../services/services';

export default function AccountScreen() {
  const { user, logout, /* make sure this exists in your auth */ updateMe } = useAuth();
  const [favCount, setFavCount] = React.useState<number>(0);
  const [savingLoc, setSavingLoc] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ids = await getMyFavorites();
        if (mounted) setFavCount(ids.length);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onRegisterCaterer = () => {
    // TODO: replace with your real portal URL
    Linking.openURL('https://your-website.example/register-caterer?from=mobile');
  };

  const promptSetLocation = () => {
    // Simple quick-pick (for demo). Replace with a proper dialog/picker later.
    Alert.alert(
      'Set Location',
      'Pick a quick location to save.',
      [
        { text: 'Manila, PH', onPress: () => saveLocation('Manila, PH') },
        { text: 'Quezon City, PH', onPress: () => saveLocation('Quezon City, PH') },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const saveLocation = async (loc: string) => {
    if (!updateMe) return;
    try {
      setSavingLoc(true);
      await updateMe({ location: loc });
    } finally {
      setSavingLoc(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Account</Text>

      <List.Section>
        <List.Item
          title={user?.username || user?.email || '—'}
          description={`Role: ${user?.role ?? '—'}`}
          left={(p) => <List.Icon {...p} icon="account" />}
        />
        <List.Item
          title="Favorites"
          description={`${favCount} saved caterers`}
          left={(p) => <List.Icon {...p} icon="heart" />}
        />
      </List.Section>

      <Divider />

      <List.Section title="Preferences">
        <List.Item
          title={`Location: ${user?.location ?? 'Not set'}`}
          description={savingLoc ? 'Saving…' : 'Tap to set a quick city'}
          left={(p) => <List.Icon {...p} icon="map-marker" />}
          onPress={promptSetLocation}
        />
      </List.Section>

      <Divider />

      <List.Section title="Business">
        <List.Item
          title="Register your catering business"
          description="Opens the web portal"
          left={(p) => <List.Icon {...p} icon="store" />}
          onPress={onRegisterCaterer}
        />
      </List.Section>

      <View style={{ marginTop: 16 }}>
        <Button mode="outlined" onPress={logout}>Log out</Button>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: '700', marginBottom: 8 },
});
