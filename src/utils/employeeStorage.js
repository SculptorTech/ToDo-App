import AsyncStorage from "@react-native-async-storage/async-storage";

const EMPLOYEES_STORAGE_KEY = "@employees";

// Sample employees data
const INITIAL_EMPLOYEES = [
  {
    id: "101",
    name: "John Doe",
    email: "john.doe@example.com",
    roleId: "1", // Administrator
    roleName: "Administrator",
    phone: "+1234567890",
    department: "IT",
    joinDate: "2026-01-15",
    status: "active",
  },
  {
    id: "102",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    roleId: "2", // Manager
    roleName: "Manager",
    phone: "+1234567891",
    department: "Operations",
    joinDate: "2026-02-01",
    status: "active",
  },
  {
    id: "103",
    name: "Mike Johnson",
    email: "mike.johnson@example.com",
    roleId: "3", // Employee
    roleName: "Employee",
    phone: "+1234567892",
    department: "Development",
    joinDate: "2026-02-15",
    status: "active",
  },
  {
    id: "104",
    name: "Sarah Williams",
    email: "sarah.williams@example.com",
    roleId: "3", // Employee
    roleName: "Employee",
    phone: "+1234567893",
    department: "Design",
    joinDate: "2026-02-20",
    status: "active",
  },
  {
    id: "105",
    name: "David Brown",
    email: "david.brown@example.com",
    roleId: "2", // Manager
    roleName: "Manager",
    phone: "+1234567894",
    department: "HR",
    joinDate: "2026-01-20",
    status: "active",
  },
];

export const getEmployees = async () => {
  try {
    const employeesJson = await AsyncStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (employeesJson) {
      return JSON.parse(employeesJson);
    } else {
      // Initialize with sample data
      await AsyncStorage.setItem(
        EMPLOYEES_STORAGE_KEY,
        JSON.stringify(INITIAL_EMPLOYEES),
      );
      return INITIAL_EMPLOYEES;
    }
  } catch (error) {
    console.error("Error getting employees:", error);
    return [];
  }
};

export const saveEmployees = async (employees) => {
  try {
    await AsyncStorage.setItem(
      EMPLOYEES_STORAGE_KEY,
      JSON.stringify(employees),
    );
    return true;
  } catch (error) {
    console.error("Error saving employees:", error);
    return false;
  }
};

export const addEmployee = async (employee) => {
  try {
    const employees = await getEmployees();
    const newEmployee = {
      ...employee,
      id: Date.now().toString(),
      joinDate: new Date().toISOString().split("T")[0],
      status: "active",
    };
    const updatedEmployees = [...employees, newEmployee];
    await saveEmployees(updatedEmployees);
    return newEmployee;
  } catch (error) {
    console.error("Error adding employee:", error);
    throw error;
  }
};

export const updateEmployee = async (id, updatedData) => {
  try {
    const employees = await getEmployees();
    const updatedEmployees = employees.map((emp) =>
      emp.id === id ? { ...emp, ...updatedData } : emp,
    );
    await saveEmployees(updatedEmployees);
    return true;
  } catch (error) {
    console.error("Error updating employee:", error);
    return false;
  }
};

export const deleteEmployee = async (id) => {
  try {
    const employees = await getEmployees();
    const updatedEmployees = employees.filter((emp) => emp.id !== id);
    await saveEmployees(updatedEmployees);
    return true;
  } catch (error) {
    console.error("Error deleting employee:", error);
    return false;
  }
};

export const getEmployeesByRole = async (roleId) => {
  try {
    const employees = await getEmployees();
    return employees.filter((emp) => emp.roleId === roleId);
  } catch (error) {
    console.error("Error getting employees by role:", error);
    return [];
  }
};
