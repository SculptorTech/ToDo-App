// src/screens/manager/ManagerHomeScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { getRequest } from "../../services/apiService";

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

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Load all data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadManagerData();
    }, [user]),
  );

  const loadManagerData = async () => {
    setLoading(true);
    try {
      // Get current user from params
      const currentUser = user;
      console.log("👤 Current Manager:", currentUser);

      if (!currentUser || !currentUser.UserID) {
        console.error("No user data available");
        setLoading(false);
        return;
      }

      // Fetch projects from API
      const projectsResponse = await getRequest("/project/get-projects");
      const allProjects = projectsResponse.projects || projectsResponse || [];
      console.log("📊 All projects from API:", allProjects.length);

      // Filter projects assigned to this manager
      const managed = allProjects.filter((p) => {
        const assignedTo = p.AssignedTo || p.assignedTo;
        return assignedTo === currentUser.UserID;
      });

      setManagedProjects(managed);
      console.log(`📋 Managed projects: ${managed.length}`);

      // Calculate active projects count
      const activeCount = managed.filter((p) => {
        const status = (p.Status || p.status || "").toLowerCase();
        return status === "active" || status === "planning";
      }).length;

      // Fetch users to get team members
      const usersResponse = await getRequest("/user/getusers");
      const allUsers = usersResponse.users || usersResponse || [];

      // Filter ONLY developers (no admins, no managers, no team leads)
      const developers = allUsers.filter((u) => {
        const role = (u.RoleName || u.role || u.Role || "").toLowerCase();
        const userId = u.UserID || u.id;
        const isActive = u.IsActive !== false;
        const isNotCurrentUser = userId !== currentUser.UserID;

        // Only include users with role containing "developer"
        const isDeveloper = role.includes("developer");

        return isActive && isNotCurrentUser && isDeveloper;
      });

      setTeamMembers(developers);
      console.log(`👥 Developers: ${developers.length}`);

      // Fetch tasks if endpoint exists
      let pendingCount = 0;
      let completedCount = 0;

      try {
        const tasksResponse = await getRequest("/task/get-tasks");
        const allTasks = tasksResponse.tasks || tasksResponse || [];

        // Filter tasks for manager's projects
        const managedProjectIds = managed.map(
          (p) => p.ProjectId || p.projectId || p.id,
        );
        const relevantTasks = allTasks.filter((t) =>
          managedProjectIds.includes(t.ProjectId || t.projectId),
        );

        pendingCount = relevantTasks.filter((t) => {
          const status = (t.Status || t.status || "").toLowerCase();
          return status === "pending" || status === "in_progress";
        }).length;

        completedCount = relevantTasks.filter((t) => {
          const status = (t.Status || t.status || "").toLowerCase();
          return status === "completed";
        }).length;

        // Set recent activities from tasks
        const recent = relevantTasks
          .sort((a, b) => {
            const dateA = new Date(
              a.UpdatedAt || a.updatedAt || a.CreatedAt || a.createdAt || 0,
            );
            const dateB = new Date(
              b.UpdatedAt || b.updatedAt || b.CreatedAt || b.createdAt || 0,
            );
            return dateB - dateA;
          })
          .slice(0, 5)
          .map((task) => ({
            id: task.TaskId || task.taskId || task.id,
            task: task.Title || task.title || task.name || "Task",
            assignee:
              task.AssignedToName || task.assignedToName || "Unassigned",
            status: task.Status || task.status || "pending",
            projectId: task.ProjectId || task.projectId,
          }));
        setRecentActivities(recent);

        // Calculate upcoming deadlines from tasks
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const deadlines = relevantTasks
          .filter((task) => {
            const dueDateStr = task.DueDate || task.dueDate;
            if (!dueDateStr) return false;

            const dueDate = new Date(dueDateStr);
            const status = (task.Status || task.status || "").toLowerCase();

            return (
              dueDate >= today && dueDate <= nextWeek && status !== "completed"
            );
          })
          .sort((a, b) => {
            const dateA = new Date(a.DueDate || a.dueDate);
            const dateB = new Date(b.DueDate || b.dueDate);
            return dateA - dateB;
          })
          .slice(0, 5)
          .map((task) => ({
            id: task.TaskId || task.taskId || task.id,
            task: task.Title || task.title || task.name || "Untitled Task",
            assignee:
              task.AssignedToName || task.assignedToName || "Unassigned",
            due: formatDueDate(task.DueDate || task.dueDate),
            priority: task.Priority || task.priority || "medium",
            projectId: task.ProjectId || task.projectId,
          }));
        setUpcomingDeadlines(deadlines);
      } catch (taskError) {
        console.log("⚠️ Tasks endpoint not available or error:", taskError);
        // If tasks endpoint doesn't exist, use project data for activities
        const recent = managed.slice(0, 5).map((project) => ({
          id: project.ProjectId || project.projectId || project.id,
          task: project.Name || project.name || "Project",
          assignee: "System",
          status: project.Status || project.status || "active",
          projectId: project.ProjectId || project.projectId || project.id,
        }));
        setRecentActivities(recent);
      }

      setStats({
        teamMembers: developers.length,
        activeProjects: activeCount,
        pendingTasks: pendingCount,
        completedTasks: completedCount,
      });
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

  // Handle project view details
  const handleViewDetails = (project) => {
    setSelectedProject(project);
    setModalVisible(true);
  };

  // Handle navigate to full project details
  const handleGoToProjectDetails = () => {
    if (selectedProject) {
      setModalVisible(false);
      const projectId =
        selectedProject.ProjectId ||
        selectedProject.projectId ||
        selectedProject.id;
      navigation.navigate("ProjectDetails", {
        projectId: projectId,
        user,
      });
    }
  };

  // Manager features
  const managerFeatures = [
    {
      id: "1",
      title: "Project List",
      icon: "📋",
      screen: "ProjectList",
      description: "View assigned projects",
      color: "#4361ee",
    },
    {
      id: "2",
      title: "Task Board",
      icon: "📌",
      screen: "TaskBoard",
      description: "Task Assigned to Developers",
      color: "#f72585",
    },
    {
      id: "3",
      title: "Team Members",
      icon: "👥",
      screen: "TeamList",
      description: "View developers",
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
      case "active":
        return "#4cc9f0";
      case "pending":
      case "planning":
        return "#f8961e";
      case "onhold":
        return "#f72585";
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

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderProjectCard = ({ item }) => {
    const projectId = item.ProjectId || item.projectId || item.id;
    const projectName = item.Name || item.name || "Unnamed";
    const projectClient = item.Client || item.client || "N/A";
    const projectStatus = item.Status || item.status || "active";
    const startDate = item.StartDate || item.startDate;
    const endDate = item.EndDate || item.endDate;

    return (
      <TouchableOpacity
        style={styles.horizontalProjectCard}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.horizontalProjectHeader}>
          <Text style={styles.horizontalProjectName} numberOfLines={1}>
            {projectName}
          </Text>
          <View
            style={[
              styles.horizontalStatusBadge,
              {
                backgroundColor: getStatusColor(projectStatus) + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.horizontalStatusText,
                { color: getStatusColor(projectStatus) },
              ]}
            >
              {projectStatus}
            </Text>
          </View>
        </View>

        <Text style={styles.horizontalProjectClient} numberOfLines={1}>
          {projectClient}
        </Text>

        <View style={styles.horizontalProjectFooter}>
          <Text style={styles.horizontalProjectIcon}>📋</Text>
          <Text style={styles.horizontalViewText}>View Details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Project Details Modal
  const ProjectDetailsModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              {selectedProject && (
                <>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Project Details</Text>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={styles.modalCloseButton}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Project ID */}
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Project ID</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedProject.ProjectId ||
                        selectedProject.projectId ||
                        selectedProject.id}
                    </Text>
                  </View>

                  {/* Project Name */}
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Project Name</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedProject.Name ||
                        selectedProject.name ||
                        "Unnamed"}
                    </Text>
                  </View>

                  {/* Client */}
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Client</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedProject.Client ||
                        selectedProject.client ||
                        "N/A"}
                    </Text>
                  </View>

                  {/* Status with Color */}
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Status</Text>
                    <View style={styles.modalStatusContainer}>
                      <View
                        style={[
                          styles.modalStatusBadge,
                          {
                            backgroundColor:
                              getStatusColor(
                                selectedProject.Status ||
                                  selectedProject.status,
                              ) + "20",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalStatusText,
                            {
                              color: getStatusColor(
                                selectedProject.Status ||
                                  selectedProject.status,
                              ),
                            },
                          ]}
                        >
                          {selectedProject.Status ||
                            selectedProject.status ||
                            "active"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Dates */}
                  <View style={styles.modalRow}>
                    <View style={[styles.modalDetailItem, { flex: 1 }]}>
                      <Text style={styles.modalDetailLabel}>Start Date</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatDate(
                          selectedProject.StartDate ||
                            selectedProject.startDate,
                        )}
                      </Text>
                    </View>
                    <View style={[styles.modalDetailItem, { flex: 1 }]}>
                      <Text style={styles.modalDetailLabel}>End Date</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatDate(
                          selectedProject.EndDate || selectedProject.endDate,
                        )}
                      </Text>
                    </View>
                  </View>

                  {/* Budget */}
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Budget</Text>
                    <Text style={styles.modalDetailValue}>
                      $
                      {(
                        selectedProject.Budget ||
                        selectedProject.budget ||
                        0
                      ).toLocaleString()}
                    </Text>
                  </View>

                  {/* Description */}
                  {selectedProject.Description ||
                  selectedProject.description ? (
                    <View style={styles.modalDetailItem}>
                      <Text style={styles.modalDetailLabel}>Description</Text>
                      <Text style={styles.modalDescription}>
                        {selectedProject.Description ||
                          selectedProject.description}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancelButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.modalCancelButtonText}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.modalViewDetailsButton}
                      onPress={handleGoToProjectDetails}
                    >
                      <Text style={styles.modalViewDetailsButtonText}>
                        Full Details →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {user?.FullName || user?.name || "Manager"}
            </Text>
            <Text style={styles.userRole}>Project Manager</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
            <Text style={styles.logoutIconText}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#4361ee10" }]}>
              <Text style={styles.statValue}>{stats.teamMembers}</Text>
              <Text style={styles.statLabel}>Developers</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#f7258510" }]}>
              <Text style={styles.statValue}>{stats.activeProjects}</Text>
              <Text style={styles.statLabel}>Active Projects</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: "#4cc9f010" }]}>
              <Text style={styles.statValue}>{stats.pendingTasks}</Text>
              <Text style={styles.statLabel}>Pending Tasks</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#43aa8b10" }]}>
              <Text style={styles.statValue}>{stats.completedTasks}</Text>
              <Text style={styles.statLabel}>Completed Tasks</Text>
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

        {/* Projects Assigned to You - Scrollable Horizontal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects Assigned to You</Text>

          {managedProjects.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyTitle}>No Projects Assigned</Text>
              <Text style={styles.emptyText}>
                Admin hasn't assigned any projects to you yet
              </Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={managedProjects}
              renderItem={renderProjectCard}
              keyExtractor={(item) => {
                const id = item.ProjectId || item.projectId || item.id;
                return id?.toString() || Math.random().toString();
              }}
              contentContainerStyle={styles.horizontalProjectList}
              nestedScrollEnabled={true}
            />
          )}
        </View>

        {/* Developers Team - Scrollable Horizontal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developers Team</Text>

          {teamMembers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👨‍💻</Text>
              <Text style={styles.emptyTitle}>No Developers</Text>
              <Text style={styles.emptyText}>
                No developers available in the system
              </Text>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={teamMembers}
              renderItem={({ item }) => {
                const memberId = item.UserID || item.id;
                const memberName =
                  item.FullName || item.fullName || item.name || "Unknown";
                const memberRole =
                  item.RoleName || item.role || item.Role || "Developer";
                const initial = memberName
                  ? memberName.charAt(0).toUpperCase()
                  : "?";

                return (
                  <TouchableOpacity
                    style={styles.horizontalMemberCard}
                    onPress={() =>
                      navigation.navigate("MemberDetails", {
                        memberId: memberId,
                        user,
                      })
                    }
                  >
                    <View
                      style={[
                        styles.horizontalMemberAvatar,
                        { backgroundColor: getRoleColor(memberRole) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.horizontalMemberAvatarText,
                          { color: getRoleColor(memberRole) },
                        ]}
                      >
                        {initial}
                      </Text>
                    </View>
                    <Text style={styles.horizontalMemberName} numberOfLines={1}>
                      {memberName}
                    </Text>
                    <View
                      style={[
                        styles.horizontalRoleBadge,
                        { backgroundColor: getRoleColor(memberRole) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.horizontalRoleText,
                          { color: getRoleColor(memberRole) },
                        ]}
                        numberOfLines={1}
                      >
                        {memberRole}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={(item) => {
                const id = item.UserID || item.id;
                return id?.toString() || Math.random().toString();
              }}
              contentContainerStyle={styles.horizontalMemberList}
              nestedScrollEnabled={true}
            />
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
                    navigation.navigate(
                      activity.projectId ? "ProjectDetails" : "TaskDetails",
                      {
                        projectId: activity.projectId,
                        taskId: activity.id,
                        user,
                      },
                    )
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
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Project Details Modal */}
      <ProjectDetailsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#6c757d",
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
    color: "#2595f7",
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
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
  // Horizontal Project List Styles
  horizontalProjectList: {
    paddingRight: 20,
    gap: 12,
  },
  horizontalProjectCard: {
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  horizontalProjectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  horizontalProjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },
  horizontalStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  horizontalStatusText: {
    fontSize: 9,
    fontWeight: "600",
  },
  horizontalProjectClient: {
    fontSize: 13,
    color: "#2595f7",
    marginBottom: 12,
  },
  horizontalProjectFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#f1f3f5",
    paddingTop: 12,
  },
  horizontalProjectIcon: {
    fontSize: 16,
  },
  horizontalViewText: {
    fontSize: 12,
    color: "#2595f7",
    fontWeight: "600",
  },
  // Horizontal Member List Styles
  horizontalMemberList: {
    paddingRight: 20,
    gap: 12,
  },
  horizontalMemberCard: {
    width: 110,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 8,
  },
  horizontalMemberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  horizontalMemberAvatarText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  horizontalMemberName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 4,
    width: "100%",
  },
  horizontalRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  horizontalRoleText: {
    fontSize: 9,
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: "#6c757d",
    fontWeight: "600",
  },
  modalDetailItem: {
    marginBottom: 16,
  },
  modalDetailLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalDetailValue: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  modalStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: "#4a4a4a",
    lineHeight: 20,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "600",
  },
  modalViewDetailsButton: {
    flex: 2,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#2595f7",
    alignItems: "center",
    shadowColor: "#2595f7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalViewDetailsButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  // Deadline and Activity styles
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
    backgroundColor: "#2595f7",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#2595f7",
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
