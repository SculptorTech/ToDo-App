// src/screens/LoginScreen.js
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { postRequest } from "../services/apiService";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const navigation = useNavigation();

  // Start animations on component mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    let isValid = true;

    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password.trim()) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    } else {
      setPasswordError("");
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    // Button press animation
    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 3,
        tension: 40,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
        tension: 40,
      }),
    ]).start();

    setLoading(true);

    try {
      console.log("Attempting login with:", { email, password });

      const response = await postRequest("/user/login", {
        EmailID: email.trim(),
        Password: password.trim(),
      });

      console.log("Login response:", response);

      if (response.token || response.user) {
        const { user, token } = response;

        const roleName = user?.RoleName || user?.roleName || user?.role || "";
        const roleLower = roleName.toString().toLowerCase();

        console.log("User role:", roleName);

        let destinationScreen = "TaskList";

        if (roleLower === "administrator" || roleLower === "admin") {
          destinationScreen = "AdminHome";
        } else if (roleLower === "manager") {
          destinationScreen = "ManagerHome";
        } else if (roleLower === "team_lead" || roleLower === "teamlead") {
          destinationScreen = "TeamLeadHome";
        } else if (roleLower === "developer" || roleLower === "dev") {
          destinationScreen = "TaskList";
        } else if (roleLower === "viewer") {
          destinationScreen = "TaskList";
        }

        console.log("Navigating to:", destinationScreen);

        navigation.replace(destinationScreen, {
          user: user,
          token: token,
        });
      } else {
        Alert.alert("Login Failed", "Invalid response from server");
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message || "Invalid credentials";

        if (status === 401) {
          Alert.alert("Login Failed", "Invalid email or password");
        } else if (status === 403) {
          Alert.alert(
            "Account Inactive",
            "Your account is pending approval. Please contact admin.",
          );
        } else if (status === 400) {
          Alert.alert("Invalid Request", message);
        } else {
          Alert.alert("Login Failed", message);
        }
      } else if (error.request) {
        Alert.alert(
          "Connection Error",
          "Cannot connect to server. Please check if backend is running.",
        );
      } else {
        Alert.alert("Error", "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailError) setEmailError("");
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (passwordError) setPasswordError("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>TaskFlow</Text>
            <View style={styles.divider} />
            <Text style={styles.subtitle}>Role-Based Task Management</Text>
          </View>

          {/* Welcome Message */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.welcomeSubtext}>
              Sign in to continue to your dashboard
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.labelText}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              style={[styles.input, emailError && styles.inputError]}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.labelText}>Password</Text>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#9ca3af"
              style={[styles.input, passwordError && styles.inputError]}
              secureTextEntry
              value={password}
              onChangeText={handlePasswordChange}
              editable={!loading}
            />
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              disabled={loading}
            >
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
  },
  headerContainer: {
    marginBottom: 48,
    alignItems: "center",
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  divider: {
    width: 40,
    height: 3,
    backgroundColor: "#3b82f6",
    borderRadius: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "400",
  },
  welcomeContainer: {
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 20,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    color: "#111827",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 32,
  },
  forgotPasswordText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    color: "#6b7280",
    fontSize: 14,
  },
  signUpLink: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
});
