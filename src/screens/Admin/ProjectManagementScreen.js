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

import {
  getRequest
} from "../../services/apiService";

export default function ProjectManagementScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [projects, setProjects] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingProjectId, setUpdatingProjectId] = useState(null);

  /* ===============================
     LOAD PROJECTS
  =============================== */

  useFocusEffect(
    useCallback(() => {
      loadProjects();
    }, []),
  );

  const loadProjects = async () => {
    try {
      console.log("📊 Fetching projects from API");

      const response = await getRequest("/project/get-projects");

      const projectsData = response.projects || [];

      const normalizedProjects = projectsData.map((p) => ({
        ...p,
        id: p.id || p.ProjectID || p.ProjectId,
      }));

      setProjects(normalizedProjects);
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

  const handleDelete = async (id) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/project/delete-project/${id}`,
        { method: "DELETE" },
      );

      const data = await res.json();
      console.log(data);

      getProjects(); // reload list
    } catch (err) {
      console.error(err);
    }
  };
  /* ===============================
     UPDATE PROJECT
  =============================== */

  const handleUpdate = async (id, updatedData) => {
    await fetch(`http://localhost:5000/api/project/update-project/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });

    getProjects();
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

        <TouchableOpacity
          onPress={() => handleDelete(item._id, item.Name)}
          disabled={updatingProjectId === item.ProjectId}
        >
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
              {updatingProjectId === item.ProjectId
                ? "Updating..."
                : item.Status}
            </Text>
          </View>
        </TouchableOpacity>
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
          onPress={() => showUpdateOptions(item)}
        >
          <Text style={styles.editButtonText}>Update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.Name)}
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

        <Text style={styles.headerTitle}>Projects ({projects.length})</Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("CreateProject", {
              user,
              mode: "create",
            })
          }
        >
          <Text style={styles.addText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={(item) => item.id.toString()}
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
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: "center",
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
