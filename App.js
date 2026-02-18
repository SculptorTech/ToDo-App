// App.js
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
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
