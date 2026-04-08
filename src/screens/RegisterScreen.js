// src/screens/RoleBasedSignupScreen.js
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

// Default role set to Developer
const DEFAULT_ROLE = {
  id: "developer",
  name: "Developer",
  description: "View and update assigned tasks",
  color: "#28a745",
  icon: "💻",
  requiresApproval: false,
};

export default function RoleBasedSignupScreen() {
  const [formData, setFormData] = useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
  });

  // Role is fixed as Developer - no state needed for selection
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateMobile = (mobile) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
      isValid = false;
    }

    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile number is required";
      isValid = false;
    } else if (!validateMobile(formData.mobileNumber)) {
      newErrors.mobileNumber = "Enter a valid 10-digit mobile number";
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Enter a valid email address";
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log("Attempting signup with:", {
        FullName: formData.fullName,
        EmailID: formData.email,
        Role: DEFAULT_ROLE.id
      });

      const response = await postRequest("/user/create-user", {
        FullName: formData.fullName,
        MobileNumber: formData.mobileNumber,
        EmailID: formData.email,
        Password: formData.password,
        Role: DEFAULT_ROLE.id,
        Department: formData.department || "",
      });

      console.log("Signup response:", response);

      if (response.success || response.message || response.user) {
        Alert.alert(
          "Success",
          "Account created successfully! You can now login.",
          [{ text: "OK", onPress: () => navigation.navigate("Login") }],
        );
      } else {
        Alert.alert("Registration Failed", "Unexpected response from server");
      }
    } catch (error) {
      console.error("Signup error:", error);

      if (error.response) {
        const status = error.response.status;
        const errorMessage = 
          error.response.data?.message || 
          error.response.data?.error || 
          "Registration failed. Please try again.";

        if (status === 400) {
          Alert.alert("Validation Error", errorMessage);
        } else if (status === 409) {
          Alert.alert("User Exists", "Email or mobile number already registered");
        } else if (status === 500) {
          Alert.alert("Server Error", "Internal server error. Please try again later.");
        } else {
          Alert.alert("Registration Failed", errorMessage);
        }
      } else if (error.request) {
        Alert.alert(
          "Connection Error",
          "Cannot connect to server. Please check your internet connection and try again.",
        );
      } else {
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200",
          }}
          style={styles.backgroundImage}
          blurRadius={5}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              {/* Header Section */}
              <View style={styles.headerContainer}>
                <View style={styles.buildingIcon}>
                  <Text style={styles.buildingIconText}>📝</Text>
                </View>
                <Text style={styles.title}>Create Account</Text>
                <View style={styles.divider} />
                <Text style={styles.subtitle}>Join TaskFlow Enterprise</Text>
              </View>

              {/* Role Info Banner */}
              <View style={[styles.roleBanner, { backgroundColor: "rgba(40, 167, 69, 0.15)" }]}>
                <View
                  style={[
                    styles.roleIconContainer,
                    { backgroundColor: DEFAULT_ROLE.color },
                  ]}
                >
                  <Text style={styles.roleIcon}>{DEFAULT_ROLE.icon}</Text>
                </View>
                <View style={styles.roleBannerText}>
                  <Text style={styles.roleBannerTitle}>
                    {DEFAULT_ROLE.name} Account
                  </Text>
                  <Text style={styles.roleBannerDesc}>
                    {DEFAULT_ROLE.description}
                  </Text>
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View style={[styles.inputWrapper, errors.fullName && styles.inputWrapperError]}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    placeholder="Enter your full name"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    value={formData.fullName}
                    onChangeText={(text) =>
                      setFormData({ ...formData, fullName: text })
                    }
                    editable={!loading}
                  />
                </View>
                {errors.fullName && (
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                )}
              </View>

              {/* Mobile Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={[styles.inputWrapper, errors.mobileNumber && styles.inputWrapperError]}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    placeholder="Enter 10-digit mobile number"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    value={formData.mobileNumber}
                    onChangeText={(text) =>
                      setFormData({ ...formData, mobileNumber: text })
                    }
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
                {errors.mobileNumber && (
                  <Text style={styles.errorText}>{errors.mobileNumber}</Text>
                )}
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                  <Text style={styles.inputIcon}>📧</Text>
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Department (optional) */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Department (Optional)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🏢</Text>
                  <TextInput
                    placeholder="Enter your department"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    value={formData.department}
                    onChangeText={(text) =>
                      setFormData({ ...formData, department: text })
                    }
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    placeholder="Create a password"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    secureTextEntry
                    value={formData.password}
                    onChangeText={(text) =>
                      setFormData({ ...formData, password: text })
                    }
                    editable={!loading}
                  />
                </View>
                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
                  <Text style={styles.inputIcon}>✓</Text>
                  <TextInput
                    placeholder="Confirm your password"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    secureTextEntry
                    value={formData.confirmPassword}
                    onChangeText={(text) =>
                      setFormData({ ...formData, confirmPassword: text })
                    }
                    editable={!loading}
                  />
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#28a745", "#1f8b4c"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonIcon}>→</Text>
                      <Text style={styles.buttonText}>Create Account</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerLine}>
                <View style={styles.line} />
                <Text style={styles.dividerText}>Already have an account?</Text>
                <View style={styles.line} />
              </View>

              {/* Login Link */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => navigation.navigate("Login")}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>Sign In</Text>
                <Text style={styles.loginArrow}>→</Text>
              </TouchableOpacity>

              {/* Info Text */}
              <Text style={styles.infoText}>
                All new accounts are created with Developer role access
              </Text>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>© 2024 TaskFlow Enterprise</Text>
                <Text style={styles.footerSubtext}>Secure Corporate Registration</Text>
              </View>
            </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
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
  title: {
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
  roleBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(40, 167, 69, 0.15)",
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  roleIcon: {
    fontSize: 24,
    color: "#fff",
  },
  roleBannerText: {
    flex: 1,
  },
  roleBannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  roleBannerDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.9,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  inputWrapperError: {
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
    opacity: 0.8,
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
  button: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 24,
    marginBottom: 16,
    shadowColor: "#28a745",
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
    marginBottom: 16,
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
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: 16,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
  },
  loginArrow: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    opacity: 0.9,
  },
  infoText: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 20,
  },
  footer: {
    alignItems: "center",
    marginTop: 10,
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