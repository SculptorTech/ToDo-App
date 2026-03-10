// src/screens/LoginScreen.js
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { postRequest } from "../services/apiService"; // Import the API method

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const navigation = useNavigation();

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

    setLoading(true);

    try {
      console.log("Attempting login with:", { email, password });

      // Using the imported postRequest method
      const response = await postRequest("/user/login", {
        EmailID: email.trim(),
        Password: password.trim(),
      });

      console.log("Login response:", response);

      if (response.token || response.user) {
        const { user, token } = response;

        // Get the role - check different possible field names
        const roleName = user?.RoleName || user?.roleName || user?.role || "";
        const roleLower = roleName.toString().toLowerCase();

        console.log("User role:", roleName);
        console.log("Lowercase role:", roleLower);

        // Navigate based on user role
        let destinationScreen = "TaskList"; // Default

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

        // Navigate directly
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
      >
        <View style={styles.content}>
          {/* Header with enhanced emoji styling */}
          <View style={styles.headerContainer}>
            <View style={styles.titleWrapper}>
              <Text style={styles.titleEmoji}>🚀</Text>
              <Text style={styles.title}>TaskFlow</Text>
              <Text style={styles.titleEmoji}>✨</Text>
            </View>
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>Role-Based Task Management</Text>
              <View style={styles.subtitleUnderline} />
            </View>
          </View>

          {/* Welcome Back Message */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>Welcome Back! 👋</Text>
            <Text style={styles.welcomeSubtext}>
              Sign in to continue to your dashboard
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.labelContainer}>
              <Text style={styles.labelText}>📧 Email</Text>
            </View>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#999"
              style={[styles.input, emailError && styles.inputError]}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {emailError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.labelContainer}>
              <Text style={styles.labelText}>🔒 Password</Text>
            </View>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#999"
              style={[styles.input, passwordError && styles.inputError]}
              secureTextEntry
              value={password}
              onChangeText={handlePasswordChange}
              editable={!loading}
            />
            {passwordError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{passwordError}</Text>
              </View>
            ) : null}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password? 🔑</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Login</Text>
                <Text style={styles.buttonEmoji}>→</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              disabled={loading}
            >
              <Text style={styles.signUpLink}>Sign Up ✨</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#1a1a1a",
    letterSpacing: 1,
    marginHorizontal: 8,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  titleEmoji: {
    fontSize: 40,
  },
  subtitleContainer: {
    alignItems: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#6c757d",
    marginBottom: 8,
    fontWeight: "500",
  },
  subtitleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: "#4361ee",
    borderRadius: 2,
  },
  welcomeContainer: {
    marginBottom: 30,
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: "#6c757d",
  },
  inputWrapper: {
    marginBottom: 20,
  },
  labelContainer: {
    marginBottom: 8,
    marginLeft: 4,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e9ecef",
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    color: "#1a1a1a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderColor: "#f72585",
    backgroundColor: "#fff5f5",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginLeft: 4,
  },
  errorIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  errorText: {
    color: "#f72585",
    fontSize: 12,
    fontWeight: "500",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#4361ee",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#4361ee",
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#4361ee",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#a5b8f0",
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
    marginRight: 8,
  },
  buttonEmoji: {
    color: "#fff",
    fontSize: 18,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  signUpText: {
    color: "#6c757d",
    fontSize: 16,
  },
  signUpLink: {
    color: "#4361ee",
    fontSize: 16,
    fontWeight: "700",
  },
});