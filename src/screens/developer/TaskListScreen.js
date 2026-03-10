// src/screens/developer/TaskListScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
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
import {
  getTasksByUser,
  updateTask
} from "../../utils/storage";

export default function TaskListScreen({ navigation, route }) {
  const { user: routeUser } = route.params || {};

  // Use route user if available, otherwise use context user
  const user = routeUser;

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
  const [sortBy, setSortBy] = useState("dueDate"); // dueDate, priority, status
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [projects, setProjects] = useState([]);

  console.log("🔍 TaskListScreen - user:", user); // Debug log

  useFocusEffect(
    useCallback(() => {
      if (user?.UserID || user?.id) {
        loadTasks();
      }
    }, [user]),
  );

  const loadTasks = async () => {
    const userId = user?.UserID || user?.id;
    if (!userId) {
      console.log("No user ID found");
      return;
    }
    console.log("Loading tasks for user:", userId);
    const userTasks = await getTasksByUser(userId);
    setTasks(userTasks);

    // Extract unique projects for filter
    const uniqueProjects = [
      ...new Set(userTasks.map((t) => t.projectName).filter(Boolean)),
    ];
    setProjects(uniqueProjects);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const updateTaskStatus = async (id, newStatus) => {
    Alert.alert(
      "Update Task Status",
      `Are you sure you want to mark this task as ${newStatus.replace("_", " ")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            const updated = await updateTask(id, {
              status: newStatus,
              ...(newStatus === "completed"
                ? { completedAt: new Date().toISOString() }
                : {}),
            });
            if (updated) {
              await loadTasks();
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

    const updated = await updateTask(selectedTask.id, {
      progress: progress,
      ...(progress === 100 ? { status: "completed" } : {}),
    });

    if (updated) {
      setProgressModal(false);
      setProgressValue("0");
      await loadTasks();
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    const task = selectedTask;
    const comments = task.comments || [];
    const updated = await updateTask(task.id, {
      comments: [
        ...comments,
        {
          id: Date.now().toString(),
          text: newComment,
          userId: user?.UserID || user?.id,
          userName: user?.FullName || user?.name || "User",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (updated) {
      setNewComment("");
      setCommentModal(false);
      await loadTasks();
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      case "low":
        return "#4CAF50";
      default:
        return "#999";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#ff9800";
      case "in_progress":
        return "#2196f3";
      case "completed":
        return "#4CAF50";
      case "blocked":
        return "#f44336";
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "in_progress":
        return "🔄";
      case "completed":
        return "✅";
      case "blocked":
        return "🚫";
      default:
        return "📋";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      case "blocked":
        return "Blocked";
      default:
        return status;
    }
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    if (diffDays === 0) return "Due today";
    return `${diffDays} days remaining`;
  };

  const getDueDateColor = (dueDate) => {
    if (!dueDate) return "#666";
    const days = getDaysRemaining(dueDate);
    if (days?.includes("Overdue")) return "#f44336";
    if (days?.includes("today")) return "#ff9800";
    return "#4CAF50";
  };

  const sortTasks = (tasksToSort) => {
    return [...tasksToSort].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "dueDate":
          comparison = new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
          break;
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison =
            (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case "status":
          const statusOrder = {
            pending: 1,
            in_progress: 2,
            blocked: 3,
            completed: 4,
          };
          comparison =
            (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
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
      if (filter === "blocked") return t.status === "blocked";
      return true;
    })
    .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
    .filter((t) => projectFilter === "all" || t.projectName === projectFilter)
    .filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description?.toLowerCase().includes(search.toLowerCase()) ||
        t.projectName?.toLowerCase().includes(search.toLowerCase()),
    );

  const sortedAndFilteredTasks = sortTasks(filteredTasks);

  // If no user is available, show login prompt
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Please log in again</Text>
          <TouchableOpacity onPress={() => navigation.replace("Login")}>
            <Text style={styles.logout}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with User Info */}
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
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter Toggle */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.search}
            placeholder="Search tasks, projects..."
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

      {/* Advanced Filters */}
      {showFilters && (
        <View style={styles.advancedFilters}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChips}>
              <Text style={styles.filterLabel}>Sort by:</Text>
              <TouchableOpacity
                style={[styles.chip, sortBy === "dueDate" && styles.chipActive]}
                onPress={() => setSortBy("dueDate")}
              >
                <Text
                  style={[
                    styles.chipText,
                    sortBy === "dueDate" && styles.chipTextActive,
                  ]}
                >
                  Due Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chip,
                  sortBy === "priority" && styles.chipActive,
                ]}
                onPress={() => setSortBy("priority")}
              >
                <Text
                  style={[
                    styles.chipText,
                    sortBy === "priority" && styles.chipTextActive,
                  ]}
                >
                  Priority
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, sortBy === "status" && styles.chipActive]}
                onPress={() => setSortBy("status")}
              >
                <Text
                  style={[
                    styles.chipText,
                    sortBy === "status" && styles.chipTextActive,
                  ]}
                >
                  Status
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, sortBy === "title" && styles.chipActive]}
                onPress={() => setSortBy("title")}
              >
                <Text
                  style={[
                    styles.chipText,
                    sortBy === "title" && styles.chipTextActive,
                  ]}
                >
                  Title
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.orderChip}
                onPress={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                <Text style={styles.orderChipText}>
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterChips}>
              <Text style={styles.filterLabel}>Priority:</Text>
              {["all", "high", "medium", "low"].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.chip,
                    priorityFilter === p && styles.chipActive,
                  ]}
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
                {projects.map((project) => (
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
                      {project}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        <View style={styles.filters}>
          {["all", "pending", "in_progress", "blocked", "completed"].map(
            (f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filter, filter === f && styles.filterActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={styles.filterIcon}>{getStatusIcon(f)}</Text>
                <Text
                  style={[
                    styles.filterText,
                    filter === f && styles.filterTextActive,
                  ]}
                >
                  {f === "in_progress"
                    ? "In Progress"
                    : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      </ScrollView>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.statCardPending]}>
          <Text style={styles.statNumber}>
            {tasks.filter((t) => t.status !== "completed").length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, styles.statCardCompleted]}>
          <Text style={styles.statNumber}>
            {tasks.filter((t) => t.status === "completed").length}
          </Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={[styles.statCard, styles.statCardOverdue]}>
          <Text style={styles.statNumber}>
            {
              tasks.filter((t) => {
                if (!t.dueDate || t.status === "completed") return false;
                return new Date(t.dueDate) < new Date();
              }).length
            }
          </Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      {/* Task List */}
      <FlatList
        data={sortedAndFilteredTasks}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              setExpandedTask(expandedTask === item.id ? null : item.id)
            }
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
                {/* Header with Icons */}
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
                {item.projectName && (
                  <Text style={styles.projectName}>📁 {item.projectName}</Text>
                )}

                {/* Description (show in expanded mode) */}
                {expandedTask === item.id && item.description && (
                  <Text style={styles.description}>{item.description}</Text>
                )}

                {/* Progress Bar */}
                {item.progress !== undefined && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${item.progress}%` },
                          item.progress === 100 && styles.progressComplete,
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{item.progress}%</Text>
                  </View>
                )}

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

                  {item.assignedBy && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>👤</Text>
                      <Text style={styles.assignedBy}>
                        By: {item.assignedBy}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {item.status !== "completed" && (
                    <>
                      {item.status === "pending" && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.startButton]}
                          onPress={() =>
                            updateTaskStatus(item.id, "in_progress")
                          }
                        >
                          <Text style={styles.actionButtonIcon}>▶️</Text>
                          <Text style={styles.actionButtonText}>Start</Text>
                        </TouchableOpacity>
                      )}

                      {item.status === "in_progress" && (
                        <>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.completeButton]}
                            onPress={() =>
                              updateTaskStatus(item.id, "completed")
                            }
                          >
                            <Text style={styles.actionButtonIcon}>✅</Text>
                            <Text style={styles.actionButtonText}>
                              Complete
                            </Text>
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
                          onPress={() =>
                            updateTaskStatus(item.id, "in_progress")
                          }
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
                      {item.comments[item.comments.length - 1].text.substring(
                        0,
                        40,
                      )}
                      {item.comments[item.comments.length - 1].text.length > 40
                        ? "..."
                        : ""}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
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
                : "You don't have any tasks yet. They will appear here when assigned."}
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
                placeholder="0"
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
                onPress={() => {
                  setProgressModal(false);
                  setProgressValue("0");
                }}
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

            {/* Comments List */}
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

            {/* Add Comment */}
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  greeting: {
    fontSize: 14,
    color: "#666",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  logout: {
    color: "#f44336",
    fontWeight: "600",
  },

  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: "#999",
  },
  search: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterToggle: {
    width: 48,
    height: 48,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  filterToggleActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  filterToggleIcon: {
    fontSize: 20,
  },

  advancedFilters: {
    backgroundColor: "#fff",
    marginTop: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  filterChips: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: "#4CAF50",
  },
  chipText: {
    fontSize: 12,
    color: "#666",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  orderChip: {
    width: 32,
    height: 32,
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  orderChipText: {
    fontSize: 16,
    color: "#666",
  },

  filtersContainer: {
    maxHeight: 50,
    marginTop: 8,
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  filter: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 6,
  },
  filterActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  filterIcon: {
    fontSize: 14,
  },
  filterText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
  },

  statsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statCardPending: {
    backgroundColor: "#e3f2fd",
  },
  statCardCompleted: {
    backgroundColor: "#e8f5e9",
  },
  statCardOverdue: {
    backgroundColor: "#ffebee",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },

  taskCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  statusBar: {
    width: 6,
    height: "auto",
  },

  taskContent: {
    flex: 1,
    padding: 16,
  },

  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIcon: {
    fontSize: 16,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },

  projectName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },

  description: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    lineHeight: 18,
  },

  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  progressComplete: {
    backgroundColor: "#4CAF50",
  },
  progressText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
    minWidth: 35,
  },

  metaContainer: {
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 6,
    color: "#999",
  },
  dueDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  assignedBy: {
    fontSize: 11,
    color: "#666",
  },

  actionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
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
    fontSize: 12,
  },
  actionButtonText: {
    fontSize: 11,
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 6,
  },
  commentsIcon: {
    fontSize: 11,
    color: "#999",
  },
  commentsPreviewText: {
    flex: 1,
    fontSize: 11,
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  taskTitleModal: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },

  progressInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  progressInput: {
    width: 80,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
  },
  progressPercent: {
    fontSize: 18,
    marginLeft: 8,
    color: "#666",
  },

  progressQuickButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  quickButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
  },
  quickButtonText: {
    fontSize: 12,
    color: "#666",
  },

  commentsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  commentItem: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  commentTime: {
    fontSize: 10,
    color: "#999",
  },
  commentText: {
    fontSize: 13,
    color: "#333",
  },
  noComments: {
    textAlign: "center",
    color: "#999",
    padding: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
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
    padding: 14,
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
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
