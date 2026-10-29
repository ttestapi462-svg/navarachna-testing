import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, LockKeyhole, Palette, RefreshCw, ShoppingBag, TrendingUp, Users, UserRound, Clock3, LogOut } from "lucide-react-native";
import { getTabBarContentPadding } from "../../constants/layout";
import { clearAuthTokens, mobileApiClient } from "../../lib/api-client";
import { notifyMobile } from "../../lib/notifications";

type User = { username?: string; email?: string; firstName?: string; lastName?: string; activeDeviceName?: string; sessionStartedAt?: string; createdAt?: string; updatedAt?: string };
type AuthResult = { isAuthenticated?: boolean; user?: User };
type StudioOrder = { id: string; client: string; garmentType: string; status: "In Cutting" | "Hand Embroidery" | "Final Fitting" | "Ready"; designer: string; deadline: string };
const chartData = [
  { month: "Jan", revenue: 14500 }, { month: "Feb", revenue: 23200 }, { month: "Mar", revenue: 31000 },
  { month: "Apr", revenue: 28400 }, { month: "May", revenue: 42100 }, { month: "Jun", revenue: 53800 },
];
const orders: StudioOrder[] = Array.from({ length: 100 }, (_, i) => ({
  id: `NVR-${1000 + i}`,
  client: ["Aarav Mehta", "Diya Sharma", "Rohan Patel", "Ananya Reddy", "Vikram Malhotra"][i % 5],
  garmentType: ["Bespoke Sherwani", "Bridal Zardozi Lehenga", "Couture Tuxedo", "Hand-woven Anarkali", "Silk Sari Gown"][i % 5],
  status: (["In Cutting", "Hand Embroidery", "Final Fitting", "Ready"] as const)[i % 4],
  designer: ["Master Rajesh", "Atelier Priya", "Couturier Karan"][i % 3],
  deadline: `Oct ${20 + (i % 10)}, 2026`,
}));
const statusColor = (status: StudioOrder["status"]) => status === "Ready" ? "#047857" : status === "Final Fitting" ? "#6d28d9" : "#34394A";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState("");
  const [endingSession, setEndingSession] = useState(false);

  const loadUser = useCallback(async () => {
    setLoadingUser(true); setUserError("");
    try {
      const result = await mobileApiClient<AuthResult>("/api/auth/me");
      if (!result.isAuthenticated) throw new Error("Your session could not be verified. Please sign in again.");
      setUser(result.user ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh session details.";
      setUserError(message);
      notifyMobile("error", message, "Session refresh failed");
    } finally { setLoadingUser(false); }
  }, []);

  useEffect(() => { void loadUser(); }, [loadUser]);

  const endSession = () => Alert.alert("End session", "Sign out and revoke this mobile session?", [
    { text: "Cancel", style: "cancel" },
    { text: "Sign out", style: "destructive", onPress: async () => {
      setEndingSession(true);
      try { await mobileApiClient("/api/auth/logout", { method: "POST" }); }
      catch { notifyMobile("warning", "The server could not confirm sign-out. This device will still be signed out.", "Signed out locally"); }
      finally { await clearAuthTokens(); setEndingSession(false); router.replace("/(auth)/login"); }
    } },
  ]);

  const maxRevenue = useMemo(() => Math.max(...chartData.map((item) => item.revenue)), []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: getTabBarContentPadding(insets.bottom) }]}>
      <View style={styles.heading}>
        <Text style={styles.eyebrow}>NAVARACHNA STUDIO</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Atelier overview and production performance.</Text>
      </View>

      <View style={styles.kpiGrid}>
        <Kpi icon={<Palette size={18} color="#e11d48" />} label="Active Couture Designs" value="142" note="+12% from last month" />
        <Kpi icon={<ShoppingBag size={18} color="#e11d48" />} label="Orders in Atelier" value="38" note="8 ready for final fitting" />
        <Kpi icon={<Users size={18} color="#e11d48" />} label="Studio VIP Clients" value="894" note="98.4% retention rate" />
        <Kpi icon={<TrendingUp size={18} color="#e11d48" />} label="Monthly Couture Revenue" value="$53,800" note="+24.5% vs atelier target" />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeading}><TrendingUp size={19} color="#e11d48" /><Text style={styles.cardTitle}>Atelier Revenue & Performance</Text></View>
        <Text style={styles.cardSubtitle}>Monthly revenue trajectory</Text>
        <View style={styles.chart}>
          {chartData.map((item) => <View key={item.month} style={styles.chartColumn}>
            <Text style={styles.chartValue}>{item.revenue >= 1000 ? `${Math.round(item.revenue / 1000)}k` : item.revenue}</Text>
            <View style={styles.chartBarTrack}><View style={[styles.chartBar, { height: `${(item.revenue / maxRevenue) * 100}%` }]} /></View>
            <Text style={styles.chartMonth}>{item.month}</Text>
          </View>)}
        </View>
        <Text style={styles.cardFootnote}>The chart values mirror the web dashboard's sample data.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeading}><LockKeyhole size={18} color="#e11d48" /><Text style={styles.cardTitle}>Active Session Security</Text></View>
        <Text style={styles.cardSubtitle}>Single-device authenticated session</Text>
        {loadingUser ? <View style={styles.inlineState}><ActivityIndicator color="#e11d48" /><Text style={styles.muted}>Refreshing session details…</Text></View> : userError ? <View style={styles.errorBox}><Text style={styles.errorText}>{userError}</Text><ActionButton title="Retry" onPress={() => void loadUser()} /></View> : <View style={styles.sessionInfo}>
          <InfoRow icon={<ShoppingBag size={15} color="#7B8497" />} label="Bound device" value={user?.activeDeviceName || "This mobile device"} />
          <InfoRow icon={<UserRound size={15} color="#7B8497" />} label="User" value={`${user?.firstName || ""} ${user?.lastName || ""}${user?.username ? ` (@${user.username})` : ""}`.trim() || "Authenticated user"} />
          {user?.email ? <InfoRow icon={<Users size={15} color="#7B8497" />} label="Email" value={user.email} /> : null}
          {user?.sessionStartedAt ? <InfoRow icon={<Clock3 size={15} color="#7B8497" />} label="Session started" value={new Date(user.sessionStartedAt).toLocaleString()} /> : null}
        </View>}
        <View style={styles.buttonRow}>
          <ActionButton title="Refresh state" icon={<RefreshCw size={14} color="#34394A" />} onPress={() => void loadUser()} disabled={loadingUser || endingSession} />
          <ActionButton title={endingSession ? "Signing out…" : "End session"} icon={<LogOut size={14} color="#be123c" />} onPress={endSession} disabled={endingSession} destructive />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.cardHeading}><CheckCircle2 size={19} color="#e11d48" /><Text style={styles.cardTitle}>Live Atelier Production Schedule</Text></View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/orders")}><Text style={styles.link}>View all</Text></Pressable>
      </View>
      {orders.slice(0, 5).map((order) => <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderTop}><Text style={styles.orderId}>{order.id}</Text><Text style={[styles.status, { color: statusColor(order.status), backgroundColor: `${statusColor(order.status)}14` }]}>{order.status}</Text></View>
        <Text style={styles.orderClient}>{order.client}</Text>
        <Text style={styles.muted}>{order.garmentType}</Text>
        <View style={styles.orderBottom}><Text style={styles.smallText}>{order.designer}</Text><Text style={styles.smallText}>Due {order.deadline}</Text></View>
      </View>)}
      <Text style={styles.cardFootnote}>Order schedule is sample data in the web app; there is no Orders API in the current backend.</Text>
    </ScrollView>
  );
}

function Kpi({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return <View style={styles.kpiCard}><View style={styles.kpiIcon}>{icon}</View><Text style={styles.kpiLabel}>{label}</Text><Text style={styles.kpiValue}>{value}</Text><Text style={styles.kpiNote}>{note}</Text></View>;
}
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <View style={styles.infoRow}>{icon}<View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
}
function ActionButton({ title, onPress, icon, disabled, destructive }: { title: string; onPress: () => void; icon?: React.ReactNode; disabled?: boolean; destructive?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.actionButton, destructive && styles.destructiveButton, disabled && styles.disabledButton]}>{icon}<Text style={[styles.actionText, destructive && styles.destructiveText]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7FB" }, content: { padding: 16, gap: 16 },
  heading: { gap: 5, marginBottom: 2 }, eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: "#e11d48" }, title: { fontSize: 29, fontWeight: "800", color: "#17172B" }, subtitle: { fontSize: 13, lineHeight: 19, color: "#7B8497" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, kpiCard: { width: "47%", flexGrow: 1, minWidth: 140, backgroundColor: "#fff", borderRadius: 17, padding: 13, borderWidth: 1, borderColor: "#E9EAF1", gap: 5 }, kpiIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center", marginBottom: 2 }, kpiLabel: { fontSize: 11, lineHeight: 15, color: "#7B8497", fontWeight: "600" }, kpiValue: { fontSize: 23, fontWeight: "800", color: "#17172B" }, kpiNote: { fontSize: 10, lineHeight: 14, color: "#059669" },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 16, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: "#e11d48", borderColor: "#E9EAF1", gap: 9 }, cardHeading: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }, cardTitle: { fontSize: 15, fontWeight: "800", color: "#17172B", flexShrink: 1 }, cardSubtitle: { fontSize: 12, color: "#7B8497", lineHeight: 17 }, chart: { height: 175, flexDirection: "row", alignItems: "stretch", gap: 9, paddingTop: 10 }, chartColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6 }, chartValue: { fontSize: 9, color: "#7B8497" }, chartBarTrack: { height: 115, width: "72%", justifyContent: "flex-end", backgroundColor: "#FFF0F5", borderRadius: 7, overflow: "hidden" }, chartBar: { width: "100%", minHeight: 4, backgroundColor: "#e11d48", borderRadius: 7 }, chartMonth: { fontSize: 10, color: "#7B8497" }, cardFootnote: { fontSize: 10, lineHeight: 15, color: "#9AA3B5" },
  inlineState: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 10 }, sessionInfo: { backgroundColor: "#F7F7FB", borderRadius: 13, padding: 11, gap: 12 }, infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 }, infoText: { flex: 1, gap: 2 }, infoLabel: { fontSize: 10, color: "#7B8497" }, infoValue: { fontSize: 12, color: "#17172B", fontWeight: "600" }, buttonRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, actionButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 11, borderWidth: 1, borderColor: "#d8d0ca", paddingVertical: 10, paddingHorizontal: 11, flexGrow: 1 }, actionText: { fontSize: 11, fontWeight: "700", color: "#34394A" }, destructiveButton: { borderColor: "#fecdd3" }, destructiveText: { color: "#be123c" }, disabledButton: { opacity: 0.5 }, errorBox: { backgroundColor: "#FFF0F5", padding: 12, borderRadius: 12, gap: 8 }, errorText: { fontSize: 12, color: "#9f1239", lineHeight: 18 }, muted: { fontSize: 11, color: "#7B8497", lineHeight: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 2 }, link: { color: "#e11d48", fontSize: 12, fontWeight: "800" }, orderCard: { backgroundColor: "#fff", borderRadius: 15, padding: 13, borderWidth: 1, borderColor: "#E9EAF1", gap: 5 }, orderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, orderId: { color: "#e11d48", fontSize: 11, fontWeight: "800" }, status: { fontSize: 9, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, overflow: "hidden" }, orderClient: { fontSize: 14, fontWeight: "800", color: "#17172B" }, orderBottom: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 3 }, smallText: { fontSize: 10, color: "#7B8497", flexShrink: 1 },
});
