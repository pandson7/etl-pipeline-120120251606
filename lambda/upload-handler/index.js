const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const s3Client = new S3Client({ region: process.env.AWS_REGION });
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
        const body = JSON.parse(event.body);
        const { fileName, fileSize } = body;

        // Validate file extension
        if (!fileName.endsWith('.parquet')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Only .parquet files are allowed' })
            };
        }

        // Generate unique job ID
        const jobId = crypto.randomUUID();
        const s3Key = `${jobId}/${fileName}`;

        // Create presigned URL for upload
        const putCommand = new PutObjectCommand({
            Bucket: process.env.INPUT_BUCKET,
            Key: s3Key,
            ContentType: 'application/octet-stream'
        });

        const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

        // Store metadata in DynamoDB
        const putItemCommand = new PutItemCommand({
            TableName: process.env.JOBS_TABLE,
            Item: {
                jobId: { S: jobId },
                fileName: { S: fileName },
                fileSize: { N: fileSize.toString() },
                uploadTimestamp: { S: new Date().toISOString() },
                status: { S: 'UPLOADED' },
                inputS3Key: { S: s3Key }
            }
        });

        await dynamoClient.send(putItemCommand);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                jobId,
                uploadUrl,
                message: 'Upload URL generated successfully'
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
