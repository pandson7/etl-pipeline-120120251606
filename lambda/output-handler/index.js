const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

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
        const preview = event.queryStringParameters?.preview === 'true';
        const limit = parseInt(event.queryStringParameters?.limit || '100');

        // List objects in the output folder
        const listCommand = new ListObjectsV2Command({
            Bucket: process.env.OUTPUT_BUCKET,
            Prefix: `${jobId}/`
        });

        const listResult = await s3Client.send(listCommand);
        
        if (!listResult.Contents || listResult.Contents.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Output file not found' })
            };
        }

        // Find the JSON file (Glue creates part files)
        const jsonFile = listResult.Contents.find(obj => 
            obj.Key.includes('.json') && !obj.Key.endsWith('/')
        );

        if (!jsonFile) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'JSON output file not found' })
            };
        }

        if (preview) {
            // Return preview of the JSON data
            const getCommand = new GetObjectCommand({
                Bucket: process.env.OUTPUT_BUCKET,
                Key: jsonFile.Key
            });

            const result = await s3Client.send(getCommand);
            const content = await result.Body.transformToString();
            
            // Parse JSON lines and return limited records
            const lines = content.trim().split('\n');
            const records = lines.slice(0, limit).map(line => JSON.parse(line));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    records,
                    totalLines: lines.length,
                    preview: true,
                    limit
                })
            };

        } else {
            // Return download URL
            const getCommand = new GetObjectCommand({
                Bucket: process.env.OUTPUT_BUCKET,
                Key: jsonFile.Key
            });

            const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    downloadUrl,
                    fileName: jsonFile.Key.split('/').pop(),
                    fileSize: jsonFile.Size
                })
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
