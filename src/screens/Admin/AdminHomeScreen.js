// src/screens/admin/AdminHomeScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { clearCurrentUser, getRequest } from "../../services/apiService";

const { width } = Dimensions.get("window");

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
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const loadStats = async () => {
    try {
      const projectsResponse = await getRequest("/project/get-projects");
      const projects = projectsResponse.projects || projectsResponse || [];

      const usersResponse = await getRequest("/user/getusers");
      const users = usersResponse.users || usersResponse || [];

      let tasks = [];
      try {
        const tasksResponse = await getRequest("/task/get-tasks");
        tasks = tasksResponse.tasks || tasksResponse || [];
      } catch (error) {
        console.warn("Tasks not loaded:", error);
      }

      let teams = [];
      try {
        teams = [];
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

      let projects = [];
      if (response.projects) {
        projects = response.projects;
      } else if (Array.isArray(response)) {
        projects = response;
      } else {
        projects = [];
      }

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

  const drawerMenuItems = [
    {
      id: "1",
      title: "User Management",
      icon: "people-outline",
      screen: "UserManagement",
    },
    {
      id: "2",
      title: "Project Creation",
      icon: "folder-open-outline",
      screen: "CreateProject",
    },
    {
      id: "3",
      title: "Role Management",
      icon: "settings-outline",
      screen: "RoleManagement",
    },
  ];

  const dashboardCards = [
    {
      id: "1",
      title: "User Management",
      icon: "people-outline",
      screen: "UserManagement",
      description: "Add, edit, or remove users",
      color: "#4361ee",
      gradient: ["#4361ee", "#3b52d4"],
    },
    {
      id: "2",
      title: "Project Creation",
      icon: "folder-open-outline",
      screen: "CreateProject",
      description: "Create and manage projects",
      color: "#f72585",
      gradient: ["#f72585", "#d91c6b"],
    },
    {
      id: "3",
      title: "Role Management",
      icon: "settings-outline",
      screen: "RoleManagement",
      description: "Assign and manage user roles",
      color: "#4cc9f0",
      gradient: ["#4cc9f0", "#3ba6c7"],
    },
  ];

  const StatCard = ({ value, label, icon, color, gradient }) => (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.statCard, { backgroundColor: color + "10" }]}
    >
      <View style={[styles.statIconWrapper, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </LinearGradient>
  );

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
            <TouchableOpacity activeOpacity={1} style={{ flex: 1 }}>
              <LinearGradient
                colors={["#1E3A5F", "#152c47"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.drawerHeader}
              >
                <View style={styles.drawerUserIcon}>
                  <Text style={styles.drawerUserIconText}>👤</Text>
                </View>
                <View style={styles.drawerHeaderText}>
                  <Text style={styles.drawerGreeting}>
                    Hi, {user?.name || "Company Admin"}
                  </Text>
                  <Text style={styles.drawerCompany}>
                    {user?.company || "Administrator"}
                  </Text>
                </View>
              </LinearGradient>

              <ScrollView style={styles.drawerMenu}>
                {drawerMenuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.drawerMenuItem}
                    onPress={() => navigateToScreen(item.screen)}
                  >
                    <View style={styles.drawerMenuIcon}>
                      <Ionicons name={item.icon} size={24} color="#1a1a1a" />
                    </View>
                    <Text style={styles.drawerMenuText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.drawerLogoutButton}
                onPress={() => navigation.replace("Login")}
              >
                <View style={styles.drawerLogoutIcon}>
                  <Text style={styles.drawerLogoutIconText}>⏻</Text>
                </View>
                <Text style={styles.drawerLogoutText}>Logout</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={toggleDrawer} style={styles.menuButton}>
              <Ionicons name="menu-outline" size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.name || "Admin"}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Administrator</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#6c757d"
              />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <StatCard
              value={stats.users}
              label="Total Users"
              icon="people-outline"
              color="#4361ee"
              gradient={["#4361ee15", "#4361ee05"]}
            />
            <StatCard
              value={stats.projects}
              label="Projects"
              icon="folder-open-outline"
              color="#f72585"
              gradient={["#f7258515", "#f7258505"]}
            />
            <StatCard
              value={stats.tasks}
              label="Tasks"
              icon="checkbox-outline"
              color="#4cc9f0"
              gradient={["#4cc9f015", "#4cc9f005"]}
            />
            <StatCard
              value={stats.teams}
              label="Teams"
              icon="people-circle-outline"
              color="#f8961e"
              gradient={["#f8961e15", "#f8961e05"]}
            />
          </View>

          {/* Quick Access Section */}
          <View style={styles.featuresContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Access</Text>
              <Text style={styles.sectionSubtitle}>Frequently used tools</Text>
            </View>
            <View style={styles.featuresGrid}>
              {dashboardCards.map((card) => (
                <TouchableOpacity
                  key={card.id}
                  style={styles.featureCard}
                  onPress={() => navigation.navigate(card.screen, { user })}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={card.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featureIcon}
                  >
                    <Ionicons name={card.icon} size={28} color="#fff" />
                  </LinearGradient>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Projects</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("ProjectManagement", { user })
                }
              >
                <Text style={styles.seeAllText}>See All →</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.emptyProjects}>
                <Text style={styles.emptyText}>Loading projects...</Text>
              </View>
            ) : recentProjects.length > 0 ? (
              recentProjects.slice(0, 5).map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() =>
                    navigation.navigate("ProjectManagement", {
                      projectId: project.id,
                      user,
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.projectHeader}>
                    <View style={styles.projectTitleContainer}>
                      <View
                        style={[
                          styles.projectStatusDot,
                          { backgroundColor: getStatusColor(project.status) },
                        ]}
                      />
                      <Text style={styles.projectName}>{project.name}</Text>
                    </View>
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

                  <View style={styles.projectClientContainer}>
                    <Ionicons
                      name="business-outline"
                      size={14}
                      color="#6c757d"
                    />
                    <Text style={styles.projectClient}>
                      {project.client || "N/A"}
                    </Text>
                  </View>

                  <View style={styles.projectFooter}>
                    <View style={styles.projectMeta}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#6c757d"
                      />
                      <Text style={styles.metaText}>
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString()
                          : "Not started"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusColor(project.status) + "20",
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
                <Ionicons name="folder-open-outline" size={60} color="#ccc" />
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
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
  },
  drawerContainer: {
    width: 280,
    height: "100%",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  drawerUserIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    color: "#fff",
    marginBottom: 4,
  },
  drawerCompany: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  drawerMenu: {
    flex: 1,
    paddingVertical: 10,
  },
  drawerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
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
  drawerMenuText: {
    fontSize: 15,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  drawerLogoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    marginTop: 10,
  },
  drawerLogoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  drawerLogoutText: {
    fontSize: 15,
    color: "#dc2626",
    fontWeight: "500",
  },
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
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
  roleBadge: {
    backgroundColor: "#4361ee15",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    color: "#4361ee",
    fontWeight: "600",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f72585",
  },
  statsContainer: {
    padding: 20,
    paddingTop: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
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
    marginTop: 2,
  },
  featuresContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6c757d",
  },
  seeAllText: {
    fontSize: 12,
    color: "#4361ee",
    fontWeight: "500",
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
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 10,
    color: "#6c757d",
    lineHeight: 12,
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
  projectTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  projectStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  projectClientContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
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
    gap: 4,
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
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
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
