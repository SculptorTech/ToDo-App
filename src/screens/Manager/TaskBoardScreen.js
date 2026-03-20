// src/screens/manager/TaskBoardScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getRequest, putRequest } from "../../services/apiService";

export default function TaskBoardScreen({ navigation, route }) {
  console.log("📱 TaskBoardScreen mounted");
  console.log("📦 Route params:", route.params);

  const { user } = route.params || {};

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentModal, setCommentModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [expandedTask, setExpandedTask] = useState(null);
  const [progressModal, setProgressModal] = useState(false);
  const [progressValue, setProgressValue] = useState("0");
  const [statsModal, setStatsModal] = useState(false);
  const [taskStats, setTaskStats] = useState(null);

  // Filter states
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Load tasks when screen focuses
  useFocusEffect(
    useCallback(() => {
      console.log("🎯 TaskBoardScreen focused");
      loadTaskData();
      loadTaskStats();
    }, [user]),
  );

  const loadTaskData = async () => {
    console.log("📥 Loading task data...");
    setLoading(true);
    setError(null);

    try {
      const currentUser = user;
      console.log("👤 Current Manager:", currentUser);

      if (!currentUser || !currentUser.UserID) {
        console.error("❌ No user data available");
        setError("User data not available");
        setLoading(false);
        return;
      }

      // Fetch tasks created by this manager
      console.log("📡 Fetching tasks from API...");
      const tasksResponse = await getRequest("/task/get-tasks", {
        createdBy: currentUser.UserID,
      });

      console.log("📡 Tasks response:", tasksResponse);

      let allTasks = [];
      if (tasksResponse.tasks) {
        allTasks = tasksResponse.tasks;
      } else if (Array.isArray(tasksResponse)) {
        allTasks = tasksResponse;
      }

      console.log(`📋 Tasks count: ${allTasks.length}`);
      setTasks(allTasks);
      applyFilters(allTasks, searchQuery, selectedFilter);

      // Fetch projects for reference
      console.log("📡 Fetching projects...");
      const projectsResponse = await getRequest("/project/get-projects");
      console.log("📡 Projects response:", projectsResponse);

      let projectsList = [];
      if (projectsResponse.projects) {
        projectsList = projectsResponse.projects;
      } else if (Array.isArray(projectsResponse)) {
        projectsList = projectsResponse;
      }
      setProjects(projectsList);

      // Fetch users for assignee names
      console.log("📡 Fetching users...");
      const usersResponse = await getRequest("/user/getusers");
      console.log("📡 Users response:", usersResponse);

      let usersList = [];
      if (usersResponse.users) {
        usersList = usersResponse.users;
      } else if (Array.isArray(usersResponse)) {
        usersList = usersResponse;
      }
      setTeamMembers(usersList);
    } catch (error) {
      console.error("❌ Error loading tasks:", error);
      setError(error.message || "Failed to load tasks");
      Alert.alert("Error", "Failed to load tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTaskStats = async () => {
    try {
      const response = await getRequest("/task/task-stats", {
        createdBy: user?.UserID,
      });
      if (response.stats) {
        setTaskStats(response.stats);
      }
    } catch (error) {
      console.error("Error loading task stats:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTaskData();
    loadTaskStats();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(tasks, text, selectedFilter);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    applyFilters(tasks, searchQuery, filter);
  };

  const applyFilters = (taskList, query, filter) => {
    let filtered = [...taskList];

    // Apply search filter
    if (query.trim() !== "") {
      filtered = filtered.filter((t) => {
        const title = (t.Title || t.title || "").toLowerCase();
        const description = (
          t.Description ||
          t.description ||
          ""
        ).toLowerCase();
        const projectName = (
          t.ProjectName ||
          t.projectName ||
          ""
        ).toLowerCase();
        const assigneeName = getAssigneeName(
          t.AssignedTo || t.assignedTo,
        ).toLowerCase();
        const searchLower = query.toLowerCase();

        return (
          title.includes(searchLower) ||
          description.includes(searchLower) ||
          projectName.includes(searchLower) ||
          assigneeName.includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (filter !== "all") {
      filtered = filtered.filter((t) => {
        const status = (t.Status || t.status || "").toLowerCase();
        return status === filter.toLowerCase();
      });
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => {
        const priority = (t.Priority || t.priority || "").toLowerCase();
        return priority === priorityFilter.toLowerCase();
      });
    }

    // Apply project filter
    if (projectFilter !== "all") {
      filtered = filtered.filter((t) => {
        const projectId = t.ProjectId || t.projectId;
        return projectId === projectFilter;
      });
    }

    // Apply assignee filter
    if (assigneeFilter !== "all") {
      filtered = filtered.filter((t) => {
        const assigneeId = t.AssignedTo || t.assignedTo;
        return assigneeId?.toString() === assigneeFilter;
      });
    }

    setFilteredTasks(filtered);
  };

  const sortTasks = (tasksToSort) => {
    return [...tasksToSort].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "dueDate":
          comparison =
            new Date(a.DueDate || a.dueDate || 0) -
            new Date(b.DueDate || b.dueDate || 0);
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, normal: 2, low: 1 };
          comparison =
            (priorityOrder[
              b.Priority?.toLowerCase() || b.priority?.toLowerCase()
            ] || 0) -
            (priorityOrder[
              a.Priority?.toLowerCase() || a.priority?.toLowerCase()
            ] || 0);
          break;
        case "status":
          const statusOrder = {
            pending: 1,
            in_progress: 2,
            onhold: 3,
            completed: 4,
          };
          comparison =
            (statusOrder[a.Status?.toLowerCase() || a.status?.toLowerCase()] ||
              0) -
            (statusOrder[b.Status?.toLowerCase() || b.status?.toLowerCase()] ||
              0);
          break;
        case "title":
          comparison = (a.Title || a.title || "").localeCompare(
            b.Title || b.title || "",
          );
          break;
        case "progress":
          comparison = (a.Progress || 0) - (b.Progress || 0);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const getProjectName = (projectId) => {
    if (!projectId) return "No Project";
    const project = projects.find(
      (p) =>
        p._id === projectId || p.ProjectId === projectId || p.id === projectId,
    );
    return project?.Name || project?.name || "Unknown Project";
  };

  const getAssigneeName = (assigneeId) => {
    if (!assigneeId) return "Unassigned";

    const assigneeIdStr = assigneeId.toString();

    const user = teamMembers.find((u) => {
      const userId = u.UserID || u.id || u._id;
      return userId?.toString() === assigneeIdStr;
    });

    return user?.FullName || user?.fullName || user?.name || "Unknown";
  };

  const getAssigneeList = () => {
    const uniqueAssignees = [];
    const assigneeIds = new Set();

    tasks.forEach((task) => {
      const assigneeId = task.AssignedTo || task.assignedTo;
      if (assigneeId && !assigneeIds.has(assigneeId.toString())) {
        assigneeIds.add(assigneeId.toString());
        uniqueAssignees.push({
          id: assigneeId.toString(),
          name: getAssigneeName(assigneeId),
        });
      }
    });

    return uniqueAssignees;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      today.setHours(0, 0, 0, 0);
      tomorrow.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) {
        return "Today";
      } else if (date.getTime() === tomorrow.getTime()) {
        return "Tomorrow";
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch (e) {
      return "Invalid date";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#f72585";
      case "medium":
      case "normal":
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
        return "#4cc9f0";
      case "pending":
        return "#f8961e";
      case "onhold":
        return "#f72585";
      default:
        return "#6c757d";
    }
  };

  const getStatusBgColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "#43aa8b20";
      case "in_progress":
      case "inprogress":
        return "#4cc9f020";
      case "pending":
        return "#f8961e20";
      case "onhold":
        return "#f7258520";
      default:
        return "#6c757d20";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "✅";
      case "in_progress":
      case "inprogress":
        return "🔄";
      case "pending":
        return "⏳";
      case "onhold":
        return "⏸️";
      default:
        return "📋";
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    } catch (e) {
      return false;
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return "#43aa8b";
    if (progress >= 50) return "#4cc9f0";
    if (progress >= 25) return "#f8961e";
    return "#f72585";
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    try {
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
      if (diffDays === 0) return "Due today";
      return `${diffDays} days remaining`;
    } catch (e) {
      return null;
    }
  };

  // Comment functions
  const addComment = async () => {
    if (!newComment.trim() || !selectedTask) return;

    const task = selectedTask;
    const comments = task.Comments || [];
    const updatedComments = [
      ...comments,
      {
        id: Date.now().toString(),
        text: newComment,
        userName: user?.FullName || user?.name || "Manager",
        timestamp: new Date().toISOString(),
      },
    ];

    try {
      await putRequest(`/task/update-task/${task.id}`, {
        Comments: updatedComments,
      });
      setNewComment("");
      setCommentModal(false);
      await loadTaskData();
    } catch (error) {
      Alert.alert("Error", "Failed to add comment");
    }
  };

  // Progress update function
  const updateTaskProgress = async () => {
    if (!selectedTask) return;

    const progress = parseInt(progressValue);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      Alert.alert("Invalid Progress", "Please enter a value between 0 and 100");
      return;
    }

    try {
      await putRequest(`/task/update-progress/${selectedTask.id}`, {
        progress: progress,
      });
      setProgressModal(false);
      setProgressValue("0");
      await loadTaskData();
      await loadTaskStats();
    } catch (error) {
      Alert.alert("Error", "Failed to update progress");
    }
  };

  // Task status update
  const updateTaskStatus = async (id, newStatus) => {
    Alert.alert(
      "Update Task Status",
      `Mark task as ${newStatus.replace("_", " ")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await putRequest(`/task/update-task/${id}`, {
                Status: newStatus,
                ...(newStatus === "completed"
                  ? {
                      CompletedAt: new Date().toISOString(),
                      Progress: 100,
                    }
                  : {}),
              });
              await loadTaskData();
              await loadTaskStats();
            } catch (error) {
              Alert.alert("Error", "Failed to update task status");
            }
          },
        },
      ],
    );
  };

  const renderTaskCard = ({ item }) => {
    const taskId = item._id || item.TaskId || item.taskId || item.id;
    const title = item.Title || item.title || "Untitled Task";
    const description = item.Description || item.description;
    const status = item.Status || item.status || "pending";
    const priority = item.Priority || item.priority || "normal";
    const dueDate = item.DueDate || item.dueDate;
    const assigneeId = item.AssignedTo || item.assignedTo;
    const assigneeName = getAssigneeName(assigneeId);
    const createdByName = item.CreatedByName || item.createdByName || "You";
    const projectId = item.ProjectId || item.projectId;
    const projectName = getProjectName(projectId);
    const overdue = isOverdue(dueDate) && status.toLowerCase() !== "completed";
    const progress = item.Progress || 0;
    const comments = item.Comments || [];
    const daysRemaining = getDaysRemaining(dueDate);
    const isExpanded = expandedTask === taskId;

    return (
      <View style={styles.taskCard}>
        <View
          style={[
            styles.priorityIndicator,
            { backgroundColor: getPriorityColor(priority) },
          ]}
        />

        <View style={styles.taskContent}>
          {/* Header with Status Icon */}
          <TouchableOpacity
            onPress={() => setExpandedTask(isExpanded ? null : taskId)}
            activeOpacity={0.7}
          >
            <View style={styles.taskHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.statusIcon}>{getStatusIcon(status)}</Text>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {title}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBgColor(status) },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: getStatusColor(status) }]}
                >
                  {status.replace("_", " ")}
                </Text>
              </View>
            </View>

            {/* Project Name Display */}
            <View style={styles.projectContainer}>
              <Text style={styles.projectIcon}>📋</Text>
              <Text style={styles.projectName} numberOfLines={1}>
                {projectName}
              </Text>
            </View>

            {!isExpanded && description ? (
              <Text style={styles.description} numberOfLines={1}>
                {description}
              </Text>
            ) : null}

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPercentage}>{progress}%</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progress}%`,
                      backgroundColor: getProgressColor(progress),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Compact Meta Info */}
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>👤</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {assigneeName}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={[styles.metaValue, overdue && styles.overdueText]}>
                  {formatDate(dueDate)}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⚡</Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: getPriorityColor(priority) },
                  ]}
                >
                  {priority}
                </Text>
              </View>

              {comments.length > 0 && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>💬</Text>
                  <Text style={styles.metaValue}>{comments.length}</Text>
                </View>
              )}
            </View>

            {daysRemaining && (
              <Text
                style={[styles.daysRemaining, overdue && styles.overdueText]}
              >
                {daysRemaining}
              </Text>
            )}
          </TouchableOpacity>

          {/* Expanded Content */}
          {isExpanded && (
            <View style={styles.expandedContent}>
              {description ? (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedLabel}>Description</Text>
                  <Text style={styles.expandedText}>{description}</Text>
                </View>
              ) : null}

              <View style={styles.expandedSection}>
                <Text style={styles.expandedLabel}>Details</Text>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Created by:</Text>
                    <Text style={styles.detailValue}>{createdByName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Assigned to:</Text>
                    <Text style={styles.detailValue}>{assigneeName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due date:</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        overdue && styles.overdueText,
                      ]}
                    >
                      {new Date(dueDate).toLocaleDateString()}
                      {overdue && " (Overdue)"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Priority:</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: getPriorityColor(priority) },
                      ]}
                    >
                      {priority}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Progress:</Text>
                    <Text style={styles.detailValue}>{progress}%</Text>
                  </View>
                </View>
              </View>

              {/* Comments Section */}
              {comments.length > 0 && (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedLabel}>
                    Comments ({comments.length})
                  </Text>
                  {comments.slice(-3).map((comment) => (
                    <View key={comment.id} style={styles.commentItem}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUser}>
                          {comment.userName}
                        </Text>
                        <Text style={styles.commentTime}>
                          {new Date(comment.timestamp).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  ))}
                  {comments.length > 3 && (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => {
                        setSelectedTask(item);
                        setCommentModal(true);
                      }}
                    >
                      <Text style={styles.viewAllText}>
                        View all comments →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.commentButton]}
                  onPress={() => {
                    setSelectedTask(item);
                    setCommentModal(true);
                  }}
                >
                  <Text style={styles.actionButtonIcon}>💬</Text>
                  <Text style={styles.actionButtonText}>
                    Comments {comments.length > 0 ? `(${comments.length})` : ""}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.progressButton]}
                  onPress={() => {
                    setSelectedTask(item);
                    setProgressValue(progress.toString());
                    setProgressModal(true);
                  }}
                >
                  <Text style={styles.actionButtonIcon}>📊</Text>
                  <Text style={styles.actionButtonText}>Update Progress</Text>
                </TouchableOpacity>

                {status !== "completed" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => updateTaskStatus(taskId, "completed")}
                  >
                    <Text style={styles.actionButtonIcon}>✅</Text>
                    <Text style={styles.actionButtonText}>Mark Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Expand/Collapse Indicator */}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpandedTask(isExpanded ? null : taskId)}
          >
            <Text style={styles.expandButtonText}>
              {isExpanded ? "Show less ▲" : "Show more ▼"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filters = [
    { id: "all", label: "All", color: "#6c757d" },
    { id: "pending", label: "Pending", color: "#f8961e" },
    { id: "in_progress", label: "In Progress", color: "#4cc9f0" },
    { id: "completed", label: "Completed", color: "#43aa8b" },
    { id: "onhold", label: "On Hold", color: "#f72585" },
  ];

  const sortedAndFilteredTasks = sortTasks(filteredTasks);

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTaskData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2599f7" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
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
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Task Board</Text>
          <Text style={styles.headerSubtitle}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => setStatsModal(true)}
          >
            <Text style={styles.statsButtonText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("AddTask", { user })}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      {taskStats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{taskStats.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, styles.statPending]}>
            <Text style={styles.statNumber}>
              {taskStats.byStatus?.pending || 0}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, styles.statProgress]}>
            <Text style={styles.statNumber}>
              {taskStats.byStatus?.in_progress || 0}
            </Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={[styles.statCard, styles.statCompleted]}>
            <Text style={styles.statNumber}>
              {taskStats.byStatus?.completed || 0}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={[styles.statCard, styles.statOverdue]}>
            <Text style={styles.statNumber}>{taskStats.overdue || 0}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View>
      )}

      {/* Search and Filter Toggle */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks by title, description, project..."
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterToggle,
            showFilters && styles.filterToggleActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterToggleIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Filters */}
      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          <View style={styles.filterChips}>
            <Text style={styles.filterLabel}>Sort:</Text>
            {["dueDate", "priority", "status", "title", "progress"].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, sortBy === s && styles.chipActive]}
                onPress={() => setSortBy(s)}
              >
                <Text
                  style={[
                    styles.chipText,
                    sortBy === s && styles.chipTextActive,
                  ]}
                >
                  {s === "dueDate" ? "Date" : s}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.orderChip}
              onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            >
              <Text style={styles.orderChipText}>
                {sortOrder === "asc" ? "↑" : "↓"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterChips}>
            <Text style={styles.filterLabel}>Priority:</Text>
            {["all", "high", "normal", "low"].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, priorityFilter === p && styles.chipActive]}
                onPress={() => setPriorityFilter(p)}
              >
                <Text
                  style={[
                    styles.chipText,
                    priorityFilter === p && styles.chipTextActive,
                  ]}
                >
                  {p === "all" ? "All" : p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {projects.length > 0 && (
            <View style={styles.filterChips}>
              <Text style={styles.filterLabel}>Project:</Text>
              <TouchableOpacity
                style={[
                  styles.chip,
                  projectFilter === "all" && styles.chipActive,
                ]}
                onPress={() => setProjectFilter("all")}
              >
                <Text
                  style={[
                    styles.chipText,
                    projectFilter === "all" && styles.chipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {projects.slice(0, 5).map((project) => (
                <TouchableOpacity
                  key={project._id || project.ProjectId}
                  style={[
                    styles.chip,
                    projectFilter === (project._id || project.ProjectId) &&
                      styles.chipActive,
                  ]}
                  onPress={() =>
                    setProjectFilter(project._id || project.ProjectId)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      projectFilter === (project._id || project.ProjectId) &&
                        styles.chipTextActive,
                    ]}
                  >
                    {project.Name?.length > 10
                      ? project.Name.substring(0, 10) + "..."
                      : project.Name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.filterChips}>
            <Text style={styles.filterLabel}>Assignee:</Text>
            <TouchableOpacity
              style={[
                styles.chip,
                assigneeFilter === "all" && styles.chipActive,
              ]}
              onPress={() => setAssigneeFilter("all")}
            >
              <Text
                style={[
                  styles.chipText,
                  assigneeFilter === "all" && styles.chipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {getAssigneeList()
              .slice(0, 5)
              .map((assignee) => (
                <TouchableOpacity
                  key={assignee.id}
                  style={[
                    styles.chip,
                    assigneeFilter === assignee.id && styles.chipActive,
                  ]}
                  onPress={() => setAssigneeFilter(assignee.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      assigneeFilter === assignee.id && styles.chipTextActive,
                    ]}
                  >
                    {assignee.name.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </ScrollView>
      )}

      {/* Status Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive,
                selectedFilter === filter.id && { borderColor: filter.color },
              ]}
              onPress={() => handleFilterChange(filter.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter.id && { color: filter.color },
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Task List */}
      <FlatList
        data={sortedAndFilteredTasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => {
          const id = item._id || item.TaskId || item.taskId || item.id;
          return id?.toString() || Math.random().toString();
        }}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📌</Text>
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ||
              selectedFilter !== "all" ||
              priorityFilter !== "all" ||
              projectFilter !== "all" ||
              assigneeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "You haven't created any tasks yet"}
            </Text>
            {(searchQuery ||
              selectedFilter !== "all" ||
              priorityFilter !== "all" ||
              projectFilter !== "all" ||
              assigneeFilter !== "all") && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedFilter("all");
                  setPriorityFilter("all");
                  setProjectFilter("all");
                  setAssigneeFilter("all");
                  setFilteredTasks(tasks);
                }}
              >
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={<View style={styles.footer} />}
      />

      {/* Comment Modal */}
      <Modal visible={commentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.commentModal]}>
            <Text style={styles.modalTitle}>Comments</Text>
            <Text style={styles.taskTitleModal}>{selectedTask?.title}</Text>

            <ScrollView style={styles.commentsList}>
              {selectedTask?.Comments?.length > 0 ? (
                selectedTask.Comments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUser}>{comment.userName}</Text>
                      <Text style={styles.commentTime}>
                        {new Date(comment.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noComments}>No comments yet</Text>
              )}
            </ScrollView>

            <TextInput
              style={styles.commentInput}
              placeholder="Write a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCommentModal(false);
                  setNewComment("");
                }}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={addComment}
              >
                <Text style={styles.saveButtonText}>Add Comment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Progress Modal */}
      <Modal visible={progressModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Progress</Text>
            <Text style={styles.taskTitleModal}>{selectedTask?.title}</Text>

            <View style={styles.progressInputContainer}>
              <TextInput
                style={styles.progressInput}
                value={progressValue}
                onChangeText={setProgressValue}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.progressPercent}>%</Text>
            </View>

            <View style={styles.progressQuickButtons}>
              {[0, 25, 50, 75, 100].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={styles.quickButton}
                  onPress={() => setProgressValue(value.toString())}
                >
                  <Text style={styles.quickButtonText}>{value}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setProgressModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={updateTaskProgress}
              >
                <Text style={styles.saveButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stats Modal */}
      <Modal visible={statsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Task Statistics</Text>

            {taskStats && (
              <View style={styles.statsModalContent}>
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {taskStats.total || 0}
                    </Text>
                    <Text style={styles.statLabel}>Total Tasks</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>
                      {taskStats.overdue || 0}
                    </Text>
                    <Text style={styles.statLabel}>Overdue</Text>
                  </View>
                </View>

                <Text style={styles.statsSectionTitle}>By Status</Text>
                {Object.entries(taskStats.byStatus || {}).map(
                  ([status, count]) => (
                    <View key={status} style={styles.statBar}>
                      <Text style={styles.statBarLabel}>
                        {status.replace("_", " ")}: {count}
                      </Text>
                      <View style={styles.statBarContainer}>
                        <View
                          style={[
                            styles.statBarFill,
                            {
                              width: `${taskStats.total > 0 ? (count / taskStats.total) * 100 : 0}%`,
                              backgroundColor: getStatusColor(status),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ),
                )}

                <Text style={styles.statsSectionTitle}>By Priority</Text>
                {Object.entries(taskStats.byPriority || {}).map(
                  ([priority, count]) => (
                    <View key={priority} style={styles.statBar}>
                      <Text style={styles.statBarLabel}>
                        {priority}: {count}
                      </Text>
                      <View style={styles.statBarContainer}>
                        <View
                          style={[
                            styles.statBarFill,
                            {
                              width: `${taskStats.total > 0 ? (count / taskStats.total) * 100 : 0}%`,
                              backgroundColor: getPriorityColor(priority),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ),
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setStatsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
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
    fontSize: 16,
    color: "#6c757d",
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2599f7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2599f7",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  statsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsButtonText: {
    fontSize: 20,
  },
  addButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    padding: 12,
    gap: 6,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  statPending: {
    backgroundColor: "#fff3e0",
  },
  statProgress: {
    backgroundColor: "#e3f2fd",
  },
  statCompleted: {
    backgroundColor: "#e8f5e9",
  },
  statOverdue: {
    backgroundColor: "#ffebee",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  statLabel: {
    fontSize: 9,
    color: "#6c757d",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: "#999",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1a1a1a",
  },
  clearIcon: {
    fontSize: 16,
    color: "#9E9E9E",
    padding: 4,
  },
  filterToggle: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  filterToggleActive: {
    backgroundColor: "#2599f7",
    borderColor: "#2599f7",
  },
  filterToggleIcon: {
    fontSize: 18,
  },
  filtersScroll: {
    maxHeight: 50,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  filterChips: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    marginRight: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: "#2599f7",
  },
  chipText: {
    fontSize: 11,
    color: "#666",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  orderChip: {
    width: 28,
    height: 28,
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  orderChipText: {
    fontSize: 14,
    color: "#666",
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9ecef",
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: "#fff",
    borderWidth: 2,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6c757d",
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  priorityIndicator: {
    width: 4,
    height: "100%",
  },
  taskContent: {
    flex: 1,
    padding: 14,
  },
  taskHeader: {
    marginBottom: 6,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  statusIcon: {
    fontSize: 14,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  projectContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 4,
  },
  projectIcon: {
    fontSize: 12,
  },
  projectName: {
    flex: 1,
    fontSize: 12,
    color: "#2599f7",
    fontWeight: "500",
  },
  description: {
    fontSize: 12,
    color: "#6c757d",
    marginBottom: 8,
  },
  progressSection: {
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 10,
    color: "#6c757d",
  },
  progressPercentage: {
    fontSize: 10,
    color: "#2599f7",
    fontWeight: "600",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#e9ecef",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: "45%",
  },
  metaIcon: {
    fontSize: 11,
    width: 16,
  },
  metaValue: {
    fontSize: 11,
    color: "#495057",
    flex: 1,
  },
  overdueText: {
    color: "#f72585",
  },
  daysRemaining: {
    fontSize: 10,
    color: "#6c757d",
    marginTop: 2,
  },
  expandButton: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    alignItems: "center",
  },
  expandButtonText: {
    fontSize: 11,
    color: "#2599f7",
    fontWeight: "500",
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  expandedSection: {
    marginBottom: 12,
  },
  expandedLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 6,
  },
  expandedText: {
    fontSize: 12,
    color: "#6c757d",
    lineHeight: 18,
  },
  detailsGrid: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: "#6c757d",
  },
  detailValue: {
    fontSize: 11,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
    backgroundColor: "#f5f5f5",
  },
  actionButtonIcon: {
    fontSize: 11,
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#666",
  },
  commentButton: {
    backgroundColor: "#e9ecef",
  },
  progressButton: {
    backgroundColor: "#e3f2fd",
  },
  completeButton: {
    backgroundColor: "#e8f5e9",
  },
  commentItem: {
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  commentUser: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2599f7",
  },
  commentTime: {
    fontSize: 8,
    color: "#999",
  },
  commentText: {
    fontSize: 11,
    color: "#333",
  },
  viewAllButton: {
    marginTop: 4,
    alignItems: "flex-end",
  },
  viewAllText: {
    fontSize: 11,
    color: "#2599f7",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9E9E9E",
    textAlign: "center",
    marginBottom: 16,
  },
  clearFiltersButton: {
    backgroundColor: "#2599f7",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    height: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  commentModal: {
    width: "95%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  taskTitleModal: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  commentsList: {
    maxHeight: 250,
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  saveButton: {
    backgroundColor: "#2599f7",
  },
  closeButton: {
    backgroundColor: "#2599f7",
    marginTop: 16,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 13,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  progressInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  progressInput: {
    width: 70,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    textAlign: "center",
  },
  progressPercent: {
    fontSize: 16,
    marginLeft: 6,
    color: "#666",
  },
  progressQuickButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  quickButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
  },
  quickButtonText: {
    fontSize: 11,
    color: "#666",
  },
  noComments: {
    textAlign: "center",
    color: "#999",
    padding: 20,
  },
  statsModalContent: {
    marginTop: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  statsSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  statBar: {
    marginBottom: 8,
  },
  statBarLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  statBarContainer: {
    height: 6,
    backgroundColor: "#e9ecef",
    borderRadius: 3,
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    borderRadius: 3,
  },
});
