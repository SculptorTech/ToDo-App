// src/screens/admin/RoleManagementScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
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
  putRequest,
} from "../../services/apiService";

export default function RoleManagementScreen({ navigation }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [editRoleName, setEditRoleName] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetchRoles();
      fetchUsers();
    }, []),
  );

  const fetchUsers = async () => {
    try {
      const response = await getRequest("/user/getusers");
      const usersData = response.users || response || [];
      setAllUsers(usersData);
      console.log(`📋 Loaded ${usersData.length} users for role counting`);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await getRequest("/role");
      console.log("📡 Roles API Response:", response);

      // Handle different response structures
      let rolesData = [];
      if (Array.isArray(response)) {
        rolesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        rolesData = response.data;
      } else if (response.roles && Array.isArray(response.roles)) {
        rolesData = response.roles;
      } else {
        rolesData = [];
      }

      // Calculate user count for each role based on actual users
      const formattedRoles = rolesData.map((role) => {
        // Count users with this role
        const userCount = allUsers.filter((user) => {
          const userRole = (
            user.RoleName ||
            user.role ||
            user.Role ||
            ""
          ).toLowerCase();
          const roleName = (role.RoleName || "").toLowerCase();
          return userRole === roleName;
        }).length;

        return {
          _id: role._id,
          RoleID: role.RoleID,
          RoleName: role.RoleName,
          color: getRoleColor(role.RoleName),
          description: getRoleDescription(role.RoleName),
          userCount: userCount,
          IsDeleted: role.IsDeleted || 0,
        };
      });

      // Filter out soft-deleted roles (IsDeleted = 1)
      const activeRoles = formattedRoles.filter((role) => role.IsDeleted !== 1);
      setRoles(activeRoles);
      console.log(
        `✅ Loaded ${activeRoles.length} active roles with user counts`,
      );
    } catch (error) {
      console.error("Error fetching roles:", error);
      Alert.alert(
        "Error",
        "Failed to fetch roles. Please check your connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (roleName) => {
    const colors = {
      admin: "#dc3545",
      administrator: "#dc3545",
      manager: "#fd7e14",
      team_lead: "#ffc107",
      teamlead: "#ffc107",
      developer: "#28a745",
      dev: "#28a745",
      viewer: "#6c757d",
    };
    return colors[roleName?.toLowerCase() || ""] || "#4361ee";
  };

  const getRoleDescription = (roleName) => {
    const descriptions = {
      admin: "Full system access with all permissions",
      administrator: "Full system access with all permissions",
      manager: "Manage projects, tasks, and team members",
      team_lead: "Lead development team and review code",
      teamlead: "Lead development team and review code",
      developer: "Write code and manage assigned tasks",
      dev: "Write code and manage assigned tasks",
      viewer: "Read-only access to projects and tasks",
    };
    return (
      descriptions[roleName?.toLowerCase() || ""] ||
      "Custom role with specific permissions"
    );
  };

  const getRoleIcon = (roleName) => {
    const icons = {
      admin: "shield-checkmark",
      administrator: "shield-checkmark",
      manager: "business",
      team_lead: "people",
      teamlead: "people",
      developer: "code-slash",
      dev: "code-slash",
      viewer: "eye",
    };
    return icons[roleName?.toLowerCase() || ""] || "ribbon";
  };

  const getNextRoleId = () => {
    if (roles.length === 0) return 1;
    return Math.max(...roles.map((r) => r.RoleID || 0)) + 1;
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      Alert.alert("Error", "Role name is required");
      return;
    }

    setSubmitting(true);
    try {
      const roleData = {
        RoleID: getNextRoleId(),
        RoleName:
          newRoleName.trim().charAt(0).toUpperCase() +
          newRoleName.trim().slice(1).toLowerCase(),
        CreatedBy: 1, // You might want to get the actual logged-in user ID
      };

      console.log("📤 Creating role:", roleData);
      const response = await postRequest("/role", roleData);
      console.log("✅ Role created:", response);

      const newRole = {
        _id: response._id,
        RoleID: response.RoleID,
        RoleName: response.RoleName,
        color: getRoleColor(response.RoleName),
        description: getRoleDescription(response.RoleName),
        userCount: 0, // New role has 0 users initially
        IsDeleted: 0,
      };

      setRoles([newRole, ...roles]);
      setCreateModal(false);
      setNewRoleName("");
      Alert.alert("Success", `Role "${newRole.RoleName}" created successfully`);
    } catch (error) {
      console.error("Error creating role:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to create role";
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !editRoleName.trim()) {
      Alert.alert("Error", "Role name is required");
      return;
    }

    setSubmitting(true);
    try {
      const updateData = {
        RoleName:
          editRoleName.trim().charAt(0).toUpperCase() +
          editRoleName.trim().slice(1).toLowerCase(),
        UpdatedBy: 1, // You might want to get the actual logged-in user ID
      };

      console.log(`📤 Updating role ${selectedRole._id}:`, updateData);
      const response = await putRequest(
        `/role/${selectedRole._id}`,
        updateData,
      );
      console.log("✅ Role updated:", response);

      // Recalculate user count for the updated role
      const updatedUserCount = allUsers.filter((user) => {
        const userRole = (
          user.RoleName ||
          user.role ||
          user.Role ||
          ""
        ).toLowerCase();
        const roleName = updateData.RoleName.toLowerCase();
        return userRole === roleName;
      }).length;

      setRoles(
        roles.map((r) =>
          r._id === selectedRole._id
            ? {
                ...r,
                RoleName: updateData.RoleName,
                color: getRoleColor(updateData.RoleName),
                description: getRoleDescription(updateData.RoleName),
                userCount: updatedUserCount,
              }
            : r,
        ),
      );

      setEditModal(false);
      setSelectedRole(null);
      setEditRoleName("");
      Alert.alert(
        "Success",
        `Role updated to "${updateData.RoleName}" successfully`,
      );
    } catch (error) {
      console.error("Error updating role:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update role";
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = (role) => {
    // Check if role has users assigned
    if (role.userCount > 0) {
      Alert.alert(
        "Cannot Delete Role",
        `"${role.RoleName}" has ${role.userCount} user${role.userCount !== 1 ? "s" : ""} assigned. Please reassign or remove users first.`,
        [{ text: "OK" }],
      );
      return;
    }

    // Prevent deletion of system roles
    const systemRoles = [
      "admin",
      "administrator",
      "manager",
      "developer",
      "viewer",
    ];
    if (systemRoles.includes(role.RoleName?.toLowerCase())) {
      Alert.alert(
        "Cannot Delete System Role",
        `"${role.RoleName}" is a system role and cannot be deleted.`,
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert(
      "Delete Role",
      `Are you sure you want to delete "${role.RoleName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log(`📤 Deleting role ${role._id}`);
              await deleteRequest(`/role/${role._id}`);
              console.log("✅ Role deleted");

              setRoles(roles.filter((r) => r._id !== role._id));
              Alert.alert(
                "Success",
                `Role "${role.RoleName}" deleted successfully`,
              );
            } catch (error) {
              console.error("Error deleting role:", error);
              const errorMessage =
                error.response?.data?.message ||
                error.message ||
                "Failed to delete role";
              Alert.alert("Error", errorMessage);
            }
          },
        },
      ],
    );
  };

  const RoleCard = ({ role }) => (
    <TouchableOpacity
      style={styles.roleCard}
      activeOpacity={0.7}
      onPress={() => {
        setSelectedRole(role);
        setEditRoleName(role.RoleName);
        setEditModal(true);
      }}
    >
      <View style={[styles.roleIcon, { backgroundColor: role.color + "20" }]}>
        <Ionicons
          name={getRoleIcon(role.RoleName)}
          size={24}
          color={role.color}
        />
      </View>
      <View style={styles.roleInfo}>
        <View style={styles.roleHeader}>
          <Text style={styles.roleName}>{role.RoleName}</Text>
          <View
            style={[styles.roleBadge, { backgroundColor: role.color + "20" }]}
          >
            <Text style={[styles.roleBadgeText, { color: role.color }]}>
              ID: {role.RoleID}
            </Text>
          </View>
        </View>
        <Text style={styles.roleDescription}>{role.description}</Text>
        <View style={styles.roleStats}>
          <Ionicons name="people-outline" size={12} color="#6c757d" />
          <Text style={styles.roleStatsText}>
            {role.userCount} user{role.userCount !== 1 ? "s" : ""} assigned
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.deleteIconButton, { backgroundColor: "#dc3545" }]}
        onPress={() => handleDeleteRole(role)}
      >
        <Ionicons name="trash-outline" size={18} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Calculate active roles count (roles with at least one user)
  const activeRolesCount = roles.filter((role) => role.userCount > 0).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b6b" />
          <Text style={styles.loadingText}>Loading roles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Role Management</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#ff6b6b20" }]}>
            <Ionicons name="people" size={24} color="#ff6b6b" />
          </View>
          <View>
            <Text style={styles.statValue}>{roles.length}</Text>
            <Text style={styles.statLabel}>Total Roles</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#28a74520" }]}>
            <Ionicons name="trending-up" size={24} color="#28a745" />
          </View>
          <View>
            <Text style={styles.statValue}>{activeRolesCount}</Text>
            <Text style={styles.statLabel}>Active Roles</Text>
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: "#ffc10720" }]}>
            <Ionicons name="people-circle" size={24} color="#ffc107" />
          </View>
          <View>
            <Text style={styles.statValue}>{allUsers.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
        </View>
      </View>

      {/* Roles List */}
      <FlatList
        data={roles}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <RoleCard role={item} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No Roles Found</Text>
            <Text style={styles.emptyText}>
              Create your first role to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Create Role</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateModal(true)}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Role Modal */}
      <Modal visible={createModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setCreateModal(false);
              setNewRoleName("");
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Role</Text>
              <TouchableOpacity
                onPress={() => {
                  setCreateModal(false);
                  setNewRoleName("");
                }}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Role Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={newRoleName}
                onChangeText={setNewRoleName}
                placeholder="e.g., Product Manager"
                placeholderTextColor="#999"
                autoFocus
              />
              <Text style={styles.inputHint}>
                Role name should be unique and descriptive. System roles: Admin,
                Manager, Developer, Viewer
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setCreateModal(false);
                  setNewRoleName("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.createBtn]}
                onPress={handleCreateRole}
                disabled={submitting || !newRoleName.trim()}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Create Role</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Role Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setEditModal(false);
              setSelectedRole(null);
              setEditRoleName("");
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Role</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditModal(false);
                  setSelectedRole(null);
                  setEditRoleName("");
                }}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Role Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={editRoleName}
                onChangeText={setEditRoleName}
                placeholder="Enter role name"
                placeholderTextColor="#999"
                autoFocus
              />
              {selectedRole && (
                <View style={styles.rolePreview}>
                  <Text style={styles.previewLabel}>Preview:</Text>
                  <View style={styles.previewBadge}>
                    <Ionicons
                      name={getRoleIcon(editRoleName)}
                      size={16}
                      color={getRoleColor(editRoleName)}
                    />
                    <Text
                      style={[
                        styles.previewText,
                        { color: getRoleColor(editRoleName) },
                      ]}
                    >
                      {editRoleName || "Role Name"}
                    </Text>
                  </View>
                  {selectedRole.userCount > 0 && (
                    <View style={styles.warningPreview}>
                      <Ionicons
                        name="warning-outline"
                        size={14}
                        color="#ffc107"
                      />
                      <Text style={styles.warningText}>
                        This role has {selectedRole.userCount} user
                        {selectedRole.userCount !== 1 ? "s" : ""} assigned
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setEditModal(false);
                  setSelectedRole(null);
                  setEditRoleName("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.updateBtn]}
                onPress={handleUpdateRole}
                disabled={submitting || !editRoleName.trim()}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.updateBtnText}>Update Role</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  headerSpacer: {
    width: 40,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  statIcon: {
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
  listContainer: {
    padding: 20,
    paddingTop: 12,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
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
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  roleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  roleDescription: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 6,
  },
  roleStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roleStatsText: {
    fontSize: 11,
    color: "#6c757d",
  },
  deleteIconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ff6b6b",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#1a1a1a",
  },
  inputHint: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 8,
  },
  rolePreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  previewLabel: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 8,
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    gap: 6,
  },
  previewText: {
    fontSize: 14,
    fontWeight: "600",
  },
  warningPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3e0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: "#e67700",
    flex: 1,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#f8f9fa",
  },
  cancelBtnText: {
    fontSize: 16,
    color: "#6c757d",
    fontWeight: "600",
  },
  createBtn: {
    backgroundColor: "#28a745",
  },
  createBtnText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  updateBtn: {
    backgroundColor: "#ff6b6b",
  },
  updateBtnText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
