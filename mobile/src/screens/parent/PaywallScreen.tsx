import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { PurchasesPackage } from "react-native-purchases";
import { subscriptionService } from "../../services/subscription";
import { useSubscriptionStore } from "../../store/subscription";
import { colors, spacing, borderRadius, fonts, typography } from "../../theme";
import { Button, Card } from "../../components";

type BillingPeriod = "monthly" | "yearly";

const FEATURES = [
  {
    name: "Active Quests",
    free: "3",
    premium: "Unlimited",
    icon: "list-outline",
  },
  { name: "Photo Proof", free: false, premium: true, icon: "camera-outline" },
  {
    name: "Quest History",
    free: "7 days",
    premium: "Full",
    icon: "time-outline",
  },
  {
    name: "Reports",
    free: "Basic",
    premium: "Detailed",
    icon: "bar-chart-outline",
  },
  { name: "Avatar Packs", free: true, premium: true, icon: "shirt-outline" },
  { name: "Data Export", free: false, premium: true, icon: "download-outline" },
];

export default function PaywallScreen() {
  const navigation = useNavigation<any>();
  const { isActive } = useSubscriptionStore();
  const activatePremium = useSubscriptionStore((s) => s.activatePremium);

  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("yearly");
  const [packages, setPackages] = useState<{
    monthly: PurchasesPackage | null;
    yearly: PurchasesPackage | null;
  }>({ monthly: null, yearly: null });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const offerings = await subscriptionService.getOfferings();
      console.log("[Paywall] Offerings result:", offerings ? "loaded" : "null");
      if (offerings?.current) {
        const monthly =
          offerings.current.availablePackages.find(
            (p) => p.packageType === "MONTHLY",
          ) ?? null;
        const yearly =
          offerings.current.availablePackages.find(
            (p) => p.packageType === "ANNUAL",
          ) ?? null;
        console.log(
          "[Paywall] Found packages — monthly:",
          !!monthly,
          "yearly:",
          !!yearly,
        );
        setPackages({ monthly, yearly });
      } else {
        console.warn("[Paywall] No current offering available");
      }
    } catch (e) {
      console.error("[Paywall] Failed to load offerings:", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    const pkg =
      selectedPeriod === "yearly" ? packages.yearly : packages.monthly;
    if (!pkg) {
      Alert.alert(
        "Unavailable",
        "This plan is not available right now. Please try again later.",
      );
      return;
    }

    setPurchasing(true);
    try {
      const customerInfo = await subscriptionService.purchasePackage(pkg);
      if (customerInfo) {
        // A non-null customerInfo means the App Store accepted the transaction.
        // Activate premium immediately — don't wait for the backend webhook,
        // which can be delayed (especially in sandbox/TestFlight).
        activatePremium();
        Alert.alert(
          "Welcome to Premium!",
          "You now have access to all ScreenQuest features.",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      }
    } catch {
      Alert.alert("Purchase Failed", "Something went wrong. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const customerInfo = await subscriptionService.restorePurchases();
      if (customerInfo?.entitlements?.active?.premium) {
        activatePremium();
        Alert.alert(
          "Restored!",
          "Your premium subscription has been restored.",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert(
          "No Purchases Found",
          "No previous purchases were found for this account.",
        );
      }
    } catch {
      Alert.alert(
        "Restore Failed",
        "Could not restore purchases. Please try again.",
      );
    } finally {
      setRestoring(false);
    }
  };

  const monthlyPrice = packages.monthly?.product?.priceString ?? "$4.99";
  const yearlyPrice = packages.yearly?.product?.priceString ?? "$39.99";

  if (isActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.alreadyPremium}>
          <Icon name="checkmark-circle" size={64} color={colors.secondary} />
          <Text style={styles.alreadyTitle}>You're Premium!</Text>
          <Text style={styles.alreadyDesc}>
            You have access to all ScreenQuest features.
          </Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.title}>Unlock ScreenQuest Plus!</Text>
          <Text style={styles.subtitle}>
            Give your family the full experience
          </Text>
        </View>

        {/* Feature Comparison */}
        <Card style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureHeaderLabel} />
            <Text style={styles.featureHeaderFree}>Free</Text>
            <Text style={styles.featureHeaderPremium}>Plus</Text>
          </View>
          {FEATURES.map((feature) => (
            <View key={feature.name} style={styles.featureRow}>
              <View style={styles.featureNameRow}>
                <Icon
                  name={feature.icon as any}
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.featureName}>{feature.name}</Text>
              </View>
              <View style={styles.featureValue}>
                {typeof feature.free === "boolean" ? (
                  <Icon
                    name={feature.free ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={
                      feature.free
                        ? colors.secondary
                        : colors.textSecondary + "60"
                    }
                  />
                ) : (
                  <Text style={styles.featureFreeText}>{feature.free}</Text>
                )}
              </View>
              <View style={styles.featureValue}>
                {typeof feature.premium === "boolean" ? (
                  <Icon
                    name="checkmark-circle"
                    size={20}
                    color={colors.secondary}
                  />
                ) : (
                  <Text style={styles.featurePremiumText}>
                    {feature.premium}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </Card>

        {/* Pricing Toggle */}
        <View style={styles.pricingToggle}>
          <TouchableOpacity
            style={[
              styles.pricingOption,
              selectedPeriod === "monthly" && styles.pricingOptionActive,
            ]}
            onPress={() => setSelectedPeriod("monthly")}
          >
            <Text
              style={[
                styles.pricingLabel,
                selectedPeriod === "monthly" && styles.pricingLabelActive,
              ]}
            >
              Monthly
            </Text>
            <Text
              style={[
                styles.pricingPrice,
                selectedPeriod === "monthly" && styles.pricingPriceActive,
              ]}
            >
              {monthlyPrice}/mo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pricingOption,
              selectedPeriod === "yearly" && styles.pricingOptionActive,
            ]}
            onPress={() => setSelectedPeriod("yearly")}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 33%</Text>
            </View>
            <Text
              style={[
                styles.pricingLabel,
                selectedPeriod === "yearly" && styles.pricingLabelActive,
              ]}
            >
              Yearly
            </Text>
            <Text
              style={[
                styles.pricingPrice,
                selectedPeriod === "yearly" && styles.pricingPriceActive,
              ]}
            >
              {yearlyPrice}/yr
            </Text>
          </TouchableOpacity>
        </View>

        {/* CTA Button */}
        <Button
          title={purchasing ? "Processing..." : "Upgrade to Premium"}
          onPress={handlePurchase}
          size="lg"
          disabled={purchasing || loading}
          style={styles.ctaButton}
        />

        {/* Restore */}
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Text style={styles.restoreText}>
            {restoring ? "Restoring..." : "Restore Purchases"}
          </Text>
        </TouchableOpacity>

        {/* Fine print */}
        <Text style={styles.finePrint}>
          Auto-renews monthly/yearly. Cancel anytime. Payment will be charged to
          your {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account. By
          subscribing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: 100 },
  headerRow: {
    marginBottom: spacing.lg,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.parentH1,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "left",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.parent.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  featureCard: { marginBottom: spacing.xl, paddingVertical: spacing.sm },
  featureHeader: {
    flexDirection: "row",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  featureHeaderLabel: { flex: 1 },
  featureHeaderFree: {
    width: 60,
    textAlign: "center",
    fontFamily: fonts.parent.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  featureHeaderPremium: {
    width: 60,
    textAlign: "center",
    fontFamily: fonts.parent.bold,
    fontSize: 12,
    color: colors.primary,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  featureNameRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureName: {
    fontFamily: fonts.parent.medium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  featureValue: {
    width: 60,
    alignItems: "center",
  },
  featureFreeText: {
    fontFamily: fonts.parent.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  featurePremiumText: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 12,
    color: colors.secondary,
  },
  pricingToggle: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  pricingOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pricingOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  pricingLabel: {
    fontFamily: fonts.parent.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pricingLabelActive: { color: colors.primary },
  pricingPrice: {
    fontFamily: fonts.parent.bold,
    fontSize: 20,
    color: colors.textSecondary,
  },
  pricingPriceActive: { color: colors.primary },
  saveBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  saveBadgeText: {
    fontFamily: fonts.parent.bold,
    fontSize: 10,
    color: "#FFF",
  },
  ctaButton: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  restoreBtn: {
    alignSelf: "center",
    paddingVertical: spacing.md,
  },
  restoreText: {
    fontFamily: fonts.parent.medium,
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  finePrint: {
    fontFamily: fonts.parent.regular,
    fontSize: 11,
    color: colors.textSecondary + "80",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: spacing.md,
  },
  alreadyPremium: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
  },
  alreadyTitle: {
    ...typography.parentH1,
    color: colors.secondary,
  },
  alreadyDesc: {
    fontFamily: fonts.parent.regular,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
});
