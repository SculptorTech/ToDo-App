import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getTasks, saveTasks } from "../utils/storage";

export default function TaskListScreen() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | pending | completed
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation();

  // Load tasks on initial mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, refreshing tasks...");
      loadTasks();
    }, []),
  );

  const loadTasks = async () => {
    try {
      const stored = await getTasks();
      console.log("Loaded tasks:", stored?.length || 0);
      setTasks(stored || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const toggleTaskCompletion = async (id) => {
    const updated = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? new Date().toISOString() : null,
          }
        : t,
    );
    setTasks(updated);
    await saveTasks(updated);
  };

  const deleteTask = async (id) => {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = tasks.filter((t) => t.id !== id);
          setTasks(updated);
          await saveTasks(updated);
        },
      },
    ]);
  };

  const logout = () => {
    try {
      console.log("Logging out...");
      navigation.replace("Login");
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to logout");
    }
  };

  // ===== DYNAMIC FILTERING + SORTING =====
  const visibleTasks = useMemo(() => {
    let list = [...tasks];

    // search
    if (search.trim()) {
      list = list.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // filter
    if (filter === "pending") list = list.filter((t) => !t.completed);
    if (filter === "completed") list = list.filter((t) => t.completed);

    // sort: pending first, then completed
    list.sort((a, b) => {
      if (!a.completed && b.completed) return -1;
      if (a.completed && !b.completed) return 1;

      if (!a.completed && !b.completed) {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }

      // Both completed - most recent first
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return new Date(b.completedAt) - new Date(a.completedAt);
    });

    return list;
  }, [tasks, search, filter]);

  const handleTaskComplete = async (id) => {
    const updated = tasks.map((t) =>
      t.id === id
        ? {
            ...t,
            completed: true,
            completedAt: new Date().toISOString(),
          }
        : t,
    );
    setTasks(updated);
    await saveTasks(updated);
  };

  const getStatsText = () => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = tasks.filter((t) => !t.completed).length;
    return `Total: ${total} | Completed: ${completed} | Pending: ${pending}`;
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>My Tasks</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <TextInput
        placeholder="Search tasks..."
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      {/* FILTERS */}
      <View style={styles.filters}>
        <TouchableOpacity
          onPress={() => setFilter("all")}
          style={[styles.filterBtn, filter === "all" && styles.filterActive]}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("pending")}
          style={[
            styles.filterBtn,
            filter === "pending" && styles.filterActive,
          ]}
        >
          <Text
            style={[
              styles.filterText,
              filter === "pending" && styles.filterTextActive,
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilter("completed")}
          style={[
            styles.filterBtn,
            filter === "completed" && styles.filterActive,
          ]}
        >
          <Text
            style={[
              styles.filterText,
              filter === "completed" && styles.filterTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* STATS */}
      <View style={styles.stats}>
        <Text style={styles.statText}>{getStatsText()}</Text>
      </View>

      {/* TASK LIST */}
      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggleComplete={() => handleTaskComplete(item.id)}
            onDelete={() => deleteTask(item.id)}
            onEdit={() => navigation.navigate("EditTask", { taskId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>
              {filter === "completed"
                ? "No completed tasks"
                : filter === "pending"
                  ? "No pending tasks"
                  : "No tasks yet"}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("AddTask")}>
              <Text style={styles.addTaskPrompt}>+ Add a new task</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddTask")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// TaskItem component with edit button
function TaskItem({ task, onToggleComplete, onDelete, onEdit }) {
  const getPriorityColor = () => {
    switch (task.priority) {
      case "High":
        return "#ff6b6b";
      case "Medium":
        return "#ffd93d";
      case "Low":
        return "#6bcf7f";
      default:
        return "#ddd";
    }
  };

  const getPriorityText = () => {
    return task.priority ? task.priority : "None";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <View
      style={[
        styles.taskContainer,
        task.completed && styles.taskContainerCompleted,
      ]}
    >
      <View style={styles.taskContent}>
        {/* CHECKBOX */}
        <TouchableOpacity
          onPress={onToggleComplete}
          style={styles.checkboxContainer}
          disabled={task.completed}
        >
          <View
            style={[
              styles.checkbox,
              task.completed && styles.checkboxChecked,
              { borderColor: task.completed ? "#4CAF50" : getPriorityColor() },
            ]}
          >
            {task.completed && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* TASK DETAILS */}
        <View style={styles.taskDetails}>
          <View style={styles.taskHeader}>
            <Text
              style={[
                styles.taskTitle,
                task.completed && styles.taskTitleCompleted,
              ]}
            >
              {task.title}
            </Text>
            {task.priority && !task.completed && (
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor() + "20" },
                ]}
              >
                <Text
                  style={[styles.priorityText, { color: getPriorityColor() }]}
                >
                  {getPriorityText()}
                </Text>
              </View>
            )}
          </View>

          {task.description ? (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {task.description}
            </Text>
          ) : null}

          <View style={styles.taskFooter}>
            {task.dueDate ? (
              <Text
                style={[
                  styles.dueDate,
                  task.completed ? styles.dueDateCompleted : {},
                ]}
              >
                Due: {formatDate(task.dueDate)}
              </Text>
            ) : null}

            {task.completedAt ? (
              <Text style={styles.completedDate}>
                Done: {formatDate(task.completedAt)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtons}>
          {/* EDIT BUTTON (only for non-completed tasks) */}
          {!task.completed && (
            <TouchableOpacity
              onPress={onEdit}
              style={styles.editBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}

          {/* DELETE BUTTON (only for completed tasks) */}
          {task.completed && (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  logoutBtn: {
    backgroundColor: "#ffebee",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  logoutText: {
    color: "#d32f2f",
    fontWeight: "600",
    fontSize: 14,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 16,
    fontSize: 16,
  },
  filters: {
    flexDirection: "row",
    marginBottom: 12,
    justifyContent: "center",
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#ddd",
    marginHorizontal: 4,
    backgroundColor: "#fff",
  },
  filterActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  stats: {
    backgroundColor: "#e3f2fd",
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: "center",
  },
  statText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "500",
  },
  taskContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskContainerCompleted: {
    backgroundColor: "#f8f9fa",
    borderColor: "#e9ecef",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  checkboxContainer: {
    marginRight: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  checkmark: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  taskDetails: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginRight: 8,
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#888",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
  },
  taskDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 18,
  },
  taskFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  dueDate: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
    marginTop: 4,
  },
  dueDateCompleted: {
    backgroundColor: "#e8f5e9",
    color: "#4CAF50",
  },
  completedDate: {
    fontSize: 12,
    color: "#4CAF50",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  editBtn: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#e3f2fd",
    borderRadius: 4,
  },
  editText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "600",
  },
  deleteBtn: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#ffebee",
    borderRadius: 4,
  },
  deleteText: {
    fontSize: 12,
    color: "#d32f2f",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    padding: 20,
  },
  empty: {
    textAlign: "center",
    fontSize: 18,
    color: "#888",
    marginBottom: 16,
  },
  addTaskPrompt: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 36,
    backgroundColor: "#1a1a1a",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "300",
    marginTop: -2,
  },
});
