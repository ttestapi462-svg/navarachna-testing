import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { Search, SlidersHorizontal, CheckCircle2, ShoppingBag } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getTabBarContentPadding } from "../../constants/layout";
import { AtelierHeader } from "../../components/layout/atelier-header";

type Status = "In Cutting" | "Hand Embroidery" | "Final Fitting" | "Ready";
type Order = { id: string; client: string; garmentType: string; status: Status; designer: string; deadline: string };
const statuses: Status[] = ["In Cutting", "Hand Embroidery", "Final Fitting", "Ready"];
const orders: Order[] = Array.from({ length: 100 }, (_, i) => ({
  id: `NVR-${1000 + i}`,
  client: ["Aarav Mehta", "Diya Sharma", "Rohan Patel", "Ananya Reddy", "Vikram Malhotra"][i % 5],
  garmentType: ["Bespoke Sherwani", "Bridal Zardozi Lehenga", "Couture Tuxedo", "Hand-woven Anarkali", "Silk Sari Gown"][i % 5],
  status: statuses[i % statuses.length],
  designer: ["Master Rajesh", "Atelier Priya", "Couturier Karan"][i % 3],
  deadline: `Oct ${20 + (i % 10)}, 2026`,
}));
const color = (status: Status) => status === "Ready" ? "#047857" : status === "Final Fitting" ? "#6d28d9" : "#231E1C";

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "All">("All");
  const filtered = useMemo(() => orders.filter((order) => {
    const q = search.trim().toLowerCase();
    const matchesText = !q || [order.id, order.client, order.garmentType, order.designer].some((v) => v.toLowerCase().includes(q));
    return matchesText && (filter === "All" || order.status === filter);
  }), [search, filter]);

  return (
    <View style={styles.screen}>
      <AtelierHeader
        title="Orders"
        icon={<ShoppingBag size={20} color="#78070D" strokeWidth={2.4} />}
        showProfile
        onPressProfile={() => router.navigate("/(tabs)/more")}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: getTabBarContentPadding(insets.bottom) + 13 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchBox}>
          <Search size={17} color="#6E6862" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search order, client, garment…"
            placeholderTextColor="#9AA3B5"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filterHeading}>
          <SlidersHorizontal size={14} color="#6E6862" />
          <Text style={styles.filterLabel}>Filter by stage ({filtered.length} of {orders.length})</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(["All", ...statuses] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterChip, filter === item && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matching orders</Text>
            <Text style={styles.subtitle}>Try another search or stage filter.</Text>
            <Pressable onPress={() => { setSearch(""); setFilter("All"); }}>
              <Text style={styles.clear}>Reset filters</Text>
            </Pressable>
          </View>
        ) : (
          filtered.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <Text style={styles.orderId}>{order.id}</Text>
                <Text style={[styles.status, { color: color(order.status), backgroundColor: `${color(order.status)}14` }]}>
                  {order.status}
                </Text>
              </View>
              <Text style={styles.client}>{order.client}</Text>
              <Text style={styles.garment}>{order.garmentType}</Text>
              <View style={styles.divider} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Lead designer</Text>
                <Text style={styles.metaValue}>{order.designer}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Fitting deadline</Text>
                <Text style={styles.metaValue}>{order.deadline}</Text>
              </View>
            </View>
          ))
        )}
        <View style={styles.note}>
          <CheckCircle2 size={15} color="#6E6862" />
          <Text style={styles.noteText}>These are the same sample records used by the web dashboard. The current backend does not provide an Orders API, so this schedule is not live database data.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF7F2" },
  content: { padding: 16, paddingTop: 12, gap: 10 },
  subtitle: { fontSize: 12, lineHeight: 18, color: "#6E6862" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 13, paddingHorizontal: 12, borderWidth: 1, borderColor: "#E8E2D8", minHeight: 46 },
  searchInput: { flex: 1, fontSize: 13, color: "#231E1C", paddingVertical: 10 },
  clear: { color: "#78070D", fontSize: 11, fontWeight: "800", padding: 4 },
  filterHeading: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  filterLabel: { fontSize: 11, fontWeight: "700", color: "#231E1C" },
  filters: { gap: 7, paddingVertical: 2 },
  filterChip: { borderWidth: 1, borderColor: "#E8E2D8", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#fff" },
  filterChipActive: { backgroundColor: "#78070D", borderColor: "#78070D" },
  filterText: { fontSize: 11, fontWeight: "700", color: "#231E1C" },
  filterTextActive: { color: "#fff" },
  orderCard: { backgroundColor: "#fff", borderLeftWidth: 4, borderLeftColor: "#78070D", borderWidth: 1, borderColor: "#E8E2D8", borderRadius: 16, padding: 14, gap: 7 },
  orderTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  orderId: { fontSize: 11, fontWeight: "800", color: "#78070D" },
  status: { overflow: "hidden", borderRadius: 18, paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: "800" },
  client: { fontSize: 15, fontWeight: "800", color: "#231E1C" },
  garment: { fontSize: 12, color: "#6E6862" },
  divider: { height: 1, backgroundColor: "#F5EFE6", marginVertical: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  metaLabel: { fontSize: 10, color: "#9AA3B5" },
  metaValue: { flex: 1, textAlign: "right", fontSize: 10, color: "#231E1C", fontWeight: "600" },
  empty: { alignItems: "center", gap: 9, padding: 24, backgroundColor: "#fff", borderRadius: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#231E1C" },
  note: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#F5EFE6", borderRadius: 12, alignItems: "flex-start", marginTop: 4 },
  noteText: { flex: 1, color: "#6E6862", fontSize: 10, lineHeight: 15 },
});
