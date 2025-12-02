# ETL Pipeline Architecture Diagrams

This directory contains AWS architecture diagrams for the ETL pipeline solution generated based on the design specifications.

## Generated Diagrams

### 1. ETL Pipeline Architecture (`etl_pipeline_architecture.png`)
- **Purpose**: High-level system architecture overview
- **Components**: 
  - React Frontend for user interaction
  - API Gateway with Lambda functions for API endpoints
  - S3 for file storage (input/output)
  - DynamoDB for job metadata
  - AWS Glue for ETL processing
- **Flow**: Shows the main components and their relationships

### 2. ETL Pipeline Data Flow (`etl_data_flow.png`)
- **Purpose**: Detailed data flow and processing sequence
- **Components**:
  - Upload Handler Lambda (POST /upload)
  - Job Trigger Lambda (POST /jobs/{id}/start)
  - Status Checker Lambda (GET /jobs/{id}/status)
  - Output Handler Lambda (GET /jobs/{id}/output)
  - Separate S3 buckets for input and output
  - DynamoDB table for job tracking
- **Flow**: Shows the complete ETL process from file upload to output retrieval

### 3. ETL Deployment Architecture (`etl_deployment_architecture.png`)
- **Purpose**: Infrastructure deployment and provisioning
- **Components**:
  - AWS CDK for Infrastructure as Code
  - CloudFormation stacks for resource provisioning
  - IAM roles and policies for security
  - CloudWatch for monitoring and logging
- **Flow**: Shows how the infrastructure is deployed and managed

## Key Architecture Decisions

1. **Serverless Architecture**: Uses Lambda functions and AWS Glue for scalable, pay-per-use processing
2. **Event-Driven Design**: API Gateway triggers Lambda functions based on user actions
3. **Separation of Concerns**: Different Lambda functions handle specific operations (upload, trigger, status, output)
4. **Data Storage**: S3 for file storage, DynamoDB for metadata and job tracking
5. **Infrastructure as Code**: CDK for reproducible deployments
6. **No Authentication**: Prototype environment without authentication requirements

## File Locations

All diagrams are stored in:
```
/home/pandson/echo-architect-artifacts/etl-pipeline-120120251606/generated-diagrams/
```

## Usage

These diagrams can be used for:
- System documentation
- Architecture reviews
- Development planning
- Stakeholder presentations
- Infrastructure planning
