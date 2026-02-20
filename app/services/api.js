// app/services/api.js

// GROQ API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = "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"; // Your GROQ API key

// Using Llama 3.1 8B Instant - fastest and most efficient model
const DEFAULT_MODEL = "llama-3.1-8b-instant";

// Helper to format prompts for GROQ
const createGroqPrompt = (type, data) => {
  const basePrompt = {
    model: DEFAULT_MODEL,
    temperature: 0.7,
    max_tokens: 500,
  };

  switch (type) {
    case "create-task":
      return {
        ...basePrompt,
        messages: [
          {
            role: "system",
            content:
              "You are a task management assistant. Create a detailed task based on user input. Format the response as a clear, actionable task description with bullet points for key steps.",
          },
          {
            role: "user",
            content: `Create a task with this description: ${data.input}`,
          },
        ],
      };

    case "generate-description":
      return {
        ...basePrompt,
        messages: [
          {
            role: "system",
            content:
              "You are a task management assistant. Generate a detailed, well-structured task description that includes key steps, considerations, and success criteria.",
          },
          {
            role: "user",
            content: `Generate a detailed description for a task titled: ${data.title}`,
          },
        ],
      };

    case "auto-priority":
      return {
        ...basePrompt,
        temperature: 0.3,
        max_tokens: 20,
        messages: [
          {
            role: "system",
            content:
              "You are a task management assistant. Analyze task priority. Respond with ONLY ONE WORD: High, Medium, or Low. No explanations, no punctuation, just the priority level.",
          },
          {
            role: "user",
            content: `What priority should this task have? Task: ${data.text}`,
          },
        ],
      };

    case "enhance-task":
      return {
        ...basePrompt,
        messages: [
          {
            role: "system",
            content:
              "You are a task management assistant. Enhance and improve the given task description. Make it more detailed, actionable, and well-structured. Add specific steps and considerations.",
          },
          {
            role: "user",
            content: `Enhance this task:\nTitle: ${data.title}\nCurrent Description: ${data.description || "No description"}\nPriority: ${data.priority}`,
          },
        ],
      };

    case "plan-schedule":
      return {
        ...basePrompt,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content:
              "You are a task management assistant. Create a detailed schedule/plan for completing this task. Break it down into phases, steps, and time estimates. Format with clear sections and bullet points.",
          },
          {
            role: "user",
            content: `Create a schedule plan for this task:\nTitle: ${data.title}\nDue Date: ${data.dueDate}\nPriority: ${data.priority}`,
          },
        ],
      };

    case "smart-summary":
      return {
        ...basePrompt,
        messages: [
          {
            role: "system",
            content:
              "You are a task management assistant. Provide a smart summary of tasks, highlighting priorities, deadlines, dependencies, and actionable suggestions.",
          },
          {
            role: "user",
            content: `Provide a summary and insights for my tasks: ${JSON.stringify(data.tasks)}`,
          },
        ],
      };

    default:
      throw new Error(`Unknown prompt type: ${type}`);
  }
};

// Make API call to GROQ
const callGroqAPI = async (prompt) => {
  try {
    console.log("📡 Calling GROQ API with model: llama-3.1-8b-instant");

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(prompt),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ GROQ API error response:", errorText);
      throw new Error(`GROQ API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ GROQ API success - Usage:", result.usage);

    // Extract the content from GROQ response
    const content = result.choices?.[0]?.message?.content || "";

    if (!content) {
      console.warn("⚠️ No content in GROQ response");
    }

    return { data: { content } };
  } catch (error) {
    console.error("❌ GROQ API call failed:", error);
    throw error;
  }
};

// Export API functions
export const createTask = async (input) => {
  const prompt = createGroqPrompt("create-task", { input });
  return await callGroqAPI(prompt);
};

export const generateDescription = async (title) => {
  const prompt = createGroqPrompt("generate-description", { title });
  return await callGroqAPI(prompt);
};

export const autoPriority = async (data) => {
  const prompt = createGroqPrompt("auto-priority", { text: data.text });
  const response = await callGroqAPI(prompt);

  // Parse priority from response
  const content = response.data.content.toLowerCase().trim();
  let priority = "Medium";
  if (content.includes("high")) priority = "High";
  else if (content.includes("low")) priority = "Low";

  console.log("📊 Detected priority:", priority, "from content:", content);

  return { data: { priority } };
};

export const enhanceTask = async (taskData) => {
  const prompt = createGroqPrompt("enhance-task", taskData);
  return await callGroqAPI(prompt);
};

export const planWithSchedule = async (taskData) => {
  const prompt = createGroqPrompt("plan-schedule", taskData);
  return await callGroqAPI(prompt);
};

export const getSmartSummary = async (tasks) => {
  const prompt = createGroqPrompt("smart-summary", { tasks });
  return await callGroqAPI(prompt);
};

// Test function to verify GROQ API is working with Llama 3.1
export const testGroqConnection = async () => {
  try {
    console.log("🧪 Testing GROQ API connection with Llama 3.1 8B Instant...");

    const testPrompt = {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content:
            "Say 'GROQ API with Llama 3.1 is working perfectly!' if you receive this message.",
        },
      ],
      max_tokens: 50,
    };

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(testPrompt),
    });

    const data = await response.json();
    console.log("🧪 Test response:", data);

    if (response.ok) {
      const message = data.choices?.[0]?.message?.content;
      return { success: true, message };
    } else {
      return { success: false, error: data };
    }
  } catch (error) {
    console.error("🧪 Test failed:", error);
    return { success: false, error: error.message };
  }
};

// Simple fetch wrapper for any other APIs if needed
export const localApi = {
  post: async (url, data) => {
    const response = await fetch(`http://localhost:5000${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return { data: result };
  },
  get: async (url) => {
    const response = await fetch(`http://localhost:5000${url}`);
    const result = await response.json();
    return { data: result };
  },
};
