import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Voice from "@react-native-voice/voice";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { getRequest, postRequest } from "../../services/apiService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function AddTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, projectId, projectName } = route.params || {};

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [date, setDate] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    return now;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  // Project selection states - AUTO SELECTED FROM NAVIGATION
  const [selectedProject, setSelectedProject] = useState(null);

  // Employee assignment states
  const [assignedTo, setAssignedTo] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState(null);

  // Voice recording states
  const [recording, setRecording] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPermission, setAudioPermission] = useState(null);

  // Voice-to-text states
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [partialText, setPartialText] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showAiOptions, setShowAiOptions] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recordingInterval = useRef(null);
  const isMounted = useRef(true);

  // Set the project from navigation params
  useEffect(() => {
    if (projectId && projectName) {
      console.log("📋 Setting project from navigation:", {
        projectId,
        projectName,
      });
      setSelectedProject({
        id: projectId,
        name: projectName,
      });
    } else if (projectId) {
      // If only projectId is provided, fetch project name
      fetchProjectDetails(projectId);
    }
  }, [projectId, projectName]);

  const fetchProjectDetails = async (id) => {
    try {
      const response = await getRequest(`/project/get-project/${id}`);
      const projectData = response.project || response;
      setSelectedProject({
        id: id,
        name: projectData.Name || projectData.name || "Project",
      });
    } catch (error) {
      console.error("Error fetching project details:", error);
      setSelectedProject({
        id: id,
        name: "Project",
      });
    }
  };

  // Load employees from API
  const loadEmployeesFromAPI = async () => {
    try {
      setLoadingEmployees(true);
      setEmployeeError(null);

      console.log("📡 Fetching employees from API...");
      const response = await getRequest("/user/getusers");
      console.log("📡 Employees response:", response);

      // Handle different response structures
      let usersList = [];
      if (response.users) {
        usersList = response.users;
      } else if (response.data?.users) {
        usersList = response.data.users;
      } else if (Array.isArray(response)) {
        usersList = response;
      } else if (response.data && Array.isArray(response.data)) {
        usersList = response.data;
      }

      console.log(`📋 Total users fetched: ${usersList.length}`);

      // Filter out managers and keep only developers
      const filteredUsers = usersList.filter(
        (u) =>
          u.UserID !== user?.UserID &&
          (u.RoleName === "Developer" ||
            u.roleName === "Developer" ||
            u.Role === "Developer" ||
            u.role === "Developer"),
      );

      // Transform API data
      const transformedEmployees = filteredUsers.map((u) => ({
        id: u.UserID || u.id || u.userId,
        name: u.FullName || u.fullName || u.name || "Unknown",
        roleName: u.Role || u.role || u.roleName || "Developer",
        email: u.Email || u.email || "",
        department: u.Department || u.department || "General",
        avatar: (u.FullName || u.fullName || u.name || "U")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .substring(0, 2),
      }));

      console.log(`📋 Transformed employees: ${transformedEmployees.length}`);
      setEmployees(transformedEmployees);
      setFilteredEmployees(transformedEmployees);
    } catch (error) {
      console.error("❌ Error loading employees:", error);
      setEmployeeError(error.message || "Failed to load employees");
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadEmployeesFromAPI();
  }, []);

  // Filter employees based on search
  useEffect(() => {
    if (employeeSearch.trim()) {
      const filtered = employees.filter(
        (emp) =>
          emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          emp.roleName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          emp.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          emp.department?.toLowerCase().includes(employeeSearch.toLowerCase()),
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [employeeSearch, employees]);

  // Initialize audio permissions and voice recognition
  useEffect(() => {
    isMounted.current = true;

    (async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (isMounted.current) {
          setAudioPermission(status === "granted");
        }
      } catch (err) {
        console.error("Failed to get audio permissions:", err);
      }
    })();

    if (Voice) {
      Voice.onSpeechStart = () => {
        if (isMounted.current) {
          setIsListening(true);
          setVoiceError("");
        }
      };

      Voice.onSpeechEnd = () => {
        if (isMounted.current) {
          setIsListening(false);
        }
      };

      Voice.onSpeechResults = (event) => {
        if (isMounted.current && event.value && event.value.length > 0) {
          const text = event.value[0];
          setRecognizedText(text);
          if (!title.trim()) {
            setTitle(text);
          } else {
            setDescription((prev) => (prev ? `${prev}\n${text}` : text));
          }
        }
      };

      Voice.onSpeechPartialResults = (event) => {
        if (isMounted.current && event.value && event.value.length > 0) {
          setPartialText(event.value[0]);
        }
      };

      Voice.onSpeechError = (event) => {
        if (isMounted.current) {
          setVoiceError(event.error?.message || "Voice recognition failed");
          setIsListening(false);
          setIsProcessing(false);
        }
      };
    }

    return () => {
      isMounted.current = false;
      if (Voice) {
        Voice.stop()
          .then(() => Voice.destroy())
          .then(() => Voice.removeAllListeners())
          .catch((e) => console.log("Voice cleanup error:", e));
      }

      if (recording) {
        recording.stopAndUnloadAsync().catch(console.error);
      }

      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!audioPermission) {
        Alert.alert("Permission required", "Please grant microphone access");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      if (isMounted.current) {
        setRecording(recording);
        setIsRecording(true);
        setRecordingTime(0);

        recordingInterval.current = setInterval(() => {
          if (isMounted.current) {
            setRecordingTime((prev) => prev + 1);
          }
        }, 1000);
      }
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (isMounted.current) {
        const newRecording = {
          uri,
          duration: recordingTime,
          timestamp: new Date().toISOString(),
        };

        setRecordings([...recordings, newRecording]);
        setRecording(null);
        setRecordingTime(0);
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  };

  const playRecording = async (uri) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } catch (err) {
      console.error("Failed to play recording", err);
      Alert.alert("Error", "Failed to play recording");
    }
  };

  const deleteRecording = (index) => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const newRecordings = [...recordings];
            newRecordings.splice(index, 1);
            setRecordings(newRecordings);
          },
        },
      ],
    );
  };

  const startVoiceToText = async () => {
    try {
      setIsProcessing(true);
      setVoiceError("");
      setRecognizedText("");
      setPartialText("");

      if (!Voice) {
        throw new Error("Voice recognition is not available");
      }

      const available = await Voice.isAvailable();
      if (!available) {
        throw new Error("Voice recognition is not available on this device");
      }

      await Voice.start("en-US");
    } catch (error) {
      console.error("Voice start error:", error);
      setVoiceError(error.message || "Failed to start voice recognition");
      setIsProcessing(false);
    }
  };

  const stopVoiceToText = async () => {
    try {
      setIsProcessing(false);
      if (Voice) {
        await Voice.stop();
      }
    } catch (error) {
      console.error("Voice stop error:", error);
    }
  };

  const selectEmployee = (employee) => {
    console.log("Selected employee:", employee);

    setAssignedTo({
      id: employee.id.toString(),
      name: employee.name,
      role: employee.roleName || "Developer",
      avatar: employee.avatar,
      department: employee.department || "",
    });

    setShowEmployeeModal(false);
    setEmployeeSearch("");
  };

  const clearAssignedEmployee = () => {
    setAssignedTo(null);
  };

  const addTask = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title");
      return;
    }

    if (!selectedProject) {
      Alert.alert("Error", "Please select a project");
      return;
    }

    if (!assignedTo) {
      Alert.alert("Error", "Please assign this task to a developer");
      return;
    }

    if (date < new Date()) {
      Alert.alert(
        "Past Due Date",
        "The due date is in the past. Do you want to continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => actuallyAddTask() },
        ],
      );
    } else {
      await actuallyAddTask();
    }
  };

  const actuallyAddTask = async () => {
    try {
      setIsSubmitting(true);

      if (isListening) {
        await stopVoiceToText();
      }

      if (isRecording && recording) {
        await stopRecording();
      }

      // Close all modals
      setShowVoiceModal(false);
      setShowRecordModal(false);
      setShowAiOptions(false);
      setShowDescriptionModal(false);
      setShowFilterOptions(false);
      setShowEmployeeModal(false);

      // Get manager info from the user object passed from navigation
      const managerId = user?.UserID || user?.id;
      const managerName = user?.FullName || user?.fullName || user?.name;

      // Get assigned developer info
      const assignedDeveloperId = assignedTo?.id;
      const assignedDeveloperName = assignedTo?.name;
      const assignedDeveloperRole = assignedTo?.role || "Developer";

      // Validate required fields
      if (!managerId || !managerName) {
        Alert.alert(
          "Error",
          "Manager information is missing. Please log in again.",
        );
        setIsSubmitting(false);
        return;
      }

      if (!assignedDeveloperId || !assignedDeveloperName) {
        Alert.alert("Error", "Please assign the task to a developer");
        setIsSubmitting(false);
        return;
      }

      // Prepare task data for API - matching the backend schema exactly
      const taskData = {
        title: title.trim(),
        description: description.trim() || "",
        priority: priority,
        dueDate: date.toISOString(),
        projectId: selectedProject.id.toString(),
        projectName: selectedProject.name,
        assignedTo: parseInt(assignedDeveloperId),
        assignedToName: assignedDeveloperName,
        assignedToRole: assignedDeveloperRole,
        createdBy: parseInt(managerId),
        createdByName: managerName,
        status: "pending",
        voiceNote: recognizedText || null,
        recordings: recordings.map((r) => ({
          uri: r.uri,
          duration: r.duration,
          timestamp: r.timestamp,
        })),
      };

      console.log(
        "📤 Sending task data to backend:",
        JSON.stringify(taskData, null, 2),
      );
      console.log("👤 Manager (Creator):", managerName, "(ID:", managerId, ")");
      console.log(
        "👨‍💻 Assigned Developer:",
        assignedDeveloperName,
        "(ID:",
        assignedDeveloperId,
        ")",
      );
      console.log(
        "📁 Project:",
        selectedProject.name,
        "(ID:",
        selectedProject.id,
        ")",
      );

      const response = await postRequest("/task/create-task", taskData);
      console.log("✅ Task created successfully:", response);

      Alert.alert("Success", "Task created successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("❌ Error creating task:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          "Failed to create task. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      if (isListening) {
        await stopVoiceToText();
      }

      if (isRecording && recording) {
        await stopRecording();
      }

      navigation.goBack();
    } catch (error) {
      console.error("Error during cancel:", error);
      navigation.goBack();
    }
  };

  const handlePickerChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }

    if (selectedDate && isMounted.current) {
      if (pickerMode === "date") {
        const newDate = new Date(date);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setDate(newDate);
      } else {
        const newDate = new Date(date);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        newDate.setSeconds(0);
        setDate(newDate);
      }
    }
  };

  const showPicker = (mode) => {
    setPickerMode(mode);
    setShowFilterOptions(false);
    if (Platform.OS === "ios") {
      setShowDatePicker(true);
    } else {
      if (mode === "date") {
        setShowDatePicker(true);
      } else {
        setShowTimePicker(true);
      }
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const closeVoiceModal = async () => {
    if (isListening) {
      await stopVoiceToText();
    }
    setShowVoiceModal(false);
  };

  const closeRecordModal = async () => {
    if (isRecording && recording) {
      await stopRecording();
    }
    setShowRecordModal(false);
  };

  const retryLoadEmployees = () => {
    loadEmployeesFromAPI();
  };

  const getRandomColor = (seed) => {
    const colors = [
      "#4CAF50",
      "#2196F3",
      "#9C27B0",
      "#FF9800",
      "#E91E63",
      "#00BCD4",
      "#FF5722",
      "#3F51B5",
      "#8BC34A",
      "#FFC107",
    ];
    const index = (seed?.toString()?.length || 0) % colors.length;
    return colors[index];
  };

  const handleCopyDescription = () => {
    if (description?.trim()) {
      Alert.alert("Copied", "Description copied to clipboard");
    }
  };

  const handleClearDescription = () => {
    Alert.alert(
      "Clear Description",
      "Are you sure you want to clear the description?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          onPress: () => setDescription(""),
          style: "destructive",
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Project Name */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Create Task</Text>
          {selectedProject?.name && (
            <Text style={styles.projectNameText}>{selectedProject.name}</Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Task Title Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Task Title *</Text>
            <TouchableOpacity
              style={styles.voiceIconButton}
              onPress={() => setShowVoiceModal(true)}
            >
              <Ionicons name="mic-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <TextInput
            placeholder="Enter task title..."
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholderTextColor="#999"
          />
        </View>

        {/* Project Section - Auto-filled from navigation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Project *</Text>
          </View>
          <View style={styles.projectInfoCard}>
            <Ionicons name="folder-outline" size={24} color="#007AFF" />
            <View style={styles.projectInfoDetails}>
              <Text style={styles.projectInfoName}>
                {selectedProject?.name || "Loading..."}
              </Text>
              <Text style={styles.projectInfoId}>
                ID: {selectedProject?.id || projectId}
              </Text>
            </View>
          </View>
        </View>

        {/* Assign To Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assign To *</Text>
            {assignedTo && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearAssignedEmployee}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => setShowEmployeeModal(true)}
            activeOpacity={0.7}
          >
            {assignedTo ? (
              <View style={styles.selectedEmployee}>
                <View
                  style={[
                    styles.selectedEmployeeAvatar,
                    { backgroundColor: getRandomColor(assignedTo.id) },
                  ]}
                >
                  <Text style={styles.selectedEmployeeAvatarText}>
                    {assignedTo.avatar}
                  </Text>
                </View>
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{assignedTo.name}</Text>
                  <Text style={styles.employeeRole}>{assignedTo.role}</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </View>
            ) : (
              <View style={styles.assignPlaceholder}>
                <Ionicons name="person-add-outline" size={20} color="#007AFF" />
                <Text style={styles.assignPlaceholderText}>
                  Tap to assign to a developer
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Filter Button for Priority & Due Date */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterOptions(!showFilterOptions)}
        >
          <Ionicons name="filter-outline" size={18} color="#666" />
          <Text style={styles.filterButtonText}>Priority & Due Date</Text>
          <Ionicons
            name={showFilterOptions ? "chevron-up" : "chevron-down"}
            size={16}
            color="#666"
          />
        </TouchableOpacity>

        {/* Filter Options */}
        {showFilterOptions && (
          <View style={styles.filterOptions}>
            {/* Priority */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Priority</Text>
              <View style={styles.priorityOptions}>
                {[
                  { level: "Low", color: "#4CAF50" },
                  { level: "Normal", color: "#FF9800" },
                  { level: "High", color: "#F44336" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.level}
                    style={[
                      styles.priorityOption,
                      priority === item.level && {
                        backgroundColor: item.color,
                      },
                    ]}
                    onPress={() => setPriority(item.level)}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        priority === item.level &&
                          styles.priorityOptionTextActive,
                      ]}
                    >
                      {item.level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Due Date */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Due Date</Text>
              <View style={styles.datetimeOptions}>
                <TouchableOpacity
                  style={styles.dateOption}
                  onPress={() => showPicker("date")}
                >
                  <Ionicons name="calendar-outline" size={18} color="#007AFF" />
                  <Text style={styles.dateOptionText}>{formatDate(date)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeOption}
                  onPress={() => showPicker("time")}
                >
                  <Ionicons name="time-outline" size={18} color="#007AFF" />
                  <Text style={styles.timeOptionText}>{formatTime(date)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Description Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TouchableOpacity
              style={styles.fullscreenButton}
              onPress={() => setShowDescriptionModal(true)}
            >
              <Ionicons name="expand-outline" size={20} color="#007AFF" />
              <Text style={styles.fullscreenButtonText}>Full Screen</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.descriptionPreview}
            onPress={() => setShowDescriptionModal(true)}
            activeOpacity={0.7}
          >
            {description.trim() ? (
              <Text style={styles.descriptionPreviewText} numberOfLines={4}>
                {description}
              </Text>
            ) : (
              <Text style={styles.descriptionPlaceholder}>
                Tap to add description...
              </Text>
            )}
            <View style={styles.descriptionPreviewFooter}>
              <Text style={styles.descriptionLength}>
                {description.length} characters
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Audio Notes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Audio Notes</Text>
            <TouchableOpacity
              style={styles.recordButton}
              onPress={() => setShowRecordModal(true)}
            >
              <Ionicons name="mic-outline" size={18} color="#FF3B30" />
              <Text style={styles.recordButtonText}>
                {recordings.length > 0
                  ? `${recordings.length} recorded`
                  : "Record"}
              </Text>
            </TouchableOpacity>
          </View>
          {recordings.length > 0 && (
            <View style={styles.recordingsPreview}>
              {recordings.slice(0, 3).map((rec, index) => (
                <View key={index} style={styles.recordingPreviewItem}>
                  <View style={styles.recordingInfo}>
                    <Ionicons
                      name="musical-notes-outline"
                      size={16}
                      color="#666"
                    />
                    <Text style={styles.recordingPreviewText}>
                      Recording {index + 1}
                    </Text>
                    <Text style={styles.recordingDuration}>
                      {formatRecordingTime(rec.duration)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => playRecording(rec.uri)}
                    style={styles.playButton}
                  >
                    <Ionicons name="play" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Voice-to-Text Results */}
        {(recognizedText || partialText) && (
          <View style={styles.voiceResultContainer}>
            <Text style={styles.voiceResultLabel}>
              {isListening ? "🎤 Listening..." : "🎤 Voice Input"}
            </Text>
            <Text style={styles.voiceResultText}>
              {recognizedText || partialText}
            </Text>
          </View>
        )}

        {/* Date/Time Pickers */}
        {showDatePicker && Platform.OS === "ios" && (
          <View style={styles.iosPickerContainer}>
            <DateTimePicker
              value={date}
              mode="datetime"
              display="spinner"
              onChange={handlePickerChange}
              style={styles.iosPicker}
            />
            <View style={styles.iosPickerButtons}>
              <TouchableOpacity
                style={styles.iosPickerButton}
                onPress={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.iosPickerButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handlePickerChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={handlePickerChange}
            is24Hour={false}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Employee Selection Modal */}
      <Modal
        visible={showEmployeeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmployeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.employeeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Developer</Text>
              <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color="#999"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, role, or email..."
                value={employeeSearch}
                onChangeText={setEmployeeSearch}
                placeholderTextColor="#999"
              />
              {employeeSearch ? (
                <TouchableOpacity onPress={() => setEmployeeSearch("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Error State */}
            {employeeError && (
              <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={40} color="#FF3B30" />
                <Text style={styles.errorText}>{employeeError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={retryLoadEmployees}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading Indicator */}
            {loadingEmployees && !employeeError ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading developers...</Text>
              </View>
            ) : (
              !employeeError && (
                <FlatList
                  data={filteredEmployees}
                  keyExtractor={(item) => item.id?.toString()}
                  style={styles.employeesList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.employeeItem}
                      onPress={() => selectEmployee(item)}
                    >
                      <View
                        style={[
                          styles.employeeItemAvatar,
                          { backgroundColor: getRandomColor(item.id) },
                        ]}
                      >
                        <Text style={styles.employeeItemAvatarText}>
                          {item.avatar}
                        </Text>
                      </View>
                      <View style={styles.employeeItemInfo}>
                        <Text style={styles.employeeItemName}>{item.name}</Text>
                        <Text style={styles.employeeItemRole}>
                          {item.roleName}
                        </Text>
                        <Text style={styles.employeeItemEmail}>
                          {item.email}
                        </Text>
                        {item.department && (
                          <Text style={styles.employeeItemDepartment}>
                            {item.department}
                          </Text>
                        )}
                      </View>
                      {assignedTo?.id === item.id && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#4CAF50"
                        />
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    !loadingEmployees && !employeeError ? (
                      <View style={styles.emptyList}>
                        <Ionicons
                          name="people-outline"
                          size={50}
                          color="#ccc"
                        />
                        <Text style={styles.emptyListText}>
                          No developers found
                        </Text>
                        <TouchableOpacity
                          style={styles.refreshButton}
                          onPress={loadEmployeesFromAPI}
                        >
                          <Ionicons name="refresh" size={20} color="#fff" />
                          <Text style={styles.refreshButtonText}>Refresh</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null
                  }
                />
              )
            )}

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowEmployeeModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fixed Add Task Button */}
      <View style={styles.fixedActionBar}>
        <TouchableOpacity
          style={[
            styles.addButton,
            (!title.trim() ||
              !selectedProject ||
              !assignedTo ||
              isSubmitting) &&
              styles.buttonDisabled,
          ]}
          onPress={addTask}
          disabled={
            !title.trim() || !selectedProject || !assignedTo || isSubmitting
          }
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Create Task</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Description Full-Screen Modal */}
      <Modal
        visible={showDescriptionModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowDescriptionModal(false)}
      >
        <SafeAreaView style={styles.fullscreenModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Description Editor</Text>
            <TouchableOpacity
              onPress={() => setShowDescriptionModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalToolbar}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => {
                setShowDescriptionModal(false);
                setShowVoiceModal(true);
              }}
            >
              <Ionicons name="mic-outline" size={20} color="#007AFF" />
              <Text style={styles.toolbarButtonText}>Voice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={handleCopyDescription}
              disabled={!description.trim()}
            >
              <Ionicons name="copy-outline" size={20} color="#666" />
              <Text style={styles.toolbarButtonText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={handleClearDescription}
              disabled={!description.trim()}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.toolbarButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.fullscreenInput}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            placeholder="Write your task description here..."
            placeholderTextColor="#999"
            autoFocus
          />

          <View style={styles.modalFooter}>
            <Text style={styles.charCountLarge}>
              {description.length}/5000 characters
            </Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowDescriptionModal(false)}
            >
              <Text style={styles.saveButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Voice-to-Text Modal */}
      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeVoiceModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Voice Input</Text>
              <TouchableOpacity onPress={closeVoiceModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.voiceModalBody}>
              {voiceError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning-outline" size={40} color="#FF3B30" />
                  <Text style={styles.errorText}>{voiceError}</Text>
                </View>
              ) : isListening ? (
                <View style={styles.listeningContainer}>
                  <View style={styles.pulseAnimation}>
                    <Ionicons name="mic" size={60} color="#007AFF" />
                  </View>
                  <Text style={styles.listeningText}>Listening...</Text>
                  <Text style={styles.recordingText}>
                    {partialText || "Speak now..."}
                  </Text>
                </View>
              ) : (
                <View style={styles.readyContainer}>
                  <Ionicons name="mic-outline" size={60} color="#007AFF" />
                  <Text style={styles.readyText}>Ready to Listen</Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              {isListening ? (
                <TouchableOpacity
                  style={[styles.modalButton, styles.stopButton]}
                  onPress={stopVoiceToText}
                >
                  <Ionicons name="square" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Stop</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.startButton]}
                  onPress={startVoiceToText}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="mic" size={20} color="#fff" />
                      <Text style={styles.modalButtonText}>Start</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Audio Recording Modal */}
      <Modal
        visible={showRecordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeRecordModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audio Recordings</Text>
              <TouchableOpacity onPress={closeRecordModal}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.recordingsList}>
              {recordings.length === 0 ? (
                <View style={styles.emptyRecordings}>
                  <Ionicons name="mic-off-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyRecordingsText}>
                    No recordings yet
                  </Text>
                </View>
              ) : (
                recordings.map((rec, index) => (
                  <View key={index} style={styles.recordingItem}>
                    <View style={styles.recordingInfo}>
                      <Text style={styles.recordingIndex}>
                        Recording {index + 1}
                      </Text>
                      <Text style={styles.recordingDuration}>
                        {formatRecordingTime(rec.duration)}
                      </Text>
                    </View>
                    <View style={styles.recordingActions}>
                      <TouchableOpacity
                        style={styles.recordingAction}
                        onPress={() => playRecording(rec.uri)}
                      >
                        <Ionicons
                          name="play-circle"
                          size={28}
                          color="#007AFF"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.recordingAction}
                        onPress={() => deleteRecording(index)}
                      >
                        <Ionicons name="trash" size={28} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.recordingControls}>
              {isRecording ? (
                <View style={styles.recordingActive}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>
                      Recording: {formatRecordingTime(recordingTime)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.stopRecordingButton]}
                    onPress={stopRecording}
                  >
                    <Ionicons name="square" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.startRecordingButton]}
                  onPress={startRecording}
                >
                  <Ionicons name="mic" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Start Recording</Text>
                </TouchableOpacity>
              )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  closeButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  projectNameText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  voiceIconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#f0f8ff",
  },
  titleInput: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#1a1a1a",
  },
  projectInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  projectInfoDetails: {
    marginLeft: 12,
    flex: 1,
  },
  projectInfoName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  projectInfoId: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  assignButton: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  selectedEmployee: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedEmployeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  selectedEmployeeAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  employeeRole: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  assignPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  assignPlaceholderText: {
    fontSize: 15,
    color: "#007AFF",
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  employeeModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1a1a1a",
  },
  employeesList: {
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  employeeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  employeeItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  employeeItemAvatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  employeeItemInfo: {
    flex: 1,
  },
  employeeItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  employeeItemRole: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  employeeItemEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  employeeItemDepartment: {
    fontSize: 12,
    color: "#4CAF50",
    marginTop: 2,
  },
  emptyList: {
    alignItems: "center",
    padding: 40,
  },
  emptyListText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  refreshButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  closeModalButton: {
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
    marginLeft: 8,
  },
  filterOptions: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  priorityOptions: {
    flexDirection: "row",
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    alignItems: "center",
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  priorityOptionTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  datetimeOptions: {
    flexDirection: "row",
    gap: 12,
  },
  dateOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  timeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  dateOptionText: {
    fontSize: 14,
    color: "#1a1a1a",
    marginLeft: 8,
  },
  timeOptionText: {
    fontSize: 14,
    color: "#1a1a1a",
    marginLeft: 8,
  },
  fullscreenButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f0f8ff",
  },
  fullscreenButtonText: {
    fontSize: 12,
    color: "#007AFF",
    marginLeft: 4,
    fontWeight: "500",
  },
  descriptionPreview: {
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#fafafa",
  },
  descriptionPreviewText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  descriptionPlaceholder: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  descriptionPreviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  descriptionLength: {
    fontSize: 12,
    color: "#999",
  },
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#fff0f0",
  },
  recordButtonText: {
    fontSize: 13,
    color: "#FF3B30",
    marginLeft: 4,
    fontWeight: "500",
  },
  recordingsPreview: {
    gap: 8,
  },
  recordingPreviewItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  recordingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingPreviewText: {
    fontSize: 13,
    color: "#666",
  },
  recordingDuration: {
    fontSize: 12,
    color: "#999",
  },
  playButton: {
    padding: 4,
  },
  voiceResultContainer: {
    backgroundColor: "#f0f8ff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#d0e8ff",
  },
  voiceResultLabel: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
    marginBottom: 6,
  },
  voiceResultText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  fixedActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: "#b0b0b0",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalCloseButton: {
    padding: 8,
  },
  modalToolbar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    gap: 12,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  toolbarButtonText: {
    fontSize: 13,
    marginLeft: 6,
    color: "#666",
  },
  fullscreenInput: {
    flex: 1,
    fontSize: 16,
    padding: 16,
    color: "#1a1a1a",
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  charCountLarge: {
    fontSize: 14,
    color: "#666",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  voiceModalBody: {
    padding: 40,
    alignItems: "center",
    minHeight: 200,
    justifyContent: "center",
  },
  listeningContainer: {
    alignItems: "center",
  },
  pulseAnimation: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e6f2ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  listeningText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 10,
  },
  recordingText: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
    fontStyle: "italic",
  },
  readyContainer: {
    alignItems: "center",
  },
  readyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    marginVertical: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalButtons: {
    padding: 20,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 10,
  },
  startButton: {
    backgroundColor: "#007AFF",
  },
  stopButton: {
    backgroundColor: "#FF3B30",
  },
  startRecordingButton: {
    backgroundColor: "#FF3B30",
  },
  stopRecordingButton: {
    backgroundColor: "#1a1a1a",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  recordingsList: {
    maxHeight: 400,
  },
  emptyRecordings: {
    padding: 40,
    alignItems: "center",
  },
  emptyRecordingsText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  recordingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  recordingIndex: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  recordingActions: {
    flexDirection: "row",
    gap: 16,
  },
  recordingAction: {
    padding: 4,
  },
  recordingControls: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  recordingActive: {
    alignItems: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF3B30",
    marginRight: 8,
  },
  iosPickerContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  iosPicker: {
    height: 200,
  },
  iosPickerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  iosPickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iosPickerButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
