import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BookUser, Info, Ruler, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTabBarContentPadding } from "../../constants/layout";

export default function CustomerScreen() {
  const insets = useSafeAreaInsets();
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: getTabBarContentPadding(insets.bottom) }]}>
    <Text style={styles.eyebrow}>NAVARACHNA STUDIO</Text>
    <Text style={styles.title}>VIP Clients</Text>
    <Text style={styles.subtitle}>Client directory and measurements</Text>
    <View style={styles.iconCard}><View style={styles.iconCircle}><Users size={25} color="#e11d48" /></View><Text style={styles.cardTitle}>Client records are not implemented yet</Text><Text style={styles.body}>The web sidebar links to Client Directory and Measurements & Profiles using placeholder anchors. There is no customer page, customer API endpoint, or customer data model in the current project snapshot, so the mobile app cannot load real client records yet.</Text></View>
    <View style={styles.featureRow}><BookUser size={18} color="#7B8497"/><View style={styles.featureText}><Text style={styles.featureTitle}>Client Directory</Text><Text style={styles.body}>Needs a real client list endpoint and profile screen.</Text></View></View>
    <View style={styles.featureRow}><Ruler size={18} color="#7B8497"/><View style={styles.featureText}><Text style={styles.featureTitle}>Measurements & Profiles</Text><Text style={styles.body}>Needs a customer measurement model and save/update APIs.</Text></View></View>
    <View style={styles.info}><Info size={15} color="#7B8497"/><Text style={styles.infoText}>No sample customers are shown here, to avoid presenting fabricated records as live studio data.</Text></View>
  </ScrollView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#F7F7FB" }, content: { padding: 18, gap: 13 }, eyebrow: { marginTop: 4, fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: "#e11d48" }, title: { fontSize: 29, fontWeight: "800", color: "#17172B" }, subtitle: { fontSize: 13, color: "#7B8497" }, iconCard: { alignItems: "center", backgroundColor: "#fff", borderRadius: 20, padding: 23, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: "#e11d48", borderColor: "#E9EAF1", gap: 10, marginTop: 3 }, iconCircle: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" }, cardTitle: { fontSize: 17, fontWeight: "800", textAlign: "center", color: "#17172B" }, body: { fontSize: 12, lineHeight: 18, color: "#7B8497" }, featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 15, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E9EAF1", borderRadius: 15 }, featureText: { flex: 1, gap: 4 }, featureTitle: { fontSize: 13, fontWeight: "800", color: "#17172B" }, info: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, backgroundColor: "#f3f0ed", borderRadius: 12 }, infoText: { flex: 1, fontSize: 10, lineHeight: 15, color: "#7B8497" } });
