// src/screens/admin/ProjectManagementScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProjectManagementScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [projects, setProjects] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load projects when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, []),
  );

  const loadProjects = async () => {
    try {
      console.log("📊 Loading projects...");
      const rawData = await AsyncStorage.getItem("taskflow_projects");
      console.log("📦 Raw data:", rawData);

      const data = rawData ? JSON.parse(rawData) : [];
      console.log("✅ Projects loaded:", data.length);
      setProjects(data);
    } catch (error) {
      console.error("❌ Error loading projects:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const handleDelete = (projectId, projectName) => {
    console.log("🗑️ Delete clicked for:", projectName, "ID:", projectId);

    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${projectName}"?\n\nThis will also delete all tasks associated with this project.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("✅ Delete confirmed");

              // Get current projects
              const rawData = await AsyncStorage.getItem("taskflow_projects");
              const allProjects = JSON.parse(rawData || "[]");
              console.log("📊 Before delete count:", allProjects.length);

              // Filter out the project
              const filtered = allProjects.filter((p) => p.id !== projectId);
              console.log("📊 After filter count:", filtered.length);

              // Save back to storage
              await AsyncStorage.setItem(
                "taskflow_projects",
                JSON.stringify(filtered),
              );
              console.log("✅ Saved to storage");

              // Also delete associated tasks
              try {
                const tasksData = await AsyncStorage.getItem("taskflow_tasks");
                const allTasks = tasksData ? JSON.parse(tasksData) : [];
                const remainingTasks = allTasks.filter(
                  (t) => t.projectId !== projectId,
                );
                await AsyncStorage.setItem(
                  "taskflow_tasks",
                  JSON.stringify(remainingTasks),
                );
                console.log("✅ Associated tasks deleted");
              } catch (taskError) {
                console.error("Error deleting tasks:", taskError);
              }

              // Update state immediately
              setProjects(filtered);

              // Show success message
              Alert.alert("Success", "Project deleted successfully");
            } catch (error) {
              console.error("❌ Error in delete:", error);
              Alert.alert("Error", "Failed to delete: " + error.message);
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#4CAF50";
      case "planning":
        return "#ff9800";
      case "completed":
        return "#2196f3";
      case "onhold":
        return "#f44336";
      default:
        return "#999";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      case "low":
        return "#4CAF50";
      default:
        return "#999";
    }
  };

  const renderProject = ({ item }) => (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <Text style={styles.projectName}>{item.name}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status
              ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
              : "Unknown"}
          </Text>
        </View>
      </View>

      <Text style={styles.client}>Client: {item.client || "N/A"}</Text>

      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.dates}>
        <Text style={styles.date}>Start: {item.startDate || "N/A"}</Text>
        <Text style={styles.date}>End: {item.endDate || "N/A"}</Text>
      </View>

      <View style={styles.metaContainer}>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(item.priority) + "20" },
          ]}
        >
          <Text
            style={[
              styles.priorityText,
              { color: getPriorityColor(item.priority) },
            ]}
          >
            {item.priority ? item.priority.toUpperCase() : "MEDIUM"}
          </Text>
        </View>

        <Text style={styles.budget}>💰 ${item.budget || "0"}</Text>
        <Text style={styles.progress}>📊 {item.progress || 0}%</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => Alert.alert("Info", "Edit feature coming soon")}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.name)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Projects ({projects.length})</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("CreateProject", { user })}
        >
          <Text style={styles.addText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No Projects</Text>
            <Text style={styles.emptyText}>
              Tap the + button to create your first project
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#4CAF50",
  },
  backText: {
    color: "#fff",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  addText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    padding: 16,
  },
  projectCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  projectName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  client: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
    lineHeight: 18,
  },
  dates: {
    flexDirection: "row",
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: "#999",
    marginRight: 16,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
  },
  budget: {
    fontSize: 12,
    color: "#666",
    marginRight: 12,
  },
  progress: {
    fontSize: 12,
    color: "#666",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  editButton: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    marginRight: 8,
  },
  editButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  deleteButton: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    backgroundColor: "#ffebee",
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: "#f44336",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
