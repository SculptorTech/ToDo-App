// src/screens/manager/ManagerHomeScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import Svg, { Circle } from "react-native-svg";

import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [projectProgress, setProjectProgress] = useState({});

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Create Task Modal state
  const [createTaskModalVisible, setCreateTaskModalVisible] = useState(false);
  const [taskType, setTaskType] = useState("company"); // 'company' or 'project'
  const [selectedProjectForTask, setSelectedProjectForTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
    status: "pending",
  });

  // Chatbot state
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // Ref members.map scroll view
  const scrollViewRef = useRef();

  const CircularProgress = ({ percentage, size = 40 }) => {
    const radius = size / 2 - 4;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={3}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#2563EB"
            strokeWidth={3}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.circularProgressTextContainer}>
          <Text style={styles.circularProgressText}>{percentage}%</Text>
        </View>
      </View>
    );
  };

  // Load all data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadManagerData();
    }, [user]),
  );

  const loadManagerData = async () => {
    setLoading(true);
    try {
      const currentUser = user;
      console.log("👤 Current Manager:", currentUser);

      if (!currentUser || !currentUser.UserID) {
        console.error("No user data available");
        setLoading(false);
        return;
      }

      const projectsResponse = await getRequest("/project/get-projects");
      const allProjects = projectsResponse.projects || projectsResponse || [];
      console.log("📊 All projects from API:", allProjects.length);

      const managed = allProjects.filter((p) => {
        const assignedTo = p.AssignedTo || p.assignedTo;
        return assignedTo === currentUser.UserID;
      });

      setManagedProjects(managed);
      console.log(`📋 Managed projects: ${managed.length}`);

      const activeCount = managed.filter((p) => {
        const status = (p.Status || p.status || "").toLowerCase();
        return status === "active" || status === "planning";
      }).length;

      const usersResponse = await getRequest("/user/getusers");
      const allUsers = usersResponse.users || usersResponse || [];

      const developers = allUsers.filter((u) => {
        const role = (u.RoleName || u.role || u.Role || "").toLowerCase();
        const userId = u.UserID || u.id;
        const isActive = u.IsActive !== false;
        const isNotCurrentUser = userId !== currentUser.UserID;
        const isDeveloper = role.includes("developer");
        return isActive && isNotCurrentUser && isDeveloper;
      });

      setTeamMembers(developers);
      console.log(`👥 Developers: ${developers.length}`);

      let pendingCount = 0;
      let completedCount = 0;
      let progressMap = {};

      try {
        const tasksResponse = await getRequest("/task/get-tasks");
        const allTasks = tasksResponse.tasks || tasksResponse || [];

        const managedProjectIds = managed.map(
          (p) => p.ProjectId || p.projectId || p.id,
        );
        const relevantTasks = allTasks.filter((t) =>
          managedProjectIds.includes(t.ProjectId || t.projectId),
        );

        // Calculate progress for each project
        managed.forEach((project) => {
          const projectId =
            project.ProjectId || project.projectId || project.id;
          const projectTasks = relevantTasks.filter(
            (task) => (task.ProjectId || task.projectId) === projectId,
          );

          if (projectTasks.length > 0) {
            const completedTasks = projectTasks.filter((task) => {
              const status = (task.Status || task.status || "").toLowerCase();
              return status === "completed";
            }).length;

            const progress = (completedTasks / projectTasks.length) * 100;
            progressMap[projectId] = {
              percentage: Math.round(progress),
              totalTasks: projectTasks.length,
              completedTasks: completedTasks,
            };
          } else {
            progressMap[projectId] = {
              percentage: 0,
              totalTasks: 0,
              completedTasks: 0,
            };
          }
        });

        setProjectProgress(progressMap);

        pendingCount = relevantTasks.filter((t) => {
          const status = (t.Status || t.status || "").toLowerCase();
          return status === "pending" || status === "in_progress";
        }).length;

        completedCount = relevantTasks.filter((t) => {
          const status = (t.Status || t.status || "").toLowerCase();
          return status === "completed";
        }).length;

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

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      Alert.alert("Error", "Please enter task title");
      return;
    }

    if (taskType === "project" && !selectedProjectForTask) {
      Alert.alert("Error", "Please select a project for this task");
      return;
    }

    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        status: "pending",
        createdBy: user?.UserID,
        createdAt: new Date().toISOString(),
        projectId: taskType === "project" ? selectedProjectForTask.id : null,
      };

      // Call your API to create the task
      // const response = await postRequest("/task/create-task", taskData);

      console.log("Creating task:", taskData);

      Alert.alert("Success", "Task created successfully!");

      setNewTask({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
        status: "pending",
      });
      setTaskType("company");
      setSelectedProjectForTask(null);
      setCreateTaskModalVisible(false);

      loadManagerData();
    } catch (error) {
      console.error("Error creating task:", error);
      Alert.alert("Error", "Failed to create task");
    }
  };

  // Rule-based chatbot logic
  const handleBotResponse = (query) => {
    const msg = query.toLowerCase();

    if (
      msg.includes("free developer") ||
      msg.includes("available") ||
      msg.includes("who is free") ||
      msg.includes("free dev")
    ) {
      const busyNames = recentActivities.map((a) => a.assignee);
      const freeDevs = teamMembers.filter((dev) => {
        const devName = dev.FullName || dev.fullName || dev.name;
        return !busyNames.includes(devName);
      });

      if (freeDevs.length === 0) {
        return "All developers are currently busy with tasks.";
      }

      const devNames = freeDevs
        .map((dev) => dev.FullName || dev.fullName || dev.name)
        .join(", ");
      return `There ${freeDevs.length === 1 ? "is" : "are"} ${freeDevs.length} developer${freeDevs.length !== 1 ? "s" : ""} free right now: ${devNames}`;
    }

    if (
      msg.includes("team size") ||
      msg.includes("how many developers") ||
      msg.includes("team members")
    ) {
      return `You have ${teamMembers.length} developer${teamMembers.length !== 1 ? "s" : ""} in your team.`;
    }

    if (msg.includes("project") || msg.includes("how many projects")) {
      return `You are managing ${managedProjects.length} project${managedProjects.length !== 1 ? "s" : ""}. ${stats.activeProjects} of them are currently active.`;
    }

    if (
      msg.includes("task") ||
      msg.includes("tasks summary") ||
      msg.includes("pending tasks")
    ) {
      return `📊 Task Summary:\n• Pending: ${stats.pendingTasks}\n• Completed: ${stats.completedTasks}\n• Total: ${stats.pendingTasks + stats.completedTasks}`;
    }

    if (
      msg.includes("deadline") ||
      msg.includes("upcoming deadline") ||
      msg.includes("due soon")
    ) {
      if (upcomingDeadlines.length === 0) {
        return "No upcoming deadlines in the next 7 days. Great job! 🎉";
      }
      const deadlines = upcomingDeadlines
        .map((d) => `• ${d.task} (Due: ${d.due})`)
        .join("\n");
      return `📅 Upcoming deadlines (next 7 days):\n${deadlines}`;
    }

    if (msg.includes("help") || msg.includes("what can you do")) {
      return "I can help you with:\n• Free developers\n• Team size\n• Projects overview\n• Tasks summary\n• Upcoming deadlines\n\nJust ask me!";
    }

    if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
      return `Hello! I'm your AI assistant. Ask me about developers, projects, tasks, or deadlines. Type "help" to see what I can do.`;
    }

    return "Sorry, I didn't understand. Try asking about:\n• Free developers\n• Team size\n• Projects\n• Tasks summary\n• Upcoming deadlines\n• Help";
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMsg = { type: "user", text: input };
    const botReply = handleBotResponse(input);
    const botMsg = { type: "bot", text: botReply };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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

  const handleViewDetails = (project) => {
    const projectId = project.ProjectId || project.projectId || project.id;
    navigation.navigate("ProjectDetails", {
      projectId: projectId,
      user,
    });
  };

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

  const handleNotificationPress = () => {
    navigation.navigate("Notifications", { userId: user?.UserID });
  };

  const managerFeatures = [
    {
      id: "1",
      title: "Project List",
      icon: "📋",
      screen: "ProjectList",
      description: "View assigned projects",
      color: "#2563EB",
    },
    {
      id: "2",
      title: "Task Board",
      icon: "📌",
      screen: "TaskBoard",
      description: "Task Assigned to Developers",
      color: "#2563EB",
    },
    {
      id: "3",
      title: "Create Task",
      icon: "➕",
      onPress: () => setCreateTaskModalVisible(true),
      description: "Assign new tasks",
      color: "#2563EB",
    },
    {
      id: "4",
      title: "Reports",
      icon: "📊",
      screen: "Reports",
      description: "View analytics",
      color: "#2563EB",
    },
  ];

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#6B7280";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "#10B981";
      case "in_progress":
      case "inprogress":
      case "active":
        return "#3B82F6";
      case "pending":
      case "planning":
        return "#F59E0B";
      case "overdue":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "#2563EB";
      case "manager":
        return "#2563EB";
      case "team_lead":
        return "#2563EB";
      case "developer":
        return "#2563EB";
      default:
        return "#6B7280";
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
    const progress = projectProgress[projectId] || {
      percentage: 0,
      totalTasks: 0,
      completedTasks: 0,
    };
    const progressPercentage = progress.percentage;

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

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[styles.progressBar, { width: `${progressPercentage}%` }]}
            />
          </View>
          {progress.totalTasks > 0 && (
            <Text style={styles.progressStats}>
              {progress.completedTasks} of {progress.totalTasks} tasks completed
            </Text>
          )}
        </View>

        <View style={styles.horizontalProjectFooter}>
          <Text style={styles.horizontalViewText}>View Details →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Create Task Modal Component
  const CreateTaskModal = () => (
    <Modal
      visible={createTaskModalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setCreateTaskModalVisible(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        <ScrollView style={{ flex: 1, padding: 20 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Task</Text>
            <TouchableOpacity
              onPress={() => setCreateTaskModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.taskTypeSection}>
            <Text style={styles.inputLabel}>Task Type</Text>
            <View style={styles.taskTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.taskTypeButton,
                  taskType === "company" && styles.taskTypeButtonActive,
                ]}
                onPress={() => {
                  setTaskType("company");
                  setSelectedProjectForTask(null);
                }}
              >
                <Text
                  style={[
                    styles.taskTypeButtonText,
                    taskType === "company" && styles.taskTypeButtonTextActive,
                  ]}
                >
                  🏢 Company Task
                </Text>
                <Text style={styles.taskTypeDescription}>
                  Tasks not tied to any project
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.taskTypeButton,
                  taskType === "project" && styles.taskTypeButtonActive,
                ]}
                onPress={() => setTaskType("project")}
              >
                <Text
                  style={[
                    styles.taskTypeButtonText,
                    taskType === "project" && styles.taskTypeButtonTextActive,
                  ]}
                >
                  📋 Project Task
                </Text>
                <Text style={styles.taskTypeDescription}>
                  Tasks specific to a project
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {taskType === "project" && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Project *</Text>
              <View style={styles.projectSelectContainer}>
                {managedProjects.map((project) => {
                  const projectId =
                    project.ProjectId || project.projectId || project.id;
                  const projectName = project.Name || project.name || "Unnamed";
                  const isSelected = selectedProjectForTask?.id === projectId;

                  return (
                    <TouchableOpacity
                      key={projectId}
                      style={[
                        styles.projectSelectCard,
                        isSelected && styles.projectSelectCardActive,
                      ]}
                      onPress={() =>
                        setSelectedProjectForTask({
                          id: projectId,
                          name: projectName,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.projectSelectName,
                          isSelected && styles.projectSelectNameActive,
                        ]}
                      >
                        {projectName}
                      </Text>
                      {isSelected && (
                        <Text style={styles.projectSelectCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter task title"
              placeholderTextColor="#9CA3AF"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter task description"
              placeholderTextColor="#9CA3AF"
              value={newTask.description}
              onChangeText={(text) =>
                setNewTask({ ...newTask, description: text })
              }
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assign To</Text>
            <View style={styles.assigneeSelectContainer}>
              {teamMembers.map((member) => {
                const memberId = member.UserID || member.id;
                const memberName =
                  member.FullName || member.fullName || member.name;
                const isSelected = newTask.assignedTo === memberId;

                return (
                  <TouchableOpacity
                    key={memberId}
                    style={[
                      styles.assigneeChip,
                      isSelected && styles.assigneeChipActive,
                    ]}
                    onPress={() =>
                      setNewTask({
                        ...newTask,
                        assignedTo: memberId,
                        assignedToName: memberName,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.assigneeChipText,
                        isSelected && styles.assigneeChipTextActive,
                      ]}
                    >
                      {memberName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityContainer}>
              {["low", "medium", "high"].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    styles.priorityChip,
                    newTask.priority === priority && styles.priorityChipActive,
                  ]}
                  onPress={() => setNewTask({ ...newTask, priority: priority })}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      newTask.priority === priority &&
                        styles.priorityChipTextActive,
                    ]}
                  >
                    {priority.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Due Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => {
                Alert.alert("Date Picker", "Please implement date picker");
              }}
            >
              <Text style={styles.datePickerText}>
                {newTask.dueDate || "Select due date"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalActionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setCreateTaskModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.createButton,
                !newTask.title && styles.disabledButton,
              ]}
              onPress={handleCreateTask}
              disabled={!newTask.title}
            >
              <Text style={styles.createButtonText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

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
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Project Details</Text>
                    <TouchableOpacity
                      onPress={() => setModalVisible(false)}
                      style={styles.modalCloseButton}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Project Name</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedProject.Name ||
                        selectedProject.name ||
                        "Unnamed"}
                    </Text>
                  </View>

                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalDetailLabel}>Client</Text>
                    <Text style={styles.modalDetailValue}>
                      {selectedProject.Client ||
                        selectedProject.client ||
                        "N/A"}
                    </Text>
                  </View>

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

  // Chatbot Modal Component
  const ChatbotModal = () => (
    <Modal
      visible={chatVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setChatVisible(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
        <View style={styles.chatHeader}>
          <View>
            <Text style={styles.chatHeaderTitle}>AI Assistant</Text>
            <Text style={styles.chatHeaderSubtitle}>
              Ask me anything about your projects
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setChatVisible(false)}
            style={styles.chatCloseButton}
          >
            <Text style={styles.chatCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, padding: 10 }}
          showsVerticalScrollIndicator={true}
        >
          {messages.length === 0 ? (
            <View style={styles.chatWelcomeContainer}>
              <Text style={styles.chatWelcomeIcon}>🤖</Text>
              <Text style={styles.chatWelcomeTitle}>
                Welcome to AI Assistant!
              </Text>
              <Text style={styles.chatWelcomeText}>
                I can help you with:
                {"\n"}• Finding free developers
                {"\n"}• Team size information
                {"\n"}• Project overview
                {"\n"}• Task summary
                {"\n"}• Upcoming deadlines
                {"\n\n"}Type "help" to see all commands.
              </Text>
            </View>
          ) : (
            messages.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.chatMessageContainer,
                  msg.type === "user"
                    ? styles.chatUserMessage
                    : styles.chatBotMessage,
                ]}
              >
                <View
                  style={[
                    styles.chatBubble,
                    msg.type === "user"
                      ? styles.chatUserBubble
                      : styles.chatBotBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.chatMessageText,
                      msg.type === "user"
                        ? styles.chatUserText
                        : styles.chatBotText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask something..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={[
              styles.chatSendButton,
              !input.trim() && styles.chatSendButtonDisabled,
            ]}
            disabled={!input.trim()}
          >
            <Text
              style={[
                styles.chatSendText,
                !input.trim() && styles.chatSendDisabled,
              ]}
            >
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
          <View style={styles.headerIcons}>
            {/* Notifications Button */}
            <TouchableOpacity
              style={styles.notificationIcon}
              onPress={() => {
                console.log("🔔 Opening notifications for user:", user?.UserID);
                navigation.navigate("Notifications", {
                  userId: user?.UserID,
                });
              }}
            >
              <Text style={styles.notificationIconText}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Manager Tools</Text>
          <View style={styles.featuresGrid}>
            {managerFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                onPress={() => {
                  if (feature.onPress) {
                    feature.onPress();
                  } else if (feature.screen) {
                    navigation.navigate(feature.screen, { user });
                  }
                }}
              >
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: feature.color + "10" },
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
                        { backgroundColor: "#2563EB10" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.horizontalMemberAvatarText,
                          { color: "#2563EB" },
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
                        { backgroundColor: "#2563EB10" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.horizontalRoleText,
                          { color: "#2563EB" },
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

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.replace("Login")}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <ProjectDetailsModal />
      <ChatbotModal />
      <CreateTaskModal />

      <TouchableOpacity
        style={styles.chatFloatingButton}
        onPress={() => setChatVisible(true)}
      >
        <Text style={styles.chatFloatingIcon}>💬</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
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
    color: "#6B7280",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 4,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIconText: {
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
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
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
    color: "#1F2937",
    marginBottom: 12,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    borderRadius: 12,
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
    color: "#1F2937",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    color: "#1F2937",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  horizontalProjectList: {
    paddingRight: 20,
    gap: 12,
  },
  horizontalProjectCard: {
    width: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  horizontalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  horizontalStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  horizontalProjectClient: {
    fontSize: 13,
    color: "#2563EB",
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563EB",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 3,
  },
  progressStats: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
  },
  horizontalProjectFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  horizontalViewText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  horizontalMemberList: {
    paddingRight: 20,
    gap: 12,
  },
  horizontalMemberCard: {
    width: 110,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    color: "#1F2937",
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
  circularProgressTextContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  circularProgressText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#2563EB",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalDetailItem: {
    marginBottom: 16,
  },
  modalDetailLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalDetailValue: {
    fontSize: 16,
    color: "#1F2937",
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
    color: "#4B5563",
    lineHeight: 20,
    backgroundColor: "#F9FAFB",
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
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalViewDetailsButton: {
    flex: 2,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalViewDetailsButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  deadlineList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    borderBottomColor: "#F3F4F6",
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
    color: "#1F2937",
    marginBottom: 2,
  },
  deadlineMeta: {
    fontSize: 11,
    color: "#6B7280",
  },
  activityList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
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
    borderBottomColor: "#F3F4F6",
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
    color: "#1F2937",
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 11,
    color: "#6B7280",
  },
  logoutButton: {
    margin: 20,
    marginTop: 0,
    marginBottom: 30,
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  chatFloatingButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#2563EB",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatFloatingIcon: {
    color: "#FFFFFF",
    fontSize: 28,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#2563EB",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  chatHeaderSubtitle: {
    color: "#FFFFFF",
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
  },
  chatCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  chatCloseText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  chatWelcomeContainer: {
    alignItems: "center",
    padding: 40,
    marginTop: 50,
  },
  chatWelcomeIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  chatWelcomeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  chatWelcomeText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  chatMessageContainer: {
    marginVertical: 8,
    marginHorizontal: 12,
  },
  chatUserMessage: {
    alignItems: "flex-end",
  },
  chatBotMessage: {
    alignItems: "flex-start",
  },
  chatBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 12,
  },
  chatUserBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 4,
  },
  chatBotBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chatMessageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatUserText: {
    color: "#FFFFFF",
  },
  chatBotText: {
    color: "#1F2937",
  },
  chatInputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: "#FFFFFF",
  },
  chatSendButton: {
    marginLeft: 12,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#2563EB",
    borderRadius: 12,
  },
  chatSendButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  chatSendText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  chatSendDisabled: {
    opacity: 0.5,
  },
  taskTypeSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  taskTypeButtons: {
    gap: 12,
    marginTop: 8,
  },
  taskTypeButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  taskTypeButtonActive: {
    backgroundColor: "#2563EB10",
    borderColor: "#2563EB",
  },
  taskTypeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  taskTypeButtonTextActive: {
    color: "#2563EB",
  },
  taskTypeDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  projectSelectContainer: {
    gap: 10,
  },
  projectSelectCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  projectSelectCardActive: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB10",
  },
  projectSelectName: {
    fontSize: 14,
    color: "#1F2937",
  },
  projectSelectNameActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  projectSelectCheck: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "bold",
  },
  assigneeSelectContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  assigneeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  assigneeChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  assigneeChipText: {
    fontSize: 14,
    color: "#6B7280",
  },
  assigneeChipTextActive: {
    color: "#FFFFFF",
  },
  priorityContainer: {
    flexDirection: "row",
    gap: 12,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  priorityChipActive: {
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  priorityChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  priorityChipTextActive: {
    color: "#2563EB",
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  datePickerText: {
    fontSize: 16,
    color: "#6B7280",
  },
  modalActionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  createButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
  },
});
