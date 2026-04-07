import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteRequest,
  getRequest,
  postRequest,
} from "../../services/apiService";

export default function ProjectDetailsScreen({ navigation, route }) {
  const { projectId, user } = route.params || {};
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectTasks, setProjectTasks] = useState([]);
  const scrollViewRef = useRef();

  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        console.log("📱 Screen focused - loading data for project:", projectId);
        const loadAllData = async () => {
          await loadProjectDetails();
          await loadProjectMembers(projectId);
          await loadAvailableMembers();
          await loadProjectTasks();
        };
        loadAllData();
      }
      return () => {
        console.log("📱 Screen unfocused");
      };
    }, [projectId]),
  );

  const loadProjectDetails = async () => {
    setLoading(true);
    try {
      console.log(`📡 Fetching project: ${projectId}`);

      let response = null;
      let projectData = null;

      try {
        response = await getRequest(`/project/get-project/${projectId}`);
        console.log("Response from get-project:", response);
        projectData = response.project || response;
      } catch (err1) {
        console.log("First endpoint failed:", err1);

        try {
          response = await getRequest(`/project/${projectId}`);
          console.log("Response from project/id:", response);
          projectData = response.project || response;
        } catch (err2) {
          console.log("Second endpoint failed:", err2);

          try {
            const allProjectsResponse = await getRequest(
              "/project/get-projects",
            );
            const allProjects =
              allProjectsResponse.projects || allProjectsResponse || [];
            projectData = allProjects.find((p) => {
              const pId = p.ProjectId || p.projectId || p.id;
              return pId === projectId;
            });

            if (!projectData) {
              throw new Error("Project not found in list");
            }
          } catch (err3) {
            console.log("Third endpoint failed:", err3);
            throw new Error("Could not fetch project details");
          }
        }
      }

      if (!projectData) {
        throw new Error("No project data received");
      }

      console.log("✅ Final project data:", projectData);
      setProject(projectData);
    } catch (error) {
      console.error("❌ Error loading project:", error);
      Alert.alert(
        "Error",
        "Failed to load project details. Please check if the project exists.",
        [
          { text: "Go Back", onPress: () => navigation.goBack() },
          { text: "Retry", onPress: () => loadProjectDetails() },
        ],
      );
    } finally {
      setLoading(false);
    }
  };

  // Load project members with complete user details
  const loadProjectMembers = async (projectId) => {
    try {
      console.log("🔍 Loading project members for project:", projectId);

      const response = await getRequest(
        `/project-member/project-members/${projectId}`,
      );
      console.log("Project members response:", response);

      const members = response.members || response || [];

      if (members.length === 0) {
        setSelectedMembers([]);
        return;
      }

      // Fetch complete user details for each member
      const formattedMembers = [];

      for (const member of members) {
        const userId = member.UserId || member.userId || member.id;

        try {
          // Try to get user details from the response first
          let userDetails = null;

          if (member.user) {
            // If user object is already populated in response
            userDetails = member.user;
          } else {
            // Otherwise fetch user details
            try {
              const userResponse = await getRequest(`/user/getuser/${userId}`);
              userDetails = userResponse.user || userResponse;
            } catch (userError) {
              console.log(`Could not fetch user ${userId}:`, userError);
            }
          }

          if (userDetails && userDetails.FullName) {
            formattedMembers.push({
              UserID: userId,
              id: userId,
              FullName: userDetails.FullName,
              fullName: userDetails.FullName,
              name: userDetails.FullName,
              EmailID: userDetails.EmailID || userDetails.email || "",
              email: userDetails.EmailID || userDetails.email || "",
              RoleName:
                member.Role || member.role || userDetails.RoleName || "Member",
              role:
                member.Role || member.role || userDetails.RoleName || "Member",
              ProjectMemberId: member._id || member.id,
            });
          } else {
            // Fallback if user details not available
            formattedMembers.push({
              UserID: userId,
              id: userId,
              FullName: `User ${userId}`,
              fullName: `User ${userId}`,
              name: `User ${userId}`,
              EmailID: "",
              email: "",
              RoleName: member.Role || member.role || "Member",
              role: member.Role || member.role || "Member",
              ProjectMemberId: member._id || member.id,
            });
          }
        } catch (error) {
          console.log(`Error processing member ${userId}:`, error);
          // Fallback if everything fails
          formattedMembers.push({
            UserID: userId,
            id: userId,
            FullName: `User ${userId}`,
            fullName: `User ${userId}`,
            name: `User ${userId}`,
            EmailID: "",
            email: "",
            RoleName: member.Role || member.role || "Member",
            role: member.Role || member.role || "Member",
            ProjectMemberId: member._id || member.id,
          });
        }
      }

      console.log(`✅ Loaded ${formattedMembers.length} project members`);
      formattedMembers.forEach((m) => {
        console.log(`  - ${m.FullName} (${m.RoleName})`);
      });
      setSelectedMembers(formattedMembers);
    } catch (error) {
      console.error("❌ Error loading project members:", error);
      setSelectedMembers([]);
    }
  };

  // Load available users (developers) who can be added to project
  const loadAvailableMembers = async () => {
    try {
      const response = await getRequest("/user/getusers");
      const allUsers = response.users || response || [];

      console.log(`📋 Total users from API: ${allUsers.length}`);

      const developers = allUsers.filter((u) => {
        const role = (u.RoleName || u.role || u.Role || "").toLowerCase();
        const isActive = u.IsDeleted !== 1;
        const isDeveloper = role.includes("developer") || role.includes("dev");
        const currentUserId = user?.UserID || user?.id;
        const isNotCurrentUser = (u.UserID || u.id) !== currentUserId;

        // Filter out users already in the project
        const isNotAlreadyAdded = !selectedMembers.some(
          (m) => (m.UserID || m.id) === (u.UserID || u.id),
        );

        console.log(
          `  User: ${u.FullName || u.name}, Role: ${role}, IsDev: ${isDeveloper}, AlreadyAdded: ${!isNotAlreadyAdded}`,
        );

        return isActive && isDeveloper && isNotCurrentUser && isNotAlreadyAdded;
      });

      console.log(`✅ Found ${developers.length} available developers`);
      developers.forEach((d) => {
        console.log(`  - ${d.FullName || d.name} (${d.RoleName || d.role})`);
      });
      setAvailableMembers(developers);
    } catch (error) {
      console.error("Error loading available members:", error);
      Alert.alert("Error", "Failed to load available members");
      setAvailableMembers([]);
    }
  };

  const loadProjectTasks = async () => {
    try {
      const response = await getRequest("/task/get-tasks");
      const allTasks = response.tasks || response || [];

      const projectSpecificTasks = allTasks.filter((task) => {
        const taskProjectId = task.ProjectId || task.projectId;
        return taskProjectId === projectId;
      });

      setProjectTasks(projectSpecificTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  // Add single member to project
  const addMemberToProject = async (member) => {
    setSaving(true);
    try {
      const userId = Number(member.UserID || member.id);
      const memberName = member.FullName || member.fullName || member.name;

      console.log(
        `➕ Adding member ${memberName} (ID: ${userId}) to project ${projectId}`,
      );

      const response = await postRequest("/project-member/add-member", {
        projectId: projectId,
        userId: userId,
        role: "member",
      });

      if (response.success) {
        console.log("✅ Member added successfully");

        // Add the member with complete details
        const newMember = {
          UserID: userId,
          id: userId,
          FullName: memberName,
          fullName: memberName,
          name: memberName,
          EmailID: member.EmailID || member.email || "",
          email: member.EmailID || member.email || "",
          RoleName: member.RoleName || member.role || "Member",
          role: member.RoleName || member.role || "Member",
        };

        setSelectedMembers((prev) => [...prev, newMember]);
        await loadAvailableMembers();

        Alert.alert("Success", `${memberName} added to project successfully`);
      } else {
        throw new Error(response.message || "Failed to add member");
      }
    } catch (error) {
      console.error("❌ Error adding member:", error);
      Alert.alert("Error", `Failed to add member: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Remove member from project
  const removeMemberFromProject = async (member) => {
    const memberName = member.FullName || member.name;

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberName} from this project?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              const userId = Number(member.UserID || member.id);

              console.log(
                `❌ Removing member ${memberName} (ID: ${userId}) from project ${projectId}`,
              );

              const response = await deleteRequest(
                "/project-member/remove-member",
                {
                  data: {
                    projectId: projectId,
                    userId: userId,
                  },
                },
              );

              if (response.success) {
                console.log("✅ Member removed successfully");

                // Remove from local state
                setSelectedMembers((prev) =>
                  prev.filter((m) => (m.UserID || m.id) !== userId),
                );
                await loadAvailableMembers();

                Alert.alert("Success", `${memberName} removed from project`);
              } else {
                throw new Error(response.message || "Failed to remove member");
              }
            } catch (error) {
              console.error("❌ Error removing member:", error);
              Alert.alert("Error", `Failed to remove member: ${error.message}`);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
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
      case "on hold":
        return "#f72585";
      default:
        return "#6c757d";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const getTaskStats = () => {
    const completed = projectTasks.filter((t) => {
      const status = (t.Status || t.status || "").toLowerCase();
      return status === "completed";
    }).length;

    const pending = projectTasks.filter((t) => {
      const status = (t.Status || t.status || "").toLowerCase();
      return status !== "completed";
    }).length;

    const inProgress = projectTasks.filter((t) => {
      const status = (t.Status || t.status || "").toLowerCase();
      return status === "in_progress" || status === "inprogress";
    }).length;

    return { completed, pending, inProgress, total: projectTasks.length };
  };

  const filteredAvailableMembers = availableMembers.filter((member) => {
    const name = (
      member.FullName ||
      member.fullName ||
      member.name ||
      ""
    ).toLowerCase();
    const email = (member.EmailID || member.email || "").toLowerCase();
    const role = (member.RoleName || member.role || "").toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    return (
      name.includes(searchLower) ||
      email.includes(searchLower) ||
      role.includes(searchLower)
    );
  });

  const MemberSelectorModal = () => (
    <Modal
      animationType="slide"
      transparent={false}
      visible={showMemberSelector}
      onRequestClose={() => setShowMemberSelector(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Add Team Members</Text>
          <TouchableOpacity
            onPress={() => setShowMemberSelector(false)}
            style={styles.modalCloseButton}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.selectedCountContainer}>
          <Text style={styles.selectedCountText}>
            Current Team: {selectedMembers.length} member
            {selectedMembers.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or role..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={filteredAvailableMembers}
          keyExtractor={(item) => (item.UserID || item.id).toString()}
          renderItem={({ item }) => {
            const memberName = item.FullName || item.fullName || item.name;
            const memberEmail = item.EmailID || item.email;
            const memberRole = item.RoleName || item.role || "Developer";

            return (
              <TouchableOpacity
                style={styles.memberItem}
                onPress={() => {
                  addMemberToProject(item);
                  setShowMemberSelector(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.memberInfo}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {memberName?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{memberName}</Text>
                    <Text style={styles.memberEmail}>{memberEmail}</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>{memberRole}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.addIcon}>
                  <Text style={styles.addIconText}>+</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No developers available</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "Try a different search term"
                  : "All developers are already assigned to this project"}
              </Text>
            </View>
          )}
        />

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setShowMemberSelector(false)}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const taskStats = getTaskStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2595f7" />
          <Text style={styles.loadingText}>Loading project details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Project Details</Text>
          <TouchableOpacity
            onPress={() => {
              loadProjectMembers(projectId);
              loadAvailableMembers();
              Alert.alert("Refreshed", "Team members reloaded");
            }}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshButtonText}>⟳</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.projectIdContainer}>
          <Text style={styles.projectIdLabel}>Project ID</Text>
          <Text style={styles.projectIdValue}>{projectId}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectName}>
              {project?.Name || project?.name || "Unnamed Project"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    getStatusColor(project?.Status || project?.status) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(project?.Status || project?.status) },
                ]}
              >
                {project?.Status || project?.status || "Active"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Client:</Text>
            <Text style={styles.infoValue}>
              {project?.Client || project?.client || "N/A"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Manager:</Text>
            <Text style={styles.infoValue}>
              {project?.AssignedToName ||
                project?.managerName ||
                user?.FullName ||
                "Not assigned"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Budget:</Text>
            <Text style={styles.infoValue}>
              ${(project?.Budget || project?.budget || 0).toLocaleString()}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Timeline:</Text>
            <Text style={styles.infoValue}>
              {formatDate(project?.StartDate || project?.startDate)} -{" "}
              {formatDate(project?.EndDate || project?.endDate)}
            </Text>
          </View>

          {project?.Description || project?.description ? (
            <View style={styles.descriptionContainer}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.description}>
                {project?.Description || project?.description}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.teamSection}>
          <View style={styles.teamHeader}>
            <Text style={styles.sectionTitle}>
              Team Members ({selectedMembers.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowMemberSelector(true)}
            >
              <Text style={styles.addButtonText}>+ Add Members</Text>
            </TouchableOpacity>
          </View>

          {selectedMembers.length === 0 ? (
            <View style={styles.emptyTeamCard}>
              <Text style={styles.emptyTeamIcon}>👥</Text>
              <Text style={styles.emptyTeamTitle}>No Team Members</Text>
              <Text style={styles.emptyTeamText}>
                Click "Add Members" to assign developers to this project
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.memberScrollView}
              contentContainerStyle={styles.memberScrollContent}
            >
              {selectedMembers.map((member) => {
                const memberId = member.UserID || member.id;
                const memberName =
                  member.FullName || member.fullName || member.name;
                const memberRole =
                  member.RoleName || member.role || "Developer";
                const memberEmail = member.EmailID || member.email;

                return (
                  <View key={memberId} style={styles.memberCard}>
                    <View style={styles.memberAvatarLarge}>
                      <Text style={styles.memberAvatarLargeText}>
                        {memberName?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                    <Text style={styles.memberCardName} numberOfLines={1}>
                      {memberName}
                    </Text>
                    <Text style={styles.memberCardEmail} numberOfLines={1}>
                      {memberEmail}
                    </Text>
                    <View style={styles.memberCardRoleBadge}>
                      <Text style={styles.memberCardRoleText}>
                        {memberRole}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeMemberButton}
                      onPress={() => removeMemberFromProject(member)}
                    >
                      <Text style={styles.removeMemberText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Project Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats.completed}</Text>
              <Text style={styles.statLabel}>Tasks Completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats.inProgress}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{taskStats.pending}</Text>
              <Text style={styles.statLabel}>Tasks Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{selectedMembers.length}</Text>
              <Text style={styles.statLabel}>Team Members</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate("AddTask", {
                  projectId: projectId,
                  projectName: project?.Name || project?.name,
                  user,
                })
              }
            >
              <Text style={styles.actionIcon}>➕</Text>
              <Text style={styles.actionText}>Create Task</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate("TaskBoard", {
                  projectId: projectId,
                  user,
                })
              }
            >
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionText}>View Tasks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() =>
                navigation.navigate("Reports", {
                  projectId: projectId,
                  user,
                })
              }
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Project Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <MemberSelectorModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6c757d",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: "#2595f7",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonText: {
    fontSize: 20,
    color: "#2595f7",
  },
  projectIdContainer: {
    backgroundColor: "#e3f2fd",
    margin: 20,
    marginBottom: 0,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  projectIdLabel: {
    fontSize: 10,
    color: "#2595f7",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  projectIdValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2595f7",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#fff",
    margin: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
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
    marginBottom: 16,
  },
  projectName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: "#6c757d",
    fontWeight: "500",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#1a1a1a",
  },
  descriptionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  description: {
    fontSize: 14,
    color: "#4a4a4a",
    lineHeight: 20,
    marginTop: 8,
  },
  teamSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  teamHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  addButton: {
    backgroundColor: "#2595f7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyTeamCard: {
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
  emptyTeamIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTeamTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  emptyTeamText: {
    fontSize: 12,
    color: "#6c757d",
    textAlign: "center",
  },
  memberScrollView: {
    flexDirection: "row",
  },
  memberScrollContent: {
    paddingRight: 20,
  },
  memberCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  memberAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  memberAvatarLargeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2595f7",
  },
  memberCardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 2,
  },
  memberCardEmail: {
    fontSize: 10,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 4,
  },
  memberCardRoleBadge: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberCardRoleText: {
    fontSize: 10,
    color: "#2595f7",
    fontWeight: "500",
  },
  removeMemberButton: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeMemberText: {
    fontSize: 10,
    color: "#f72585",
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2595f7",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#6c757d",
    textAlign: "center",
  },
  actionsSection: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  actionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 18,
    color: "#6c757d",
  },
  selectedCountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2595f7",
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  searchInput: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  memberItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2595f7",
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontSize: 10,
    color: "#2595f7",
    fontWeight: "500",
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2595f7",
    justifyContent: "center",
    alignItems: "center",
  },
  addIconText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6c757d",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#2595f7",
  },
  saveButtonDisabled: {
    backgroundColor: "#a0c4ff",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
