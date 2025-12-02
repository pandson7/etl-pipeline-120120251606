# Technical Design Document

## Architecture Overview

The ETL pipeline system consists of a React frontend, AWS serverless backend services, and data processing components. The architecture follows event-driven patterns with real-time status updates and scalable data processing capabilities.

## System Components

### Frontend Layer
- **Technology**: React.js with local hosting
- **Purpose**: File upload interface, job monitoring dashboard, output visualization
- **Key Features**: Real-time status updates, file preview, download functionality

### API Layer
- **Technology**: AWS API Gateway + Lambda Functions (Node.js runtime)
- **Purpose**: RESTful API endpoints for file operations, job management, and status queries
- **Authentication**: None (prototype environment)

### Data Processing Layer
- **Technology**: AWS Glue
- **Purpose**: ETL job execution, Parquet to JSON transformation
- **Scaling**: Automatic based on data volume

### Storage Layer
- **Input/Output Storage**: Amazon S3
- **Metadata Storage**: Amazon DynamoDB
- **Purpose**: File storage, job metadata, status tracking

### Infrastructure
- **Technology**: AWS CDK
- **Purpose**: Infrastructure as Code deployment
- **Components**: S3 buckets, DynamoDB tables, Lambda functions, API Gateway, Glue jobs

## Detailed Component Design

### 1. S3 Storage Structure
```
etl-pipeline-bucket/
├── input/
│   └── {job-id}/
│       └── {original-filename}.parquet
└── output/
    └── {job-id}/
        └── {filename}.json
```

### 2. DynamoDB Schema

**Table: etl-jobs**
```
Partition Key: jobId (String)
Attributes:
- fileName (String)
- fileSize (Number)
- uploadTimestamp (String)
- status (String) // UPLOADED, RUNNING, COMPLETED, FAILED
- startTime (String)
- endTime (String)
- inputS3Key (String)
- outputS3Key (String)
- errorMessage (String)
- recordCount (Number)
```

### 3. Lambda Functions

**upload-handler**
- **Runtime**: Node.js 18.x
- **Purpose**: Handle file uploads to S3, create DynamoDB records
- **Triggers**: API Gateway POST /upload

**job-trigger**
- **Runtime**: Node.js 18.x
- **Purpose**: Start AWS Glue ETL jobs
- **Triggers**: API Gateway POST /jobs/{jobId}/start

**status-checker**
- **Runtime**: Node.js 18.x
- **Purpose**: Query job status from Glue and update DynamoDB
- **Triggers**: API Gateway GET /jobs/{jobId}/status

**output-handler**
- **Runtime**: Node.js 18.x
- **Purpose**: Retrieve and serve processed JSON files
- **Triggers**: API Gateway GET /jobs/{jobId}/output

### 4. AWS Glue Job Design

**ETL Script Logic:**
1. Read Parquet file from S3 input location
2. Convert Parquet data to JSON format
3. Apply data transformations (if needed)
4. Write JSON output to S3 output location
5. Update job status in DynamoDB

**Glue Job Configuration:**
- **Type**: Python Shell
- **Python Version**: 3.9
- **Worker Type**: Standard
- **Number of Workers**: 2 (adjustable based on file size)

### 5. API Endpoints

```
POST /upload
- Purpose: Upload Parquet files
- Request: Multipart form data
- Response: {jobId, status, message}

POST /jobs/{jobId}/start
- Purpose: Trigger ETL job execution
- Response: {jobId, status, glueJobRunId}

GET /jobs/{jobId}/status
- Purpose: Get current job status
- Response: {jobId, status, progress, timestamps}

GET /jobs
- Purpose: List all jobs
- Response: [{jobId, fileName, status, timestamps}]

GET /jobs/{jobId}/output
- Purpose: Download or preview JSON output
- Query Params: ?preview=true&limit=100
- Response: JSON data or download stream

GET /jobs/{jobId}/output/download
- Purpose: Download complete JSON file
- Response: File download
```

### 6. Frontend Components

**App.js**
- Main application container
- Route management
- Global state management

**FileUpload.js**
- File selection and upload interface
- Upload progress indication
- File validation

**JobDashboard.js**
- Job listing and status display
- Real-time status updates using polling
- Job history management

**JobDetails.js**
- Detailed job information
- Output preview and download
- Error message display

**OutputViewer.js**
- JSON data preview with pagination
- Formatted JSON display
- Download functionality

## Data Flow Sequence

### File Upload and Processing Flow
```
1. User selects Parquet file in React frontend
2. Frontend calls POST /upload API
3. upload-handler Lambda:
   - Generates unique jobId
   - Uploads file to S3 input bucket
   - Creates DynamoDB record with UPLOADED status
4. User clicks "Start ETL Job"
5. Frontend calls POST /jobs/{jobId}/start
6. job-trigger Lambda:
   - Updates DynamoDB status to RUNNING
   - Starts AWS Glue job with input/output S3 paths
7. Glue job processes file:
   - Reads Parquet from S3
   - Transforms to JSON
   - Writes JSON to S3 output
   - Updates DynamoDB status to COMPLETED
8. Frontend polls GET /jobs/{jobId}/status for updates
9. User views/downloads output via GET /jobs/{jobId}/output
```

## Error Handling Strategy

### File Upload Errors
- Invalid file format: Client-side validation + server-side verification
- File size limits: 100MB maximum per file
- S3 upload failures: Retry mechanism with exponential backoff

### ETL Processing Errors
- Glue job failures: Capture error logs and update DynamoDB
- Data format issues: Validate Parquet schema before processing
- Resource limitations: Queue jobs when Glue capacity is exceeded

### API Error Responses
- 400: Bad Request (invalid parameters)
- 404: Job not found
- 500: Internal server error
- 503: Service temporarily unavailable

## Performance Considerations

### Scalability
- Lambda functions: Automatic scaling based on request volume
- Glue jobs: Configurable worker count based on file size
- DynamoDB: On-demand billing for variable workloads
- S3: Unlimited storage capacity

### Optimization
- File size-based Glue worker allocation
- Efficient JSON serialization in Glue jobs
- Frontend pagination for large datasets
- Caching of job status responses

## Security Considerations

### Data Protection
- S3 bucket encryption at rest
- HTTPS for all API communications
- Input validation for all user inputs

### Access Control
- S3 bucket policies restricting access to Lambda functions
- DynamoDB resource-based policies
- API Gateway throttling to prevent abuse

## Monitoring and Logging

### CloudWatch Integration
- Lambda function logs and metrics
- Glue job execution logs
- API Gateway access logs
- Custom metrics for job success/failure rates

### Alerting
- Failed job notifications
- High error rate alerts
- Resource utilization monitoring

## Deployment Strategy

### CDK Stack Components
1. **Storage Stack**: S3 buckets, DynamoDB table
2. **Compute Stack**: Lambda functions, Glue job definitions
3. **API Stack**: API Gateway, Lambda integrations
4. **IAM Stack**: Roles and policies for all services

### Environment Configuration
- Development: Single region, minimal resources
- Production: Multi-AZ deployment, enhanced monitoring

This design ensures a robust, scalable ETL pipeline that can handle varying data volumes while providing real-time feedback to users through an intuitive web interface.
