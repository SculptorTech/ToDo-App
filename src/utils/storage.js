// src/utils/storage.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// KEYS
export const STORAGE_KEYS = {
  USERS: "taskflow_users",
  PROJECTS: "taskflow_projects",
  TASKS: "taskflow_tasks",
  TEAMS: "taskflow_teams",
  CURRENT_USER: "taskflow_current_user",
  ACTIVITY_LOG: "taskflow_activity_log",
};

// ========== USER MANAGEMENT ==========
export const getUsers = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting users:", error);
    return [];
  }
};

export const saveUsers = async (users) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return true;
  } catch (error) {
    console.error("Error saving users:", error);
    return false;
  }
};

export const addUser = async (user) => {
  try {
    const users = await getUsers();
    const newUser = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await saveUsers(users);
    await logActivity("user_added", `User ${user.name} added`);
    return newUser;
  } catch (error) {
    console.error("Error adding user:", error);
    return null;
  }
};

export const updateUser = async (userId, updates) => {
  try {
    const users = await getUsers();
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      await saveUsers(users);
      await logActivity("user_updated", `User ${users[index].name} updated`);
      return users[index];
    }
    return null;
  } catch (error) {
    console.error("Error updating user:", error);
    return null;
  }
};

export const deleteUser = async (userId) => {
  try {
    const users = await getUsers();
    const user = users.find((u) => u.id === userId);
    const filtered = users.filter((u) => u.id !== userId);
    await saveUsers(filtered);
    await logActivity("user_deleted", `User ${user?.name} deleted`);
    return true;
  } catch (error) {
    console.error("Error deleting user:", error);
    return false;
  }
};

// ========== PROJECT MANAGEMENT ==========
export const getProjects = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting projects:", error);
    return [];
  }
};

export const saveProjects = async (projects) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    return true;
  } catch (error) {
    console.error("Error saving projects:", error);
    return false;
  }
};

export const addProject = async (project) => {
  try {
    const projects = await getProjects();
    const newProject = {
      ...project,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      tasks: [],
      teams: [],
    };
    projects.push(newProject);
    await saveProjects(projects);
    await logActivity("project_created", `Project ${project.name} created`);
    return newProject;
  } catch (error) {
    console.error("Error adding project:", error);
    return null;
  }
};

export const updateProject = async (projectId, updates) => {
  try {
    const projects = await getProjects();
    const index = projects.findIndex((p) => p.id === projectId);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates };
      await saveProjects(projects);
      await logActivity(
        "project_updated",
        `Project ${projects[index].name} updated`,
      );
      return projects[index];
    }
    return null;
  } catch (error) {
    console.error("Error updating project:", error);
    return null;
  }
};

export const deleteProject = async (projectId) => {
  try {
    console.log("🗑️ Simple delete for ID:", projectId);

    // Direct AsyncStorage access
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    const data = await AsyncStorage.getItem("taskflow_projects");
    const projects = JSON.parse(data || "[]");

    const filtered = projects.filter((p) => p.id !== projectId);

    await AsyncStorage.setItem("taskflow_projects", JSON.stringify(filtered));
    console.log("✅ Simple delete completed");

    return true;
  } catch (error) {
    console.error("❌ Simple delete error:", error);
    return false;
  }
};
// ========== TASK MANAGEMENT ==========
export const getTasks = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TASKS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
};

export const saveTasks = async (tasks) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Error saving tasks:", error);
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
      status: "pending",
      comments: [],
    };
    tasks.push(newTask);
    await saveTasks(tasks);
    await logActivity("task_created", `Task ${task.title} created`);
    return newTask;
  } catch (error) {
    console.error("Error adding task:", error);
    return null;
  }
};

export const updateTask = async (taskId, updates) => {
  try {
    const tasks = await getTasks();
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      await saveTasks(tasks);
      await logActivity("task_updated", `Task ${tasks[index].title} updated`);
      return tasks[index];
    }
    return null;
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
};

export const deleteTask = async (taskId) => {
  try {
    const tasks = await getTasks();
    const task = tasks.find((t) => t.id === taskId);
    const filtered = tasks.filter((t) => t.id !== taskId);
    await saveTasks(filtered);
    await logActivity("task_deleted", `Task ${task?.title} deleted`);
    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

export const getTasksByUser = async (userId) => {
  try {
    const tasks = await getTasks();
    return tasks.filter((t) => t.assignedTo === userId);
  } catch (error) {
    console.error("Error getting user tasks:", error);
    return [];
  }
};

export const getTasksByProject = async (projectId) => {
  try {
    const tasks = await getTasks();
    return tasks.filter((t) => t.projectId === projectId);
  } catch (error) {
    console.error("Error getting project tasks:", error);
    return [];
  }
};

// ========== TEAM MANAGEMENT ==========
export const getTeams = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TEAMS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting teams:", error);
    return [];
  }
};

export const saveTeams = async (teams) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    return true;
  } catch (error) {
    console.error("Error saving teams:", error);
    return false;
  }
};

export const addTeam = async (team) => {
  try {
    const teams = await getTeams();
    const newTeam = {
      ...team,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      members: [],
    };
    teams.push(newTeam);
    await saveTeams(teams);
    await logActivity("team_created", `Team ${team.name} created`);
    return newTeam;
  } catch (error) {
    console.error("Error adding team:", error);
    return null;
  }
};

export const addUserToTeam = async (teamId, userId) => {
  try {
    const teams = await getTeams();
    const index = teams.findIndex((t) => t.id === teamId);
    if (index !== -1) {
      if (!teams[index].members.includes(userId)) {
        teams[index].members.push(userId);
        await saveTeams(teams);
        await logActivity(
          "team_updated",
          `User added to team ${teams[index].name}`,
        );
      }
      return teams[index];
    }
    return null;
  } catch (error) {
    console.error("Error adding user to team:", error);
    return null;
  }
};
// Add this temporary function to clear data
export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    console.log("All data cleared");
    return true;
  } catch (error) {
    console.error("Error clearing data:", error);
    return false;
  }
};
// ========== ACTIVITY LOG ==========
export const logActivity = async (type, description) => {
  try {
    const currentUser = await getCurrentUser();
    const logs = await getActivityLogs();
    const newLog = {
      id: Date.now().toString(),
      type,
      description,
      userId: currentUser?.id,
      userName: currentUser?.name,
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep only last 50 activities
    const recentLogs = logs.slice(0, 50);
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACTIVITY_LOG,
      JSON.stringify(recentLogs),
    );
    return true;
  } catch (error) {
    console.error("Error logging activity:", error);
    return false;
  }
};

export const getActivityLogs = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITY_LOG);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting activity logs:", error);
    return [];
  }
};

// ========== CURRENT USER ==========
export const setCurrentUser = async (user) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return true;
  } catch (error) {
    console.error("Error setting current user:", error);
    return false;
  }
};

export const getCurrentUser = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// In src/utils/storage.js
export const clearCurrentUser = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    console.log("✅ Current user cleared");
    return true;
  } catch (error) {
    console.error("Error clearing current user:", error);
    return false;
  }
};

// ========== INITIALIZE DEFAULT DATA ==========
export const initializeDefaultData = async () => {
  try {
    // Check if already initialized
    const users = await getUsers();
    if (users.length > 0) return;

    // Default Users sankdg do as g  the sdi r tsg hetryr urir pp yifi i

    const defaultUsers = [
      {
        id: "1",
        name: "Admin User",
        email: "admin@example.com",
        password: "admin123",
        role: "admin",
        department: "Management",
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        name: "Manager User",
        email: "manager@example.com",
        password: "manager123",
        role: "manager",
        department: "Engineering",
        createdAt: new Date().toISOString(),
      },
      {
        id: "3",
        name: "Team Lead User",
        email: "teamlead@example.com",
        password: "teamlead123",
        role: "team_lead",
        department: "Development",
        createdAt: new Date().toISOString(),
      },
      {
        id: "4",
        name: "Developer User",
        email: "dev@example.com",
        password: "dev123",
        role: "developer",
        department: "Development",
        createdAt: new Date().toISOString(),
      },
      {
        id: "5",
        name: "Viewer User",
        email: "viewer@example.com",
        password: "viewer123",
        role: "viewer",
        department: "Operations",
        createdAt: new Date().toISOString(),
      },
    ];

    // Default Projects
    const defaultProjects = [
      {
        id: "p1",
        name: "E-Commerce Mobile App",
        description: "Full-featured e-commerce app",
        status: "active",
        progress: 65,
        createdAt: new Date().toISOString(),
        managerId: "2",
        teamIds: ["t1"],
      },
      {
        id: "p2",
        name: "CRM Integration",
        description: "Customer relationship management",
        status: "active",
        progress: 42,
        createdAt: new Date().toISOString(),
        managerId: "2",
        teamIds: ["t1", "t2"],
      },
    ];

    // Default Teams
    const defaultTeams = [
      {
        id: "t1",
        name: "Frontend Team",
        leadId: "3",
        memberIds: ["4"],
        projectIds: ["p1", "p2"],
        createdAt: new Date().toISOString(),
      },
      {
        id: "t2",
        name: "Backend Team",
        leadId: "3",
        memberIds: ["4"],
        projectIds: ["p2"],
        createdAt: new Date().toISOString(),
      },
    ];

    // Default Tasks
    const defaultTasks = [
      {
        id: "task1",
        title: "Implement login screen",
        description: "Create login UI with validation",
        status: "completed",
        priority: "high",
        projectId: "p1",
        assignedTo: "4",
        assignedByName: "Developer User",
        createdBy: "3",
        dueDate: "2026-03-01",
        completedAt: "2026-02-28",
        createdAt: new Date().toISOString(),
      },
      {
        id: "task2",
        title: "Design database schema",
        description: "Create ERD and models",
        status: "in_progress",
        priority: "high",
        projectId: "p2",
        assignedTo: "4",
        assignedByName: "Developer User",
        createdBy: "3",
        dueDate: "2026-03-05",
        createdAt: new Date().toISOString(),
      },
      {
        id: "task3",
        title: "Write API documentation",
        description: "Document all endpoints",
        status: "pending",
        priority: "medium",
        projectId: "p2",
        assignedTo: "4",
        assignedByName: "Developer User",
        createdBy: "3",
        dueDate: "2026-03-10",
        createdAt: new Date().toISOString(),
      },
    ];

    await saveUsers(defaultUsers);
    await saveProjects(defaultProjects);
    await saveTeams(defaultTeams);
    await saveTasks(defaultTasks);

    console.log("Default data initialized");
    return true;
  } catch (error) {
    console.error("Error initializing data:", error);
    return false;
  }
};
