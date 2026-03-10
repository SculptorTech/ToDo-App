// src/screens/manager/ManagerHomeScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
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
};

export default function ManagerHomeScreen({ navigation, route }) {
  const { user } = route.params || {};

  const [stats, setStats] = useState({
    teamMembers: 0,
    activeProjects: 0,
    pendingTasks: 0,
    completedTasks: 0,
  });

  const [teamMembers, setTeamMembers] = useState([]);
  const [managedProjects, setManagedProjects] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all data when screen focuses
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
      console.log("📊 All projects:", allProjects.length);

      // Get all users
      const usersData = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      const allUsers = usersData ? JSON.parse(usersData) : [];
      console.log("👥 All users:", allUsers.length);

      // Get all tasks
      const tasksData = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
      const allTasks = tasksData ? JSON.parse(tasksData) : [];
      console.log("📋 All tasks:", allTasks.length);

      // Filter projects managed by this manager
      const managed = allProjects.filter(
        (p) => p.status === "active" || p.status === "planning",
      );
      setManagedProjects(managed);

      // Get team members (users with role developer or team_lead)
      const team = allUsers.filter(
        (u) =>
          u.role === "developer" ||
          u.role === "team_lead" ||
          u.role === "viewer",
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

      // Get recent activities (last 5 tasks)
      const recent = allTasks
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5)
        .map((task) => ({
          id: task.id,
          task: task.title || task.name || "Untitled Task",
          assignee: task.assignedToName || "Unassigned",
          status: task.status || "pending",
          projectId: task.projectId,
        }));
      setRecentActivities(recent);

      // Calculate upcoming deadlines (tasks due in next 7 days)
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const deadlines = allTasks
        .filter((task) => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return (
            dueDate >= today &&
            dueDate <= nextWeek &&
            task.status !== "completed"
          );
        })
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 5)
        .map((task) => ({
          id: task.id,
          task: task.title || task.name || "Untitled Task",
          assignee: task.assignedToName || "Unassigned",
          due: formatDueDate(task.dueDate),
          priority: task.priority || "medium",
          projectId: task.projectId,
        }));
      setUpcomingDeadlines(deadlines);
    } catch (error) {
      console.error("❌ Error loading manager data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return "No date";

    const dueDate = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate.getTime() === today.getTime()) {
      return "Today";
    } else if (dueDate.getTime() === tomorrow.getTime()) {
      return "Tomorrow";
    } else {
      return dueDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("taskflow_current_user");
            navigation.replace("Login");
          } catch (error) {
            console.error("Logout error:", error);
            navigation.replace("Login");
          }
        },
      },
    ]);
  };

  // Manager features
  const managerFeatures = [
    {
      id: "1",
      title: "Project List",
      icon: "📋",
      screen: "ProjectList",
      description: "View all projects",
      color: "#4361ee",
    },
    {
      id: "2",
      title: "Task Board",
      icon: "📌",
      screen: "TaskBoard",
      description: "Kanban task board",
      color: "#f72585",
    },
    {
      id: "3",
      title: "Team Members",
      icon: "👥",
      screen: "TeamList",
      description: "Manage your team",
      color: "#4cc9f0",
    },
    {
      id: "4",
      title: "Create Task",
      icon: "➕",
      screen: "AddTask",
      description: "Assign new tasks",
      color: "#f8961e",
    },
    {
      id: "5",
      title: "Reports",
      icon: "📊",
      screen: "Reports",
      description: "View analytics",
      color: "#43aa8b",
    },
  ];

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#f72585";
      case "medium":
        return "#f8961e";
      case "low":
        return "#43aa8b";
      default:
        return "#6c757d";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "#43aa8b";
      case "in_progress":
      case "inprogress":
        return "#4cc9f0";
      case "pending":
        return "#f8961e";
      case "planning":
        return "#4361ee";
      case "active":
        return "#4cc9f0";
      default:
        return "#6c757d";
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "#4361ee";
      case "manager":
        return "#f72585";
      case "team_lead":
        return "#4cc9f0";
      case "developer":
        return "#f8961e";
      case "viewer":
        return "#43aa8b";
      default:
        return "#6c757d";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header - Intact with admin style */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || "Manager"}</Text>
            <Text style={styles.userRole}>Manager</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
            <Text style={styles.logoutIconText}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards - Matching admin style */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#4361ee10" }]}>
              <Text style={styles.statValue}>{stats.teamMembers}</Text>
              <Text style={styles.statLabel}>Team Members</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#f7258510" }]}>
              <Text style={styles.statValue}>{stats.activeProjects}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#4cc9f010" }]}>
              <Text style={styles.statValue}>{stats.pendingTasks}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#43aa8b10" }]}>
              <Text style={styles.statValue}>{stats.completedTasks}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Manager Tools</Text>
          <View style={styles.featuresGrid}>
            {managerFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                onPress={() => navigation.navigate(feature.screen, { user })}
              >
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: feature.color + "20" },
                  ]}
                >
                  <Text style={styles.featureIconText}>{feature.icon}</Text>
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Projects Under You */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Projects Under You</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("ProjectList", { user })}
            >
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {managedProjects.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyTitle}>No Projects Yet</Text>
              <Text style={styles.emptyText}>
                Projects created by admin will appear here
              </Text>
            </View>
          ) : (
            managedProjects.slice(0, 2).map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() =>
                  navigation.navigate("ProjectDetails", {
                    projectId: project.id,
                    user,
                  })
                }
              >
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(project.status) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(project.status) },
                      ]}
                    >
                      {project.status || "Active"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.projectClient}>
                  Client: {project.client || "N/A"}
                </Text>

                <View style={styles.projectMeta}>
                  <Text style={styles.metaText}>
                    📅{" "}
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString()
                      : "TBD"}
                  </Text>
                  <Text style={styles.metaText}>
                    👥 {project.team?.length || 0} members
                  </Text>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${project.progress || 0}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {project.progress || 0}% complete
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Team Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("TeamList", { user })}
            >
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>

          {teamMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No Team Members</Text>
              <Text style={styles.emptyText}>
                Team members added by admin will appear here
              </Text>
            </View>
          ) : (
            teamMembers.slice(0, 3).map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberCard}
                onPress={() =>
                  navigation.navigate("MemberDetails", {
                    memberId: member.id,
                    user,
                  })
                }
              >
                <View style={styles.memberLeft}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: getRoleColor(member.role) + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberAvatarText,
                        { color: getRoleColor(member.role) },
                      ]}
                    >
                      {member.name ? member.name.charAt(0).toUpperCase() : "?"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.memberName}>
                      {member.name || "Unknown"}
                    </Text>
                    <Text style={styles.memberRole}>
                      {member.role || "Developer"}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: getRoleColor(member.role) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      { color: getRoleColor(member.role) },
                    ]}
                  >
                    {member.role}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>
            <View style={styles.deadlineList}>
              {upcomingDeadlines.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.deadlineItem}
                  onPress={() =>
                    navigation.navigate("TaskDetails", {
                      taskId: item.id,
                      user,
                    })
                  }
                >
                  <View
                    style={[
                      styles.deadlineDot,
                      { backgroundColor: getPriorityColor(item.priority) },
                    ]}
                  />
                  <View style={styles.deadlineContent}>
                    <Text style={styles.deadlineTask}>{item.task}</Text>
                    <Text style={styles.deadlineMeta}>
                      {item.assignee} • Due: {item.due}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recent Activities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          <View style={styles.activityList}>
            {recentActivities.length === 0 ? (
              <Text style={styles.emptyText}>No recent activities</Text>
            ) : (
              recentActivities.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.activityItem}
                  onPress={() =>
                    navigation.navigate("TaskDetails", {
                      taskId: activity.id,
                      user,
                    })
                  }
                >
                  <View
                    style={[
                      styles.activityDot,
                      { backgroundColor: getStatusColor(activity.status) },
                    ]}
                  />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTask}>{activity.task}</Text>
                    <Text style={styles.activityMeta}>{activity.assignee}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Logout Button */}
         <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={() => navigation.replace("Login")}
                >
                  <Text style={styles.logout}>Logout</Text>
                </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 14,
    color: "#6c757d",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: "#f72585",
    fontWeight: "600",
    marginTop: 4,
  },
  logoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutIconText: {
    fontSize: 20,
  },
  statsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  featuresContainer: {
    padding: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  viewAllText: {
    fontSize: 14,
    color: "#f72585",
    fontWeight: "600",
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureIconText: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: "#6c757d",
    lineHeight: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
  projectCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  projectClient: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 8,
  },
  projectMeta: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 16,
  },
  metaText: {
    fontSize: 12,
    color: "#6c757d",
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f72585",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#6c757d",
  },
  memberCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: "#6c757d",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  deadlineList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deadlineItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  deadlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineTask: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  deadlineMeta: {
    fontSize: 11,
    color: "#6c757d",
  },
  activityList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTask: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 11,
    color: "#6c757d",
  },
  logoutButton: {
    margin: 20,
    marginTop: 0,
    marginBottom: 30,
    backgroundColor: "#f72585",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#f72585",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
