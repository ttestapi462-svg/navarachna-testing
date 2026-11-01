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
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react-native";
import { mobileApiClient, setAuthTokens, MobileApiError } from "../../lib/api-client";
import { notifyMobile } from "../../lib/notifications";
import { StudioBrandMark } from "../../components/brand/StudioLogo";

export default function MobileLoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<any>(null);

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
      const message = "Username or email and password are required.";
      setErrorMessage(message);
      notifyMobile("validation", message);
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
        const message = response.message || "Failed to authenticate.";
        setErrorMessage(message);
        notifyMobile("error", message, "Sign in failed");
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
      const message = err instanceof Error ? err.message : "Authentication error occurred.";
      setErrorMessage(message);
      notifyMobile("error", message, "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      className="flex-1 bg-[#FAF7F2]"
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
        <View style={{ width: "100%", maxWidth: 390, alignSelf: "center" }}>
          {/* Authentic 3D Embossed Gold Crest Header */}
          <View style={{ alignItems: "center", marginBottom: isKeyboardVisible ? 16 : 24 }}>
            <StudioBrandMark
              variant="stacked"
              height={isKeyboardVisible ? 96 : 132}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: "#6E6862",
                textAlign: "center",
                marginTop: 8,
                letterSpacing: 0.1,
              }}
            >
              Sign in to continue to your account
            </Text>
          </View>

          {/* Clean, Focused Login Card */}
          <View
            style={{
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "#E8E2D8",
              borderRadius: 22,
              padding: 22,
              width: "100%",
              shadowColor: "#78070D",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08,
              shadowRadius: 18,
              elevation: 3,
            }}
          >
            {/* Error Feedback Alert */}
            {errorMessage && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FBF2F3",
                  borderWidth: 1,
                  borderColor: "#F5D6D8",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <AlertCircle size={18} color="#78070D" strokeWidth={2} />
                <Text
                  style={{
                    fontSize: 13,
                    color: "#78070D",
                    flex: 1,
                    marginLeft: 8,
                    fontWeight: "600",
                    lineHeight: 18,
                  }}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Username or Email Input */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#231E1C",
                  marginBottom: 7,
                }}
              >
                Username or Email
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 48,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  borderWidth: focusedField === "identifier" ? 1.5 : 1,
                  borderColor: focusedField === "identifier" ? "#C59B4E" : "#E8E2D8",
                  backgroundColor: focusedField === "identifier" ? "#ffffff" : "#FAF7F2",
                }}
              >
                <User
                  size={18}
                  color={focusedField === "identifier" ? "#C59B4E" : "#9B958F"}
                  strokeWidth={focusedField === "identifier" ? 2.3 : 1.8}
                />
                <TextInput
                  value={identifier}
                  onChangeText={setIdentifier}
                  onFocus={() => handleInputFocus("identifier")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Username or email"
                  placeholderTextColor="#9B958F"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: "500",
                    color: "#231E1C",
                    marginLeft: 10,
                    paddingVertical: 0,
                  }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 22 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#231E1C",
                  marginBottom: 7,
                }}
              >
                Password
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 48,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  borderWidth: focusedField === "password" ? 1.5 : 1,
                  borderColor: focusedField === "password" ? "#C59B4E" : "#E8E2D8",
                  backgroundColor: focusedField === "password" ? "#ffffff" : "#FAF7F2",
                }}
              >
                <Lock
                  size={18}
                  color={focusedField === "password" ? "#C59B4E" : "#9B958F"}
                  strokeWidth={focusedField === "password" ? 2.3 : 1.8}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => handleInputFocus("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  placeholderTextColor="#9B958F"
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={() => handleLogin(false)}
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: "500",
                    color: "#231E1C",
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
                    <EyeOff size={18} color="#6E6862" strokeWidth={1.8} />
                  ) : (
                    <Eye size={18} color="#9B958F" strokeWidth={1.8} />
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
                height: 48,
                backgroundColor: loading ? "#63060B" : "#78070D",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                shadowColor: "#78070D",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.28,
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
                    fontSize: 15,
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
