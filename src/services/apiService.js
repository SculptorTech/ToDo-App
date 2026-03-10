// src/services/apiService.js
import axios from "axios";

/* Base API URL */
const BASE_URL = "http://localhost:5000/api";

/* Axios instance */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* Generic GET */
export const getRequest = async (endpoint, params = {}) => {
  try {
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error("GET Error:", error.response?.data || error.message);
    throw error;
  }
};

/* Generic POST */
export const postRequest = async (endpoint, payload = {}) => {
  try {
    const response = await api.post(endpoint, payload);
    return response.data;
  } catch (error) {
    console.error("POST Error:", error.response?.data || error.message);
    throw error;
  }
};

/* Generic PUT */
export const putRequest = async (endpoint, payload = {}) => {
  try {
    const response = await api.put(endpoint, payload);
    return response.data;
  } catch (error) {
    console.error("PUT Error:", error.response?.data || error.message);
    throw error;
  }
};

/* Generic DELETE */
export const deleteRequest = async (endpoint) => {
  try {
    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    console.error("DELETE Error:", error.response?.data || error.message);
    throw error;
  }
};

/* ================= USERS API ================= */

export const getUsers = async () => {
  try {
    const response = await api.get("/user/getusers");
    return response.data;
  } catch (error) {
    console.error("Error in getUsers:", error.response?.data || error.message);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post("/user/create-user", userData);
    return response.data;
  } catch (error) {
    console.error("Error in createUser:", error.response?.data || error.message);
    throw error;
  }
};

export const updateUser = async (userId, payload) => {
  try {
    const response = await api.put(`/user/update-user/${userId}`, payload);
    return response.data;
  } catch (error) {
    console.error("Error in updateUser:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await api.delete(`/user/delete-user/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error in deleteUser:", error.response?.data || error.message);
    throw error;
  }
};