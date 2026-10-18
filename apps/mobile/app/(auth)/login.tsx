import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Layers,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react-native";
import { mobileApiClient, setAuthTokens, MobileApiError } from "../../lib/api-client";

export default function MobileLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<"identifier" | "password" | null>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setFocusedField(null);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleInputFocus = (field: "identifier" | "password") => {
    setFocusedField(field);
    setTimeout(() => {
      if (field === "password") {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      } else {
        scrollViewRef.current?.scrollTo({ y: 60, animated: true });
      }
    }, 120);
  };

  const handleLogin = async (forceLogout = false) => {
    Keyboard.dismiss();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Username or email and password are required.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const deviceName = `${Platform.OS === "ios" ? "Apple iPhone" : "Android Device"} Companion App`;

    try {
      const response = await mobileApiClient<{
        success: boolean;
        token: string;
        refreshToken: string;
        message?: string;
        requiresForceLogout?: boolean;
        activeDevice?: string;
        sessionStartedAt?: string;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password.trim(),
          deviceName,
          forceLogout,
        }),
      });

      if (response.token) {
        await setAuthTokens(response.token, response.refreshToken);
        router.replace("/(tabs)");
      } else {
        setErrorMessage(response.message || "Failed to authenticate.");
      }
    } catch (err: unknown) {
      if (err instanceof MobileApiError && err.data?.requiresForceLogout) {
        Alert.alert(
          "Active Session Detected",
          `Your account is currently active on "${err.data.activeDevice || "another device"}". Continuing here will sign out that device.`,
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Continue",
              onPress: () => handleLogin(true),
            },
          ]
        );
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      className="flex-1 bg-slate-50"
    >
      <StatusBar style="dark" />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: isKeyboardVisible ? "flex-start" : "center",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: isKeyboardVisible ? 24 : Math.max(insets.top, 36),
          paddingBottom: isKeyboardVisible ? 120 : Math.max(insets.bottom, 36),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View style={{ width: "100%", maxWidth: 400, alignSelf: "center" }}>
          {/* Atelier Brand Monogram Header */}
          <View style={{ alignItems: "center", marginBottom: isKeyboardVisible ? 16 : 28 }}>
            <View
              style={{
                width: isKeyboardVisible ? 52 : 64,
                height: isKeyboardVisible ? 52 : 64,
                borderRadius: isKeyboardVisible ? 16 : 20,
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#fecdd3",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <Layers
                size={isKeyboardVisible ? 26 : 32}
                color="#e11d48"
                strokeWidth={2}
              />
            </View>
            <Text
              style={{
                fontSize: isKeyboardVisible ? 20 : 24,
                fontWeight: "800",
                color: "#0f172a",
                textAlign: "center",
                letterSpacing: -0.5,
              }}
            >
              Navarachna Studio
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: "#e11d48",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Haute Couture Atelier
            </Text>
          </View>

          {/* Clean, Focused Login Card */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 24,
              padding: 24,
              width: "100%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Error Feedback Alert */}
            {errorMessage && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#fff1f2",
                  borderWidth: 1,
                  borderColor: "#fecdd3",
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 18,
                }}
              >
                <AlertCircle size={18} color="#e11d48" strokeWidth={2} />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#be123c",
                    flex: 1,
                    marginLeft: 8,
                    fontWeight: "500",
                    lineHeight: 18,
                  }}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Username or Email Input */}
            <View style={{ marginBottom: 18 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#334155",
                  marginBottom: 8,
                }}
              >
                Username or Email
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 52,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  borderWidth: focusedField === "identifier" ? 1.5 : 1,
                  borderColor: focusedField === "identifier" ? "#e11d48" : "#e2e8f0",
                  backgroundColor: focusedField === "identifier" ? "#ffffff" : "#f8fafc",
                }}
              >
                <User
                  size={20}
                  color={focusedField === "identifier" ? "#e11d48" : "#94a3b8"}
                  strokeWidth={focusedField === "identifier" ? 2.5 : 2}
                />
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  onFocus={() => handleInputFocus("identifier")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Username or email"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: "500",
                    color: "#0f172a",
                    marginLeft: 10,
                    paddingVertical: 0,
                  }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#334155",
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 52,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  borderWidth: focusedField === "password" ? 1.5 : 1,
                  borderColor: focusedField === "password" ? "#e11d48" : "#e2e8f0",
                  backgroundColor: focusedField === "password" ? "#ffffff" : "#f8fafc",
                }}
              >
                <Lock
                  size={20}
                  color={focusedField === "password" ? "#e11d48" : "#94a3b8"}
                  strokeWidth={focusedField === "password" ? 2.5 : 2}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => handleInputFocus("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={() => handleLogin(false)}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    fontWeight: "500",
                    color: "#0f172a",
                    marginLeft: 10,
                    paddingVertical: 0,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ padding: 4 }}
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748b" strokeWidth={2} />
                  ) : (
                    <Eye size={20} color="#94a3b8" strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={() => handleLogin(false)}
              disabled={loading}
              activeOpacity={0.85}
              style={{
                height: 52,
                backgroundColor: loading ? "#f43f5e" : "#e11d48",
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                shadowColor: "#e11d48",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text
                  style={{
                    fontWeight: "700",
                    color: "#ffffff",
                    fontSize: 16,
                    letterSpacing: 0.3,
                  }}
                >
                  Sign In
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
