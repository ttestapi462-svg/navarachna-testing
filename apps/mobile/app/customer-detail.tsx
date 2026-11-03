import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CustomerDetailView } from "../components/customers/customer-detail-view";
import { fetchCustomersApi, type Customer } from "../lib/customer-api";

export default function CustomerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const customerId = params.id ? Number(params.id) : null;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomer() {
      if (!customerId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetchCustomersApi({ search: String(customerId) });
        const items = res.data || res.items || [];
        const found = items.find((c) => c.id === customerId);
        if (found) {
          setCustomer(found);
        }
      } catch (err) {
        console.error("Failed to load customer details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCustomer();
  }, [customerId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#78070D" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Client profile not found.</Text>
      </View>
    );
  }

  return (
    <CustomerDetailView
      customer={customer}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/customer");
        }
      }}
      onEdit={() => {}}
      onDelete={() => {}}
      onCustomerUpdated={(updated) => setCustomer(updated)}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: "#FAF7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 14,
    color: "#6E6862",
    fontWeight: "600",
  },
});
