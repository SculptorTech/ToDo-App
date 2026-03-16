// src/screens/admin/UserManagementScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// import { getTeams } from "../../api/teamApi";
import {
  deleteRequest,
  getRequest,
  postRequest,
  putRequest,
} from "../../services/apiService";

export default function UserManagementScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModal, setUserModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [teamModal, setTeamModal] = useState(false);
  const [projectModal, setProjectModal] = useState(false);
  const [resetPasswordModal, setResetPasswordModal] = useState(false);
  const [activityModal, setActivityModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [userActivity, setUserActivity] = useState([]);

  const filters = ["All", "Active", "Inactive"];
  const roles = ["Admin", "Manager", "Team Lead", "Developer", "Viewer"];

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await getRequest("/user/getusers");

      // Handle different response structures
      const usersData = response.users || response || [];

      const userList = usersData.map((u) => {
        const fullName = u.FullName || u.fullName || "";
        const nameParts = fullName.split(" ");

        return {
          id: u.UserID || u.id,
          name: fullName,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: u.EmailID || u.email,
          mobile: u.MobileNumber || u.mobile,
          phone: u.MobileNumber || u.mobile, // Alias for compatibility
          role: u.RoleName || u.role || "Developer",
          status:
            u.IsActive === true
              ? "Active"
              : u.IsActive === false
                ? "Inactive"
                : u.status || "Active",
          teams: u.Teams || u.teams || [],
          projects: u.Projects || u.projects || [],
          employeeId: u.EmployeeID || u.employeeId || "",
          joiningDate: u.JoiningDate || u.joiningDate || null,
        };
      });

      setUsers(userList);
    } catch (error) {
      console.error("Error loading users:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  };

  // const loadProjects = async () => {
  //   try {
  //     const fetchedProjects = await getRequest("/projects");
  //     setProjects(fetchedProjects);
  //   } catch (error) {
  //     console.error("Error loading projects:", error);
  //   }
  // };

  // const loadTeams = async () => {
  //   try {
  //     const fetchedTeams = await getRequest("/teams");
  //     setTeams(fetchedTeams);
  //   } catch (error) {
  //     console.error("Error loading teams:", error);
  //   }
  // };

  useFocusEffect(
    useCallback(() => {
      loadUsers();
      // Uncomment when needed
      // loadProjects();
      // loadTeams();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "#28a745";
      case "inactive":
        return "#dc3545";
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
      case "team lead":
        return "#4cc9f0";
      case "developer":
        return "#f8961e";
      case "viewer":
        return "#43aa8b";
      default:
        return "#6c757d";
    }
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "👑";
      case "manager":
        return "📊";
      case "team_lead":
      case "team lead":
        return "👥";
      case "developer":
        return "💻";
      case "viewer":
        return "👁️";
      default:
        return "👤";
    }
  };

  // Create new user
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "Developer",
    status: "Active",
    phone: "",
    employeeId: "",
    password: "",
    confirmPassword: "",
  });

  const handleCreateUser = async () => {
    // Validation
    if (!newUser.firstName.trim() || !newUser.lastName.trim()) {
      Alert.alert("Error", "First name and last name are required");
      return;
    }
    if (!newUser.email.trim()) {
      Alert.alert("Error", "Email is required");
      return;
    }
    if (!newUser.email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }
    if (!newUser.password) {
      Alert.alert("Error", "Password is required");
      return;
    }
    if (newUser.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (newUser.password !== newUser.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (!newUser.phone.trim()) {
      Alert.alert("Error", "Mobile number is required");
      return;
    }

    try {
      // Map role name to role ID (based on your backend)
      const roleMapping = {
        Admin: 1,
        Manager: 2,
        "Team Lead": 3,
        Developer: 3,
        Viewer: 4,
      };

      const userData = {
        FullName: `${newUser.firstName} ${newUser.lastName}`.trim(),
        MobileNumber: newUser.phone,
        EmailID: newUser.email,
        Password: newUser.password,
        RoleId: roleMapping[newUser.role] || 3,
        EmployeeID: newUser.employeeId || undefined,
      };

      console.log("Creating user with data:", userData);

      const response = await postRequest("/user/create-user", userData);
      console.log("Create user response:", response);

      await loadUsers();
      setCreateModal(false);
      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        role: "Developer",
        status: "Active",
        phone: "",
        employeeId: "",
        password: "",
        confirmPassword: "",
      });

      Alert.alert("Success", "User created successfully");
    } catch (error) {
      console.error("Error creating user:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to create user",
      );
    }
  };

  // Edit user profile
  const [editingUser, setEditingUser] = useState(null);

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      // Map frontend data to backend expected format
      const userData = {
        UserID: editingUser.id,
        FullName:
          `${editingUser.firstName || ""} ${editingUser.lastName || ""}`.trim(),
        EmailID: editingUser.email,
        MobileNumber: editingUser.phone || editingUser.mobile,
        EmployeeID: editingUser.employeeId,
        // Add other fields as needed by your backend
      };

      const response = await putRequest(
        `/user/update-user/${editingUser.id}`,
        userData,
      );
      console.log("Update response:", response);

      // Refresh users list
      await loadUsers();
      setEditModal(false);
      setEditingUser(null);
      Alert.alert("Success", "User updated successfully");
    } catch (error) {
      console.error("Error updating user:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update user",
      );
    }
  };

  // Activate/Deactivate user
  const handleToggleUserStatus = (user) => {
    const newStatus = user.status === "Active" ? "Inactive" : "Active";

    Alert.alert(
      "Confirm Status Change",
      `Are you sure you want to ${newStatus === "Active" ? "activate" : "deactivate"} this user?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              // Call API to update status
              await putRequest(`/user/update-user/${user.id}`, {
                IsActive: newStatus === "Active",
              });

              // Update local state
              setUsers(
                users.map((u) =>
                  u.id === user.id ? { ...u, status: newStatus } : u,
                ),
              );

              if (selectedUser?.id === user.id) {
                setSelectedUser({ ...selectedUser, status: newStatus });
              }

              Alert.alert(
                "Success",
                `User ${newStatus === "Active" ? "activated" : "deactivated"} successfully`,
              );
            } catch (error) {
              console.error("Error toggling user status:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to update user status",
              );
            }
          },
        },
      ],
    );
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    Alert.alert(
      "Confirm Password Reset",
      "Are you sure you want to reset this user's password?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await putRequest(`/user/update-user/${selectedUser.id}`, {
                Password: newPassword,
              });
              setResetPasswordModal(false);
              setNewPassword("");
              Alert.alert("Success", "Password reset successfully");
            } catch (error) {
              console.error("Error resetting password:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to reset password",
              );
            }
          },
        },
      ],
    );
  };

  // Delete user
const handleDeleteUser = (userId) => {
  Alert.alert(
    "Delete User",
    "Are you sure you want to delete this user? This action cannot be undone.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRequest(`/user/delete-user/${userId}`);
            
            await loadUsers(); // Reload all users from the server
            
            setSelectedUser(null);
            
            Alert.alert("Success", "User deleted successfully");
          } catch (error) {
            console.error("Error deleting user:", error);
            Alert.alert(
              "Error",
              error.response?.data?.message || "Failed to delete user"
            );
          }
        },
      },
    ]
  );
};
  // Assign role to user
  const handleAssignRole = async (user, newRole) => {
    Alert.alert(
      "Confirm Role Change",
      `Are you sure you want to change role to ${newRole}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: async () => {
            try {
              // Map role name to role ID
              const roleMapping = {
                Admin: 1,
                Manager: 2,
                "Team Lead": 3,
                Developer: 3,
                Viewer: 4,
              };

              await putRequest(`/user/update-user/${user.id}`, {
                RoleId: roleMapping[newRole] || 3,
              });

              // Update local state
              setUsers(
                users.map((u) =>
                  u.id === user.id ? { ...u, role: newRole } : u,
                ),
              );
              setSelectedUser({ ...user, role: newRole });
              setRoleModal(false);
              Alert.alert("Success", `Role updated to ${newRole}`);
            } catch (error) {
              console.error("Error assigning role:", error);
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to assign role",
              );
            }
          },
        },
      ],
    );
  };

  // Add user to team
  const handleAddToTeam = async (user, teamId) => {
    try {
      // Uncomment when API is implemented
      // await postRequest(`/user/${user.id}/teams`, { teamId });
      const team = teams.find((t) => t.id === teamId);
      const updatedUser = {
        ...user,
        teams: [...(user.teams || []), { id: teamId, name: team?.name }],
      };
      // await putRequest(`/user/update-user/${user.id}`, updatedUser); // Uncomment if needed
      setUsers(users.map((u) => (u.id === user.id ? updatedUser : u)));
      setSelectedUser(updatedUser);
      // loadTeams(); // Uncomment if needed
      Alert.alert("Success", `User added to team ${team?.name}`);
    } catch (error) {
      console.error("Error adding to team:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to add user to team",
      );
    }
  };

  const handleRemoveFromTeam = async (user, teamId) => {
    try {
      // Uncomment when API is implemented
      // await deleteRequest(`/user/${user.id}/teams/${teamId}`);
      const team = teams.find((t) => t.id === teamId);
      const updatedUser = {
        ...user,
        teams: (user.teams || []).filter((t) => t.id !== teamId),
      };
      // await putRequest(`/user/update-user/${user.id}`, updatedUser); // Uncomment if needed
      setUsers(users.map((u) => (u.id === user.id ? updatedUser : u)));
      setSelectedUser(updatedUser);
      // loadTeams(); // Uncomment if needed
      Alert.alert("Success", `User removed from team ${team?.name}`);
    } catch (error) {
      console.error("Error removing from team:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to remove user from team",
      );
    }
  };

  // Assign user to project
  const handleAssignToProject = async (user, projectId) => {
    try {
      // Uncomment when API is implemented
      // await postRequest(`/user/${user.id}/projects`, { projectId });
      const project = projects.find((p) => p.id === projectId);
      const updatedUser = {
        ...user,
        projects: [
          ...(user.projects || []),
          { id: projectId, name: project?.name },
        ],
      };
      // await putRequest(`/user/update-user/${user.id}`, updatedUser); // Uncomment if needed
      setUsers(users.map((u) => (u.id === user.id ? updatedUser : u)));
      setSelectedUser(updatedUser);
      Alert.alert("Success", `User assigned to project ${project?.name}`);
    } catch (error) {
      console.error("Error assigning to project:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to assign user to project",
      );
    }
  };

  const handleRemoveFromProject = async (user, projectId) => {
    try {
      // Uncomment when API is implemented
      // await deleteRequest(`/user/${user.id}/projects/${projectId}`);
      const project = projects.find((p) => p.id === projectId);
      const updatedUser = {
        ...user,
        projects: (user.projects || []).filter((p) => p.id !== projectId),
      };
      // await putRequest(`/user/update-user/${user.id}`, updatedUser); // Uncomment if needed
      setUsers(users.map((u) => (u.id === user.id ? updatedUser : u)));
      setSelectedUser(updatedUser);
      Alert.alert("Success", `User removed from project ${project?.name}`);
    } catch (error) {
      console.error("Error removing from project:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to remove user from project",
      );
    }
  };

  // View user activity
  const handleViewActivity = (user) => {
    // Mock activity data - in real app, fetch from logs
    const activity = [
      {
        id: 1,
        action: "Login",
        timestamp: new Date().toISOString(),
        details: "Successfully logged in",
      },
      {
        id: 2,
        action: "Task Update",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        details: "Updated task status",
      },
      {
        id: 3,
        action: "Project Assignment",
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        details: "Assigned to Project X",
      },
    ];
    setUserActivity(activity);
    setActivityModal(true);
  };

  const UserCard = ({ user, onPress }) => {
    const roleColor = getRoleColor(user.role);
    const statusColor = getStatusColor(user.status);
    const roleIcon = getRoleIcon(user.role);
    const fullName =
      user.name ||
      `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
      "Unknown User";

    return (
      <TouchableOpacity style={styles.userCard} onPress={() => onPress(user)}>
        <View
          style={[styles.userAvatar, { backgroundColor: roleColor + "20" }]}
        >
          <Text style={styles.userAvatarText}>{roleIcon}</Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.userName}>{fullName}</Text>
            <View
              style={[styles.roleBadge, { backgroundColor: roleColor + "20" }]}
            >
              <Text style={[styles.roleText, { color: roleColor }]}>
                {user.role || "No Role"}
              </Text>
            </View>
          </View>

          <Text style={styles.userEmail}>{user.email || "No email"}</Text>

          <View style={styles.userDetails}>
            {user.employeeId && (
              <Text style={styles.userEmployeeId}>ID: {user.employeeId}</Text>
            )}
            {user.status && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor + "20" },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: statusColor }]}
                />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {user.status}
                </Text>
              </View>
            )}
          </View>

          {/* Teams and Projects Preview */}
          <View style={styles.userMeta}>
            <Text style={styles.metaText}>
              👥 {(user.teams || []).length} teams • 📊{" "}
              {(user.projects || []).length} projects
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const fullName = (
        user.name || `${user.firstName || ""} ${user.lastName || ""}`
      ).toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (user.employeeId?.toLowerCase() || "").includes(
          searchQuery.toLowerCase(),
        ) ||
        (user.phone?.toLowerCase() || "").includes(searchQuery.toLowerCase());

      const matchesFilter =
        selectedFilter === "All" ||
        user.status?.toLowerCase() === selectedFilter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [users, searchQuery, selectedFilter]);

  const activeUsers = users.filter(
    (u) => u.status?.toLowerCase() === "active",
  ).length;
  const adminUsers = users.filter(
    (u) => u.role?.toLowerCase() === "admin",
  ).length;

  // Render loading state
  if (loading && !refreshing && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSubtitle}>
            Manage team members and their roles
          </Text>
        </View>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{activeUsers}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{adminUsers}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) =>
          item.id?.toString() || `user-${Date.now()}-${Math.random()}`
        }
        renderItem={({ item }) => (
          <UserCard user={item} onPress={setSelectedUser} />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>
              {loading ? "Loading..." : "No Users Found"}
            </Text>
            <Text style={styles.emptyText}>
              {loading ? "Please wait" : "Try adjusting your search or filters"}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateModal(true)}>
        <View style={styles.fabGradient}>
          <Text style={styles.fabIcon}>+</Text>
        </View>
      </TouchableOpacity>

      {/* Create User Modal */}
      <Modal visible={createModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New User</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                value={newUser.firstName}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, firstName: text })
                }
                placeholder="Enter first name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                value={newUser.lastName}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, lastName: text })
                }
                placeholder="Enter last name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={newUser.email}
                onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                placeholder="Enter email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>

            {/* Add this after Email input and before Password fields */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      newUser.role === role && styles.roleOptionActive,
                    ]}
                    onPress={() => setNewUser({ ...newUser, role })}
                  >
                    <Text
                      style={[
                        styles.roleOptionText,
                        newUser.role === role && styles.roleOptionTextActive,
                      ]}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Employee ID</Text>
              <TextInput
                style={styles.input}
                value={newUser.employeeId}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, employeeId: text })
                }
                placeholder="Enter employee ID"
                placeholderTextColor="#999"
              />
            </View>

            {/* Add these after the Phone input in your create modal */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={newUser.password}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, password: text })
                }
                placeholder="Enter password"
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                value={newUser.confirmPassword}
                onChangeText={(text) =>
                  setNewUser({ ...newUser, confirmPassword: text })
                }
                placeholder="Confirm password"
                secureTextEntry
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                value={newUser.phone}
                onChangeText={(text) => setNewUser({ ...newUser, phone: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateUser}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* User Details Modal */}
      <Modal visible={!!selectedUser} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            {selectedUser && (
              <>
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalAvatar,
                      {
                        backgroundColor: getRoleColor(selectedUser.role) + "20",
                      },
                    ]}
                  >
                    <Text style={styles.modalAvatarText}>
                      {getRoleIcon(selectedUser.role)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedUser(null)}>
                    <Text style={styles.modalClose}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalName}>
                  {selectedUser.name ||
                    `${selectedUser.firstName || ""} ${selectedUser.lastName || ""}`.trim()}
                </Text>
                <Text style={styles.modalEmail}>{selectedUser.email}</Text>

                <View style={styles.modalBadges}>
                  <View
                    style={[
                      styles.modalRoleBadge,
                      {
                        backgroundColor: getRoleColor(selectedUser.role) + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalRoleText,
                        { color: getRoleColor(selectedUser.role) },
                      ]}
                    >
                      {selectedUser.role || "No Role"}
                    </Text>
                  </View>
                  {selectedUser.status && (
                    <View
                      style={[
                        styles.modalStatusBadge,
                        {
                          backgroundColor:
                            getStatusColor(selectedUser.status) + "20",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: getStatusColor(
                              selectedUser.status,
                            ),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.modalStatusText,
                          { color: getStatusColor(selectedUser.status) },
                        ]}
                      >
                        {selectedUser.status}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons Grid */}
                <View style={styles.actionGrid}>
                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => {
                      setEditingUser(selectedUser);
                      setEditModal(true);
                      setSelectedUser(null);
                    }}
                  >
                    <Text style={styles.actionIcon}>✏️</Text>
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => handleToggleUserStatus(selectedUser)}
                  >
                    <Text style={styles.actionIcon}>
                      {selectedUser.status === "Active" ? "🔴" : "🟢"}
                    </Text>
                    <Text style={styles.actionText}>
                      {selectedUser.status === "Active"
                        ? "Deactivate"
                        : "Activate"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => setResetPasswordModal(true)}
                  >
                    <Text style={styles.actionIcon}>🔑</Text>
                    <Text style={styles.actionText}>Password</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => setRoleModal(true)}
                  >
                    <Text style={styles.actionIcon}>⚙️</Text>
                    <Text style={styles.actionText}>Role</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => setTeamModal(true)}
                  >
                    <Text style={styles.actionIcon}>👥</Text>
                    <Text style={styles.actionText}>Teams</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => setProjectModal(true)}
                  >
                    <Text style={styles.actionIcon}>📊</Text>
                    <Text style={styles.actionText}>Projects</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionItem}
                    onPress={() => handleViewActivity(selectedUser)}
                  >
                    <Text style={styles.actionIcon}>📋</Text>
                    <Text style={styles.actionText}>Activity</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
  style={[styles.actionItem, styles.deleteAction]}
  onPress={() => handleDeleteUser(selectedUser.UserID)}  // ✅ Correct
>
  <Text style={styles.actionIcon}>🗑️</Text>
  <Text style={styles.actionText}>Delete</Text>
</TouchableOpacity>
                </View>

                {/* User Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Employment Details
                  </Text>

                  {selectedUser.employeeId && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Employee ID</Text>
                      <Text style={styles.detailValue}>
                        {selectedUser.employeeId}
                      </Text>
                    </View>
                  )}

                  {selectedUser.phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>
                        {selectedUser.phone}
                      </Text>
                    </View>
                  )}

                  {selectedUser.mobile && !selectedUser.phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Mobile</Text>
                      <Text style={styles.detailValue}>
                        {selectedUser.mobile}
                      </Text>
                    </View>
                  )}

                  {selectedUser.joiningDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Joining Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(
                          selectedUser.joiningDate,
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Teams List */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Teams</Text>
                  {(selectedUser.teams || []).length > 0 ? (
                    (selectedUser.teams || []).map((team, index) => (
                      <View key={index} style={styles.listItem}>
                        <Text style={styles.listItemText}>
                          • {team.name || team}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No teams assigned</Text>
                  )}
                </View>

                {/* Projects List */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Projects</Text>
                  {(selectedUser.projects || []).length > 0 ? (
                    (selectedUser.projects || []).map((project, index) => (
                      <View key={index} style={styles.listItem}>
                        <Text style={styles.listItemText}>
                          • {project.name || project}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No projects assigned</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal visible={editModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User Profile</Text>

            {editingUser && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editingUser.firstName}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, firstName: text })
                    }
                    placeholder="Enter first name"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editingUser.lastName}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, lastName: text })
                    }
                    placeholder="Enter last name"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={editingUser.email}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, email: text })
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Employee ID</Text>
                  <TextInput
                    style={styles.input}
                    value={editingUser.employeeId}
                    onChangeText={(text) =>
                      setEditingUser({ ...editingUser, employeeId: text })
                    }
                    placeholder="Enter employee ID"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={editingUser.phone || editingUser.mobile}
                    onChangeText={(text) =>
                      setEditingUser({
                        ...editingUser,
                        phone: text,
                        mobile: text,
                      })
                    }
                    keyboardType="phone-pad"
                    placeholder="Enter phone number"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setEditModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.createButton]}
                    onPress={handleUpdateUser}
                  >
                    <Text style={styles.createButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={resetPasswordModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.smallModal]}>
            <Text style={styles.modalTitle}>Reset Password</Text>

            <Text style={styles.modalLabel}>
              User: {selectedUser?.name || selectedUser?.email}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                placeholderTextColor="#999"
              />
              <Text style={styles.hintText}>Minimum 6 characters</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setResetPasswordModal(false);
                  setNewPassword("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleResetPassword}
              >
                <Text style={styles.createButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Role Modal */}
      <Modal visible={roleModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.smallModal]}>
            <Text style={styles.modalTitle}>Assign Role</Text>

            <Text style={styles.modalLabel}>
              User: {selectedUser?.name || selectedUser?.email}
            </Text>

            <View style={styles.roleList}>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleItem,
                    selectedUser?.role === role && styles.roleItemActive,
                  ]}
                  onPress={() => handleAssignRole(selectedUser, role)}
                >
                  <Text
                    style={[
                      styles.roleItemText,
                      selectedUser?.role === role && styles.roleItemTextActive,
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setRoleModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manage Teams Modal */}
      <Modal visible={teamModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.mediumModal]}>
            <Text style={styles.modalTitle}>Manage Teams</Text>

            <Text style={styles.modalLabel}>
              User: {selectedUser?.name || selectedUser?.email}
            </Text>

            <ScrollView>
              {teams.length > 0 ? (
                teams.map((team) => {
                  const isAssigned = (selectedUser?.teams || []).some(
                    (t) => t.id === team.id || t === team.id || t === team.name,
                  );
                  return (
                    <TouchableOpacity
                      key={team.id}
                      style={styles.teamItem}
                      onPress={() =>
                        isAssigned
                          ? handleRemoveFromTeam(selectedUser, team.id)
                          : handleAddToTeam(selectedUser, team.id)
                      }
                    >
                      <Text style={styles.teamName}>{team.name}</Text>
                      <View
                        style={[
                          styles.teamStatus,
                          isAssigned
                            ? styles.assignedStatus
                            : styles.unassignedStatus,
                        ]}
                      >
                        <Text style={styles.teamStatusText}>
                          {isAssigned ? "✓ Assigned" : "+ Assign"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No teams available</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setTeamModal(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Projects Modal */}
      <Modal visible={projectModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.mediumModal]}>
            <Text style={styles.modalTitle}>Assign Projects</Text>

            <Text style={styles.modalLabel}>
              User: {selectedUser?.name || selectedUser?.email}
            </Text>

            <ScrollView>
              {projects.length > 0 ? (
                projects.map((project) => {
                  const isAssigned = (selectedUser?.projects || []).some(
                    (p) =>
                      p.id === project.id ||
                      p === project.id ||
                      p === project.name,
                  );
                  return (
                    <TouchableOpacity
                      key={project.id}
                      style={styles.teamItem}
                      onPress={() =>
                        isAssigned
                          ? handleRemoveFromProject(selectedUser, project.id)
                          : handleAssignToProject(selectedUser, project.id)
                      }
                    >
                      <Text style={styles.teamName}>{project.name}</Text>
                      <View
                        style={[
                          styles.teamStatus,
                          isAssigned
                            ? styles.assignedStatus
                            : styles.unassignedStatus,
                        ]}
                      >
                        <Text style={styles.teamStatusText}>
                          {isAssigned ? "✓ Assigned" : "+ Assign"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No projects available</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setProjectModal(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Activity Modal */}
      <Modal visible={activityModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.mediumModal]}>
            <Text style={styles.modalTitle}>User Activity</Text>

            <Text style={styles.modalLabel}>
              {selectedUser?.name || selectedUser?.email}
            </Text>

            <ScrollView>
              {userActivity.length > 0 ? (
                userActivity.map((activity) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <Text style={styles.activityAction}>{activity.action}</Text>
                    <Text style={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </Text>
                    <Text style={styles.activityDetails}>
                      {activity.details}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No activity found</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setActivityModal(false)}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    alignItems: "center",
    backgroundColor: "#4361ee",
    padding: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  backText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 11,
    color: "#6c757d",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#e9ecef",
  },
  searchContainer: {
    padding: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  searchIcon: {
    fontSize: 16,
    color: "#6c757d",
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  clearIcon: {
    fontSize: 16,
    color: "#6c757d",
    padding: 5,
  },
  filterContainer: {
    marginTop: 15,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  filterChipActive: {
    backgroundColor: "#4361ee",
    borderColor: "#4361ee",
  },
  filterChipText: {
    color: "#495057",
    fontSize: 14,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  listContainer: {
    padding: 20,
    paddingTop: 0,
  },
  userCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  userAvatarText: {
    fontSize: 30,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  userEmployeeId: {
    fontSize: 12,
    color: "#495057",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
  },
  userMeta: {
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#adb5bd",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4361ee",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6c757d",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  smallModal: {
    maxHeight: "50%",
  },
  mediumModal: {
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    color: "#495057",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  modalAvatarText: {
    fontSize: 40,
  },
  modalClose: {
    fontSize: 20,
    color: "#6c757d",
    padding: 5,
  },
  modalName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 5,
  },
  modalEmail: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 15,
  },
  modalBadges: {
    flexDirection: "row",
    marginBottom: 20,
  },
  modalRoleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 10,
  },
  modalRoleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionItem: {
    width: "23%",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 10,
    color: "#495057",
    textAlign: "center",
  },
  deleteAction: {
    backgroundColor: "#f7258520",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1a1a1a",
  },
  hintText: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 4,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6c757d",
  },
  detailValue: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  listItem: {
    paddingVertical: 4,
  },
  listItemText: {
    fontSize: 14,
    color: "#495057",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  cancelButtonText: {
    color: "#6c757d",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#4361ee",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  roleList: {
    marginBottom: 20,
  },
  roleItem: {
    padding: 14,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 8,
  },
  roleItemActive: {
    backgroundColor: "#4361ee20",
    borderWidth: 1,
    borderColor: "#4361ee",
  },
  roleItemText: {
    fontSize: 16,
    color: "#1a1a1a",
    textAlign: "center",
  },
  roleItemTextActive: {
    color: "#4361ee",
    fontWeight: "600",
  },
  roleOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  roleOptionActive: {
    backgroundColor: "#4361ee",
    borderColor: "#4361ee",
  },
  roleOptionText: {
    color: "#495057",
    fontSize: 14,
  },
  roleOptionTextActive: {
    color: "#fff",
  },
  teamItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  teamStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignedStatus: {
    backgroundColor: "#43aa8b20",
  },
  unassignedStatus: {
    backgroundColor: "#4361ee20",
  },
  teamStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4361ee",
  },
  activityItem: {
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 8,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: "#6c757d",
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 12,
    color: "#495057",
  },
});
