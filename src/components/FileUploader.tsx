import React, { useState } from 'react';
import './FileUploader.css';
import { uploadFileForAnalysis } from '../services/api';

interface FileUploaderProps {
  onAnalyzeSuccess?: (data: any) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onAnalyzeSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const data = await uploadFileForAnalysis(selectedFile);
      // show DB save warning if backend couldn't persist metadata
      if (data && data.db_saved === false) {
        setError('File processed but metadata could not be saved to the database. Check server logs.');
      }
      if (onAnalyzeSuccess) {
        onAnalyzeSuccess(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="uploader-container">
      <form 
        className={`uploader-form ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="uploader-content">
          <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          
          {selectedFile ? (
            <p className="file-name">Selected: {selectedFile.name}</p>
          ) : (
            <>
              <p>Drag and drop Master Excel or CSV file here</p>
              <span className="or-text">or</span>
            </>
          )}

          <label className="upload-button">
            {selectedFile ? "Change File" : "Browse Files"}
            <input type="file" className="file-input" accept=".xlsx,.xls,.csv" onChange={handleChange} />
          </label>

          {error && <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

          {selectedFile && (
            <button className="analyze-button" type="button" onClick={handleAnalyze} disabled={loading}>
              {loading ? "Analyzing..." : "Analyze Data"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FileUploader;