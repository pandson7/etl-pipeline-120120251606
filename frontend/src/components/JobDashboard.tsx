import React from 'react';
import { Job } from '../App';

interface JobDashboardProps {
  jobs: Job[];
  onJobSelect: (job: Job) => void;
  onJobStart: (jobId: string) => void;
  loading: boolean;
}

const JobDashboard: React.FC<JobDashboardProps> = ({ 
  jobs, 
  onJobSelect, 
  onJobStart, 
  loading 
}) => {
  const getStatusBadge = (status: string) => {
    const className = `status-badge status-${status.toLowerCase()}`;
    return <span className={className}>{status}</span>;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const canStartJob = (job: Job) => {
    return job.status === 'UPLOADED';
  };

  return (
    <div>
      <h2>ETL Jobs ({jobs.length})</h2>
      
      {jobs.length === 0 ? (
        <p>No jobs found. Upload a Parquet file to get started.</p>
      ) : (
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>File Name</th>
              <th>Status</th>
              <th>Upload Time</th>
              <th>Duration</th>
              <th>Records</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.jobId}>
                <td>
                  <button 
                    className="btn btn-link"
                    onClick={() => onJobSelect(job)}
                    style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }}
                  >
                    {job.jobId.substring(0, 8)}...
                  </button>
                </td>
                <td>{job.fileName}</td>
                <td>{getStatusBadge(job.status)}</td>
                <td>{formatTimestamp(job.uploadTimestamp)}</td>
                <td>
                  {job.startTime && job.endTime ? (
                    `${Math.round((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 1000)}s`
                  ) : job.startTime ? (
                    <span className="loading"></span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>{job.recordCount || '-'}</td>
                <td>
                  {canStartJob(job) && (
                    <button
                      className="btn btn-success"
                      onClick={() => onJobStart(job.jobId)}
                      disabled={loading}
                    >
                      {loading ? <span className="loading"></span> : 'Start ETL'}
                    </button>
                  )}
                  {job.status === 'COMPLETED' && (
                    <button
                      className="btn btn-primary"
                      onClick={() => onJobSelect(job)}
                    >
                      View Output
                    </button>
                  )}
                  {job.status === 'FAILED' && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => onJobSelect(job)}
                    >
                      View Error
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default JobDashboard;
