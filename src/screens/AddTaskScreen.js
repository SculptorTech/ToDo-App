import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Voice from "@react-native-voice/voice";
import { useNavigation } from "@react-navigation/native";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import {
  autoPriority,
  createTask,
  enhanceTask,
  generateDescription,
  planWithSchedule,
  testGroqConnection,
} from "../../app/services/api";
import { getTasks, saveTasks } from "../utils/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function AddTaskScreen() {
  const navigation = useNavigation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
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

  // AI Processing states
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const recordingTimer = useRef(null);
  const recordingInterval = useRef(null);
  const isMounted = useRef(true);
  const descriptionRef = useRef(null);

  // Helper function to clean API response
  const cleanApiResponse = (apiText) => {
    if (!apiText) return "";

    console.log("Raw API response:", apiText);

    if (apiText.includes("[object Object]")) {
      return "AI generated description based on your task title. You can edit this description.";
    }

    let cleaned = apiText
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/#{1,6}\s?/g, "")
      .replace(/\[object Object\]/g, "")
      .replace(/Unfortunately,.*?generic title\./g, "")
      .replace(/\n\s*[-•*]\s*/g, "\n• ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/Task Title:.*?\n/g, "")
      .replace(/Task Description:?\s*/g, "")
      .replace(/Deliverables:.*/g, "")
      .replace(/Deadline:.*/g, "")
      .replace(/Priority:.*/g, "")
      .replace(/Please provide.*tailored task description\./g, "")
      .trim();

    if (cleaned.length < 10) {
      cleaned = `Complete "${title}" with attention to detail. Ensure all requirements are met and deliverables are completed on time.`;
    }

    console.log("Cleaned description:", cleaned);
    return cleaned;
  };
  // Add this function before the return statement
  const testGroq = async () => {
    const result = await testGroqConnection();
    if (result.success) {
      Alert.alert("✅ GROQ API Working!", result.message);
    } else {
      Alert.alert("❌ GROQ API Failed", JSON.stringify(result.error));
    }
  };

  // AI Action Functions
  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title first");
      return;
    }

    setIsGeneratingAI(true);
    setShowAiOptions(false);

    try {
      console.log("Generating description for:", title.trim());
      const res = await generateDescription(title.trim());
      console.log("API Response:", res.data);

      if (res.data?.description) {
        const cleanedDescription = cleanApiResponse(res.data.description);
        setDescription(cleanedDescription);
      } else if (res.data?.content) {
        const cleanedDescription = cleanApiResponse(res.data.content);
        setDescription(cleanedDescription);
      } else {
        setDescription(`Complete "${title.trim()}" efficiently and on time.`);
      }
    } catch (error) {
      console.log("Description error:", error);
      Alert.alert("Error", "Failed to generate description. Please try again.");
      setDescription(`Complete "${title.trim()}" efficiently and on time.`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleEnhanceTask = async () => {
    if (!title.trim() && !description.trim()) {
      Alert.alert("Error", "Please enter task title or description first");
      return;
    }

    setIsGeneratingAI(true);
    setShowAiOptions(false);

    try {
      const response = await enhanceTask({
        title: title.trim(),
        description: description.trim(),
        priority: priority,
      });

      if (response.data?.content) {
        const cleanedDescription = cleanApiResponse(response.data.content);
        setDescription(cleanedDescription);
        Alert.alert("Success", "Task enhanced successfully!");
      } else if (response.data?.description) {
        const cleanedDescription = cleanApiResponse(response.data.description);
        setDescription(cleanedDescription);
        Alert.alert("Success", "Task enhanced successfully!");
      }
    } catch (error) {
      console.log("Enhance error:", error);
      Alert.alert("Error", "Failed to enhance task");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePlanWithSchedule = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title first");
      return;
    }

    setIsGeneratingAI(true);
    setShowAiOptions(false);

    try {
      const response = await planWithSchedule({
        title: title.trim(),
        dueDate: date.toISOString(),
        priority: priority,
      });

      if (response.data?.content) {
        const cleanedContent = cleanApiResponse(response.data.content);
        const scheduledDescription = `${cleanedContent}\n\n📅 **Suggested Schedule:**\n• Start Date: ${new Date().toLocaleDateString()}\n• Timeline: 3-5 days\n• Checkpoints: Daily progress reviews`;
        setDescription((prev) =>
          prev ? prev + "\n\n" + scheduledDescription : scheduledDescription,
        );
        Alert.alert("Success", "Schedule created successfully!");
      } else if (response.data?.description) {
        const cleanedDescription = cleanApiResponse(response.data.description);
        const scheduledDescription = `${cleanedDescription}\n\n📅 **Suggested Schedule:**\n• Start Date: ${new Date().toLocaleDateString()}\n• Timeline: 3-5 days\n• Checkpoints: Daily progress reviews`;
        setDescription((prev) =>
          prev ? prev + "\n\n" + scheduledDescription : scheduledDescription,
        );
        Alert.alert("Success", "Schedule created successfully!");
      }
    } catch (error) {
      console.log("Plan error:", error);
      Alert.alert("Error", "Failed to create schedule");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAutoPriority = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title first");
      return;
    }

    try {
      const response = await autoPriority({ text: title });
      if (response.data?.priority) {
        setPriority(response.data.priority);
        Alert.alert("Priority Set", `Priority: ${response.data.priority}`);
      }
    } catch (error) {
      console.log("Priority error:", error);
      Alert.alert("Error", "Failed to analyze priority");
    }
  };

  const handleCreateTaskWithAI = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title first");
      return;
    }

    setIsGeneratingAI(true);
    setShowAiOptions(false);

    try {
      const response = await createTask(title.trim());
      if (response.data?.content) {
        const cleanedContent = cleanApiResponse(response.data.content);
        setDescription(cleanedContent);
        Alert.alert("Success", "AI-generated task created!");
      } else if (response.data?.description) {
        const cleanedDescription = cleanApiResponse(response.data.description);
        setDescription(cleanedDescription);
        Alert.alert("Success", "AI-generated task created!");
      }
    } catch (error) {
      console.log("Create task error:", error);
      Alert.alert("Error", "Failed to create task with AI");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Description text actions
  const handleCopyDescription = () => {
    if (description.trim()) {
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
      if (recordingTimer.current) {
        clearTimeout(recordingTimer.current);
      }
    };
  }, []);

  // Auto-generate priority when title changes
  useEffect(() => {
    const generatePriority = async () => {
      if (title.trim() && title.length > 3 && !isGeneratingAI) {
        try {
          const priorityRes = await autoPriority({ text: title });
          if (priorityRes?.data?.priority) {
            setPriority(priorityRes.data.priority);
          }
        } catch (priorityError) {
          console.log("Priority generation failed:", priorityError);
        }
      }
    };

    const debounceTimer = setTimeout(() => {
      generatePriority();
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [title]);

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
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
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
      setVoiceError(error.message || "Failed to stop voice recognition");
    }
  };

  const addTask = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title");
      return;
    }

    if (date < new Date()) {
      Alert.alert(
        "Past Due Date",
        "The due date is in the past. Do you want to continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: actuallyAddTask },
        ],
      );
    } else {
      await actuallyAddTask();
    }
  };

  const actuallyAddTask = async () => {
    try {
      if (isListening) {
        await stopVoiceToText();
      }

      if (isRecording && recording) {
        await stopRecording();
      }

      setShowVoiceModal(false);
      setShowRecordModal(false);
      setShowAiOptions(false);
      setShowDescriptionModal(false);
      setShowFilterOptions(false);

      const existing = await getTasks();

      const newTask = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: date.toISOString(),
        voiceNote: recognizedText || null,
        recordings: recordings.length > 0 ? recordings.map((r) => r.uri) : [],
        completed: false,
        createdAt: new Date().toISOString(),
      };

      await saveTasks([...existing, newTask]);

      navigation.goBack();
    } catch (error) {
      console.error("Error adding task:", error);
      Alert.alert("Error", "Failed to add task. Please try again.");
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

      setShowVoiceModal(false);
      setShowRecordModal(false);
      setShowAiOptions(false);
      setShowDescriptionModal(false);
      setShowFilterOptions(false);

      setTitle("");
      setDescription("");
      setRecognizedText("");
      setPartialText("");
      setRecordings([]);
      setVoiceError("");
      setPriority("Normal");

      const now = new Date();
      now.setHours(now.getHours() + 1);
      now.setMinutes(0);
      setDate(now);

      navigation.goBack();
    } catch (error) {
      console.error("Error during cancel cleanup:", error);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Task</Text>
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
                Tap to add description or use AI...
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

        {/* Spacer for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating AI Button */}
{title.trim() && title.length > 3 && (
  <TouchableOpacity
    style={styles.floatingAiButton}
    onPress={() => setShowAiOptions(!showAiOptions)}
  >
    {/* Fixed: "sparkles" is the correct name */}
    <Ionicons name="sparkles" size={24} color="#fff" />
    
    {showAiOptions && (
      <View style={styles.aiOptionsPanel}>
        <TouchableOpacity
          style={[styles.aiOption, styles.generateOption]}
          onPress={handleGenerateDescription}
          disabled={isGeneratingAI}
        >
          <Ionicons name="document-text-outline" size={18} color="#007AFF" />
          <Text style={styles.aiOptionText}>Generate Description</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aiOption, styles.enhanceOption]}
          onPress={handleEnhanceTask}
          disabled={isGeneratingAI}
        >
          <Ionicons name="star-outline" size={18} color="#5856D6" />
          <Text style={styles.aiOptionText}>Enhance Task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aiOption, styles.scheduleOption]}
          onPress={handlePlanWithSchedule}
          disabled={isGeneratingAI}
        >
          <Ionicons name="calendar-outline" size={18} color="#34C759" />
          <Text style={styles.aiOptionText}>Plan with Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aiOption, styles.priorityOption]}
          onPress={handleAutoPriority}
          disabled={isGeneratingAI}
        >
          <Ionicons name="flag-outline" size={18} color="#FF9500" />
          <Text style={styles.aiOptionText}>Auto Priority</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.aiOption, styles.createOption]}
          onPress={handleCreateTaskWithAI}
          disabled={isGeneratingAI}
        >
          <Ionicons name="add-circle-outline" size={18} color="#007AFF" />
          <Text style={styles.aiOptionText}>Create Task with AI</Text>
        </TouchableOpacity>
      </View>
    )}
  </TouchableOpacity>
)}

      {/* Fixed Add Task Button */}
      <View style={styles.fixedActionBar}>
        <TouchableOpacity
          style={[styles.addButton, !title.trim() && styles.buttonDisabled]}
          onPress={addTask}
          disabled={!title.trim() || isGeneratingAI}
        >
          {isGeneratingAI ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Task</Text>
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
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    flex: 1,
    textAlign: "center",
    marginRight: 40,
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
  floatingAiButton: {
    position: "absolute",
    bottom: 90,
    right: 16,
    backgroundColor: "#007AFF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiOptionsPanel: {
    position: "absolute",
    bottom: 70,
    right: 0,
    width: 200,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  aiOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  generateOption: {
    backgroundColor: "#f0f8ff",
  },
  enhanceOption: {
    backgroundColor: "#f0f0ff",
  },
  scheduleOption: {
    backgroundColor: "#f0fff0",
  },
  priorityOption: {
    backgroundColor: "#fff5e6",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  createOption: {
    backgroundColor: "#e6f7ff",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  aiOptionText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 8,
    color: "#333",
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
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
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
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
