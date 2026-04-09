// src/screens/developer/TaskListScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { getRequest, putRequest, uploadImage } from "../../services/apiService";

const { width } = Dimensions.get("window");

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
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
    Alert.alert("Add Image", "Choose source", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickImage = () => {
    const options = {
      mediaType: "photo",
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
      mediaType: "photo",
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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
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
      if (filter === "pending")
        return t.status !== "completed" && t.status !== "in_progress";
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
    <View
      style={[
        styles.chatMessage,
        isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      <View style={styles.messageHeader}>
        <View style={styles.messageUserInfo}>
          <View
            style={[styles.messageAvatar, isOwn && styles.ownMessageAvatar]}
          >
            <Text style={styles.messageAvatarText}>
              {message.userName?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View>
            <Text style={[styles.messageUser, isOwn && styles.ownMessageText]}>
              {message.userName}
            </Text>
            <Text style={[styles.messageRole, isOwn && styles.ownMessageRole]}>
              {message.userRole || "Developer"}
            </Text>
          </View>
        </View>
        <Text style={[styles.messageTime, isOwn && styles.ownMessageText]}>
          {message.time || "Just now"}
        </Text>
      </View>
      <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
        {message.text}
      </Text>
    </View>
  );

  const StatCard = ({ label, value, icon, color }) => (
    <LinearGradient
      colors={["#fff", "#fff"]}
      style={[styles.statCard, { borderTopColor: color }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.statIconWrapper, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </LinearGradient>
  );

  const renderTaskCard = ({ item, index }) => (
    <Animated.View
      style={[
        styles.taskCard,
        item.status === "completed" && styles.completedTaskCard,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={[getStatusColor(item.status) + "15", "#fff"]}
        style={styles.taskCardGradient}
      >
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        />

        <View style={styles.taskContent}>
          <View style={styles.taskHeader}>
            <TouchableOpacity
              onPress={() => toggleTaskCompletion(item)}
              style={styles.checkbox}
            >
              <LinearGradient
                colors={
                  item.status === "completed"
                    ? ["#10b981", "#059669"]
                    : ["#fff", "#fff"]
                }
                style={[
                  styles.checkboxBox,
                  item.status === "completed" && styles.checkboxChecked,
                ]}
              >
                {item.status === "completed" && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text
              style={[
                styles.taskTitle,
                item.status === "completed" && styles.completedTitle,
              ]}
            >
              {item.title}
            </Text>

            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(item.priority) },
              ]}
            >
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          </View>

          <View style={styles.projectInfo}>
            <Ionicons name="folder-outline" size={12} color="#6c757d" />
            <Text style={styles.projectName}>{item.projectName}</Text>
          </View>

          {item.description && (
            <Text
              style={[
                styles.description,
                item.status === "completed" && styles.completedText,
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}

          {/* Image Previews */}
          {item.images && item.images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagePreviewContainer}
            >
              {item.images.slice(0, 3).map((img, idx) => (
                <Image
                  key={idx}
                  source={{ uri: img }}
                  style={styles.previewImage}
                />
              ))}
              {item.images.length > 3 && (
                <View style={styles.moreImagesBadge}>
                  <Text style={styles.moreImagesText}>
                    +{item.images.length - 3}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          {item.status !== "completed" && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={["#3b82f6", "#2563eb"]}
                  style={[
                    styles.progressBarFill,
                    { width: `${item.progress || 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{item.progress || 0}%</Text>
            </View>
          )}

          <View style={styles.metaContainer}>
            {item.dueDate && (
              <View style={styles.dueDateContainer}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={getDueDateColor(item.dueDate)}
                />
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
            <View style={styles.assignedByContainer}>
              <Ionicons name="person-outline" size={12} color="#9ca3af" />
              <Text style={styles.assignedBy}>
                Created by {item.assignedBy}
              </Text>
            </View>
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
                  <Ionicons name="trending-up" size={14} color="#fff" />
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
                  <Ionicons name="image-outline" size={14} color="#fff" />
                  <Text style={styles.buttonText}>
                    {uploadingImage && selectedTask?.id === item.id
                      ? "Uploading..."
                      : "Add Image"}
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
              <Ionicons name="chatbubble-outline" size={14} color="#fff" />
              <Text style={styles.buttonText}>
                Chat {item.comments?.length ? `(${item.comments.length})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="person-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>User not found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.replace("Login")}
          >
            <LinearGradient
              colors={["#4361ee", "#3b52d4"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Back to Login</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4361ee" />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={loadTasks}>
            <LinearGradient
              colors={["#4361ee", "#3b52d4"]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#f8f9fa", "#f0f2f5"]}
        style={styles.gradientBackground}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {user?.FullName || user?.name || "Developer"}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Developer</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.drawerLogoutButton}
            onPress={() => navigation.replace("Login")}
          >
            <View style={styles.drawerLogoutIcon}>
              <Text style={styles.drawerLogoutIconText}>⏻</Text>
            </View>
            <Text style={styles.drawerLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={["#fff", "#fff"]}
            style={styles.searchWrapper}
          >
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tasks..."
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={setSearch}
            />
            {search !== "" && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          {["all", "pending", "in_progress", "completed"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filter === f && styles.filterChipActive,
              ]}
              onPress={() => setFilter(f)}
            >
              <LinearGradient
                colors={
                  filter === f ? ["#4361ee", "#3b52d4"] : ["#fff", "#fff"]
                }
                style={styles.filterChipGradient}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === f && styles.filterTextActive,
                  ]}
                >
                  {f === "all"
                    ? "All"
                    : f === "in_progress"
                      ? "In Progress"
                      : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard
            label="Total"
            value={tasks.length}
            icon="apps-outline"
            color="#4361ee"
          />
          <StatCard
            label="Active"
            value={tasks.filter((t) => t.status !== "completed").length}
            icon="time-outline"
            color="#f59e0b"
          />
          <StatCard
            label="Completed"
            value={tasks.filter((t) => t.status === "completed").length}
            icon="checkmark-done-outline"
            color="#10b981"
          />
        </View>

        {/* Task List */}
        <FlatList
          ref={flatListRef}
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4361ee"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={80}
                color="#ccc"
              />
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
            <LinearGradient
              colors={["#fff", "#f8f9fa"]}
              style={styles.modalContent}
            >
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
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setProgressModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={updateTaskProgress}
                  disabled={progressSubmitting}
                >
                  {progressSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
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
              <LinearGradient
                colors={["#fff", "#f8f9fa"]}
                style={styles.chatHeader}
              >
                <TouchableOpacity
                  onPress={() => setCommentModal(false)}
                  style={styles.chatBackButton}
                >
                  <Ionicons name="arrow-back" size={24} color="#4361ee" />
                </TouchableOpacity>
                <View style={styles.chatHeaderInfo}>
                  <Text style={styles.chatHeaderTitle}>
                    {selectedTask?.title}
                  </Text>
                  <View style={styles.chatHeaderMeta}>
                    <Ionicons name="folder-outline" size={12} color="#6c757d" />
                    <Text style={styles.chatHeaderSubtitle}>
                      {selectedTask?.projectName}
                    </Text>
                    <View
                      style={[
                        styles.chatStatusDot,
                        {
                          backgroundColor: getStatusColor(selectedTask?.status),
                        },
                      ]}
                    />
                    <Text style={styles.chatHeaderSubtitle}>
                      {getStatusText(selectedTask?.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.chatHeaderPlaceholder} />
              </LinearGradient>

              <FlatList
                data={selectedTask?.comments || []}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <ChatMessage
                    message={{
                      ...item,
                      time: new Date(item.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    }}
                    isOwn={
                      item.userRole === "Developer" ||
                      item.userName === user?.FullName
                    }
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
                    <Ionicons
                      name="chatbubbles-outline"
                      size={60}
                      color="#ccc"
                    />
                    <Text style={styles.chatEmptyText}>No messages yet</Text>
                    <Text style={styles.chatEmptySubtext}>
                      Start the conversation
                    </Text>
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
                  style={[
                    styles.chatSendButton,
                    (!newComment.trim() || commentSubmitting) &&
                      styles.chatSendButtonDisabled,
                  ]}
                  onPress={addComment}
                  disabled={commentSubmitting || !newComment.trim()}
                >
                  {commentSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  gradientBackground: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  greeting: {
    fontSize: 13,
    color: "#6c757d",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: "#4361ee15",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontSize: 10,
    color: "#4361ee",
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fee2e2",
    backgroundColor: "#fef2f2",
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2937",
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterChip: {
    borderRadius: 20,
    overflow: "hidden",
    marginRight: 8,
  },
  filterChipGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChipActive: {
    shadowColor: "#4361ee",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontSize: 13,
    color: "#6c757d",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderTopWidth: 3,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },
  statLabel: {
    fontSize: 11,
    color: "#6c757d",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  taskCardGradient: {
    flexDirection: "row",
    overflow: "hidden",
  },
  completedTaskCard: {
    opacity: 0.75,
  },
  statusIndicator: {
    width: 4,
  },
  taskContent: {
    flex: 1,
    padding: 16,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  checkbox: {
    padding: 2,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  completedTitle: {
    textDecorationLine: "line-through",
    color: "#9ca3af",
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
  projectInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  projectName: {
    fontSize: 12,
    color: "#6c757d",
  },
  description: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 10,
    lineHeight: 18,
  },
  completedText: {
    color: "#9ca3af",
  },
  imagePreviewContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  moreImagesBadge: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    right: 8,
  },
  moreImagesText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#6c757d",
    fontWeight: "500",
    minWidth: 35,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dueDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  assignedByContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#4361ee",
    paddingVertical: 10,
    borderRadius: 10,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10b981",
    paddingVertical: 10,
    borderRadius: 10,
  },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#8b5cf6",
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fff",
  },
  button: {
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6c757d",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: width * 0.85,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 20,
  },
  progressInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  progressInput: {
    width: 80,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    fontSize: 20,
    textAlign: "center",
    color: "#1f2937",
    fontWeight: "600",
  },
  progressPercent: {
    fontSize: 18,
    marginLeft: 8,
    color: "#6c757d",
  },
  quickButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  quickButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
  },
  quickButtonText: {
    fontSize: 12,
    color: "#6c757d",
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#4361ee",
  },
  cancelButtonText: {
    color: "#6c757d",
    fontWeight: "500",
    fontSize: 14,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 14,
  },
  // Chat Modal Styles
  chatModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  chatBackButton: {
    padding: 4,
  },
  chatHeaderInfo: {
    flex: 1,
    alignItems: "center",
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  chatHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  chatStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chatHeaderSubtitle: {
    fontSize: 11,
    color: "#6c757d",
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
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#4361ee",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  messageUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
  },
  ownMessageAvatar: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4361ee",
  },
  messageUser: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6c757d",
  },
  ownMessageText: {
    color: "#fff",
  },
  ownMessageRole: {
    backgroundColor: "rgba(255,255,255,0.2)",
    color: "#fff",
  },
  messageRole: {
    fontSize: 9,
    color: "#9ca3af",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  messageTime: {
    fontSize: 10,
    color: "#9ca3af",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#1f2937",
  },
  chatEmpty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  chatEmptyText: {
    fontSize: 16,
    color: "#6c757d",
  },
  chatEmptySubtext: {
    fontSize: 13,
    color: "#9ca3af",
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: "#1f2937",
  },
  chatSendButton: {
    backgroundColor: "#4361ee",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  chatSendButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
});
