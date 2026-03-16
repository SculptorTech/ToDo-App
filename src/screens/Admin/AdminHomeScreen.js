// src/screens/admin/AdminHomeScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  clearCurrentUser,
  getRequest
} from "../../services/apiService";

export default function AdminHomeScreen({ navigation, route }) {
  const { user } = route.params || {};
  const [stats, setStats] = useState({
    projects: 0,
    users: 0,
    tasks: 0,
    teams: 0,
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, []),
  );

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadRecentProjects()]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load projects
      const projectsResponse = await getRequest("/project/get-projects");
      const projects = projectsResponse.projects || projectsResponse || [];

      // Load users
      const usersResponse = await getRequest("/user/getusers");
      const users = usersResponse.users || usersResponse || [];

      // Load tasks (if you have tasks endpoint)
      let tasks = [];
      try {
        const tasksResponse = await getRequest("/task/get-tasks");
        tasks = tasksResponse.tasks || tasksResponse || [];
      } catch (error) {
        console.warn("Tasks not loaded:", error);
      }

      // Load teams (if you have teams endpoint)
      let teams = [];
      try {
       // const teamsResponse = await getRequest("/team/get-teams");
        teams = teamsResponse.teams || teamsResponse || [];
      } catch (error) {
        console.warn("Teams not loaded:", error);
      }

      setStats({
        projects: projects.length,
        users: users.length,
        tasks: tasks.length,
        teams: teams.length,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const loadRecentProjects = async () => {
    try {
      const response = await getRequest("/project/get-projects");

      // Handle different response structures
      let projects = [];
      if (response.projects) {
        projects = response.projects;
      } else if (Array.isArray(response)) {
        projects = response;
      } else {
        projects = [];
      }

      // Map projects to the format expected by the UI
      const mappedProjects = projects.map((project) => ({
        id: project.ProjectId || project.projectId || project.id,
        name: project.Name || project.name || "Untitled Project",
        client: project.Client || project.client || "N/A",
        status: project.Status || project.status || "planning",
        priority: project.Priority || project.priority || "Medium",
        startDate: project.StartDate || project.startDate,
        endDate: project.EndDate || project.endDate,
        progress: project.Progress || project.progress || 0,
        createdAt:
          project.CreatedAt || project.createdAt || new Date().toISOString(),
      }));

      // Sort by creation date (newest first)
      const sorted = mappedProjects.sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      );

      setRecentProjects(sorted);
    } catch (error) {
      console.error("Error loading projects:", error);
      setRecentProjects([]);
    }
  };

  const toggleDrawer = () => {
    if (drawerVisible) {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setDrawerVisible(false));
    } else {
      setDrawerVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
            await clearCurrentUser();
            navigation.replace("Login");
          } catch (error) {
            console.error("Logout error:", error);
            navigation.replace("Login");
          }
        },
      },
    ]);
  };

  const navigateToScreen = (screen) => {
    toggleDrawer();
    setTimeout(() => {
      navigation.navigate(screen, { user });
    }, 300);
  };

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
      case "planning":
        return "#4361ee";
      case "active":
        return "#4cc9f0";
      case "completed":
        return "#43aa8b";
      case "onhold":
        return "#f72585";
      default:
        return "#6c757d";
    }
  };

  // Drawer menu items
  const drawerMenuItems = [
    {
      id: "1",
      title: "User Management",
      icon: "👥",
      screen: "UserManagement",
      iconBg: "#FF9800",
    },
    {
      id: "2",
      title: "Project Creation",
      icon: "📁",
      screen: "CreateProject",
      iconBg: "#FF9800",
    },
    {
      id: "3",
      title: "Role Management",
      icon: "⚙️",
      screen: "RoleManagement",
      iconBg: "#FF9800",
    },
  ];

  // Main dashboard cards
  const dashboardCards = [
    {
      id: "1",
      title: "User Management",
      icon: "👥",
      screen: "UserManagement",
      description: "Add, edit, or remove users",
      color: "#4361ee",
    },
    {
      id: "2",
      title: "Project Creation",
      icon: "📁",
      screen: "CreateProject",
      description: "Create and manage projects",
      color: "#f72585",
    },
    {
      id: "3",
      title: "Role Management",
      icon: "⚙️",
      screen: "RoleManagement",
      description: "Assign and manage user roles",
      color: "#4cc9f0",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Drawer Menu */}
      <Modal
        visible={drawerVisible}
        transparent={true}
        animationType="none"
        onRequestClose={toggleDrawer}
      >
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={toggleDrawer}
        >
          <Animated.View
            style={[
              styles.drawerContainer,
              { transform: [{ translateX: slideAnim }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* Drawer Header */}
              <View style={styles.drawerHeader}>
                <View style={styles.drawerUserIcon}>
                  <Text style={styles.drawerUserIconText}>👤</Text>
                </View>
                <View style={styles.drawerHeaderText}>
                  <Text style={styles.drawerGreeting}>
                    Hi, {user?.name || "Company Admin"}
                  </Text>
                  <Text style={styles.drawerCompany}>
                    {user?.company || "Admin"}
                  </Text>
                </View>
              </View>

              {/* Drawer Menu Items */}
              <ScrollView style={styles.drawerMenu}>
                {drawerMenuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.drawerMenuItem}
                    onPress={() => navigateToScreen(item.screen)}
                  >
                    <View
                      style={[
                        styles.drawerMenuIcon,
                        { backgroundColor: item.iconBg },
                      ]}
                    >
                      <Text style={styles.drawerMenuIconText}>{item.icon}</Text>
                    </View>
                    <Text style={styles.drawerMenuText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Drawer Logout Button */}
              <TouchableOpacity
                style={styles.drawerLogoutButton}
                onPress={handleLogout}
              >
                <View style={styles.drawerLogoutIcon}>
                  <Text style={styles.drawerLogoutIconText}>🚪</Text>
                </View>
                <Text style={styles.drawerLogoutText}>Logout</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || "Admin"}</Text>
            <Text style={styles.userRole}>Administrator</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#4361ee10" }]}>
              <Text style={styles.statValue}>{stats.users}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#f7258510" }]}>
              <Text style={styles.statValue}>{stats.projects}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#4cc9f010" }]}>
              <Text style={styles.statValue}>{stats.tasks}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#f8961e10" }]}>
              <Text style={styles.statValue}>{stats.teams}</Text>
              <Text style={styles.statLabel}>Teams</Text>
            </View>
          </View>
        </View>

        {/* Quick Access Cards */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.featuresGrid}>
            {dashboardCards.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.featureCard}
                onPress={() => navigation.navigate(card.screen, { user })}
              >
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: card.color + "20" },
                  ]}
                >
                  <Text style={styles.featureIconText}>{card.icon}</Text>
                </View>
                <Text style={styles.featureTitle}>{card.title}</Text>
                <Text style={styles.featureDescription}>
                  {card.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Projects Section */}
        <View style={styles.projectsContainer}>
          <Text style={styles.sectionTitle}>Recent Projects</Text>

          {loading ? (
            <View style={styles.emptyProjects}>
              <Text style={styles.emptyText}>Loading projects...</Text>
            </View>
          ) : recentProjects.length > 0 ? (
            recentProjects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() =>
                  navigation.navigate("ProjectManagement", {
                    projectId: project.id,
                    user,
                  })
                }
              >
                <View style={styles.projectHeader}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      {
                        backgroundColor:
                          getPriorityColor(project.priority) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        { color: getPriorityColor(project.priority) },
                      ]}
                    >
                      {project.priority || "Medium"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.projectClient}>
                  Client: {project.client || "N/A"}
                </Text>

                <View style={styles.projectFooter}>
                  <View style={styles.projectMeta}>
                    <Text style={styles.metaIcon}>📅</Text>
                    <Text style={styles.metaText}>
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString()
                        : "Start date"}
                    </Text>
                  </View>
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
                      {project.status
                        ? project.status.charAt(0).toUpperCase() +
                          project.status.slice(1)
                        : "Planning"}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
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
                    {project.progress || 0}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyProjects}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyTitle}>No Projects Yet</Text>
              <Text style={styles.emptyText}>
                Create your first project to get started
              </Text>
              <TouchableOpacity
                style={styles.createProjectButton}
                onPress={() => navigation.navigate("CreateProject", { user })}
              >
                <Text style={styles.createProjectButtonText}>
                  Create Project →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  // Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
  },
  drawerContainer: {
    width: 300,
    height: "100%",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  drawerHeader: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    paddingTop: 50,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  drawerUserIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FF9800",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  drawerUserIconText: {
    fontSize: 24,
  },
  drawerHeaderText: {
    flex: 1,
  },
  drawerGreeting: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  drawerCompany: {
    fontSize: 12,
    color: "#6c757d",
  },
  drawerMenu: {
    flex: 1,
    paddingVertical: 10,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  drawerMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  drawerMenuIconText: {
    fontSize: 20,
  },
  drawerMenuText: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "400",
  },
  drawerLogoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fef2f2",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    marginTop: 10,
  },
  drawerLogoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  drawerLogoutIconText: {
    fontSize: 20,
  },
  drawerLogoutText: {
    fontSize: 16,
    color: "#dc2626",
    fontWeight: "500",
  },
  // Header Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
  },
  menuButton: {
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
  menuIcon: {
    fontSize: 24,
    color: "#1a1a1a",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerRight: {
    width: 44,
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
    color: "#4361ee",
    fontWeight: "600",
    marginTop: 4,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "31%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  featureIconText: {
    fontSize: 22,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 10,
    color: "#6c757d",
    lineHeight: 13,
    textAlign: "center",
  },
  projectsContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 30,
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
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  projectClient: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 12,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  projectMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6c757d",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
    marginRight: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4361ee",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "#6c757d",
    fontWeight: "500",
  },
  emptyProjects: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 16,
  },
  createProjectButton: {
    backgroundColor: "#4361ee",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createProjectButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
