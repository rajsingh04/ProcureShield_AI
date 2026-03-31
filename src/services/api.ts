// API service wrappers

// Backend base URL. In production, set VITE_BACKEND_URL to your Railway
// backend URL. In local dev, set it to http://localhost:8000.
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "https://procureshieldai-production.up.railway.app";

export const API_BASE_URL = `${BACKEND_URL}/api`;

export const initiateGoogleLogin = () => {
  window.location.href = `${API_BASE_URL}/auth/login`;
};

export const uploadFileForAnalysis = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  const token = localStorage.getItem("authToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    body: formData,
    headers,
  });
  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "Analysis failed");
  }
  console.log("API Response:", await response.clone().json()); // Log response for debugging
  return response.json();
};

export const getDownloadReportUrl = () => {
  return `${API_BASE_URL}/reports/download`;
};

export const getChartUrl = (chartName: string) => {
  return `${API_BASE_URL}/charts/${chartName}`;
};
