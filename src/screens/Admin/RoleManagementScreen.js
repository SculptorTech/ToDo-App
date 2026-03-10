// src/screens/admin/RoleManagementScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await getRequest("/role");
      const rolesData = Array.isArray(response)
        ? response
        : response.data || [];

      const formattedRoles = rolesData.map((role) => ({
        _id: role._id,
        RoleID: role.RoleID,
        RoleName: role.RoleName,
        color: getRoleColor(role.RoleName),
      }));

      setRoles(formattedRoles);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch roles");
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
      const response = await postRequest("/role", {
        RoleID: getNextRoleId(),
        RoleName: newRoleName.trim(),
        CreatedBy: 1,
      });

      setRoles([
        ...roles,
        {
          _id: response._id,
          RoleID: response.RoleID,
          RoleName: response.RoleName,
          color: getRoleColor(response.RoleName),
        },
      ]);

      setCreateModal(false);
      setNewRoleName("");
      Alert.alert("Success", "Role created");
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create role",
      );
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
      await putRequest(`/role/${selectedRole._id}`, {
        RoleName: editRoleName.trim(),
        UpdatedBy: 1,
      });

      setRoles(
        roles.map((r) =>
          r._id === selectedRole._id
            ? {
                ...r,
                RoleName: editRoleName.trim(),
                color: getRoleColor(editRoleName.trim()),
              }
            : r,
        ),
      );

      setEditModal(false);
      setSelectedRole(null);
      setEditRoleName("");
      Alert.alert("Success", "Role updated");
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update role",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = (role) => {
    Alert.alert("Delete Role", `Delete "${role.RoleName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRequest(`/role/${role._id}`);
            setRoles(roles.filter((r) => r._id !== role._id));
            Alert.alert("Success", "Role deleted");
          } catch (error) {
            Alert.alert("Error", "Failed to delete role");
          }
        },
      },
    ]);
  };

  const RoleCard = ({ role }) => (
    <View style={styles.roleCard}>
      <View style={[styles.colorDot, { backgroundColor: role.color }]} />
      <View style={styles.roleInfo}>
        <Text style={styles.roleName}>{role.RoleName}</Text>
        <Text style={styles.roleId}>ID: {role.RoleID}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.iconButton, styles.editButton]}
          onPress={() => {
            setSelectedRole(role);
            setEditRoleName(role.RoleName);
            setEditModal(true);
          }}
        >
          <Ionicons name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconButton, styles.deleteButton]}
          onPress={() => handleDeleteRole(role)}
        >
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ff6b6b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Card - Moved up since header is removed */}
      <View style={[styles.statsCard, { marginTop: 20 }]}>
        <Ionicons name="people" size={24} color="#ff6b6b" />
        <View>
          <Text style={styles.statValue}>{roles.length}</Text>
          <Text style={styles.statLabel}>Total Roles</Text>
        </View>
      </View>

      {/* Add FAB for create */}
      <TouchableOpacity style={styles.fab} onPress={() => setCreateModal(true)}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Roles List */}
      <FlatList
        data={roles}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <RoleCard role={item} />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No roles found</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setCreateModal(true)}
            >
              <Text style={styles.emptyButtonText}>Create Role</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Role</Text>
            <TextInput
              style={styles.modalInput}
              value={editRoleName}
              onChangeText={setEditRoleName}
              placeholder="Role name"
              autoFocus
            />
            <View style={styles.modalButtons}>
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
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.updateBtnText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={createModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Role</Text>
            <TextInput
              style={styles.modalInput}
              value={newRoleName}
              onChangeText={setNewRoleName}
              placeholder="Enter role name"
              autoFocus
            />
            <View style={styles.modalButtons}>
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
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 15,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 15,
  },
  listContainer: {
    padding: 20,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  roleId: {
    fontSize: 12,
    color: "#999",
  },
  actionButtons: {
    flexDirection: "row",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#ff6b6b",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
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
    zIndex: 999,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 10,
  },
  emptyButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#ff6b6b",
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: "#f5f5f5",
  },
  cancelBtnText: {
    color: "#666",
    fontWeight: "600",
  },
  createBtn: {
    backgroundColor: "#28a745",
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  updateBtn: {
    backgroundColor: "#ff6b6b",
  },
  updateBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
