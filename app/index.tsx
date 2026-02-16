// app/index.jsx
import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';



export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    console.log('Splash screen mounted');
    const timer = setTimeout(() => {
      console.log('Redirecting to /signup');
      router.replace('/signup');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📝 TaskMaster</Text>
      <ActivityIndicator size="large" color="#1a1a1a" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' },
  title: { fontSize: 42, fontWeight: 'bold', color: '#fff', marginBottom: 40 },
  loader: { marginTop: 20 }
});