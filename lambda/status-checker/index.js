const { DynamoDBClient, GetItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { GlueClient, GetJobRunCommand } = require('@aws-sdk/client-glue');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const glueClient = new GlueClient({ region: process.env.AWS_REGION });

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
        const jobId = event.pathParameters?.jobId;

        if (jobId) {
            // Get specific job status
            const getItemCommand = new GetItemCommand({
                TableName: process.env.JOBS_TABLE,
                Key: { jobId: { S: jobId } }
            });

            const result = await dynamoClient.send(getItemCommand);
            
            if (!result.Item) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Job not found' })
                };
            }

            const job = {
                jobId: result.Item.jobId.S,
                fileName: result.Item.fileName.S,
                fileSize: parseInt(result.Item.fileSize.N),
                status: result.Item.status.S,
                uploadTimestamp: result.Item.uploadTimestamp.S,
                startTime: result.Item.startTime?.S,
                endTime: result.Item.endTime?.S,
                recordCount: result.Item.recordCount?.N ? parseInt(result.Item.recordCount.N) : null,
                errorMessage: result.Item.errorMessage?.S
            };

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(job)
            };

        } else {
            // Get all jobs
            const scanCommand = new ScanCommand({
                TableName: process.env.JOBS_TABLE
            });

            const result = await dynamoClient.send(scanCommand);
            
            const jobs = result.Items.map(item => ({
                jobId: item.jobId.S,
                fileName: item.fileName.S,
                status: item.status.S,
                uploadTimestamp: item.uploadTimestamp.S,
                startTime: item.startTime?.S,
                endTime: item.endTime?.S
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(jobs)
            };
        }

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
