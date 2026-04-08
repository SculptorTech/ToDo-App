// src/screens/LoginScreen.js
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
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
  const cardAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 1000,
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
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200",
          }}
          style={styles.backgroundImage}
          blurRadius={5}
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
              {/* Office Header Section */}
              <View style={styles.headerContainer}>
                <View style={styles.buildingIcon}>
                  <Text style={styles.buildingIconText}>🏢</Text>
                </View>
                <Text style={styles.companyName}>TaskFlow</Text>
                <View style={styles.divider} />
                <Text style={styles.subtitle}>Corporate Task Management</Text>
              </View>

              {/* Login Card - Transparent */}
              <Animated.View
                style={[
                  styles.loginCard,
                  {
                    transform: [
                      {
                        scale: cardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.95, 1],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Welcome Section */}
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcomeText}>Welcome Back</Text>
                  <Text style={styles.welcomeSubtext}>
                    Please enter your corporate credentials
                  </Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.labelText}>Official Email</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      emailError && styles.inputContainerError,
                    ]}
                  >
                    <Text style={styles.inputIcon}>📧</Text>
                    <TextInput
                      placeholder="employee@taskflow.com"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.input}
                      value={email}
                      onChangeText={handleEmailChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>
                  {emailError ? (
                    <Text style={styles.errorText}>{emailError}</Text>
                  ) : null}
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.labelText}>Password</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      passwordError && styles.inputContainerError,
                    ]}
                  >
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      style={styles.input}
                      secureTextEntry
                      value={password}
                      onChangeText={handlePasswordChange}
                      editable={!loading}
                    />
                  </View>
                  {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  ) : null}
                </View>

                {/* Forgot Password Link */}
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                {/* Login Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#2563EB", "#1E40AF"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                    >
                      {loading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <>
                          <Text style={styles.buttonIcon}>→</Text>
                          <Text style={styles.buttonText}>
                            Access Dashboard
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Divider */}
                <View style={styles.dividerLine}>
                  <View style={styles.line} />
                  <Text style={styles.dividerText}>New to TaskFlow?</Text>
                  <View style={styles.line} />
                </View>

                {/* Sign Up Link */}
                <TouchableOpacity
                  style={styles.signUpButton}
                  onPress={() => navigation.navigate("Register")}
                  disabled={loading}
                >
                  <Text style={styles.signUpText}>
                    Create Corporate Account
                  </Text>
                  <Text style={styles.signUpArrow}>→</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  © 2024 TaskFlow Enterprise
                </Text>
                <Text style={styles.footerSubtext}>
                  Secure Corporate Access
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </ImageBackground>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    resizeMode: "cover",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 40 : 20,
    paddingBottom: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  buildingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  buildingIconText: {
    fontSize: 40,
  },
  companyName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
    marginBottom: 12,
    opacity: 0.8,
  },
  subtitle: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  loginCard: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 24,
    padding: 24,
    backdropFilter: "blur(10px)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  welcomeContainer: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 20,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    opacity: 0.9,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputContainerError: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    opacity: 0.9,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    paddingVertical: 0,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
  },
  button: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  buttonIcon: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
  },
  dividerLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  dividerText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginHorizontal: 12,
  },
  signUpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  signUpText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
  },
  signUpArrow: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    opacity: 0.9,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    opacity: 0.7,
    marginBottom: 4,
  },
  footerSubtext: {
    color: "#FFFFFF",
    fontSize: 10,
    opacity: 0.5,
  },
});
