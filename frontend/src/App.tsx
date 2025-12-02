import React, { useState, useEffect } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import JobDashboard from './components/JobDashboard';
import JobDetails from './components/JobDetails';

const API_BASE_URL = 'https://4rhxfh20il.execute-api.us-east-1.amazonaws.com/prod';

export interface Job {
  jobId: string;
  fileName: string;
  fileSize?: number;
  status: string;
  uploadTimestamp: string;
  startTime?: string;
  endTime?: string;
  recordCount?: number;
  errorMessage?: string;
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs`);
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleFileUploaded = (newJob: Job) => {
    setJobs(prev => [newJob, ...prev]);
  };

  const handleJobStart = async (jobId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/start`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchJobs(); // Refresh jobs list
      }
    } catch (error) {
      console.error('Error starting job:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>ETL Pipeline Dashboard</h1>
      </header>
      
      <main className="App-main">
        {selectedJob ? (
          <JobDetails 
            job={selectedJob} 
            onBack={() => setSelectedJob(null)}
            apiBaseUrl={API_BASE_URL}
          />
        ) : (
          <>
            <FileUpload 
              onFileUploaded={handleFileUploaded}
              apiBaseUrl={API_BASE_URL}
            />
            
            <JobDashboard 
              jobs={jobs}
              onJobSelect={setSelectedJob}
              onJobStart={handleJobStart}
              loading={loading}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
