// src/screens/manager/ManagerHomeScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STORAGE_KEYS = {
  PROJECTS: "taskflow_projects",
  USERS: "taskflow_users",
  TASKS: "taskflow_tasks",
  CURRENT_USER: "taskflow_current_user",
};

export default function ManagerHomeScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    teamMembers: 0,
    activeProjects: 0,
    pendingTasks: 0,
    completedTasks: 0,
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [managedProjects, setManagedProjects] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadManagerData();
    }, []),
  );

  const loadManagerData = async () => {
    setLoading(true);
    try {
      // Get all projects
      const projectsData = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS);
      const allProjects = projectsData ? JSON.parse(projectsData) : [];

      // Get all users
      const usersData = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      const allUsers = usersData ? JSON.parse(usersData) : [];

      // Get all tasks
      const tasksData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      const allTasks = tasksData ? JSON.parse(tasksData) : [];

      // Filter projects assigned to this manager
      // In a real app, you'd have a managerId field in projects
      const managed = allProjects.filter(
        (p) => p.status === "active" || p.status === "planning",
      );
      setManagedProjects(managed);

      // Get team members (developers and team leads)
      const team = allUsers.filter(
        (u) => u.role === "developer" || u.role === "team_lead",
      );
      setTeamMembers(team);

      // Calculate stats
      const pendingCount = allTasks.filter(
        (t) => t.status === "pending" || t.status === "in_progress",
      ).length;
      const completedCount = allTasks.filter(
        (t) => t.status === "completed",
      ).length;

      setStats({
        teamMembers: team.length,
        activeProjects: managed.length,
        pendingTasks: pendingCount,
        completedTasks: completedCount,
      });

      // Get tasks pending review
      const reviews = allTasks
        .filter((t) => t.status === "review" || t.status === "code_review")
        .slice(0, 5)
        .map((task) => ({
          id: task.id,
          title: task.title,
          assignee: task.assignedToName || "Unassigned",
        }));
      setPendingReviews(reviews);

      // Get recent activities
      const recent = allTasks
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt) -
            new Date(a.updatedAt || a.createdAt),
        )
        .slice(0, 5)
        .map((task) => ({
          id: task.id,
          action: `${task.title} - ${task.status}`,
          user: task.assignedToName || "Unknown",
          time: getTimeAgo(task.updatedAt || task.createdAt),
        }));
      setRecentActivities(recent);
    } catch (error) {
      console.error("Error loading manager data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Unknown";
    const diff = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff} min ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
    return `${Math.floor(diff / 1440)} days ago`;
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

  const quickActions = [
    {
      id: "1",
      title: "Assign Tasks",
      icon: "✓",
      screen: "AssignTask",
      desc: "Assign to team members",
      color: "#4CAF50",
    },
    {
      id: "2",
      title: "Review Tasks",
      icon: "👀",
      screen: "TaskList",
      desc: "Review submissions",
      color: "#2196F3",
    },
    {
      id: "3",
      title: "Team Calendar",
      icon: "📅",
      screen: "Calendar",
      desc: "View schedule",
      color: "#FF9800",
    },
    {
      id: "4",
      title: "Reports",
      icon: "📊",
      screen: "Reports",
      desc: "Generate reports",
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
            <Text style={styles.userName}>{user?.name || "Manager"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>MANAGER</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.teamMembers}</Text>
            <Text style={styles.statLabel}>Team</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activeProjects}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pendingTasks}</Text>
            <Text style={styles.statLabel}>Pending</Text>
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
                onPress={() => navigation.navigate(item.screen, { user })}
              >
                <Text style={styles.actionIcon}>{item.icon}</Text>
                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Your Projects ({managedProjects.length})
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ProjectManagement", { user })}
            >
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          {managedProjects.slice(0, 3).map((project) => (
            <TouchableOpacity key={project.id} style={styles.projectCard}>
              <Text style={styles.projectName}>{project.name}</Text>
              <Text style={styles.projectClient}>
                Client: {project.client || "N/A"}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${project.progress || 0}%` },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Team Members */}
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
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>
                  {member.name?.charAt(0) || "?"}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pending Reviews */}
        {pendingReviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Reviews ({pendingReviews.length})
            </Text>
            {pendingReviews.map((review) => (
              <TouchableOpacity key={review.id} style={styles.reviewItem}>
                <Text style={styles.reviewTitle}>{review.title}</Text>
                <Text style={styles.reviewAssignee}>By: {review.assignee}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.replace("Login")}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
  actionDesc: { fontSize: 10, color: "#666", textAlign: "center" },
  projectCard: {
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  projectClient: { fontSize: 13, color: "#666", marginBottom: 8 },
  progressBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#4CAF50" },
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
  reviewItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  reviewTitle: { fontSize: 14, fontWeight: "500", color: "#333" },
  reviewAssignee: { fontSize: 12, color: "#666", marginTop: 2 },
  logoutButton: {
    margin: 20,
    backgroundColor: "#f44336",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
