import AsyncStorage from "@react-native-async-storage/async-storage";

const TASKS_STORAGE_KEY = "@tasks";

export const getTasks = async () => {
  try {
    const tasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
    return tasksJson ? JSON.parse(tasksJson) : [];
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
};

export const saveTasks = async (tasks) => {
  try {
    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    console.log("Tasks saved successfully:", tasks.length); // Add this log
  } catch (error) {
    console.error("Error saving tasks:", error);
  }
};

// Update existing task - IMPROVED with better error handling
export const updateTask = async (id, updatedData) => {
  try {
    if (!id) {
      console.error("Update task failed: No ID provided");
      return false;
    }

    const tasks = await getTasks();
    const taskExists = tasks.some((task) => task.id === id);

    if (!taskExists) {
      console.error(`Update task failed: Task with ID ${id} not found`);
      return false;
    }

    const updatedTasks = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            ...updatedData,
            updatedAt: new Date().toISOString(),
          }
        : task,
    );

    await saveTasks(updatedTasks);
    return true;
  } catch (error) {
    console.error("Error updating task:", error);
    return false;
  }
};

// Get single task by ID
export const getTask = async (id) => {
  try {
    if (!id) {
      console.error("Get task failed: No ID provided");
      return null;
    }

    const tasks = await getTasks();
    const task = tasks.find((task) => task.id === id);

    if (!task) {
      console.log(`Task with ID ${id} not found`);
      return null;
    }

    return task;
  } catch (error) {
    console.error("Error getting task:", error);
    return null;
  }
};

// Delete task by ID
export const deleteTask = async (id) => {
  try {
    if (!id) {
      console.error("Delete task failed: No ID provided");
      return false;
    }

    const tasks = await getTasks();
    const taskExists = tasks.some((task) => task.id === id);

    if (!taskExists) {
      console.error(`Delete task failed: Task with ID ${id} not found`);
      return false;
    }

    const updatedTasks = tasks.filter((task) => task.id !== id);
    await saveTasks(updatedTasks);
    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

// Toggle task completion status
export const toggleTaskCompletion = async (id) => {
  try {
    if (!id) {
      console.error("Toggle task failed: No ID provided");
      return false;
    }

    const tasks = await getTasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
      console.error(`Toggle task failed: Task with ID ${id} not found`);
      return false;
    }

    const task = tasks[taskIndex];
    const updatedTask = {
      ...task,
      completed: !task.completed,
      completedAt: !task.completed ? new Date().toISOString() : null,
    };

    tasks[taskIndex] = updatedTask;
    await saveTasks(tasks);
    return true;
  } catch (error) {
    console.error("Error toggling task:", error);
    return false;
  }
};

// Add new task
export const addTask = async (task) => {
  try {
    if (!task || !task.title) {
      console.error("Add task failed: Task must have a title");
      throw new Error("Task must have a title");
    }

    const tasks = await getTasks();
    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completed: task.completed || false,
    };

    const updatedTasks = [newTask, ...tasks];
    await saveTasks(updatedTasks);
    return newTask;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};

// Clear all tasks (useful for testing)
export const clearAllTasks = async () => {
  try {
    await AsyncStorage.removeItem(TASKS_STORAGE_KEY);
    console.log("All tasks cleared");
    return true;
  } catch (error) {
    console.error("Error clearing tasks:", error);
    return false;
  }
};

// Get task count
export const getTaskCount = async () => {
  try {
    const tasks = await getTasks();
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.completed).length,
      pending: tasks.filter((t) => !t.completed).length,
    };
  } catch (error) {
    console.error("Error getting task count:", error);
    return { total: 0, completed: 0, pending: 0 };
  }
};
