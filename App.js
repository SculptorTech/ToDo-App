// App.js
import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View, Alert } from "react-native";
import "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";

import { io } from "socket.io-client";

// ⚠️ Replace with your backend IP if using real device
const socket = io("http://localhost:5000"); 
// For emulator you can use:
// Android Emulator → http://10.0.2.2:5000
// iOS Simulator → http://localhost:5000

export default function App() {
  useEffect(() => {
    // ⚠️ Replace with actual logged-in user ID
    const userId = 101;

    // 🔗 Join room
    socket.emit("join", userId);

    // 🔔 Listen for notifications
    socket.on("new-notification", (data) => {
      console.log("🔔 Notification:", data);

      // Show popup alert
      Alert.alert(data.title, data.message);
    });

    // Cleanup
    return () => {
      socket.off("new-notification");
      socket.disconnect();
    };
  }, []);

  return (
    <NavigationContainer
      fallback={
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      }
    >
      <AppNavigator />
    </NavigationContainer>
  );
}