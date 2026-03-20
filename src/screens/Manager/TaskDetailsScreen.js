// src/screens/manager/TaskDetailsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { getRequest, putRequest } from "../../services/apiService";

export default function TaskDetailsScreen({ route }) {
  const navigation = useNavigation();
  const { taskId, user } = route.params || {};
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completionNotes, setCompletionNotes] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await getRequest(`/task/get-task/${taskId}`);
      setTask(response.task);
    } catch (error) {
      console.error("Error loading task:", error);
      Alert.alert("Error", "Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    try {
      await putRequest(`/task/complete-task/${taskId}`, {
        userId: user?.UserID,
        notes: completionNotes
      });

      Alert.alert(
        "Success",
        "Task marked as complete!",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error completing task:", error);
      Alert.alert("Error", "Failed to complete task");
    }
  };

  const handleReopenTask = async () => {
    Alert.alert(
      "Reopen Task",
      "Are you sure you want to reopen this task?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reopen",
          style: "destructive",
          onPress: async () => {
            try {
              await putRequest(`/task/reopen-task/${taskId}`, {
                userId: user?.UserID
              });
              loadTaskDetails();
            } catch (error) {
              console.error("Error reopening task:", error);
              Alert.alert("Error", "Failed to reopen task");
            }
          }
        }
      ]
    );
  };

  const handleUpdateProgress = async (newProgress) => {
    try {
      await putRequest(`/task/update-progress/${taskId}`, {
        progress: newProgress
      });
      loadTaskDetails();
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2599f7" />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Task not found</Text>
      </SafeAreaView>
    );
  }

  const isCompleted = task.Status === 'completed';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isCompleted ? '#4CAF50' : '#FF9800' }
          ]}>
            <Text style={styles.statusText}>
              {isCompleted ? '✓ Completed' : '● In Progress'}
            </Text>
          </View>
        </View>

        {/* Task Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Task Title</Text>
          <Text style={styles.value}>{task.Title}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>
            {task.Description || 'No description provided'}
          </Text>
        </View>

        <View style={styles.row}>
          <View style={styles.halfSection}>
            <Text style={styles.label}>Priority</Text>
            <View style={[styles.priorityBadge, { 
              backgroundColor: task.Priority === 'High' ? '#f72585' :
                              task.Priority === 'Normal' ? '#f8961e' : '#43aa8b'
            }]}>
              <Text style={styles.priorityText}>{task.Priority}</Text>
            </View>
          </View>

          <View style={styles.halfSection}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.value}>
              {new Date(task.DueDate).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Assignment Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Assigned To</Text>
          <Text style={styles.value}>{task.AssignedToName}</Text>
          <Text style={styles.subValue}>{task.AssignedToRole}</Text>
        </View>

        {/* Project Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Project</Text>
          <Text style={styles.value}>{task.ProjectName}</Text>
        </View>

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <Text style={styles.label}>Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${task.Progress || 0}%` }]} />
          </View>
          <Text style={styles.progressText}>{task.Progress || 0}% Complete</Text>
        </View>

        {/* Completion Info (if completed) */}
        {isCompleted && task.CompletedAt && (
          <View style={styles.completionSection}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.completionText}>
              Completed on {new Date(task.CompletedAt).toLocaleDateString()}
            </Text>
            {task.CompletionNotes && (
              <Text style={styles.completionNotes}>Notes: {task.CompletionNotes}</Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!isCompleted ? (
            <>
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => setShowCompleteModal(true)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Mark Complete</Text>
              </TouchableOpacity>

              {/* Progress Update Buttons */}
              <View style={styles.progressButtons}>
                {[25, 50, 75].map(progress => (
                  <TouchableOpacity
                    key={progress}
                    style={styles.progressButton}
                    onPress={() => handleUpdateProgress(progress)}
                  >
                    <Text style={styles.progressButtonText}>{progress}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={styles.reopenButton}
              onPress={handleReopenTask}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.buttonText}>Reopen Task</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Complete Task Modal */}
      <Modal
        visible={showCompleteModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Task</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Add completion notes (optional)"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCompleteModal(false);
                  setCompletionNotes("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => {
                  handleCompleteTask();
                  setShowCompleteModal(false);
                }}
              >
                <Text style={styles.modalConfirmText}>Complete</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2599f7',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  subValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginVertical: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: '#2599f7',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  completionSection: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 14,
    color: '#2e7d32',
    marginTop: 8,
  },
  completionNotes: {
    fontSize: 14,
    color: '#2e7d32',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    marginTop: 20,
    marginBottom: 40,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  reopenButton: {
    backgroundColor: '#f72585',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  progressButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  progressButton: {
    flex: 1,
    backgroundColor: '#e9ecef',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  progressButtonText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});