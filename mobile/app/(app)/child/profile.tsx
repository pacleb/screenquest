import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';
import { AVATAR_PACKS, AvatarPack, avatarPackService } from '../../../src/services/avatarPacks';
import { colors, spacing, borderRadius, fonts } from '../../../src/theme';
import { Card, Badge } from '../../../src/components';

export default function ChildProfile() {
  const { user, logout } = useAuthStore();
  const [ownedPacks, setOwnedPacks] = useState<string[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      avatarPackService.getOwnedPacks(user.id).then(setOwnedPacks).catch(() => {});
    }
  }, [user?.id]);

  const handleBuyPack = async (pack: AvatarPack) => {
    if (!user?.id) return;
    setPurchasing(pack.id);
    try {
      const success = await avatarPackService.purchasePack(user.id, pack.id);
      if (success) {
        setOwnedPacks((prev) => [...prev, pack.id]);
        Alert.alert('Purchased!', `You now own the ${pack.name} pack!`);
      }
    } catch {
      Alert.alert('Error', 'Could not complete the purchase. Try again later.');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>😊</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.level}>Level 1 — Starter</Text>
        </View>

        {/* Avatar Shop */}
        <Text style={styles.shopTitle}>Avatar Shop</Text>
        <Text style={styles.shopDesc}>Unlock fun avatar packs!</Text>

        <View style={styles.packsGrid}>
          {AVATAR_PACKS.map((pack) => {
            const owned = ownedPacks.includes(pack.id);
            return (
              <Card key={pack.id} style={styles.packCard}>
                <Text style={styles.packIcon}>{pack.icon}</Text>
                <Text style={styles.packName}>{pack.name}</Text>
                <View style={styles.packItems}>
                  {pack.items.slice(0, 4).map((item, i) => (
                    <Text key={i} style={styles.packItemEmoji}>{item}</Text>
                  ))}
                </View>
                {owned ? (
                  <Badge label="Owned" variant="success" />
                ) : (
                  <TouchableOpacity
                    style={styles.buyBtn}
                    onPress={() => handleBuyPack(pack)}
                    disabled={purchasing === pack.id}
                  >
                    <Text style={styles.buyBtnText}>
                      {purchasing === pack.id ? '...' : pack.priceString}
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color="#FFF" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.childBg },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarEmoji: { fontSize: 48 },
  name: {
    fontFamily: fonts.child.extraBold,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  level: {
    fontFamily: fonts.child.semiBold,
    fontSize: 16,
    color: colors.purple,
  },
  shopTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  shopDesc: {
    fontFamily: fonts.child.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  packsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  packCard: {
    width: '47%' as any,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  packIcon: { fontSize: 36, marginBottom: spacing.xs },
  packName: {
    fontFamily: fonts.child.bold,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  packItems: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.sm,
  },
  packItemEmoji: { fontSize: 20 },
  buyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  buyBtnText: {
    fontFamily: fonts.child.bold,
    fontSize: 13,
    color: '#FFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
  },
  logoutText: {
    fontFamily: fonts.child.bold,
    color: '#FFF',
    fontSize: 16,
  },
});
