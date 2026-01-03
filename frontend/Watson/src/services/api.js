// API service functions for interacting with the Watson backend

const API_BASE_URL = `http://${import.meta.env.PUBLIC_API_URL}`; // Adjust this based on your backend URL

/**
 * Upload files with task metadata to the backend
 * @param {Object} taskData - Object containing task information
 * @param {string} taskData.taskName - Name of the task
 * @param {string} taskData.description - Description of the task
 * @param {File[]} taskData.files - Array of files to upload
 * @returns {Promise<Object>} Response from the backend
 */
export const uploadTaskFiles = async ({ taskName, description, files }) => {
  const formData = new FormData();

  // Add metadata
  formData.append("task_name", taskName);
  formData.append("task_description", description);

  // Add files
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await fetch(`${API_BASE_URL}/files`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

/**
 * Get all tasks
 * @param {Object} options - Query options
 * @param {string|null} options.status - Filter by task status (null for all tasks)
 * @param {number} options.limit - Maximum number of tasks to return
 * @param {number} options.skip - Number of tasks to skip
 * @param {number} options.order - Order by updated_at (-1 for newest first, 1 for oldest first)
 * @returns {Promise<Object>} List of tasks
 */
export const getTasks = async ({
  status = null,
  limit = 10,
  skip = 0,
  order = -1,
} = {}) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    skip: skip.toString(),
    order: order.toString(),
  });

  // Only add status parameter if it's not null/undefined
  if (status !== null && status !== undefined) {
    params.append("status", status);
  }

  const response = await fetch(`${API_BASE_URL}/tasks?${params}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

/**
 * Get a specific task by ID
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} Task details
 */
export const getTask = async (taskId) => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

/**
 * Download a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<Blob>} File content as blob
 */
export const downloadFile = async (filePath) => {
  const response = await fetch(`${API_BASE_URL}/files/${filePath}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.blob();
};

/**
 * Get all chunk descriptors for a task.
 * Returns chunk ids and file names used to populate the dropdown.
 * @param {string} taskId - The task ID
 * @returns {Promise<Object>} Chunk list response
 */
export const getTaskChunks = async (taskId) => {
  const response = await fetch(`${API_BASE_URL}/results/tasks/${taskId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

/**
 * Get all data for a specific chunk (graph, summary, relations, text, etc.).
 * @param {string} taskId - The task ID
 * @param {string} chunkId - The chunk ID
 * @returns {Promise<Object>} Chunk detail payload
 */
export const getChunkDetails = async (taskId, chunkId) => {
  const response = await fetch(
    `${API_BASE_URL}/results/${taskId}/chunks/${chunkId}`,
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

/**
 * Search relations for a task by embedding similarity.
 * @param {Object} params - Search parameters
 * @param {string} params.taskId - Task identifier
 * @param {string} params.query - Search query text
 * @param {number} params.topK - Number of top results to fetch
 * @returns {Promise<Object>} Search results response
 */
export const searchTaskRelations = async ({ taskId, query, topK = 15 }) => {
  const params = new URLSearchParams({
    task_id: taskId,
    query,
    top_k: topK.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/search?${params}`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `HTTP error! status: ${response.status}`,
    );
  }

  return response.json();
};

/**
 * Check backend health
 * @returns {Promise<Object>} Health status
 */
export const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }

  return response.json();
};
