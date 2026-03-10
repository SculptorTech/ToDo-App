// src/screens/admin/AssignTaskScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

// Import your GROQ API functions
//import {
//   autoPriority,
//   createTask,
//   enhanceTask,
//   generateDescription,
//   planWithSchedule,
//   testGroqConnection,
// } from "../../../app/services/api";

export default function AssignTaskScreen({ navigation, route }) {
  const { user } = route.params || {};

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    project: "",
    projectId: "",
    assignedTo: [],
    priority: "medium",
    status: "pending",
    startDate: new Date(),
    dueDate: new Date(),
    estimatedHours: "",
    taskType: "Development",
    subtasks: [],
  });

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userModal, setUserModal] = useState(false);
  const [projectModal, setProjectModal] = useState(false);
  const [subtaskModal, setSubtaskModal] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  // AI States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiAction, setAiAction] = useState("");
  const [apiStatus, setApiStatus] = useState(null);

  // Test API connection on mount
  useEffect(() => {
    testApiConnection();
    loadData();
  }, []);

  const testApiConnection = async () => {
    try {
      const result = await testGroqConnection();
      if (result.success) {
        setApiStatus("connected");
        console.log("✅ API Connected:", result.message);
      } else {
        setApiStatus("error");
        console.error("❌ API Error:", result.error);
      }
    } catch (error) {
      setApiStatus("error");
      console.error("❌ API Test Failed:", error);
    }
  };

  const loadData = async () => {
    try {
      // Load projects
      const projectsData = await AsyncStorage.getItem("taskflow_projects");
      const loadedProjects = projectsData ? JSON.parse(projectsData) : [];
      setProjects(loadedProjects);

      // Load users (developers and team leads only)
      const usersData = await AsyncStorage.getItem("taskflow_users");
      const allUsers = usersData ? JSON.parse(usersData) : [];
      const filteredUsers = allUsers.filter(
        (u) => u.role === "developer" || u.role === "team_lead",
      );
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // AI: Handle all AI actions with better error handling
  const handleAIAction = async (action) => {
    if (apiStatus !== "connected") {
      Alert.alert(
        "API Not Connected",
        "Please check your internet connection and API key.",
        [{ text: "Retry", onPress: testApiConnection }],
      );
      return;
    }

    setAiAction(action);
    setAiModalVisible(true);
    setAiLoading(true);
    setAiResult("");

    try {
      let response;
      let result = "";

      switch (action) {
        case "create":
          if (!taskData.title.trim() && !taskData.description.trim()) {
            Alert.alert("Info", "Please enter task title or description first");
            setAiModalVisible(false);
            return;
          }
          const input = taskData.description || taskData.title;
          response = await createTask(input);
          result = response.data?.content || "No response from AI";
          setAiResult(result);
          break;

        case "describe":
          if (!taskData.title.trim()) {
            Alert.alert("Info", "Please enter task title first");
            setAiModalVisible(false);
            return;
          }
          response = await generateDescription(taskData.title);
          result = response.data?.content || "No response from AI";
          setAiResult(result);
          break;

        case "priority":
          const textToAnalyze = taskData.description || taskData.title;
          if (!textToAnalyze.trim()) {
            Alert.alert("Info", "Please enter task details first");
            setAiModalVisible(false);
            return;
          }
          response = await autoPriority({ text: textToAnalyze });
          const priority = response.data?.priority?.toLowerCase() || "medium";
          setTaskData({ ...taskData, priority });
          setAiResult(
            `✅ Priority detected: ${priority.toUpperCase()}\n\nBased on your task: "${textToAnalyze.substring(0, 100)}..."`,
          );
          break;

        case "enhance":
          if (!taskData.title.trim()) {
            Alert.alert("Info", "Please enter task title first");
            setAiModalVisible(false);
            return;
          }
          response = await enhanceTask({
            title: taskData.title,
            description: taskData.description || "No description provided",
            priority: taskData.priority,
          });
          result = response.data?.content || "No response from AI";
          setAiResult(result);
          break;

        case "schedule":
          if (!taskData.title.trim() || !taskData.dueDate) {
            Alert.alert("Info", "Please enter task title and due date");
            setAiModalVisible(false);
            return;
          }
          response = await planWithSchedule({
            title: taskData.title,
            dueDate: taskData.dueDate.toLocaleDateString(),
            priority: taskData.priority,
          });
          result = response.data?.content || "No response from AI";
          setAiResult(result);
          break;
      }
    } catch (error) {
      console.error("AI error:", error);
      setAiResult(
        `❌ Error: ${error.message || "Failed to get AI response. Please try again."}`,
      );
    } finally {
      setAiLoading(false);
    }
  };

  const applyAIResult = () => {
    if (
      aiAction === "describe" ||
      aiAction === "enhance" ||
      aiAction === "create"
    ) {
      setTaskData({
        ...taskData,
        description: aiResult,
      });
    }
    setAiModalVisible(false);
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setTaskData({
        ...taskData,
        subtasks: [
          ...taskData.subtasks,
          {
            id: Date.now().toString(),
            title: newSubtask,
            completed: false,
          },
        ],
      });
      setNewSubtask("");
      setSubtaskModal(false);
    }
  };

  const toggleSubtask = (subtaskId) => {
    setTaskData({
      ...taskData,
      subtasks: taskData.subtasks.map((subtask) =>
        subtask.id === subtaskId
          ? { ...subtask, completed: !subtask.completed }
          : subtask,
      ),
    });
  };

  const calculateProgress = () => {
    if (taskData.subtasks.length === 0) return 0;
    const completed = taskData.subtasks.filter((s) => s.completed).length;
    return Math.round((completed / taskData.subtasks.length) * 100);
  };

  const handleAssignTask = async () => {
    if (!taskData.title.trim()) {
      Alert.alert("Error", "Please enter task title");
      return;
    }

    if (!taskData.project) {
      Alert.alert("Error", "Please select a project");
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert("Error", "Please assign at least one user");
      return;
    }

    try {
      const tasksData = await AsyncStorage.getItem("taskflow_tasks");
      const allTasks = tasksData ? JSON.parse(tasksData) : [];

      const newTasks = selectedUsers.map((assignedUser) => ({
        id: Date.now().toString() + assignedUser.id,
        title: taskData.title,
        description: taskData.description || "",
        project: taskData.project,
        projectId: taskData.projectId,
        assignedTo: assignedUser.id,
        assignedToName: assignedUser.name,
        assignedToRole: assignedUser.role,
        createdBy: user?.id || "1",
        createdByName: user?.name || "Admin",
        createdAt: new Date().toISOString(),
        startDate: taskData.startDate.toISOString(),
        dueDate: taskData.dueDate.toISOString(),
        priority: taskData.priority,
        status: taskData.status,
        taskType: taskData.taskType,
        estimatedHours: taskData.estimatedHours || "0",
        actualHours: "0",
        subtasks: taskData.subtasks,
        progress: calculateProgress(),
        comments: [],
        aiGenerated: aiResult ? true : false,
      }));

      const updatedTasks = [...allTasks, ...newTasks];
      await AsyncStorage.setItem(
        "taskflow_tasks",
        JSON.stringify(updatedTasks),
      );

      Alert.alert(
        "Success",
        `Task assigned to ${selectedUsers.length} user(s) successfully!`,
        [
          {
            text: "Assign Another",
            onPress: () => {
              setTaskData({
                title: "",
                description: "",
                project: "",
                projectId: "",
                assignedTo: [],
                priority: "medium",
                status: "pending",
                startDate: new Date(),
                dueDate: new Date(),
                estimatedHours: "",
                taskType: "Development",
                subtasks: [],
              });
              setSelectedUsers([]);
              setAiResult("");
            },
          },
          {
            text: "Back to Dashboard",
            onPress: () => navigation.navigate("AdminHome", { user }),
          },
        ],
      );
    } catch (error) {
      console.error("Error assigning task:", error);
      Alert.alert("Error", "Failed to assign task");
    }
  };

  const UserCard = ({ user, onSelect, selected }) => (
    <TouchableOpacity
      style={[styles.userCard, selected && styles.userCardSelected]}
      onPress={() => onSelect(user)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {user.name ? user.name.charAt(0).toUpperCase() : "?"}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userRole}>{user.role}</Text>
      </View>
      {selected && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      case "low":
        return "#4CAF50";
      default:
        return "#4CAF50";
    }
  };

  const taskTypes = [
    "Development",
    "Design",
    "Testing",
    "Documentation",
    "Research",
    "Review",
  ];
  const priorities = ["low", "medium", "high"];

  const aiOptions = [
    {
      id: "create",
      label: "✨ Create Task",
      icon: "📝",
      action: "create",
      desc: "Generate task from description",
    },
    {
      id: "describe",
      label: "📄 Generate Description",
      icon: "📄",
      action: "describe",
      desc: "Create detailed description from title",
    },
    {
      id: "priority",
      label: "⚡ Detect Priority",
      icon: "⚡",
      action: "priority",
      desc: "Auto-detect task priority",
    },
    {
      id: "enhance",
      label: "🔧 Enhance Task",
      icon: "🔧",
      action: "enhance",
      desc: "Improve existing description",
    },
    {
      id: "schedule",
      label: "📅 Create Schedule",
      icon: "📅",
      action: "schedule",
      desc: "Generate timeline plan",
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign New Task</Text>
        <TouchableOpacity onPress={() => setAiModalVisible(true)}>
          <Text style={styles.aiHeaderIcon}>🤖</Text>
        </TouchableOpacity>
      </View>

      {/* API Status Indicator */}
      {apiStatus === "error" && (
        <View style={styles.apiErrorBanner}>
          <Text style={styles.apiErrorText}>
            ⚠️ API not connected. AI features may not work.
          </Text>
          <TouchableOpacity onPress={testApiConnection}>
            <Text style={styles.apiRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Basic Task Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Task Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Task Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={taskData.title}
                onChangeText={(text) =>
                  setTaskData({ ...taskData, title: text })
                }
                placeholder="e.g., Implement login functionality"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={taskData.description}
                onChangeText={(text) =>
                  setTaskData({ ...taskData, description: text })
                }
                placeholder="Describe the task requirements"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Task Type</Text>
              <View style={styles.optionsRow}>
                {taskTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      taskData.taskType === type && styles.typeButtonActive,
                    ]}
                    onPress={() => setTaskData({ ...taskData, taskType: type })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        taskData.taskType === type &&
                          styles.typeButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Project Selection */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Project <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setProjectModal(true)}
            >
              <Text
                style={
                  taskData.project
                    ? styles.selectorText
                    : styles.selectorPlaceholder
                }
              >
                {taskData.project || "Select a project"}
              </Text>
              <Text style={styles.selectorIcon}>▼</Text>
            </TouchableOpacity>

            {projects.length === 0 && (
              <Text style={styles.emptyText}>
                No projects found. Create a project first.
              </Text>
            )}
          </View>

          {/* Assign Users */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                Assign To <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity onPress={() => setUserModal(true)}>
                <Text style={styles.addButton}>+ Add Users</Text>
              </TouchableOpacity>
            </View>

            {selectedUsers.map((user) => (
              <View key={user.id} style={styles.userRow}>
                <View style={styles.userAvatarSmall}>
                  <Text style={styles.userAvatarSmallText}>
                    {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userRole}>{user.role}</Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setSelectedUsers(
                      selectedUsers.filter((u) => u.id !== user.id),
                    )
                  }
                >
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}

            {selectedUsers.length === 0 && (
              <Text style={styles.emptyText}>No users selected</Text>
            )}
          </View>

          {/* Timeline */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Timeline</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Start Date</Text>
                <TouchableOpacity
                  style={styles.datePicker}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text>{taskData.startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={taskData.startDate}
                    mode="date"
                    onChange={(event, date) => {
                      setShowStartPicker(false);
                      if (date) setTaskData({ ...taskData, startDate: date });
                    }}
                  />
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>Due Date</Text>
                <TouchableOpacity
                  style={styles.datePicker}
                  onPress={() => setShowDuePicker(true)}
                >
                  <Text>{taskData.dueDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
                {showDuePicker && (
                  <DateTimePicker
                    value={taskData.dueDate}
                    mode="date"
                    onChange={(event, date) => {
                      setShowDuePicker(false);
                      if (date) setTaskData({ ...taskData, dueDate: date });
                    }}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Priority */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Priority</Text>
            <View style={styles.priorityRow}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOption,
                    taskData.priority === p && styles.priorityOptionActive,
                    { backgroundColor: getPriorityColor(p) + "20" },
                  ]}
                  onPress={() => setTaskData({ ...taskData, priority: p })}
                >
                  <Text
                    style={[
                      styles.priorityOptionText,
                      { color: getPriorityColor(p) },
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Estimated Hours */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estimated Hours</Text>
            <TextInput
              style={styles.input}
              value={taskData.estimatedHours}
              onChangeText={(text) =>
                setTaskData({ ...taskData, estimatedHours: text })
              }
              placeholder="e.g., 8"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          {/* Subtasks */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Subtasks</Text>
              <TouchableOpacity onPress={() => setSubtaskModal(true)}>
                <Text style={styles.addButton}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {taskData.subtasks.length > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${calculateProgress()}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {calculateProgress()}% complete
                </Text>
              </View>
            )}

            {taskData.subtasks.map((subtask) => (
              <TouchableOpacity
                key={subtask.id}
                style={styles.subtaskItem}
                onPress={() => toggleSubtask(subtask.id)}
              >
                <View
                  style={[
                    styles.subtaskCheckbox,
                    subtask.completed && styles.subtaskChecked,
                  ]}
                >
                  {subtask.completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.subtaskTitle,
                    subtask.completed && styles.subtaskCompleted,
                  ]}
                >
                  {subtask.title}
                </Text>
              </TouchableOpacity>
            ))}
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
              onPress={handleAssignTask}
            >
              <Text style={styles.submitButtonText}>Assign Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* AI Main Modal */}
      <Modal visible={aiModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 AI Assistant</Text>
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {apiStatus !== "connected" && !aiLoading && (
              <View style={styles.apiWarningContainer}>
                <Text style={styles.apiWarningText}>⚠️ API not connected</Text>
                <TouchableOpacity
                  style={styles.apiRetryButton}
                  onPress={testApiConnection}
                >
                  <Text style={styles.apiRetryButtonText}>
                    Retry Connection
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {!aiLoading && !aiResult ? (
              <View style={styles.aiOptionsGrid}>
                {aiOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.aiOptionCard}
                    onPress={() => handleAIAction(option.action)}
                  >
                    <Text style={styles.aiOptionIcon}>{option.icon}</Text>
                    <Text style={styles.aiOptionLabel}>{option.label}</Text>
                    <Text style={styles.aiOptionDesc}>{option.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : aiLoading ? (
              <View style={styles.aiLoadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.aiLoadingText}>
                  AI is thinking with Llama 3.1...
                </Text>
              </View>
            ) : (
              <View style={styles.aiResultContainer}>
                <ScrollView style={styles.aiResultScroll}>
                  <Text style={styles.aiResultText}>{aiResult}</Text>
                </ScrollView>

                {(aiAction === "describe" ||
                  aiAction === "enhance" ||
                  aiAction === "create") && (
                  <TouchableOpacity
                    style={styles.aiApplyButton}
                    onPress={applyAIResult}
                  >
                    <Text style={styles.aiApplyButtonText}>
                      Apply to Description
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.aiCloseButton}
                  onPress={() => {
                    setAiModalVisible(false);
                    setAiResult("");
                    setAiAction("");
                  }}
                >
                  <Text style={styles.aiCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Project Selection Modal */}
      <Modal visible={projectModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Project</Text>
            {projects.length === 0 ? (
              <Text style={styles.emptyModalText}>No projects available</Text>
            ) : (
              <FlatList
                data={projects}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setTaskData({
                        ...taskData,
                        project: item.name,
                        projectId: item.id,
                      });
                      setProjectModal(false);
                    }}
                  >
                    <View>
                      <Text style={styles.modalItemTitle}>{item.name}</Text>
                      <Text style={styles.modalItemSubtitle}>
                        Client: {item.client || "N/A"}
                      </Text>
                    </View>
                    {taskData.projectId === item.id && (
                      <Text style={styles.modalItemCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setProjectModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Selection Modal */}
      <Modal visible={userModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Users</Text>
            {users.length === 0 ? (
              <Text style={styles.emptyModalText}>No users available</Text>
            ) : (
              <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <UserCard
                    user={item}
                    selected={selectedUsers.some((u) => u.id === item.id)}
                    onSelect={(user) => {
                      if (selectedUsers.some((u) => u.id === user.id)) {
                        setSelectedUsers(
                          selectedUsers.filter((u) => u.id !== user.id),
                        );
                      } else {
                        setSelectedUsers([...selectedUsers, user]);
                      }
                    }}
                  />
                )}
              />
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setUserModal(false)}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Subtask Modal */}
      <Modal visible={subtaskModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Subtask</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter subtask title"
              value={newSubtask}
              onChangeText={setNewSubtask}
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setSubtaskModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={addSubtask}
              >
                <Text style={styles.modalConfirmText}>Add</Text>
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
  aiHeaderIcon: {
    fontSize: 24,
    color: "#fff",
  },
  apiErrorBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffebee",
    padding: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ffcdd2",
  },
  apiErrorText: {
    color: "#c62828",
    fontSize: 12,
    flex: 1,
  },
  apiRetryText: {
    color: "#2196f3",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  form: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  inputGroup: {
    marginBottom: 16,
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
    padding: 10,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  typeButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  typeButtonText: {
    fontSize: 12,
    color: "#666",
  },
  typeButtonTextActive: {
    color: "#fff",
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
  selectorPlaceholder: {
    fontSize: 14,
    color: "#999",
  },
  selectorIcon: {
    fontSize: 12,
    color: "#999",
  },
  addButton: {
    color: "#4CAF50",
    fontSize: 13,
    fontWeight: "600",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  userAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  userAvatarSmallText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  userRole: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  removeText: {
    color: "#f44336",
    fontSize: 12,
  },
  emptyText: {
    color: "#999",
    fontSize: 13,
    fontStyle: "italic",
    textAlign: "center",
    padding: 12,
  },
  datePicker: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
  },
  priorityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priorityOption: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  priorityOptionActive: {
    borderWidth: 2,
    borderColor: "#333",
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  progressText: {
    fontSize: 11,
    color: "#666",
    textAlign: "right",
  },
  subtaskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  subtaskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ddd",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  subtaskChecked: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 13,
    color: "#333",
  },
  subtaskCompleted: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  checkmark: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
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
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalClose: {
    fontSize: 20,
    color: "#999",
    padding: 4,
  },
  apiWarningContainer: {
    padding: 20,
    alignItems: "center",
  },
  apiWarningText: {
    fontSize: 16,
    color: "#f44336",
    marginBottom: 12,
  },
  apiRetryButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  apiRetryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  aiOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  aiOptionCard: {
    width: "48%",
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  aiOptionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  aiOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  aiOptionDesc: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
  aiLoadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  aiLoadingText: {
    marginTop: 12,
    color: "#4CAF50",
    fontSize: 16,
  },
  aiResultContainer: {
    maxHeight: 500,
  },
  aiResultScroll: {
    maxHeight: 350,
    marginBottom: 16,
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  aiResultText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  aiApplyButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  aiApplyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  aiCloseButton: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  aiCloseButtonText: {
    color: "#f44336",
    fontSize: 14,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  emptyModalText: {
    textAlign: "center",
    color: "#999",
    padding: 20,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  modalItemSubtitle: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  modalItemCheck: {
    fontSize: 18,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  userCardSelected: {
    backgroundColor: "#e8f5e9",
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
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalCancelText: {
    color: "#f44336",
    fontSize: 14,
    fontWeight: "600",
  },
  modalConfirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    marginLeft: 8,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
