// src/utils/storage.js
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
  } catch (error) {
    console.error("Error saving tasks:", error);
  }
};
// Update existing task
export const updateTask = async (id, updatedData) => {
  try {
    const tasks = await getTasks();
    const updatedTasks = tasks.map((task) =>
      task.id === id
        ? { ...task, ...updatedData, updatedAt: new Date().toISOString() }
        : task,
    );
    await saveTasks(updatedTasks);
    return true;
  } catch (error) {
    console.error("Error updating task:", error);
    return false;
  }
};
export const getTask = async (id) => {
  try {
    const tasks = await getTasks();
    return tasks.find((task) => task.id === id);
  } catch (error) {
    console.error("Error getting task:", error);
    return null;
  }
};

export const deleteTask = async (id) => {
  try {
    const tasks = await getTasks();
    const updatedTasks = tasks.filter((task) => task.id !== id);
    await saveTasks(updatedTasks);
    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

export const toggleTaskCompletion = async (id) => {
  try {
    const tasks = await getTasks();
    const updatedTasks = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? new Date().toISOString() : null,
          }
        : task,
    );
    await saveTasks(updatedTasks);
    return true;
  } catch (error) {
    console.error("Error toggling task:", error);
    return false;
  }
};

export const addTask = async (task) => {
  try {
    const tasks = await getTasks();
    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updatedTasks = [newTask, ...tasks];
    await saveTasks(updatedTasks);
    return newTask;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};
