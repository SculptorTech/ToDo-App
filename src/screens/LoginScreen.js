// src/screens/LoginScreen.js
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation();

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      Alert.alert("Success", "Logged in successfully!");
      // ✅ FIXED: Use 'TaskListScreen' (matches the name in AppNavigator)
      navigation.replace("TaskList");
      setLoading(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Task Manager</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    marginTop: 24,
    color: "#2196F3",
    fontSize: 14,
  },
});
