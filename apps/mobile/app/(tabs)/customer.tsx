import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BookUser, Info, Ruler, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { getTabBarContentPadding } from "../../constants/layout";
import { AtelierHeader } from "../../components/layout/atelier-header";

export default function CustomerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <AtelierHeader
        title="Customers"
        icon={<Users size={20} color="#78070D" strokeWidth={2.4} />}
        showProfile
        onPressProfile={() => router.navigate("/(tabs)/more")}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: getTabBarContentPadding(insets.bottom) }]}
      >
        <View style={styles.headerInfo}>
          <Text style={styles.subtitle}>Client directory, couture measurements & profiles</Text>
        </View>
        <View style={styles.iconCard}>
          <View style={styles.iconCircle}>
            <Users size={25} color="#78070D" />
          </View>
          <Text style={styles.cardTitle}>Client records are not implemented yet</Text>
          <Text style={styles.body}>The web sidebar links to Client Directory and Measurements & Profiles using placeholder anchors. There is no customer page, customer API endpoint, or customer data model in the current project snapshot, so the mobile app cannot load real client records yet.</Text>
        </View>
        <View style={styles.featureRow}>
          <BookUser size={18} color="#6E6862" />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Client Directory</Text>
            <Text style={styles.body}>Needs a real client list endpoint and profile screen.</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <Ruler size={18} color="#6E6862" />
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Measurements & Profiles</Text>
            <Text style={styles.body}>Needs a customer measurement model and save/update APIs.</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Info size={15} color="#6E6862" />
          <Text style={styles.infoText}>No sample customers are shown here, to avoid presenting fabricated records as live studio data.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF7F2" },
  content: { padding: 16, paddingTop: 12, gap: 12 },
  headerInfo: { marginBottom: 2 },
  subtitle: { fontSize: 12, lineHeight: 18, color: "#6E6862" },
  iconCard: { alignItems: "center", backgroundColor: "#fff", borderRadius: 20, padding: 22, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: "#78070D", borderColor: "#E8E2D8", gap: 10, marginTop: 2 },
  iconCircle: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#FBF2F3", alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "800", textAlign: "center", color: "#231E1C" },
  body: { fontSize: 12, lineHeight: 18, color: "#6E6862" },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E8E2D8", borderRadius: 15 },
  featureText: { flex: 1, gap: 4 },
  featureTitle: { fontSize: 13, fontWeight: "800", color: "#231E1C" },
  info: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, backgroundColor: "#F5EFE6", borderRadius: 12 },
  infoText: { flex: 1, fontSize: 10, lineHeight: 15, color: "#6E6862" },
});
