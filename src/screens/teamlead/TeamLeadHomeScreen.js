// src/screens/teamlead/TeamLeadHomeScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const STORAGE_KEYS = {
  USERS: "taskflow_users",
  TASKS: "taskflow_tasks",
  PROJECTS: "taskflow_projects",
  CURRENT_USER: "taskflow_current_user",
};

export default function TeamLeadHomeScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: new Date(),
    priority: "medium",
    estimatedHours: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const [stats, setStats] = useState({
    teamSize: 0,
    activeTasks: 0,
    pendingReviews: 0,
    completedTasks: 0,
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [sprintTasks, setSprintTasks] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadTeamLeadData();
    }, []),
  );

  const loadTeamLeadData = async () => {
    setLoading(true);
    try {
      const usersData = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      const allUsers = usersData ? JSON.parse(usersData) : [];

      const tasksData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      const allTasks = tasksData ? JSON.parse(tasksData) : [];

      // Team members (developers only)
      const team = allUsers.filter((u) => u.role === "developer");
      setTeamMembers(team);

      // Tasks assigned to team
      const teamTaskIds = team.map((m) => m.id);
      const teamTasks = allTasks.filter((t) =>
        teamTaskIds.includes(t.assignedTo),
      );

      // Stats
      const active = teamTasks.filter(
        (t) => t.status === "in_progress" || t.status === "pending",
      ).length;
      const reviews = teamTasks.filter(
        (t) => t.status === "review" || t.status === "code_review",
      ).length;
      const completed = teamTasks.filter(
        (t) => t.status === "completed",
      ).length;

      setStats({
        teamSize: team.length,
        activeTasks: active,
        pendingReviews: reviews,
        completedTasks: completed,
      });

      // Tasks due this week
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const sprint = teamTasks
        .filter((t) => t.dueDate && new Date(t.dueDate) <= nextWeek)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          title: t.title,
          assignee: t.assignedToName,
          assignedBy: t.createdByName || "Unknown",
          status: t.status,
          due: new Date(t.dueDate).toLocaleDateString(),
          priority: t.priority,
        }));
      setSprintTasks(sprint);

      // Pending reviews
      const reviews_list = teamTasks
        .filter((t) => t.status === "review" || t.status === "code_review")
        .slice(0, 3)
        .map((t) => ({
          id: t.id,
          title: t.title,
          author: t.assignedToName,
          assignedBy: t.createdByName || "Unknown",
        }));
      setPendingReviews(reviews_list);
    } catch (error) {
      console.error("Error loading team lead data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async () => {
    if (!taskForm.title.trim()) {
      Alert.alert("Error", "Please enter task title");
      return;
    }

    if (!selectedMember) {
      Alert.alert("Error", "Please select a team member");
      return;
    }

    try {
      const tasksData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      const allTasks = tasksData ? JSON.parse(tasksData) : [];

      const newTask = {
        id: Date.now().toString(),
        title: taskForm.title,
        description: taskForm.description || "",
        assignedTo: selectedMember.id,
        assignedToName: selectedMember.name,
        assignedToRole: selectedMember.role,
        createdBy: user?.id || "1",
        createdByName: user?.name || "Team Lead",
        createdAt: new Date().toISOString(),
        dueDate: taskForm.dueDate.toISOString(),
        priority: taskForm.priority,
        status: "pending",
        estimatedHours: taskForm.estimatedHours || "0",
        comments: [],
        projectId: "general",
        projectName: "General",
      };

      allTasks.push(newTask);
      await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));

      Alert.alert("Success", `Task assigned to ${selectedMember.name}`);
      setModalVisible(false);
      resetTaskForm();
      loadTeamLeadData(); // Refresh data
    } catch (error) {
      console.error("Error assigning task:", error);
      Alert.alert("Error", "Failed to assign task");
    }
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      dueDate: new Date(),
      priority: "medium",
      estimatedHours: "",
    });
    setSelectedMember(null);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          navigation.replace("Login");
        },
      },
    ]);
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

  const quickActions = [
    {
      id: "1",
      title: "Assign Task",
      icon: "📝",
      screen: "",
      color: "#2196F3",
      action: () => setModalVisible(true),
    },
    {
      id: "2",
      title: "Review Tasks",
      icon: "👀",
      screen: "TaskList",
      color: "#FF9800",
    },
    {
      id: "3",
      title: "Sprint Planning",
      icon: "📋",
      screen: "SprintPlanning",
      color: "#4CAF50",
    },
    {
      id: "4",
      title: "Team Standup",
      icon: "👥",
      screen: "Standup",
      color: "#9C27B0",
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || "Team Lead"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>TEAM LEAD</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.teamSize}</Text>
            <Text style={styles.statLabel}>Team</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activeTasks}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pendingReviews}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.completedTasks}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.actionCard, { borderColor: item.color }]}
                onPress={() =>
                  item.action
                    ? item.action()
                    : navigation.navigate(item.screen, { user })
                }
              >
                <Text style={styles.actionIcon}>{item.icon}</Text>
                <Text style={styles.actionTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Team Members - Click to assign task */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Team Members ({teamMembers.length})
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("TeamList", { user })}
            >
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          {teamMembers.slice(0, 3).map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.memberRow}
              onPress={() => {
                setSelectedMember(member);
                setModalVisible(true);
              }}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {member.name?.charAt(0) || "?"}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
              <Text style={styles.assignIcon}>📝</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sprint Tasks */}
        {sprintTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Upcoming Tasks ({sprintTasks.length})
            </Text>
            {sprintTasks.map((task) => (
              <View key={task.id} style={styles.taskItem}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      {
                        backgroundColor: getPriorityColor(task.priority) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        { color: getPriorityColor(task.priority) },
                      ]}
                    >
                      {task.priority}
                    </Text>
                  </View>
                </View>
                <Text style={styles.taskMeta}>
                  👤 {task.assignee} • 📅 {task.due}
                </Text>
                <Text style={styles.taskAssignedBy}>
                  Assigned by: {task.assignedBy}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pending Reviews */}
        {pendingReviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Reviews ({pendingReviews.length})
            </Text>
            {pendingReviews.map((review) => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewItem}
                onPress={() => navigation.navigate("TaskList", { user })}
              >
                <Text style={styles.reviewTitle}>{review.title}</Text>
                <Text style={styles.reviewMeta}>
                  By: {review.author} • Assigned by: {review.assignedBy}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Assign Task Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Assign Task to {selectedMember?.name || "Team Member"}
            </Text>

            <ScrollView>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Task Title *</Text>
                <TextInput
                  style={styles.input}
                  value={taskForm.title}
                  onChangeText={(text) =>
                    setTaskForm({ ...taskForm, title: text })
                  }
                  placeholder="e.g., Fix login bug"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={taskForm.description}
                  onChangeText={(text) =>
                    setTaskForm({ ...taskForm, description: text })
                  }
                  placeholder="Task details..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity
                  style={styles.datePicker}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>{taskForm.dueDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={taskForm.dueDate}
                    mode="date"
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setTaskForm({ ...taskForm, dueDate: date });
                    }}
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityContainer}>
                  {["low", "medium", "high"].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityOption,
                        taskForm.priority === p && styles.priorityOptionActive,
                        { backgroundColor: getPriorityColor(p) + "20" },
                      ]}
                      onPress={() => setTaskForm({ ...taskForm, priority: p })}
                    >
                      <Text
                        style={[
                          styles.priorityOptionText,
                          { color: getPriorityColor(p) },
                        ]}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Estimated Hours</Text>
                <TextInput
                  style={styles.input}
                  value={taskForm.estimatedHours}
                  onChangeText={(text) =>
                    setTaskForm({ ...taskForm, estimatedHours: text })
                  }
                  placeholder="e.g., 4"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  resetTaskForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.assignButton]}
                onPress={handleAssignTask}
              >
                <Text style={styles.assignButtonText}>Assign Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  greeting: { fontSize: 14, color: "#666" },
  userName: { fontSize: 24, fontWeight: "bold", color: "#4CAF50" },
  userEmail: { fontSize: 12, color: "#999", marginTop: 4 },
  roleBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    margin: 20,
    padding: 15,
    borderRadius: 12,
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#4CAF50" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 2 },
  statDivider: { width: 1, backgroundColor: "#ddd" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  viewAll: { fontSize: 12, color: "#4CAF50" },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 2,
  },
  actionIcon: { fontSize: 32, marginBottom: 4 },
  actionTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberInitial: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600", color: "#333" },
  memberRole: { fontSize: 12, color: "#666" },
  assignIcon: { fontSize: 20, color: "#4CAF50" },
  taskItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  taskTitle: { fontSize: 14, fontWeight: "500", color: "#333", flex: 1 },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
  },
  taskMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  taskAssignedBy: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
    fontStyle: "italic",
  },
  reviewItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  reviewTitle: { fontSize: 14, fontWeight: "500", color: "#333" },
  reviewMeta: { fontSize: 11, color: "#666", marginTop: 4 },
  logoutButton: {
    margin: 20,
    backgroundColor: "#f44336",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#555",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  datePicker: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
  },
  priorityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priorityOption: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: "center",
  },
  priorityOptionActive: {
    borderWidth: 2,
    borderColor: "#333",
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#f44336",
    fontSize: 15,
    fontWeight: "600",
  },
  assignButton: {
    backgroundColor: "#4CAF50",
    marginLeft: 8,
  },
  assignButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
