import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Search,
  Scissors,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react-native";
import { getAuthToken } from "../../lib/api-client";

type OrderStatus = "In Production" | "Designing" | "Ready for Dispatch";

interface OrderItem {
  id: string;
  client: string;
  category: string;
  status: OrderStatus;
  items: number;
  deliveryDate: string;
}

const mockOrders: OrderItem[] = [
  {
    id: "NVR-1001",
    client: "Aarav Fabrics",
    category: "Bespoke Bridal Lehenga",
    status: "In Production",
    items: 4,
    deliveryDate: "Oct 24",
  },
  {
    id: "NVR-1002",
    client: "Maya Boutique",
    category: "Raw Silk Anarkali Suit",
    status: "Designing",
    items: 2,
    deliveryDate: "Oct 28",
  },
  {
    id: "NVR-1003",
    client: "Royal Silk House",
    category: "Handcrafted Zardozi Sherwani",
    status: "Ready for Dispatch",
    items: 12,
    deliveryDate: "Today",
  },
  {
    id: "NVR-1004",
    client: "Couture Atelier Delhi",
    category: "Embroidered Velvet Cape",
    status: "In Production",
    items: 6,
    deliveryDate: "Oct 26",
  },
  {
    id: "NVR-1005",
    client: "Zardozi Bridal Studio",
    category: "Custom Gown & Veil",
    status: "Ready for Dispatch",
    items: 1,
    deliveryDate: "Tomorrow",
  },
];

const statusFilters: Array<"All" | OrderStatus> = [
  "All",
  "In Production",
  "Designing",
  "Ready for Dispatch",
];

export default function MobileOrdersScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | OrderStatus>("All");

  useEffect(() => {
    async function verifyAuth() {
      const token = await getAuthToken();
      if (!token) {
        router.replace("/(auth)/login");
      }
    }
    verifyAuth();
  }, [router]);

  const filteredOrders = mockOrders.filter((order) => {
    const matchesFilter =
      activeFilter === "All" || order.status === activeFilter;
    const matchesSearch =
      order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* Top Search & Filter Container */}
      <View className="bg-white border-b border-slate-200/90 px-4 pt-3.5 pb-3.5">
        {/* Spacious Search Input */}
        <View className="flex-row items-center h-12 bg-slate-50/80 border border-slate-200 rounded-2xl px-4 mb-3">
          <Search size={19} color="#94a3b8" strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search order ID, client, or category..."
            placeholderTextColor="#94a3b8"
            className="flex-1 text-[16px] font-medium text-slate-900 ml-3"
          />
        </View>

        {/* Filter Chips Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          {statusFilters.map((filter) => {
            const count =
              filter === "All"
                ? mockOrders.length
                : mockOrders.filter((o) => o.status === filter).length;
            const isSelected = activeFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.8}
                className={`mr-2.5 px-3.5 py-1.5 rounded-full border ${
                  isSelected
                    ? "bg-slate-900 border-slate-900"
                    : "bg-white border-slate-200/90"
                }`}
              >
                <Text
                  className={`text-xs ${
                    isSelected
                      ? "font-bold text-white"
                      : "font-semibold text-slate-700"
                  }`}
                >
                  {filter} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18 }}
        ListEmptyComponent={
          <View className="py-14 items-center justify-center">
            <View className="w-14 h-14 rounded-3xl bg-slate-100 items-center justify-center mb-3.5">
              <Search size={24} color="#94a3b8" strokeWidth={2} />
            </View>
            <Text className="text-base font-bold text-slate-900">
              No matching orders found
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              Try adjusting your search query or filter chip.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isReady = item.status === "Ready for Dispatch";
          const isProduction = item.status === "In Production";

          const badgeStyles = isReady
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : isProduction
            ? "bg-rose-50 border-rose-200 text-rose-700"
            : "bg-amber-50 border-amber-200 text-amber-700";

          const StatusIcon = isReady ? CheckCircle2 : isProduction ? Clock : Sparkles;
          const statusIconColor = isReady
            ? "#059669"
            : isProduction
            ? "#e11d48"
            : "#d97706";

          return (
            <View className="bg-white border border-slate-200/90 rounded-3xl p-4.5 mb-3.5 shadow-xs">
              {/* Row 1: ID and Status Pill */}
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-mono font-bold text-slate-900 text-sm">
                  #{item.id}
                </Text>
                <View
                  className={`px-3 py-1 rounded-full border flex-row items-center gap-1.5 ${badgeStyles}`}
                >
                  <StatusIcon size={13} color={statusIconColor} strokeWidth={2.5} />
                  <Text className={`text-xs font-bold ${badgeStyles.split(" ")[2]}`}>
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Row 2: Client & Category */}
              <Text className="text-base font-extrabold text-slate-900">
                {item.client}
              </Text>
              <Text className="text-xs text-slate-500 font-medium mt-0.5">
                {item.category}
              </Text>

              {/* Row 3: Meta Footers (Garments & Delivery) */}
              <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
                <View className="flex-row items-center gap-1.5">
                  <Scissors size={15} color="#64748b" strokeWidth={2} />
                  <Text className="text-xs text-slate-600 font-semibold">
                    {item.items} garments in queue
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Calendar size={15} color="#64748b" strokeWidth={2} />
                  <Text className="text-xs text-slate-600 font-semibold">
                    Due: {item.deliveryDate}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
