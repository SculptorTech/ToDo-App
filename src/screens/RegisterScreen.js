// src/screens/RoleBasedSignupScreen.js
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

      // Using the imported postRequest method
      const response = await postRequest("/user/create-user", {
        FullName: formData.fullName,
        MobileNumber: formData.mobileNumber,
        EmailID: formData.email,
        Password: formData.password,
        Role: DEFAULT_ROLE.id, // Always use Developer role
        Department: formData.department || "", // Send empty string if not provided
      });

      console.log("Signup response:", response);

      // Check for success - adjust based on your API response structure
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

      // Error handling with the API service response structure
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up as a Developer</Text>

          {/* Role Info Banner */}
          <View
            style={[
              styles.roleBanner,
              { backgroundColor: DEFAULT_ROLE.color + "20" },
            ]}
          >
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
            <TextInput
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              style={[styles.input, errors.fullName && styles.inputError]}
              value={formData.fullName}
              onChangeText={(text) =>
                setFormData({ ...formData, fullName: text })
              }
              editable={!loading}
            />
            {errors.fullName && (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            )}
          </View>

          {/* Mobile Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#999"
              style={[styles.input, errors.mobileNumber && styles.inputError]}
              value={formData.mobileNumber}
              onChangeText={(text) =>
                setFormData({ ...formData, mobileNumber: text })
              }
              keyboardType="phone-pad"
              maxLength={10}
              editable={!loading}
            />
            {errors.mobileNumber && (
              <Text style={styles.errorText}>{errors.mobileNumber}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#999"
              style={[styles.input, errors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Department (optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Department (Optional)</Text>
            <TextInput
              placeholder="Enter your department"
              placeholderTextColor="#999"
              style={styles.input}
              value={formData.department}
              onChangeText={(text) =>
                setFormData({ ...formData, department: text })
              }
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              placeholder="Create a password"
              placeholderTextColor="#999"
              style={[styles.input, errors.password && styles.inputError]}
              secureTextEntry
              value={formData.password}
              onChangeText={(text) =>
                setFormData({ ...formData, password: text })
              }
              editable={!loading}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              placeholder="Confirm your password"
              placeholderTextColor="#999"
              style={[
                styles.input,
                errors.confirmPassword && styles.inputError,
              ]}
              secureTextEntry
              value={formData.confirmPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, confirmPassword: text })
              }
              editable={!loading}
            />
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
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")} disabled={loading}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <Text style={styles.infoText}>
            All new accounts are created with Developer role access
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  roleBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e9ecef",
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
    color: "#1a1a1a",
    marginBottom: 2,
  },
  roleBannerDesc: {
    fontSize: 13,
    color: "#666",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  inputError: {
    borderColor: "#ff6b6b",
    backgroundColor: "#fff5f5",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "#28a745", // Developer role color
    padding: 16,
    borderRadius: 10,
    marginTop: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: "#666",
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginText: {
    color: "#666",
    fontSize: 14,
  },
  loginLink: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  infoText: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginTop: 20,
    fontStyle: "italic",
  },
});