const API_BASE_URL = "http://localhost:5000";

// Simple fetch wrapper that mimics axios interface
const api = {
  post: async (url, data) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const result = await response.json();
    return { data: result }; // Wraps in data property like axios
  },
  
  get: async (url) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    return { data: result }; // Wraps in data property like axios
  }
};

export const createTask = (input) =>
  api.post("/ai/create-task", { input });

export const getSmartSummary = () => api.get("/summary");

export const autoPriority = (data) => api.post("/auto-priority", data);

export const generateDescription = (title) =>
  api.post("/ai/description", { title });

export default api;