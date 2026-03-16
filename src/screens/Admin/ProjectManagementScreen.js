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

import { getRequest, deleteRequest } from "../../services/apiService";

export default function ProjectManagementScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [projects, setProjects] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  /* ===============================
     LOAD PROJECTS
  =============================== */

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, [])
  );

  const loadProjects = async () => {
    try {
      console.log("📊 Fetching projects from API");

      const response = await getRequest("/project/get-projects");

      console.log("API Response:", response);

      setProjects(response.projects || []);
    } catch (error) {
      console.error("❌ Error loading projects:", error);
      Alert.alert("Error", "Failed to load projects");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  /* ===============================
     DELETE PROJECT
  =============================== */

  const handleDelete = (projectId, projectName) => {
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${projectName}"?`,
      [
        { text: "Cancel", style: "cancel" },

        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRequest(`/project/delete-project/${projectId}`);

              setProjects(projects.filter((p) => p.ProjectId !== projectId));

              Alert.alert("Success", "Project deleted successfully");
            } catch (error) {
              console.error("❌ Delete error:", error);

              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to delete project"
              );
            }
          },
        },
      ]
    );
  };

  /* ===============================
     UI HELPERS
  =============================== */

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

  /* ===============================
     PROJECT CARD
  =============================== */

  const renderProject = ({ item }) => (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <Text style={styles.projectName}>{item.Name}</Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.Status) + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.Status) },
            ]}
          >
            {item.Status}
          </Text>
        </View>
      </View>

      <Text style={styles.client}>Client: {item.Client || "N/A"}</Text>

      <Text style={styles.description} numberOfLines={2}>
        {item.Description}
      </Text>

      <View style={styles.dates}>
        <Text style={styles.date}>Start: {item.StartDate}</Text>
        <Text style={styles.date}>End: {item.EndDate}</Text>
      </View>

      <View style={styles.metaContainer}>
        <Text style={styles.budget}>💰 ${item.Budget || 0}</Text>
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
          onPress={() => handleDelete(item.ProjectId, item.Name)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ===============================
     SCREEN
  =============================== */

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Projects ({projects.length})
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("CreateProject", { user })}
        >
          <Text style={styles.addText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.ProjectId}
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

/* ===============================
   STYLES
=============================== */

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
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },

  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  projectName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
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
    marginBottom: 12,
  },

  budget: {
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
  },

  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});       