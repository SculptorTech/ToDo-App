// app/index.jsx - Splash Screen
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login"); // ← Check this line too
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 TaskMaster</Text>
      <Text style={styles.subtitle}>Your Personal Task Manager</Text>
      <ActivityIndicator size="large" color="#1a1a1a" style={styles.loader} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}
