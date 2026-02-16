import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
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
  Vibration,
  View,
} from "react-native";
import { getTask, updateTask } from "../utils/storage";

export default function EditTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { taskId } = route.params;

  const [task, setTask] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Voice recording states
  const [recording, setRecording] = useState(null);
  const [recordings, setRecordings] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPermission, setAudioPermission] = useState(null);

  // Voice-to-text states (using speech recognition simulation)
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [partialText, setPartialText] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const recordingTimer = useRef(null);
  const speechTimeout = useRef(null);

  // Load task data
  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  // Initialize audio permissions
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === "granted");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();

    return () => {
      if (speechTimeout.current) {
        clearTimeout(speechTimeout.current);
      }
      stopListening();
    };
  }, []);

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
        setRecognizedText(taskData.voiceNote || "");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load task");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate voice recognition
  const simulateVoiceRecognition = () => {
    const phrases = [
      "Update task for tomorrow",
      "Complete the project report",
      "Buy groceries after work",
      "Call mom in the evening",
      "Prepare for the meeting",
      "Finish the assignment",
      "Exercise for 30 minutes",
      "Read a book before bed",
      "Clean the house this weekend",
      "Pay the bills on time",
    ];

    let currentText = "";
    const targetText = phrases[Math.floor(Math.random() * phrases.length)];

    const typeText = () => {
      if (currentText.length < targetText.length) {
        currentText = targetText.substring(0, currentText.length + 1);
        setPartialText(currentText);
        speechTimeout.current = setTimeout(typeText, 50);
      } else {
        setRecognizedText(currentText);
        setPartialText("");

        if (!title.trim()) {
          setTitle(currentText);
        } else {
          setDescription((prev) =>
            prev ? `${prev}. ${currentText}` : currentText,
          );
        }

        setTimeout(() => {
          setIsListening(false);
          setIsProcessing(false);
        }, 1000);
      }
    };

    typeText();
  };

  const startListening = () => {
    if (!audioPermission) {
      setVoiceError("Microphone permission not granted");
      return;
    }

    setIsListening(true);
    setIsProcessing(true);
    setVoiceError("");
    setRecognizedText("");
    setPartialText("");

    Vibration.vibrate(50);

    setTimeout(() => {
      simulateVoiceRecognition();
    }, 1000);
  };

  const stopListening = () => {
    setIsListening(false);
    setIsProcessing(false);
    if (speechTimeout.current) {
      clearTimeout(speechTimeout.current);
    }

    if (partialText && !recognizedText) {
      setRecognizedText(partialText);
      if (!title.trim()) {
        setTitle(partialText);
      } else {
        setDescription((prev) =>
          prev ? `${prev} ${partialText}` : partialText,
        );
      }
    }

    setPartialText("");
  };

  // Audio recording functions
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

      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/success.mp3"),
      );
      await sound.playAsync();
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

  // Update task
  const handleUpdateTask = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    try {
      setIsSaving(true);

      const success = await updateTask(taskId, {
        title,
        description,
      });

      if (success) {
        Alert.alert("Success", "Task updated successfully!");
        navigation.goBack();
      } else {
        Alert.alert("Error", "Failed to update task");
      }
    } catch (error) {
      console.error("Update task error:", error);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    setIsSaving(true);
    try {
      await deleteTaskById(taskId);

      Alert.alert("Success", "Task deleted successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to delete task");
      console.error(error);
      setIsSaving(false);
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
          onPress={() => navigation.goBack()}
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Task</Text>
          <TouchableOpacity
            style={styles.deleteHeaderButton}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Task Title with Voice Input */}
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Task Title *</Text>
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={() => setShowVoiceModal(true)}
          >
            <Ionicons name="mic-outline" size={20} color="#007AFF" />
            <Text style={styles.voiceButtonText}>Voice Input</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder="What needs to be done?"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Description with Voice Input */}
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={() => setShowVoiceModal(true)}
          >
            <Ionicons name="mic-outline" size={20} color="#007AFF" />
            <Text style={styles.voiceButtonText}>Add by Voice</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder="Add details about this task..."
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          maxLength={500}
        />

        {/* Voice-to-Text Results */}
        {(recognizedText || partialText) && (
          <View style={styles.voiceResultContainer}>
            <Text style={styles.voiceResultLabel}>
              {isListening ? "Listening..." : "Voice Input"}
            </Text>
            <Text style={styles.voiceResultText}>
              {recognizedText || partialText}
            </Text>
          </View>
        )}

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

        {/* Date & Time Selectors */}
        <Text style={styles.label}>Due Date & Time</Text>

        <TouchableOpacity
          style={styles.selector}
          onPress={() => showPicker("date")}
          activeOpacity={0.7}
        >
          <Text style={styles.selectorLabel}>📅 Date</Text>
          <Text style={styles.selectorText}>{formatDate(date)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selector}
          onPress={() => showPicker("time")}
          activeOpacity={0.7}
        >
          <Text style={styles.selectorLabel}>⏰ Time</Text>
          <Text style={styles.selectorText}>{formatTime(date)}</Text>
        </TouchableOpacity>

        {/* Audio Recording Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>Audio Notes</Text>
          <TouchableOpacity
            style={styles.voiceButton}
            onPress={() => setShowRecordModal(true)}
          >
            <Ionicons name="recording-outline" size={20} color="#FF3B30" />
            <Text style={[styles.voiceButtonText, { color: "#FF3B30" }]}>
              {recordings.length} Recordings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Combined DateTimePicker for iOS */}
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

        {/* Android Date Picker */}
        {showDatePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handlePickerChange}
            minimumDate={new Date()}
          />
        )}

        {/* Android Time Picker */}
        {showTimePicker && Platform.OS === "android" && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={handlePickerChange}
            is24Hour={false}
          />
        )}

        {/* Update Task Button */}
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

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isSaving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Voice-to-Text Modal */}
      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowVoiceModal(false);
          stopListening();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Voice Input</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowVoiceModal(false);
                  stopListening();
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.voiceModalBody}>
              {voiceError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning-outline" size={40} color="#FF3B30" />
                  <Text style={styles.errorText}>{voiceError}</Text>
                  <Text style={styles.errorSubtext}>
                    Please check microphone permissions and try again.
                  </Text>
                </View>
              ) : isListening ? (
                <View style={styles.listeningContainer}>
                  <View style={[styles.pulseAnimation, styles.pulse]}>
                    <Ionicons name="mic" size={60} color="#007AFF" />
                  </View>
                  <Text style={styles.listeningText}>Listening...</Text>
                  <Text style={styles.recordingText}>
                    {partialText || "Speak now..."}
                  </Text>
                  <Text style={styles.hintText}>
                    Speak clearly into the microphone
                  </Text>
                </View>
              ) : (
                <View style={styles.readyContainer}>
                  <Ionicons name="mic-outline" size={60} color="#007AFF" />
                  <Text style={styles.readyText}>Ready to Listen</Text>
                  <Text style={styles.hintText}>
                    Tap the button below to start speaking
                  </Text>
                  <Text style={styles.demoHint}>
                    (Demo: This simulates voice input with sample phrases)
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              {isListening ? (
                <TouchableOpacity
                  style={[styles.modalButton, styles.stopButton]}
                  onPress={stopListening}
                >
                  <Ionicons name="square" size={20} color="#fff" />
                  <Text style={styles.modalButtonText}>Stop Listening</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.startButton]}
                  onPress={startListening}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="mic" size={20} color="#fff" />
                      <Text style={styles.modalButtonText}>Start Speaking</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowVoiceModal(false);
                  stopListening();
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#666" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audio Recording Modal */}
      <Modal
        visible={showRecordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRecordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Audio Recordings ({recordings.length})
              </Text>
              <TouchableOpacity onPress={() => setShowRecordModal(false)}>
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
                  <Text style={styles.emptyRecordingsSubtext}>
                    Record audio notes for your task
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
                      <Text style={styles.recordingTime}>
                        {new Date(rec.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View style={styles.recordingActions}>
                      <TouchableOpacity
                        style={styles.recordingAction}
                        onPress={() => playRecording(rec.uri)}
                      >
                        <Ionicons
                          name="play-circle-outline"
                          size={24}
                          color="#007AFF"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.recordingAction}
                        onPress={() => deleteRecording(index)}
                      >
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
                  <Text style={styles.modalButtonText}>
                    {recordings.length === 0
                      ? "Start Recording"
                      : "Add Another"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalButton, styles.doneButton]}
                onPress={() => setShowRecordModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: "#007AFF" }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Ionicons name="warning" size={50} color="#FF3B30" />
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
    padding: 10,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#333",
  },
  deleteHeaderButton: {
    padding: 10,
    backgroundColor: "#ffebee",
    borderRadius: 10,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    flex: 1,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  voiceButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "#f0f8ff",
  },
  voiceButtonText: {
    fontSize: 12,
    color: "#007AFF",
    marginLeft: 4,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  voiceResultContainer: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#d0e8ff",
  },
  voiceResultLabel: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
    marginBottom: 4,
  },
  voiceResultText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  priorityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    marginHorizontal: 4,
    alignItems: "center",
    backgroundColor: "#fff",
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
    color: "#666",
  },
  priorityTextActive: {
    color: "#333",
    fontWeight: "600",
  },
  selector: {
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  selectorLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  selectorText: {
    fontSize: 16,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  iosPickerContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 10,
  },
  iosPicker: {
    height: 200,
  },
  iosPickerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
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
  button: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 10,
    marginTop: 30,
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
  modalContainer: {
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
  voiceModalBody: {
    padding: 30,
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  pulse: {
    backgroundColor: "#e6f2ff",
  },
  listeningText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 10,
  },
  recordingText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
    fontStyle: "italic",
    minHeight: 24,
  },
  readyContainer: {
    alignItems: "center",
  },
  readyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  hintText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
  },
  demoHint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
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
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
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
    marginBottom: 10,
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
  cancelModalButton: {
    backgroundColor: "#f0f0f0",
  },

  // Recording Modal Styles
  recordingsList: {
    maxHeight: 300,
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
  emptyRecordingsSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 5,
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
  recordingIndex: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  recordingDuration: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  recordingTime: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: "row",
  },
  recordingAction: {
    marginLeft: 15,
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
  doneButton: {
    backgroundColor: "#f0f8ff",
    marginTop: 10,
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
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 16,
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
