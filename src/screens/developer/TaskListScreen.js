// src/screens/developer/TaskListScreen.js
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState, useRef } from "react";
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { getRequest, putRequest, uploadImage } from "../../services/apiService";

export default function TaskListScreen({ navigation, route }) {
  const { user } = route.params || {};

  // State declarations
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentModal, setCommentModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [progressModal, setProgressModal] = useState(false);
  const [progressValue, setProgressValue] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [progressSubmitting, setProgressSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const flatListRef = useRef(null);

  // ==================== HELPER FUNCTIONS ====================

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#ef4444";
      case "medium":
      case "normal":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#9ca3af";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "#f59e0b";
      case "in_progress":
        return "#3b82f6";
      case "completed":
        return "#10b981";
      case "blocked":
      case "onhold":
        return "#ef4444";
      default:
        return "#9ca3af";
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
        return status || "Unknown";
    }
  };

  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    try {
      const today = new Date();
      const due = new Date(dueDate);
      const diffTime = due - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
      if (diffDays === 0) return "Due today";
      return `${diffDays}d left`;
    } catch (e) {
      return null;
    }
  };

  const getDueDateColor = (dueDate) => {
    if (!dueDate) return "#6b7280";
    const days = getDaysRemaining(dueDate);
    if (days?.includes("Overdue")) return "#ef4444";
    if (days?.includes("today")) return "#f59e0b";
    return "#10b981";
  };

  // ==================== IMAGE PICKER FUNCTIONS ====================
  
  const handleImagePick = () => {
    Alert.alert(
      "Add Image",
      "Choose source",
      [
        { text: "Camera", onPress: takePhoto },
        { text: "Gallery", onPress: pickImage },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const pickImage = () => {
    const options = { 
      mediaType: 'photo', 
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert("Error", response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        await uploadTaskImage(asset);
      }
    });
  };

  const takePhoto = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      saveToPhotos: true,
    };

    launchCamera(options, async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert("Error", response.errorMessage);
        return;
      }

      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        await uploadTaskImage(asset);
      }
    });
  };

  const uploadTaskImage = async (asset) => {
    if (!asset || !selectedTask) return;

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append("image", {
        uri: asset.uri,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `task_${Date.now()}.jpg`,
      });
      formData.append("taskId", selectedTask.id);

      const response = await uploadImage("/task/upload-image", formData);
      
      const updatedImages = [...(selectedTask.images || []), response.imageUrl];
      
      await putRequest(`/task/update-task/${selectedTask.id}`, {
        images: updatedImages,
      });
      
      await loadTasks();
      Alert.alert("Success", "Image uploaded successfully");
    } catch (error) {
      Alert.alert("Error", "Upload failed");
    } finally {
      setUploadingImage(false);
    }
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
        images: task.Images || [],
      }));

      setTasks(transformedTasks);
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";

    Alert.alert(
      newStatus === "completed" ? "Complete Task" : "Reopen Task",
      newStatus === "completed"
        ? `Mark "${task.title}" as completed?`
        : `Reopen "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await putRequest(`/task/update-task/${task.id}`, {
                Status: newStatus,
                ...(newStatus === "completed"
                  ? { CompletedAt: new Date().toISOString(), Progress: 100 }
                  : { CompletedAt: null }),
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
      setProgressSubmitting(true);
      await putRequest(`/task/update-progress/${selectedTask.id}`, {
        progress: progress,
      });
      setProgressModal(false);
      setProgressValue("0");
      await loadTasks();
    } catch (error) {
      Alert.alert("Error", "Failed to update progress");
    } finally {
      setProgressSubmitting(false);
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
        userRole: "Developer",
        timestamp: new Date().toISOString(),
      },
    ];

    try {
      setCommentSubmitting(true);
      await putRequest(`/task/update-task/${task.id}`, {
        Comments: updatedComments,
      });
      setNewComment("");
      await loadTasks();
      setSelectedTask({
        ...selectedTask,
        comments: updatedComments,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  // ==================== FILTER FUNCTIONS ====================

  const filteredTasks = tasks
    .filter((t) => {
      if (filter === "pending") return t.status !== "completed" && t.status !== "in_progress";
      if (filter === "in_progress") return t.status === "in_progress";
      if (filter === "completed") return t.status === "completed";
      return true;
    })
    .filter(
      (t) =>
        (t.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (t.projectName || "").toLowerCase().includes(search.toLowerCase()),
    );

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

  const ChatMessage = ({ message, isOwn }) => (
    <View style={[styles.chatMessage, isOwn ? styles.ownMessage : styles.otherMessage]}>
      <View style={styles.messageHeader}>
        <Text style={[styles.messageUser, isOwn && styles.ownMessageText]}>{message.userName}</Text>
        <Text style={[styles.messageRole, isOwn && styles.ownMessageRole]}>{message.userRole || "Developer"}</Text>
        <Text style={[styles.messageTime, isOwn && styles.ownMessageText]}>{message.time || "Just now"}</Text>
      </View>
      <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>{message.text}</Text>
    </View>
  );

  const renderTaskCard = ({ item }) => (
    <View
      style={[
        styles.taskCard,
        item.status === "completed" && styles.completedTaskCard,
      ]}
    >
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
      
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <TouchableOpacity onPress={() => toggleTaskCompletion(item)} style={styles.checkbox}>
            <View style={[styles.checkboxBox, item.status === "completed" && styles.checkboxChecked]}>
              {item.status === "completed" && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.taskTitle, item.status === "completed" && styles.completedTitle]}>
            {item.title}
          </Text>
          
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>

        <Text style={styles.projectName}>{item.projectName}</Text>

        {item.description && (
          <Text style={[styles.description, item.status === "completed" && styles.completedText]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Image Previews */}
        {item.images && item.images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
            {item.images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.previewImage} />
            ))}
          </ScrollView>
        )}

        {item.status !== "completed" && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${item.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>{item.progress || 0}%</Text>
          </View>
        )}

        <View style={styles.metaContainer}>
          {item.dueDate && (
            <Text style={[styles.dueDate, { color: getDueDateColor(item.dueDate) }]}>
              {getDaysRemaining(item.dueDate)}
            </Text>
          )}
          <Text style={styles.assignedBy}>Created by {item.assignedBy}</Text>
        </View>

        <View style={styles.actionButtons}>
          {item.status !== "completed" && (
            <>
              <TouchableOpacity
                style={styles.progressButton}
                onPress={() => {
                  setSelectedTask(item);
                  setProgressValue(item.progress?.toString() || "0");
                  setProgressModal(true);
                }}
              >
                <Text style={styles.buttonText}>Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageButton}
                onPress={() => {
                  setSelectedTask(item);
                  handleImagePick();
                }}
                disabled={uploadingImage}
              >
                <Text style={styles.buttonText}>
                  {uploadingImage && selectedTask?.id === item.id ? "Uploading..." : "Add Image"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => {
              setSelectedTask(item);
              setCommentModal(true);
            }}
          >
            <Text style={styles.buttonText}>
              Chat {item.comments?.length ? `(${item.comments.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const StatCard = ({ label, value, color }) => (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.replace("Login")}>
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={loadTasks}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.FullName || user?.name || "Developer"}</Text>
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              { text: "Logout", style: "destructive", onPress: () => navigation.replace("Login") },
            ]);
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={styles.clearIcon}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {["all", "pending", "in_progress", "completed"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "all" ? "All" : f === "in_progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <StatCard label="Total" value={tasks.length} color="#3b82f6" />
        <StatCard label="Active" value={tasks.filter((t) => t.status !== "completed").length} color="#f59e0b" />
        <StatCard label="Completed" value={tasks.filter((t) => t.status === "completed").length} color="#10b981" />
      </View>

      {/* Task List */}
      <FlatList
        ref={flatListRef}
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No tasks found</Text>
            <Text style={styles.emptyText}>
              {search ? "Try adjusting your search" : "You're all caught up!"}
            </Text>
          </View>
        }
      />

      {/* Progress Modal */}
      <Modal visible={progressModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Progress</Text>
            <Text style={styles.modalSubtitle}>{selectedTask?.title}</Text>

            <View style={styles.progressInputContainer}>
              <TextInput
                style={styles.progressInput}
                value={progressValue}
                onChangeText={setProgressValue}
                keyboardType="numeric"
                maxLength={3}
                editable={!progressSubmitting}
              />
              <Text style={styles.progressPercent}>%</Text>
            </View>

            <View style={styles.quickButtons}>
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
              <TouchableOpacity style={styles.cancelButton} onPress={() => setProgressModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={updateTaskProgress} disabled={progressSubmitting}>
                {progressSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chat Modal - Teams Style */}
      <Modal visible={commentModal} animationType="slide">
        <SafeAreaView style={styles.chatModalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.chatContainer}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.chatHeader}>
              <TouchableOpacity onPress={() => setCommentModal(false)} style={styles.chatBackButton}>
                <Text style={styles.chatBackText}>←</Text>
              </TouchableOpacity>
              <View style={styles.chatHeaderInfo}>
                <Text style={styles.chatHeaderTitle}>{selectedTask?.title}</Text>
                <Text style={styles.chatHeaderSubtitle}>
                  {selectedTask?.projectName} • {getStatusText(selectedTask?.status)}
                </Text>
              </View>
              <View style={styles.chatHeaderPlaceholder} />
            </View>

            <FlatList
              data={selectedTask?.comments || []}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <ChatMessage 
                  message={{
                    ...item,
                    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }} 
                  isOwn={item.userRole === "Developer" || item.userName === user?.FullName}
                />
              )}
              contentContainerStyle={styles.chatMessages}
              onLayout={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }}
              ListEmptyComponent={
                <View style={styles.chatEmpty}>
                  <Text style={styles.chatEmptyText}>No messages yet</Text>
                  <Text style={styles.chatEmptySubtext}>Start the conversation</Text>
                </View>
              }
            />

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.chatSendButton, (!newComment.trim() || commentSubmitting) && styles.chatSendButtonDisabled]}
                onPress={addComment}
                disabled={commentSubmitting || !newComment.trim()}
              >
                {commentSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.chatSendText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  greeting: {
    fontSize: 13,
    color: "#6b7280",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  clearIcon: {
    fontSize: 18,
    color: "#9ca3af",
    padding: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  filterText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: "hidden",
  },
  completedTaskCard: {
    opacity: 0.75,
    backgroundColor: "#fafafa",
  },
  statusIndicator: {
    width: 4,
  },
  taskContent: {
    flex: 1,
    padding: 14,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  checkbox: {
    padding: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  checkboxChecked: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  checkboxCheck: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  completedTitle: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "600",
  },
  projectName: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
  },
  description: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 16,
  },
  completedText: {
    color: "#9ca3af",
  },
  imagePreviewContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 8,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "500",
    minWidth: 32,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dueDate: {
    fontSize: 10,
    fontWeight: "500",
  },
  assignedBy: {
    fontSize: 10,
    color: "#9ca3af",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  progressButton: {
    flex: 1,
    backgroundColor: "#3b82f6",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  imageButton: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  chatButton: {
    flex: 1,
    backgroundColor: "#8b5cf6",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ffffff",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 20,
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
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: 18,
    textAlign: "center",
    color: "#111827",
  },
  progressPercent: {
    fontSize: 16,
    marginLeft: 8,
    color: "#6b7280",
  },
  quickButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  quickButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
  },
  quickButtonText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#3b82f6",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontWeight: "500",
    fontSize: 14,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "500",
    fontSize: 14,
  },
  // Chat Modal Styles
  chatModalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  chatBackButton: {
    padding: 8,
  },
  chatBackText: {
    fontSize: 24,
    color: "#3b82f6",
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: "center",
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  chatHeaderSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  chatHeaderPlaceholder: {
    width: 40,
  },
  chatMessages: {
    padding: 16,
    flexGrow: 1,
  },
  chatMessage: {
    maxWidth: "85%",
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
  },
  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
    flexWrap: "wrap",
  },
  messageUser: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  ownMessageText: {
    color: "#ffffff",
  },
  ownMessageRole: {
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "#ffffff",
  },
  messageRole: {
    fontSize: 10,
    color: "#9ca3af",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  messageTime: {
    fontSize: 10,
    color: "#9ca3af",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#111827",
  },
  chatEmpty: {
    alignItems: "center",
    paddingVertical: 60,
  },
  chatEmptyText: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 8,
  },
  chatEmptySubtext: {
    fontSize: 13,
    color: "#9ca3af",
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
    color: "#111827",
  },
  chatSendButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: "center",
  },
  chatSendButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  chatSendText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
});