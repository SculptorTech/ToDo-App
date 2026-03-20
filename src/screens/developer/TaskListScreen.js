// src/screens/developer/TaskListScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getRequest, putRequest } from "../../services/apiService";

export default function TaskListScreen({ navigation, route }) {
  const { user } = route.params || {};

  // All state declarations
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentModal, setCommentModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
  const [progressModal, setProgressModal] = useState(false);
  const [progressValue, setProgressValue] = useState("0");
  const [sortBy, setSortBy] = useState("dueDate");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==================== HELPER FUNCTIONS ====================

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#f44336";
      case "medium":
      case "normal":
        return "#ff9800";
      case "low":
        return "#4CAF50";
      default:
        return "#999";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "#ff9800";
      case "in_progress":
        return "#2196f3";
      case "completed":
        return "#4CAF50";
      case "blocked":
      case "onhold":
        return "#f44336";
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "⏳";
      case "in_progress":
        return "🔄";
      case "completed":
        return "✅";
      case "blocked":
      case "onhold":
        return "🚫";
      default:
        return "📋";
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "blocked":
        return "Blocked";
      case "onhold":
        return "On Hold";
      default:
        return status;
    }
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
      return "Invalid date";
    }
  };

  const getDueDateColor = (dueDate) => {
    if (!dueDate) return "#666";
    const days = getDaysRemaining(dueDate);
    if (days?.includes("Overdue")) return "#f44336";
    if (days?.includes("today")) return "#ff9800";
    return "#4CAF50";
  };

  // ==================== API FUNCTIONS ====================

  const loadTasks = async () => {
    const userId = user?.UserID || user?.id;
    if (!userId) {
      setError("No user ID found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getRequest("/task/get-tasks", {
        assignedTo: userId,
      });

      let userTasks = [];
      if (response.tasks) {
        userTasks = response.tasks;
      } else if (Array.isArray(response)) {
        userTasks = response;
      }

      // Transform tasks
      const transformedTasks = userTasks.map((task) => ({
        id: task._id || task.TaskId || task.id,
        title: task.Title || task.title || "Untitled Task",
        description: task.Description || task.description || "",
        priority: task.Priority || task.priority || "Normal",
        status: task.Status || task.status || "pending",
        dueDate: task.DueDate || task.dueDate,
        projectName: task.ProjectName || task.projectName || "No Project",
        assignedBy: task.CreatedByName || task.createdByName || "Manager",
        progress: task.Progress || 0,
        comments: task.Comments || [],
      }));

      setTasks(transformedTasks);

      // Update projects list
      const uniqueProjects = [
        ...new Set(transformedTasks.map((t) => t.projectName).filter(Boolean)),
      ];
      setProjects(uniqueProjects);
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (id, newStatus) => {
    Alert.alert(
      "Update Task Status",
      `Mark task as ${getStatusText(newStatus)}?`,
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
              await loadTasks();
            } catch (error) {
              Alert.alert("Error", "Failed to update task status");
            }
          },
        },
      ],
    );
  };

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
      await loadTasks();
    } catch (error) {
      Alert.alert("Error", "Failed to update progress");
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    const task = selectedTask;
    const comments = task.comments || [];
    const updatedComments = [
      ...comments,
      {
        id: Date.now().toString(),
        text: newComment,
        userName: user?.FullName || user?.name || "Developer",
        timestamp: new Date().toISOString(),
      },
    ];

    try {
      await putRequest(`/task/update-task/${task.id}`, {
        Comments: updatedComments,
      });
      setNewComment("");
      setCommentModal(false);
      await loadTasks();
    } catch (error) {
      Alert.alert("Error", "Failed to add comment");
    }
  };

  // ==================== FILTER AND SORT FUNCTIONS ====================

  const sortTasks = (tasksToSort) => {
    return [...tasksToSort].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "dueDate":
          comparison = new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, normal: 2, low: 1 };
          comparison =
            (priorityOrder[b.priority?.toLowerCase()] || 0) -
            (priorityOrder[a.priority?.toLowerCase()] || 0);
          break;
        case "status":
          const statusOrder = {
            pending: 1,
            in_progress: 2,
            blocked: 3,
            onhold: 3,
            completed: 4,
          };
          comparison =
            (statusOrder[a.status?.toLowerCase()] || 0) -
            (statusOrder[b.status?.toLowerCase()] || 0);
          break;
        case "title":
          comparison = (a.title || "").localeCompare(b.title || "");
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  };

  const filteredTasks = tasks
    .filter((t) => {
      if (filter === "pending") return t.status !== "completed";
      if (filter === "in_progress") return t.status === "in_progress";
      if (filter === "completed") return t.status === "completed";
      if (filter === "blocked")
        return t.status === "blocked" || t.status === "onhold";
      return true;
    })
    .filter(
      (t) =>
        priorityFilter === "all" ||
        t.priority?.toLowerCase() === priorityFilter,
    )
    .filter((t) => projectFilter === "all" || t.projectName === projectFilter)
    .filter(
      (t) =>
        (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.projectName || "").toLowerCase().includes(search.toLowerCase()),
    );

  const sortedAndFilteredTasks = sortTasks(filteredTasks);

  // ==================== LOAD DATA ON FOCUS ====================

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [user]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderTaskCard = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setExpandedTask(expandedTask === item.id ? null : item.id)}
    >
      <View style={styles.taskCard}>
        {/* Status Bar */}
        <View
          style={[
            styles.statusBar,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        />

        <View style={styles.taskContent}>
          {/* Header */}
          <View style={styles.taskHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.statusIcon}>
                {getStatusIcon(item.status)}
              </Text>
              <Text style={styles.taskTitle}>{item.title}</Text>
            </View>
            {item.priority && (
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(item.priority) },
                ]}
              >
                <Text style={styles.priorityText}>{item.priority}</Text>
              </View>
            )}
          </View>

          {/* Project Name */}
          <Text style={styles.projectName}>📁 {item.projectName}</Text>

          {/* Description (expanded) */}
          {expandedTask === item.id && item.description && (
            <Text style={styles.description}>{item.description}</Text>
          )}

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${item.progress || 0}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{item.progress || 0}%</Text>
          </View>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            {item.dueDate && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text
                  style={[
                    styles.dueDate,
                    { color: getDueDateColor(item.dueDate) },
                  ]}
                >
                  {getDaysRemaining(item.dueDate)}
                </Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>👤</Text>
              <Text style={styles.assignedBy}>By: {item.assignedBy}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {item.status !== "completed" && (
              <>
                {item.status === "pending" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={() => updateTaskStatus(item.id, "in_progress")}
                  >
                    <Text style={styles.actionButtonIcon}>▶️</Text>
                    <Text style={styles.actionButtonText}>Start</Text>
                  </TouchableOpacity>
                )}

                {item.status === "in_progress" && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => updateTaskStatus(item.id, "completed")}
                    >
                      <Text style={styles.actionButtonIcon}>✅</Text>
                      <Text style={styles.actionButtonText}>Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.blockButton]}
                      onPress={() => updateTaskStatus(item.id, "blocked")}
                    >
                      <Text style={styles.actionButtonIcon}>🚫</Text>
                      <Text style={styles.actionButtonText}>Block</Text>
                    </TouchableOpacity>
                  </>
                )}

                {item.status === "blocked" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.resumeButton]}
                    onPress={() => updateTaskStatus(item.id, "in_progress")}
                  >
                    <Text style={styles.actionButtonIcon}>🔄</Text>
                    <Text style={styles.actionButtonText}>Resume</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.progressButton]}
                  onPress={() => {
                    setSelectedTask(item);
                    setProgressValue(item.progress?.toString() || "0");
                    setProgressModal(true);
                  }}
                >
                  <Text style={styles.actionButtonIcon}>📊</Text>
                  <Text style={styles.actionButtonText}>Progress</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.commentButton]}
              onPress={() => {
                setSelectedTask(item);
                setCommentModal(true);
              }}
            >
              <Text style={styles.actionButtonIcon}>💬</Text>
              <Text style={styles.actionButtonText}>
                Comments{" "}
                {item.comments?.length ? `(${item.comments.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Comments Preview */}
          {item.comments && item.comments.length > 0 && (
            <View style={styles.commentsPreview}>
              <Text style={styles.commentsIcon}>💬</Text>
              <Text style={styles.commentsPreviewText}>
                {item.comments[item.comments.length - 1].text.substring(0, 40)}
                {item.comments[item.comments.length - 1].text.length > 40
                  ? "..."
                  : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // ==================== LOADING/ERROR STATES ====================

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>No User Data</Text>
          <Text style={styles.errorText}>Please log in again</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.replace("Login")}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading your tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={loadTasks}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user?.FullName || user?.name || "Developer"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.replace("Login")}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#999"
          />
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

      {/* Filters */}
      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
        >
          <View style={styles.filterChips}>
            <Text style={styles.filterLabel}>Sort:</Text>
            {["dueDate", "priority", "status", "title"].map((s) => (
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
                  key={project}
                  style={[
                    styles.chip,
                    projectFilter === project && styles.chipActive,
                  ]}
                  onPress={() => setProjectFilter(project)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      projectFilter === project && styles.chipTextActive,
                    ]}
                  >
                    {project.length > 10
                      ? project.substring(0, 10) + "..."
                      : project}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusScroll}
      >
        <View style={styles.statusFilters}>
          {["all", "pending", "in_progress", "blocked", "completed"].map(
            (f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.statusFilter,
                  filter === f && styles.statusFilterActive,
                ]}
                onPress={() => setFilter(f)}
              >
                <Text style={styles.filterIcon}>{getStatusIcon(f)}</Text>
                <Text
                  style={[
                    styles.statusFilterText,
                    filter === f && styles.statusFilterTextActive,
                  ]}
                >
                  {f === "in_progress"
                    ? "In Progress"
                    : f === "blocked"
                      ? "Blocked"
                      : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, styles.pendingBox]}>
          <Text style={styles.statNumber}>
            {tasks.filter((t) => t.status !== "completed").length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statBox, styles.completedBox]}>
          <Text style={styles.statNumber}>
            {tasks.filter((t) => t.status === "completed").length}
          </Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
      </View>

      {/* Task List */}
      <FlatList
        data={sortedAndFilteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptyText}>
              {search ||
              filter !== "all" ||
              priorityFilter !== "all" ||
              projectFilter !== "all"
                ? "Try adjusting your filters"
                : "You don't have any tasks assigned yet."}
            </Text>
          </View>
        }
      />

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

      {/* Comment Modal */}
      <Modal visible={commentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.commentModal]}>
            <Text style={styles.modalTitle}>Comments</Text>
            <Text style={styles.taskTitleModal}>{selectedTask?.title}</Text>

            <ScrollView style={styles.commentsList}>
              {selectedTask?.comments?.length > 0 ? (
                selectedTask.comments.map((comment) => (
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
                onPress={() => setCommentModal(false)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  greeting: {
    fontSize: 14,
    color: "#666",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  logoutButton: {
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  logoutText: {
    color: "#f44336",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
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
  },
  filterToggle: {
    width: 44,
    height: 44,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterToggleActive: {
    backgroundColor: "#4CAF50",
  },
  filterToggleIcon: {
    fontSize: 18,
  },
  filtersScroll: {
    maxHeight: 50,
    paddingHorizontal: 16,
  },
  filterChips: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginRight: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: "#4CAF50",
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
  statusScroll: {
    maxHeight: 45,
    paddingHorizontal: 16,
  },
  statusFilters: {
    flexDirection: "row",
    gap: 8,
  },
  statusFilter: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 4,
  },
  statusFilterActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  statusFilterText: {
    fontSize: 12,
    color: "#666",
  },
  statusFilterTextActive: {
    color: "#fff",
  },
  filterIcon: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    elevation: 2,
  },
  pendingBox: {
    backgroundColor: "#e3f2fd",
  },
  completedBox: {
    backgroundColor: "#e8f5e9",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  statusBar: {
    width: 5,
    height: "auto",
  },
  taskContent: {
    flex: 1,
    padding: 14,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusIcon: {
    fontSize: 14,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "600",
  },
  projectName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    lineHeight: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  progressText: {
    fontSize: 10,
    color: "#666",
    minWidth: 30,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaIcon: {
    fontSize: 11,
    color: "#999",
  },
  dueDate: {
    fontSize: 10,
    fontWeight: "500",
  },
  assignedBy: {
    fontSize: 10,
    color: "#666",
  },
  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    gap: 3,
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
  startButton: {
    backgroundColor: "#e3f2fd",
  },
  completeButton: {
    backgroundColor: "#e8f5e9",
  },
  blockButton: {
    backgroundColor: "#ffebee",
  },
  resumeButton: {
    backgroundColor: "#fff3e0",
  },
  progressButton: {
    backgroundColor: "#f3e5f5",
  },
  commentButton: {
    backgroundColor: "#f5f5f5",
  },
  commentsPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 5,
  },
  commentsIcon: {
    fontSize: 10,
    color: "#999",
  },
  commentsPreviewText: {
    flex: 1,
    fontSize: 10,
    color: "#999",
    fontStyle: "italic",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
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
    marginBottom: 20,
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
  commentsList: {
    maxHeight: 250,
    marginBottom: 16,
  },
  commentItem: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  commentUser: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4CAF50",
  },
  commentTime: {
    fontSize: 9,
    color: "#999",
  },
  commentText: {
    fontSize: 12,
    color: "#333",
  },
  noComments: {
    textAlign: "center",
    color: "#999",
    padding: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 16,
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
    backgroundColor: "#4CAF50",
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
});
