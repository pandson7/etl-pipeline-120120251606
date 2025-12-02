# ETL Pipeline Project

A comprehensive ETL (Extract, Transform, Load) pipeline built with AWS CDK, featuring automated data processing, monitoring, and a React-based frontend dashboard.

## Architecture Overview

This project implements a serverless ETL pipeline using AWS services:

- **AWS Lambda**: Data processing functions (upload handler, job trigger, status checker, output handler)
- **AWS Glue**: ETL job execution for data transformation
- **Amazon S3**: Data storage (input, output, and processed data)
- **Amazon EventBridge**: Event-driven orchestration
- **Amazon CloudWatch**: Monitoring and logging
- **React Frontend**: Dashboard for monitoring pipeline status

## Project Structure

```
etl-pipeline-120120251606/
├── bin/                    # CDK app entry point
├── lib/                    # CDK stack definitions
├── lambda/                 # Lambda function code
│   ├── upload-handler/     # Handles file uploads
│   ├── job-trigger/        # Triggers ETL jobs
│   ├── status-checker/     # Monitors job status
│   └── output-handler/     # Processes job outputs
├── glue/                   # Glue ETL scripts
├── frontend/               # React dashboard
├── specs/                  # Project specifications
├── pricing/                # Cost analysis
├── generated-diagrams/     # Architecture diagrams
└── jira-stories-summary.md # Project stories
```

## Features

- **Automated ETL Processing**: Serverless data pipeline with automatic scaling
- **Event-Driven Architecture**: Uses EventBridge for loose coupling
- **Monitoring Dashboard**: React-based frontend for pipeline monitoring
- **Cost Optimization**: Serverless architecture for cost-effective processing
- **Infrastructure as Code**: Complete AWS CDK implementation
- **Comprehensive Documentation**: Detailed specifications and diagrams

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate permissions
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Python 3.9+ (for Glue scripts)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Infrastructure

```bash
# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy the stack
cdk deploy
```

### 3. Run Frontend Dashboard

```bash
cd frontend
npm install
npm start
```

The dashboard will be available at `http://localhost:3000`

## Usage

### Uploading Data

1. Upload CSV files to the input S3 bucket
2. The upload handler Lambda will automatically trigger the ETL pipeline
3. Monitor progress through the React dashboard
4. Processed data will be available in the output S3 bucket

### Monitoring

- **CloudWatch Logs**: Detailed execution logs for all Lambda functions
- **CloudWatch Metrics**: Pipeline performance metrics
- **React Dashboard**: Real-time status monitoring

## Configuration

Key configuration options can be found in:

- `lib/etl-pipeline-stack.ts`: Infrastructure configuration
- `lambda/*/index.js`: Lambda function settings
- `glue/etl_script.py`: ETL job configuration

## Cost Analysis

Detailed cost analysis is available in the `pricing/` directory, including:

- Monthly cost estimates
- Cost breakdown by service
- Optimization recommendations

## Architecture Diagrams

Visual representations of the system architecture are available in `generated-diagrams/`:

- `etl_pipeline_architecture.png`: High-level architecture
- `etl_data_flow.png`: Data flow diagram
- `etl_deployment_architecture.png`: Deployment architecture

## Development

### Adding New Lambda Functions

1. Create a new directory under `lambda/`
2. Add the function code and package.json
3. Update the CDK stack in `lib/etl-pipeline-stack.ts`

### Modifying ETL Logic

1. Update the Glue script in `glue/etl_script.py`
2. Redeploy the stack with `cdk deploy`

### Frontend Development

```bash
cd frontend
npm start    # Development server
npm test     # Run tests
npm run build # Production build
```

## Testing

```bash
# Test CDK stack
npm test

# Test Lambda functions
cd lambda/function-name
npm test

# Test frontend
cd frontend
npm test
```

## Deployment

### Production Deployment

```bash
# Deploy to production
cdk deploy --profile production

# Deploy frontend to S3/CloudFront
cd frontend
npm run build
aws s3 sync build/ s3://your-frontend-bucket/
```

## Monitoring and Troubleshooting

### Common Issues

1. **Lambda Timeout**: Increase timeout in CDK stack
2. **Glue Job Failures**: Check CloudWatch logs for detailed error messages
3. **S3 Permissions**: Ensure proper IAM roles and policies

### Logs Location

- Lambda Logs: `/aws/lambda/function-name`
- Glue Logs: `/aws-glue/jobs/logs-v2`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:

- Check the documentation in `specs/`
- Review architecture diagrams in `generated-diagrams/`
- Consult the Jira stories summary for feature details

## Changelog

See `jira-stories-summary.md` for detailed project history and feature development.
