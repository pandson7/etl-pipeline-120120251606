import React, { useState } from 'react';
import { Job } from '../App';

interface FileUploadProps {
  onFileUploaded: (job: Job) => void;
  apiBaseUrl: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, apiBaseUrl }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.parquet')) {
        setMessage('Please select a .parquet file');
        return;
      }
      setSelectedFile(file);
      setMessage('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setMessage('');

    try {
      // Get upload URL
      const response = await fetch(`${apiBaseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
          fileSize: selectedFile.size
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { jobId, uploadUrl } = await response.json();

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Create job object
      const newJob: Job = {
        jobId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        status: 'UPLOADED',
        uploadTimestamp: new Date().toISOString()
      };

      onFileUploaded(newJob);
      setMessage('File uploaded successfully!');
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-section">
      <h2>Upload Parquet File</h2>
      
      <div className="file-input">
        <input
          id="file-input"
          type="file"
          accept=".parquet"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {selectedFile && (
        <div>
          <p>Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
          <button 
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? <span className="loading"></span> : 'Upload File'}
          </button>
        </div>
      )}

      {message && (
        <div className={message.includes('success') ? 'success-message' : 'error-message'}>
          {message}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
