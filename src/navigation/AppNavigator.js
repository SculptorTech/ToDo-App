// src/navigation/AppNavigator.js

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

// Regular User Screens (Viewer, Developer)
import TaskListScreen from "../screens/developer/TaskListScreen";

// Manager & Team Lead Screens
import AddTaskScreen from "../screens/Manager/AddTaskScreen";
import ManagerHomeScreen from "../screens/Manager/ManagerHomeScreen";
import ProjectDetailsScreen from "../screens/Manager/ProjectDetailsScreen";
import ProjectListScreen from "../screens/Manager/ProjectListScreen";
import Reports from "../screens/Manager/Reports";
import TaskBoardScreen from "../screens/Manager/TaskBoardScreen";
import TeamManagementScreen from "../screens/Manager/TeamManagementScreen";
import TeamLeadHomeScreen from "../screens/teamlead/TeamLeadHomeScreen";

// Admin Screens
import AddPeopleScreen from "../screens/Admin/AddPeopleScreen";
import AdminHomeScreen from "../screens/Admin/AdminHomeScreen";
import AnalyticsScreen from "../screens/Admin/AnalyticsScreen";
import AssignTaskScreen from "../screens/Admin/AssignTaskScreen";
import CreateProjectScreen from "../screens/Admin/CreateProjectScreen";
import ManageTeamsScreen from "../screens/Admin/ManageTeamsScreen";
import ProjectManagementScreen from "../screens/Admin/ProjectManagementScreen";
import RoleManagementScreen from "../screens/Admin/RoleManagementScreen";
import UserManagementScreen from "../screens/Admin/UserManagementScreen";


const Stack = createNativeStackNavigator();

export default function AppNavigator({ userRole }) {
  // Function to get initial screen based on role
  const getInitialScreen = (role) => {
    switch (role) {
      case "admin":
        return "AdminHome";
      case "manager":
        return "ManagerHome";
      case "team_lead":
        return "TeamLeadHome";
      default:
        return "TaskList";
    }
  };

  return (
    // Remove NavigationContainer wrapper - it should only be in App.js
    <Stack.Navigator initialRouteName="Login">
      {/* Auth Screens */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: "Create Account" }}
      />

      {/* Regular User Screens (Viewer, Developer) */}
      <Stack.Screen
        name="TaskList"
        component={TaskListScreen}
        options={{
          title: "My Tasks",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen name="AddTask" component={AddTaskScreen} options={{}} />

      {/* Manager Screens */}
      <Stack.Screen
        name="ManagerHome"
        component={ManagerHomeScreen}
        options={{
          title: "  Manager Dashboard ",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen name="Reports" component={Reports} />
      <Stack.Screen name="TeamList" component={TeamManagementScreen} />

      {/* Team Lead Screens */}
      <Stack.Screen
        name="TeamLeadHome"
        component={TeamLeadHomeScreen}
        options={{
          title: "Team Lead Dashboard",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="ProjectDetails"
        component={ProjectDetailsScreen}
        options={{ headerShown: false }}
      />
      {/* Admin Screens */}
      <Stack.Screen
        name="AdminHome"
        component={AdminHomeScreen}
        options={{
          title: "Admin Dashboard",
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={{ title: "Create Project" }}
      />
      <Stack.Screen
        name="AddPeople"
        component={AddPeopleScreen}
        options={{ title: "Add People" }}
      />
      <Stack.Screen
        name="AssignTask"
        component={AssignTaskScreen}
        options={{ title: "Assign Task" }}
      />
      <Stack.Screen
        name="ProjectManagement"
        component={ProjectManagementScreen}
        options={{ title: "Project Management" }}
      />
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: "User Management" }}
      />
      <Stack.Screen
        name="ManageTeams"
        component={ManageTeamsScreen}
        options={{ title: "Manage Teams" }}
      />
      <Stack.Screen
        name="Analytics"

        
        component={AnalyticsScreen}
        options={{ title: "Analytics" }}
      />
      <Stack.Screen
        name="RoleManagement"
        component={RoleManagementScreen}
        options={{ title: "Role Management" }}
      />
      <Stack.Screen
        name="ProjectList"
        component={ProjectListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskBoard"
        component={TaskBoardScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
