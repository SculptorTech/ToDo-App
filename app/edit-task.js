import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Audio } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
// FIXED: Correct import path - go up two levels to root utils

import { deleteTaskById, getTask, updateTask } from "../src/utils/storage";

export default function EditTaskScreen() {
  const { taskId } = useLocalSearchParams();
  const [task, setTask] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");

  // Audio recording states
  const [recording, setRecording] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Voice input states
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");

  // Modal states
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();
  const recordingTimer = useRef(null);

  // Load task data
  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const loadTaskData = async () => {
    try {
      setIsLoading(true);
      const taskData = await getTask(taskId);

      if (taskData) {
        setTask(taskData);
        setTitle(taskData.title);
        setDescription(taskData.description || "");
        setPriority(taskData.priority || "Medium");
        setDate(taskData.dueDate ? new Date(taskData.dueDate) : new Date());
        setRecordings(
          taskData.recordings
            ? taskData.recordings.map((uri) => ({
                uri,
                duration: 0,
                timestamp: new Date().toISOString(),
              }))
            : [],
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load task");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
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

      setRecording(recording);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimer.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      clearInterval(recordingTimer.current);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      const newRecording = {
        uri,
        duration: recordingTime,
        timestamp: new Date().toISOString(),
      };

      setRecordings([...recordings, newRecording]);
      setRecording(null);
      setRecordingTime(0);
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
    }
  };

  const deleteRecording = (index) => {
    const newRecordings = [...recordings];
    newRecordings.splice(index, 1);
    setRecordings(newRecordings);
  };

  // Update task - FIXED VERSION
  const handleUpdateTask = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title");
      return;
    }

    setIsSaving(true);
    try {
      const updatedTask = {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: date.toISOString(),
        recordings: recordings.map((r) => r.uri),
        updatedAt: new Date().toISOString(),
      };

      const success = await updateTask(taskId, updatedTask);

      if (success) {
        Alert.alert("Success", "Task updated successfully!");
        setTimeout(() => {
          router.back();
        }, 500);
      } else {
        Alert.alert("Error", "Failed to update task");
        setIsSaving(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update task");
      console.error(error);
      setIsSaving(false);
    }
  };

  // Delete task - FIXED VERSION
  const handleDeleteTask = async () => {
    setIsSaving(true);
    try {
      const success = await deleteTaskById(taskId);

      if (success) {
        Alert.alert("Success", "Task deleted successfully!");
        setTimeout(() => {
          router.back();
        }, 500);
      } else {
        Alert.alert("Error", "Failed to delete task");
        setIsSaving(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to delete task");
      console.error(error);
      setIsSaving(false);
    }
  };

  // Simple voice simulation
  const startVoiceInput = () => {
    setIsListening(true);
    setVoiceText("");

    const phrases = [
      "Update: Call mom tomorrow",
      "Change to: Buy groceries after work",
      "Revised: Finish the report by Friday",
      "New: Schedule dentist appointment",
      "Updated: Clean the garage this weekend",
    ];

    const selectedPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    let i = 0;
    const typeWriter = () => {
      if (i < selectedPhrase.length) {
        setVoiceText((prev) => prev + selectedPhrase.charAt(i));
        i++;
        setTimeout(typeWriter, 50);
      } else {
        setIsListening(false);
        if (!title.trim()) {
          setTitle(selectedPhrase);
        } else {
          setDescription((prev) =>
            prev ? `${prev}. ${selectedPhrase}` : selectedPhrase,
          );
        }
      }
    };

    typeWriter();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePickerChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }

    if (selectedDate) {
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
        <Text style={styles.loadingText}>Loading task...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
        <Text style={styles.errorText}>Task not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Task</Text>
          <TouchableOpacity
            style={styles.deleteHeaderButton}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Task Title */}
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Task Title *"
            style={[styles.input, styles.titleInput]}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowVoiceModal(true)}
          >
            <Ionicons name="mic-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Description */}
        <TextInput
          placeholder="Description (Optional)"
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={500}
        />

        {/* Voice Input Result */}
        {voiceText ? (
          <View style={styles.voiceResult}>
            <Text style={styles.voiceResultText}>🎤 {voiceText}</Text>
          </View>
        ) : null}

        {/* Priority Selector */}
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityContainer}>
          {["Low", "Medium", "High"].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.priorityButton,
                priority === level && styles[`priority${level}Active`],
              ]}
              onPress={() => setPriority(level)}
            >
              <Text
                style={[
                  styles.priorityText,
                  priority === level && styles.priorityTextActive,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date & Time */}
        <Text style={styles.label}>Due Date & Time</Text>
        <View style={styles.datetimeContainer}>
          <TouchableOpacity
            style={styles.datetimeButton}
            onPress={() => showPicker("date")}
          >
            <Ionicons name="calendar-outline" size={20} color="#666" />
            <Text style={styles.datetimeText}>{formatDate(date)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.datetimeButton}
            onPress={() => showPicker("time")}
          >
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.datetimeText}>{formatTime(date)}</Text>
          </TouchableOpacity>
        </View>

        {/* Audio Recording Button */}
        <TouchableOpacity
          style={styles.audioButton}
          onPress={() => setShowRecordModal(true)}
        >
          <Ionicons name="recording-outline" size={24} color="#FF3B30" />
          <Text style={styles.audioButtonText}>
            {recordings.length > 0
              ? `${recordings.length} Audio Note${recordings.length > 1 ? "s" : ""}`
              : "Add Audio Note"}
          </Text>
        </TouchableOpacity>

        {/* DateTime Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode={pickerMode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handlePickerChange}
          />
        )}

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              (!title.trim() || isSaving) && styles.buttonDisabled,
            ]}
            onPress={handleUpdateTask}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update Task</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Voice Input Modal */}
      <Modal visible={showVoiceModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Voice Input</Text>
              <TouchableOpacity onPress={() => setShowVoiceModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {isListening ? (
                <View style={styles.listeningContainer}>
                  <View style={styles.micContainer}>
                    <Ionicons name="mic" size={60} color="#007AFF" />
                    <View style={styles.pulseCircle} />
                  </View>
                  <Text style={styles.listeningText}>Listening...</Text>
                  <Text style={styles.voicePreview}>{voiceText}</Text>
                </View>
              ) : (
                <View style={styles.readyContainer}>
                  <Ionicons name="mic-outline" size={60} color="#007AFF" />
                  <Text style={styles.readyText}>Tap to speak</Text>
                  <Text style={styles.hintText}>
                    Speak clearly and press stop when done
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              {isListening ? (
                <TouchableOpacity
                  style={[styles.modalButton, styles.stopButton]}
                  onPress={() => {
                    setIsListening(false);
                    setShowVoiceModal(false);
                  }}
                >
                  <Ionicons name="square" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Stop</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.startButton]}
                  onPress={startVoiceInput}
                >
                  <Ionicons name="mic" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Start Speaking</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Audio Recording Modal */}
      <Modal visible={showRecordModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audio Notes</Text>
              <TouchableOpacity onPress={() => setShowRecordModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.recordingsList}>
              {recordings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="mic-off-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyText}>No recordings yet</Text>
                </View>
              ) : (
                recordings.map((rec, index) => (
                  <View key={index} style={styles.recordingItem}>
                    <View style={styles.recordingInfo}>
                      <Text style={styles.recordingTitle}>
                        Recording {index + 1}
                      </Text>
                      <Text style={styles.recordingMeta}>
                        {formatRecordingTime(rec.duration)} •{" "}
                        {new Date(rec.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={styles.recordingActions}>
                      <TouchableOpacity onPress={() => playRecording(rec.uri)}>
                        <Ionicons
                          name="play-circle"
                          size={28}
                          color="#007AFF"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteRecording(index)}>
                        <Ionicons
                          name="trash-outline"
                          size={24}
                          color="#FF3B30"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.recordingControls}>
              {isRecording ? (
                <View style={styles.recordingStatus}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingTimeText}>
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
                  <Text style={styles.modalButtonText}>
                    {recordings.length > 0 ? "Add Another" : "Start Recording"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Ionicons
              name="warning"
              size={50}
              color="#FF3B30"
              style={styles.warningIcon}
            />
            <Text style={styles.confirmModalTitle}>Delete Task</Text>
            <Text style={styles.confirmModalText}>
              Are you sure you want to delete "{task.title}"? This action cannot
              be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelConfirmButton]}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={handleDeleteTask}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                )}
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
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#FF3B30",
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#333",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    flex: 1,
  },
  deleteHeaderButton: {
    padding: 10,
    backgroundColor: "#ffebee",
    borderRadius: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  titleInput: {
    flex: 1,
    marginRight: 10,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  iconButton: {
    padding: 10,
    backgroundColor: "#f0f8ff",
    borderRadius: 10,
  },
  voiceResult: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  voiceResultText: {
    fontSize: 14,
    color: "#333",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    marginHorizontal: 4,
    alignItems: "center",
  },
  priorityLowActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#4CAF50",
  },
  priorityMediumActive: {
    backgroundColor: "#fff8e1",
    borderColor: "#ff9800",
  },
  priorityHighActive: {
    backgroundColor: "#ffebee",
    borderColor: "#f44336",
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "500",
  },
  priorityTextActive: {
    fontWeight: "600",
  },
  datetimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  datetimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginHorizontal: 5,
  },
  datetimeText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
  },
  audioButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff5f5",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ffebee",
    marginBottom: 30,
  },
  audioButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "500",
  },
  buttonContainer: {
    marginTop: 10,
  },
  button: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: "#b0b0b0",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#666",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
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
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  modalBody: {
    padding: 40,
    alignItems: "center",
    minHeight: 200,
    justifyContent: "center",
  },
  micContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseCircle: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#007AFF20",
  },
  listeningText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginTop: 20,
  },
  voicePreview: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  readyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
  },
  hintText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  modalActions: {
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
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  // Recording Modal
  recordingsList: {
    maxHeight: 300,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
  recordingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  recordingMeta: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: "row",
    gap: 15,
  },
  recordingControls: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  recordingStatus: {
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
  recordingTimeText: {
    fontSize: 14,
    color: "#333",
  },
  startRecordingButton: {
    backgroundColor: "#FF3B30",
  },
  stopRecordingButton: {
    backgroundColor: "#1a1a1a",
  },
  // Delete Confirmation Modal
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  warningIcon: {
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  confirmModalText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmModalButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelConfirmButton: {
    backgroundColor: "#f0f0f0",
  },
  deleteConfirmButton: {
    backgroundColor: "#FF3B30",
  },
  cancelConfirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
