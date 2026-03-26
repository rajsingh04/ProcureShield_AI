// API service wrappers

const BASE_URL = "/api";

export const uploadFileForAnalysis = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "Analysis failed");
  }
  console.log("API Response:", await response.clone().json()); // Log response for debugging
  return response.json();
};

export const getDownloadReportUrl = () => {
  return `${BASE_URL}/reports/download`;
};

export const getChartUrl = (chartName: string) => {
  return `${BASE_URL}/charts/${chartName}`;
};
