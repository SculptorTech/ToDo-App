// src/screens/admin/AddPeopleScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const STORAGE_KEYS = {
  USERS: "taskflow_users",
};

export default function AddPeopleScreen({ navigation, route }) {
  const { user } = route.params || {};

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "developer",
    department: "",
    status: "Active",
  });

  const [selectedRole, setSelectedRole] = useState("developer");
  const [roleModal, setRoleModal] = useState(false);

  const roles = [
    { id: "admin", name: "Admin", color: "#dc3545" },
    { id: "manager", name: "Manager", color: "#fd7e14" },
    { id: "team_lead", name: "Team Lead", color: "#ffc107" },
    { id: "developer", name: "Developer", color: "#28a745" },
    { id: "viewer", name: "Viewer", color: "#6c757d" },
  ];

  const departments = [
    "Engineering",
    "Design",
    "Marketing",
    "Sales",
    "HR",
    "Finance",
    "Operations",
  ];

  const statuses = ["Active", "On Leave", "Inactive"];

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddUser = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName) {
      Alert.alert("Error", "Please enter full name");
      return;
    }

    if (!formData.email || !validateEmail(formData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      // Get existing users
      const usersData = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
      const users = usersData ? JSON.parse(usersData) : [];

      // Check if email already exists
      if (users.some((u) => u.email === formData.email)) {
        Alert.alert("Error", "User with this email already exists");
        return;
      }

      // Create new user object
      const newUser = {
        id: Date.now().toString(),
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || "",
        role: selectedRole,
        department: formData.department || "Engineering",
        status: formData.status,
        password: "password123", // Default password
        createdAt: new Date().toISOString(),
      };

      // Save to storage
      users.push(newUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      Alert.alert(
        "Success",
        `User ${formData.firstName} ${formData.lastName} added successfully!`,
        [
          {
            text: "Add Another",
            onPress: () => {
              setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                role: "developer",
                department: "",
                status: "Active",
              });
              setSelectedRole("developer");
            },
          },
          {
            text: "View All Users",
            onPress: () => navigation.navigate("UserManagement", { user }),
          },
        ],
      );
    } catch (error) {
      console.error("Error adding user:", error);
      Alert.alert("Error", "Failed to add user");
    }
  };

  const RoleCard = ({ role, onSelect }) => (
    <TouchableOpacity
      style={[styles.roleCard, { borderLeftColor: role.color }]}
      onPress={() => {
        setSelectedRole(role.id);
        setFormData({ ...formData, role: role.id });
        setRoleModal(false);
      }}
    >
      <View style={[styles.roleBadge, { backgroundColor: role.color }]}>
        <Text style={styles.roleBadgeText}>{role.name.charAt(0)}</Text>
      </View>
      <View style={styles.roleInfo}>
        <Text style={styles.roleName}>{role.name}</Text>
      </View>
      {selectedRole === role.id && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New People</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>
                  First Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                  placeholder="John"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>
                  Last Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                  placeholder="Doe"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                placeholder="john.doe@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Role</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setRoleModal(true)}
            >
              <Text style={styles.selectorText}>
                {roles.find((r) => r.id === selectedRole)?.name ||
                  "Select a role"}
              </Text>
              <Text style={styles.selectorIcon}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Department */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Department</Text>
            <View style={styles.optionsContainer}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.optionButton,
                    formData.department === dept && styles.optionButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, department: dept })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.department === dept &&
                        styles.optionButtonTextActive,
                    ]}
                  >
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.optionsContainer}>
              {statuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.optionButton,
                    formData.status === status && styles.optionButtonActive,
                    status === "Active" && { borderColor: "#28a745" },
                    status === "On Leave" && { borderColor: "#ffc107" },
                    status === "Inactive" && { borderColor: "#dc3545" },
                  ]}
                  onPress={() => setFormData({ ...formData, status })}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      formData.status === status &&
                        styles.optionButtonTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddUser}
            >
              <Text style={styles.submitButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Role Selection Modal */}
      <Modal visible={roleModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Role</Text>
            <FlatList
              data={roles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <RoleCard role={item} onSelect={() => {}} />
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setRoleModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
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
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#4CAF50",
  },
  backText: {
    color: "#fff",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#555",
    marginBottom: 4,
  },
  required: {
    color: "#f44336",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  selector: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorText: {
    fontSize: 14,
    color: "#333",
  },
  selectorIcon: {
    fontSize: 12,
    color: "#999",
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  optionButtonText: {
    fontSize: 12,
    color: "#666",
  },
  optionButtonTextActive: {
    color: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 14,
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#f44336",
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
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
    width: "80%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  roleBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  checkmark: {
    fontSize: 18,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  modalCloseButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
  },
  modalCloseText: {
    color: "#f44336",
    fontSize: 15,
    fontWeight: "600",
  },
});
