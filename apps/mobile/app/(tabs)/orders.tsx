import { View, Text, FlatList } from "react-native";

const mockOrders = [
  { id: "ORD-101", client: "Aarav Fabrics", status: "In Production", items: 4 },
  { id: "ORD-102", client: "Maya Boutique", status: "Designing", items: 2 },
  { id: "ORD-103", client: "Royal Silk House", status: "Ready for Dispatch", items: 12 },
];

export default function MobileOrdersScreen() {
  return (
    <View className="flex-1 bg-slate-50 p-4">
      <Text className="text-lg font-bold text-slate-800 mb-3">Recent Studio Orders</Text>
      <FlatList
        data={mockOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mb-3 rounded-xl bg-white p-4 border border-slate-200 shadow-xs">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="font-bold text-slate-900">{item.id}</Text>
              <Text className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {item.status}
              </Text>
            </View>
            <Text className="text-sm text-slate-600">{item.client}</Text>
            <Text className="text-xs text-slate-400 mt-1">{item.items} items</Text>
          </View>
        )}
      />
    </View>
  );
}
