import React, { useState, useEffect } from 'react';
import { Job } from '../App';

interface JobDetailsProps {
  job: Job;
  onBack: () => void;
  apiBaseUrl: string;
}

interface OutputData {
  records: any[];
  totalLines: number;
  preview: boolean;
  limit: number;
}

const JobDetails: React.FC<JobDetailsProps> = ({ job, onBack, apiBaseUrl }) => {
  const [outputData, setOutputData] = useState<OutputData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/jobs/${job.jobId}/status`);
      if (response.ok) {
        const updatedJob = await response.json();
        // Update job details if needed
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    }
  };

  const loadOutputPreview = async () => {
    if (job.status !== 'COMPLETED') return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/jobs/${job.jobId}/output?preview=true&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to load output preview');
      }

      const data = await response.json();
      setOutputData(data);
    } catch (error) {
      console.error('Error loading output:', error);
      setError('Failed to load output preview');
    } finally {
      setLoading(false);
    }
  };

  const downloadOutput = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/jobs/${job.jobId}/output`);
      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const { downloadUrl, fileName } = await response.json();
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  useEffect(() => {
    fetchJobDetails();
    if (job.status === 'COMPLETED') {
      loadOutputPreview();
    }
  }, [job.jobId]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const className = `status-badge status-${status.toLowerCase()}`;
    return <span className={className}>{status}</span>;
  };

  return (
    <div className="job-details">
      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </div>

      <h2>Job Details</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h3>Job Information</h3>
          <p><strong>Job ID:</strong> {job.jobId}</p>
          <p><strong>File Name:</strong> {job.fileName}</p>
          <p><strong>Status:</strong> {getStatusBadge(job.status)}</p>
          <p><strong>Upload Time:</strong> {formatTimestamp(job.uploadTimestamp)}</p>
          {job.fileSize && (
            <p><strong>File Size:</strong> {(job.fileSize / 1024 / 1024).toFixed(2)} MB</p>
          )}
        </div>

        <div>
          <h3>Processing Information</h3>
          {job.startTime && (
            <p><strong>Start Time:</strong> {formatTimestamp(job.startTime)}</p>
          )}
          {job.endTime && (
            <p><strong>End Time:</strong> {formatTimestamp(job.endTime)}</p>
          )}
          {job.startTime && job.endTime && (
            <p><strong>Duration:</strong> {Math.round((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 1000)} seconds</p>
          )}
          {job.recordCount && (
            <p><strong>Records Processed:</strong> {job.recordCount.toLocaleString()}</p>
          )}
        </div>
      </div>

      {job.status === 'FAILED' && job.errorMessage && (
        <div className="error-message">
          <h3>Error Details</h3>
          <p>{job.errorMessage}</p>
        </div>
      )}

      {job.status === 'COMPLETED' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <button className="btn btn-primary" onClick={downloadOutput}>
              Download JSON Output
            </button>
            <button className="btn btn-secondary" onClick={loadOutputPreview} style={{ marginLeft: '10px' }}>
              Refresh Preview
            </button>
          </div>

          {loading && <div className="loading"></div>}
          
          {error && (
            <div className="error-message">{error}</div>
          )}

          {outputData && (
            <div>
              <h3>Output Preview (First {outputData.records.length} of {outputData.totalLines} records)</h3>
              <div className="output-preview">
                {outputData.records.map((record, index) => (
                  <div key={index} className="json-record">
                    <pre>{JSON.stringify(record, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {job.status === 'RUNNING' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="loading" style={{ margin: '0 auto' }}></div>
          <p>ETL job is running... This page will update automatically.</p>
        </div>
      )}
    </div>
  );
};

export default JobDetails;
