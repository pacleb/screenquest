import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth';
import { useGamificationStore } from '../../../src/store/gamification';
import { AVATAR_PACKS, AvatarPack, avatarPackService } from '../../../src/services/avatarPacks';
import { colors, spacing, borderRadius, fonts } from '../../../src/theme';
import { typography } from '../../../src/theme/typography';
import { Card, Badge, ProgressBar } from '../../../src/components';

export default function ChildProfile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { progress, achievements, fetchProgress, fetchAchievements } =
    useGamificationStore();
  const [ownedPacks, setOwnedPacks] = useState<string[]>([]);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    await Promise.all([
      fetchProgress(user.id),
      fetchAchievements(user.id),
      avatarPackService.getOwnedPacks(user.id).then(setOwnedPacks).catch(() => {}),
    ]);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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

  const recentBadges = achievements
    .filter((a) => a.unlockedAt)
    .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
    .slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>😊</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>

          {/* Level + Streak Row */}
          <View style={styles.levelRow}>
            <Text style={styles.level}>
              Level {progress?.level ?? 1} — {progress?.levelName ?? 'Starter'}
            </Text>
            {progress && progress.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakText}>
                  🔥 {progress.currentStreak}
                </Text>
              </View>
            )}
          </View>

          {/* XP Progress Bar */}
          {progress && (
            <View style={styles.xpSection}>
              <ProgressBar
                progress={progress.xpProgressInLevel}
                color={colors.purple}
                height={10}
              />
              <Text style={styles.xpText}>
                {progress.totalXp} / {progress.totalXp + progress.xpToNextLevel} XP
              </Text>
            </View>
          )}
        </View>

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <View style={styles.badgesSection}>
            <View style={styles.badgesHeader}>
              <Text style={styles.sectionTitle}>Badges</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/child/trophies')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.badgesRow}>
              {recentBadges.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName} numberOfLines={1}>
                    {badge.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Customize Avatar Button */}
        <TouchableOpacity
          style={styles.customizeBtn}
          onPress={() => router.push('/(app)/child/avatar-customize')}
          activeOpacity={0.85}
        >
          <Text style={styles.customizeBtnIcon}>🎭</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.customizeBtnText}>Customize Avatar</Text>
            <Text style={styles.customizeBtnHint}>Equip hats, outfits & more!</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.purple} />
        </TouchableOpacity>

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
    marginBottom: spacing.lg,
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
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  level: {
    fontFamily: fonts.child.semiBold,
    fontSize: 16,
    color: colors.purple,
  },
  streakBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  streakText: {
    fontFamily: fonts.child.bold,
    fontSize: 13,
    color: '#E65100',
  },
  xpSection: {
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  xpText: {
    fontFamily: fonts.child.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  badgesSection: {
    marginBottom: spacing.lg,
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.child.bold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  seeAll: {
    fontFamily: fonts.child.semiBold,
    fontSize: 14,
    color: colors.purple,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badgeItem: {
    alignItems: 'center',
    width: 56,
  },
  badgeIcon: { fontSize: 28 },
  badgeName: {
    fontFamily: fonts.child.regular,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.purple + '30',
  },
  customizeBtnIcon: { fontSize: 28 },
  customizeBtnText: {
    fontFamily: fonts.child.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  customizeBtnHint: {
    fontFamily: fonts.child.regular,
    fontSize: 12,
    color: colors.textSecondary,
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
