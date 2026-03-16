// src/screens/admin/CreateProjectScreen.js
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getRequest, postRequest } from "../../services/apiService";

export default function CreateProjectScreen({ navigation, route }) {
  const { user } = route.params || {};

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    budget: "",
    status: "planning",
    client: "",
    assignedTo: null,
    projectId: "",
  });

  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [projectIdError, setProjectIdError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState([]);

  // Load users and projects from API
  useEffect(() => {
    loadUsers();
    loadProjects();
    generateProjectId();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getRequest("/user/getusers");
      const usersData = response.users || response || [];

      // Map user data to expected format
      const mappedUsers = usersData.map((u) => ({
        id: u.UserID || u.id,
        UserID: u.UserID,
        name:
          u.FullName ||
          u.fullName ||
          `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.EmailID || u.email,
        role: u.RoleName || u.role || "Developer",
        isActive: u.IsActive !== false,
      }));

      // Filter active users only
      setUsers(mappedUsers.filter((u) => u.isActive));
    } catch (error) {
      console.error("Error loading users:", error);
      Alert.alert("Error", "Failed to load users");
    }
  };

  const loadProjects = async () => {
    try {
      const response = await getRequest("/project/get-projects");
      setProjects(response.projects || response || []);
    } catch (error) {
      console.error("Error loading projects:", error);
      // Don't show alert here, just log
    }
  };

  // Generate a unique project ID
  const generateProjectId = async () => {
    setIsGeneratingId(true);
    setProjectIdError("");

    try {
      const year = new Date().getFullYear();
      let sequence = 1;

      const validProjects = projects.filter((p) => {
        const id = p.projectId || p.ProjectId || p.id || "";
        return id.startsWith("PRJ-") && id.includes(year.toString());
      });

      if (validProjects.length > 0) {
        const sequences = validProjects
          .map((p) => {
            const projectId = p.projectId || p.ProjectId || p.id || "";
            const parts = projectId.split("-");
            return parts.length === 3 ? parseInt(parts[2]) : 0;
          })
          .filter((seq) => !isNaN(seq) && seq > 0);

        if (sequences.length > 0) {
          sequence = Math.max(...sequences) + 1;
        }
      }

      if (sequence > 999) {
        sequence = 1;
      }

      const paddedSequence = sequence.toString().padStart(3, "0");
      const generatedId = `PRJ-${year}-${paddedSequence}`;

      if (validateProjectId(generatedId)) {
        setFormData((prev) => ({ ...prev, projectId: generatedId }));
      }
    } catch (error) {
      console.error("Error generating project ID:", error);
      setProjectIdError("Failed to generate project ID");
    } finally {
      setIsGeneratingId(false);
    }
  };

  // Validate project ID format
  const validateProjectId = (id) => {
    const pattern = /^PRJ-(20\d{2})-\d{3}$/;

    if (!pattern.test(id)) {
      setProjectIdError(
        "ID must be in format: PRJ-YYYY-XXX (e.g., PRJ-2024-001)",
      );
      return false;
    }

    const [_, year, sequence] = id.match(pattern);
    const currentYear = new Date().getFullYear();
    const projectYear = parseInt(year);

    if (projectYear < currentYear) {
      setProjectIdError("Project year cannot be in the past");
      return false;
    }

    if (projectYear > currentYear + 5) {
      setProjectIdError(
        "Project year cannot be more than 5 years in the future",
      );
      return false;
    }

    const seqNum = parseInt(sequence);
    if (seqNum < 1 || seqNum > 999) {
      setProjectIdError("Sequence must be between 001 and 999");
      return false;
    }

    if (id.length < 11 || id.length > 15) {
      setProjectIdError("Project ID must be between 11-15 characters");
      return false;
    }

    setProjectIdError("");
    return true;
  };

  // Handle manual project ID change
  const handleProjectIdChange = (text) => {
    const formatted = text.toUpperCase();
    setFormData((prev) => ({ ...prev, projectId: formatted }));
    validateProjectId(formatted);
  };

  // Validate dates
  const validateDates = (startDate, endDate) => {
    if (!startDate && !endDate) return true;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (startDate && !dateRegex.test(startDate)) {
      Alert.alert(
        "Validation Error",
        "Start date must be in YYYY-MM-DD format",
      );
      return false;
    }

    if (endDate && !dateRegex.test(endDate)) {
      Alert.alert("Validation Error", "End date must be in YYYY-MM-DD format");
      return false;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        Alert.alert("Validation Error", "Invalid date format");
        return false;
      }

      if (end < start) {
        Alert.alert("Validation Error", "End date cannot be before start date");
        return false;
      }
    }

    return true;
  };

  // Validate budget
  const validateBudget = (budget) => {
    if (!budget) return true;

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum < 0) {
      Alert.alert("Validation Error", "Please enter a valid budget amount");
      return false;
    }

    if (budgetNum > 10000000) {
      Alert.alert("Validation Error", "Budget cannot exceed $10,000,000");
      return false;
    }

    return true;
  };

  const handleCreateProject = async () => {
    // Validation
    if (!formData.projectId.trim()) {
      Alert.alert("Validation Error", "Project ID is required");
      return;
    }

    if (!validateProjectId(formData.projectId)) {
      Alert.alert(
        "Validation Error",
        projectIdError || "Invalid project ID format",
      );
      return;
    }

    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Project name is required");
      return;
    }

    if (formData.name.length < 3) {
      Alert.alert(
        "Validation Error",
        "Project name must be at least 3 characters",
      );
      return;
    }

    if (!formData.client.trim()) {
      Alert.alert("Validation Error", "Client name is required");
      return;
    }

    if (!validateDates(formData.startDate, formData.endDate)) {
      return;
    }

    if (!validateBudget(formData.budget)) {
      return;
    }

    if (!formData.assignedTo) {
      Alert.alert("Validation Error", "Please assign the project to a user");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare project data for backend
      const projectData = {
        ProjectId: formData.projectId.toUpperCase(),
        Name: formData.name.trim(),
        Description: formData.description.trim() || "No description provided",
        Client: formData.client.trim(),
        StartDate: formData.startDate || new Date().toISOString().split("T")[0],
        EndDate:
          formData.endDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        Budget: formData.budget ? parseFloat(formData.budget) : 0,
        Status: formData.status,
        CreatedBy: user?.UserID || user?.id || "1",
        CreatedByName: user?.name || user?.firstName || "Admin",
        AssignedTo: formData.assignedTo.UserID || formData.assignedTo.id,
      };

      console.log("📝 Creating project:", projectData);

      // Create project via API using generic postRequest
      const result = await postRequest("/project/create-project", projectData);

      // If project created successfully and has an ID, assign the user
      if (result && (result.projectId || result.ProjectId || result.id)) {
        const projectId = result.projectId || result.ProjectId || result.id;

        try {
          // Assign user to project using generic postRequest
          await postRequest("/project/assign-user", {
            projectId: projectId,
            userId: formData.assignedTo.UserID || formData.assignedTo.id,
          });
        } catch (assignError) {
          console.warn(
            "Project created but user assignment failed:",
            assignError,
          );
          // Don't fail the whole operation, just warn
        }
      }

      Alert.alert(
        "✅ Success",
        `Project "${formData.name}" created successfully!\n\nProject ID: ${formData.projectId}\nAssigned to: ${formData.assignedTo.name}`,
        [
          {
            text: "Back to Dashboard",
            onPress: () => navigation.navigate("AdminHome", { user }),
          },
          {
            text: "Create Another",
            onPress: () => {
              setFormData({
                name: "",
                description: "",
                startDate: "",
                endDate: "",
                budget: "",
                status: "planning",
                client: "",
                assignedTo: null,
                projectId: "",
              });
              generateProjectId();
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error creating project:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create project",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
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

  // User selection modal
  const UserSelectionModal = () => (
    <Modal
      visible={showUserModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowUserModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select User</Text>
            <TouchableOpacity
              onPress={() => setShowUserModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={users}
            keyExtractor={(item) => item.id?.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.userItem,
                  formData.assignedTo?.id === item.id &&
                    styles.userItemSelected,
                ]}
                onPress={() => {
                  setFormData({ ...formData, assignedTo: item });
                  setShowUserModal(false);
                }}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {item.name?.charAt(0) || item.firstName?.charAt(0) || "U"}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.name || `${item.firstName} ${item.lastName}`}
                  </Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <Text style={styles.userRole}>
                    {item.role || "Team Member"}
                  </Text>
                </View>
                {formData.assignedTo?.id === item.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyList}>No users found</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Create New Project</Text>
            <Text style={styles.headerSubtitle}>
              Fill in the project details
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Project ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              🆔 Project ID <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.projectIdContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.projectIdInput,
                  projectIdError ? styles.inputError : null,
                ]}
                value={formData.projectId}
                onChangeText={handleProjectIdChange}
                placeholder="PRJ-2024-001"
                placeholderTextColor="#adb5bd"
                maxLength={15}
                autoCapitalize="characters"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateProjectId}
                disabled={isGeneratingId || isLoading}
              >
                <Text style={styles.generateButtonText}>
                  {isGeneratingId ? "..." : "🔄"}
                </Text>
              </TouchableOpacity>
            </View>
            {projectIdError ? (
              <Text style={styles.errorText}>{projectIdError}</Text>
            ) : (
              <Text style={styles.helperText}>
                Format: PRJ-YYYY-XXX (e.g., PRJ-2024-001)
              </Text>
            )}
          </View>

          {/* Project Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              📋 Project Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="e.g., E-Commerce Mobile App"
              placeholderTextColor="#adb5bd"
              maxLength={100}
              editable={!isLoading}
            />
            <Text style={styles.charCount}>{formData.name.length}/100</Text>
          </View>

          {/* Client */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              🤝 Client <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={formData.client}
              onChangeText={(text) =>
                setFormData({ ...formData, client: text })
              }
              placeholder="Client name"
              placeholderTextColor="#adb5bd"
              maxLength={50}
              editable={!isLoading}
            />
            <Text style={styles.charCount}>{formData.client.length}/50</Text>
          </View>

          {/* Assign To */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              👤 Assign To <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => setShowUserModal(true)}
              disabled={isLoading}
            >
              {formData.assignedTo ? (
                <View style={styles.selectedUser}>
                  <View style={styles.selectedUserAvatar}>
                    <Text style={styles.selectedUserAvatarText}>
                      {formData.assignedTo.name?.charAt(0) ||
                        formData.assignedTo.firstName?.charAt(0) ||
                        "U"}
                    </Text>
                  </View>
                  <View style={styles.selectedUserInfo}>
                    <Text style={styles.selectedUserName}>
                      {formData.assignedTo.name ||
                        `${formData.assignedTo.firstName} ${formData.assignedTo.lastName}`}
                    </Text>
                    <Text style={styles.selectedUserEmail}>
                      {formData.assignedTo.email}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.assignButtonText}>Select a user</Text>
              )}
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>📝 Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder="Describe the project scope and goals"
              placeholderTextColor="#adb5bd"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
              editable={!isLoading}
            />
            <Text style={styles.charCount}>
              {formData.description.length}/500
            </Text>
          </View>

          {/* Dates */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>📅 Start Date</Text>
              <TextInput
                style={styles.input}
                value={formData.startDate}
                onChangeText={(text) =>
                  setFormData({ ...formData, startDate: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#adb5bd"
                maxLength={10}
                editable={!isLoading}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>📅 End Date</Text>
              <TextInput
                style={styles.input}
                value={formData.endDate}
                onChangeText={(text) =>
                  setFormData({ ...formData, endDate: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#adb5bd"
                maxLength={10}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Budget */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>💰 Budget ($)</Text>
            <TextInput
              style={styles.input}
              value={formData.budget}
              onChangeText={(text) =>
                setFormData({ ...formData, budget: text })
              }
              placeholder="e.g., 50000"
              placeholderTextColor="#adb5bd"
              keyboardType="numeric"
              maxLength={10}
              editable={!isLoading}
            />
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>📊 Status</Text>
            <View style={styles.optionsRow}>
              {["planning", "active", "completed", "onhold"].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusButton,
                    formData.status === s && styles.statusButtonActive,
                    { borderColor: getStatusColor(s) },
                    formData.status === s && {
                      backgroundColor: getStatusColor(s) + "20",
                    },
                  ]}
                  onPress={() => setFormData({ ...formData, status: s })}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      { color: getStatusColor(s) },
                      formData.status === s && styles.statusButtonTextActive,
                      formData.status === s && { color: getStatusColor(s) },
                    ]}
                  >
                    {s === "onhold"
                      ? "On Hold"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
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
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.disabledButton]}
              onPress={handleCreateProject}
              disabled={isLoading}
            >
              <Text style={styles.createButtonText}>
                {isLoading ? "Creating..." : "Create Project →"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* User Selection Modal */}
      <UserSelectionModal />
    </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  backText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
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
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
    position: "relative",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  required: {
    color: "#f72585",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1a1a1a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: "#f72585",
  },
  errorText: {
    color: "#f72585",
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: "#6c757d",
    fontSize: 12,
    marginTop: 4,
  },
  projectIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  projectIdInput: {
    flex: 1,
  },
  generateButton: {
    width: 50,
    height: 50,
    backgroundColor: "#e9ecef",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  generateButtonText: {
    fontSize: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  charCount: {
    position: "absolute",
    right: 8,
    bottom: -18,
    fontSize: 11,
    color: "#adb5bd",
  },
  row: {
    flexDirection: "row",
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  statusButtonActive: {
    backgroundColor: "#f8f9fa",
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusButtonTextActive: {
    fontWeight: "700",
  },
  assignButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  assignButtonText: {
    color: "#6c757d",
    fontSize: 16,
  },
  dropdownIcon: {
    color: "#6c757d",
    fontSize: 14,
  },
  selectedUser: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4361ee",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedUserAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  selectedUserInfo: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  selectedUserEmail: {
    fontSize: 12,
    color: "#6c757d",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 30,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cancelButtonText: {
    color: "#6c757d",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    flex: 2,
    backgroundColor: "#4361ee",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#4361ee",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
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
    fontWeight: "700",
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
    fontSize: 16,
    color: "#6c757d",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  userItemSelected: {
    backgroundColor: "#e7f5ff",
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4361ee",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userAvatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: "#4361ee",
    fontWeight: "500",
  },
  checkmark: {
    fontSize: 20,
    color: "#4361ee",
    fontWeight: "600",
    marginLeft: 12,
  },
  emptyList: {
    textAlign: "center",
    padding: 40,
    color: "#6c757d",
    fontSize: 16,
  },
});
