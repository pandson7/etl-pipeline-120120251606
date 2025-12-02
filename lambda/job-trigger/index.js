const { GlueClient, StartJobRunCommand } = require('@aws-sdk/client-glue');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');

const glueClient = new GlueClient({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const jobId = event.pathParameters.jobId;
        
        const inputPath = `s3://${process.env.INPUT_BUCKET}/${jobId}/`;
        const outputPath = `s3://${process.env.OUTPUT_BUCKET}/${jobId}/`;

        // Start Glue job
        const startJobCommand = new StartJobRunCommand({
            JobName: `etl-parquet-to-json-120120251606`,
            Arguments: {
                '--INPUT_PATH': inputPath,
                '--OUTPUT_PATH': outputPath,
                '--ETL_JOB_ID': jobId,
                '--TABLE_NAME': process.env.JOBS_TABLE
            }
        });

        const jobRun = await glueClient.send(startJobCommand);

        // Update DynamoDB with job run ID
        const updateCommand = new UpdateItemCommand({
            TableName: process.env.JOBS_TABLE,
            Key: { jobId: { S: jobId } },
            UpdateExpression: 'SET glueJobRunId = :runId, #status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':runId': { S: jobRun.JobRunId },
                ':status': { S: 'RUNNING' }
            }
        });

        await dynamoClient.send(updateCommand);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                jobId,
                glueJobRunId: jobRun.JobRunId,
                message: 'ETL job started successfully'
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to start ETL job' })
        };
    }
};
