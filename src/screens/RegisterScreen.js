import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
//import { supabase } from '../utils/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");

    // Email validation
    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    // Password validation
    if (!password.trim()) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      // Sync any locally stored tasks to cloud
      // await syncLocalTasks();

      Alert.alert("Success", "Logged in successfully!", [
        { text: "OK", onPress: () => router.replace("/TaskListScreen") },
      ]);
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Login Failed", error.message || "Invalid credentials");
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

  const handleGuestLogin = () => {
    Alert.alert(
      "Continue as Guest",
      "You can use the app offline. Tasks will be saved locally.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", onPress: () => router.replace("/tasks") },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Task Manager</Text>
        <Text style={styles.subtitle}>Organize your tasks efficiently</Text>

        {/* Email Input */}
        <TextInput
          placeholder="Email"
          style={[styles.input, emailError && styles.inputError]}
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        {/* Password Input */}
        <TextInput
          placeholder="Password"
          style={[styles.input, passwordError && styles.inputError]}
          secureTextEntry
          value={password}
          onChangeText={handlePasswordChange}
          editable={!loading}
        />
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : null}

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Guest Login */}
        <TouchableOpacity
          style={styles.guestButton}
          onPress={handleGuestLogin}
          disabled={loading}
        >
          <Text style={styles.guestButtonText}>Continue as Guest</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sign Up Link */}
        <TouchableOpacity
          onPress={() => router.push("/register")}
          disabled={loading}
        >
          <Text style={styles.link}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>

        {/* Demo credentials */}
        <View style={styles.demoHint}>
          <Text style={styles.demoText}>
            For testing: use any email & password
          </Text>
          <Text style={styles.demoText}>
            Or continue as guest for offline use
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
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
    marginBottom: 40,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
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
    marginBottom: 16,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
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
  guestButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    marginBottom: 20,
  },
  guestButtonText: {
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
    fontSize: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    color: "#999",
    paddingHorizontal: 16,
    fontSize: 14,
  },
  link: {
    textAlign: "center",
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "500",
  },
  demoHint: {
    marginTop: 30,
    padding: 16,
    backgroundColor: "#f0f7ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cce5ff",
  },
  demoText: {
    fontSize: 13,
    color: "#0066cc",
    textAlign: "center",
    marginBottom: 4,
  },
});
