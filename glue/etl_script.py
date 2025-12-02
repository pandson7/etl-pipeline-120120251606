import sys
import boto3
import json
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from pyspark.sql import SparkSession

# Initialize Glue context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)

# Get job parameters
args = getResolvedOptions(sys.argv, ['JOB_NAME', 'INPUT_PATH', 'OUTPUT_PATH', 'ETL_JOB_ID', 'TABLE_NAME'])

job_name = args['JOB_NAME']
input_path = args['INPUT_PATH']
output_path = args['OUTPUT_PATH']
job_id = args['ETL_JOB_ID']
table_name = args['TABLE_NAME']

job.init(job_name, args)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(table_name)

try:
    # Update job status to RUNNING
    table.update_item(
        Key={'jobId': job_id},
        UpdateExpression='SET #status = :status, startTime = :start_time',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'RUNNING',
            ':start_time': str(spark.sql("SELECT current_timestamp()").collect()[0][0])
        }
    )
    
    # Read Parquet file
    print(f"Reading Parquet file from: {input_path}")
    df = spark.read.parquet(input_path)
    
    # Convert to JSON format
    print(f"Converting {df.count()} records to JSON")
    
    # Write as JSON to output path
    df.coalesce(1).write.mode('overwrite').format('json').save(output_path)
    
    # Update job status to COMPLETED
    table.update_item(
        Key={'jobId': job_id},
        UpdateExpression='SET #status = :status, endTime = :end_time, recordCount = :count',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'COMPLETED',
            ':end_time': str(spark.sql("SELECT current_timestamp()").collect()[0][0]),
            ':count': df.count()
        }
    )
    
    print(f"ETL job completed successfully. Output written to: {output_path}")
    
except Exception as e:
    error_message = str(e)
    print(f"ETL job failed: {error_message}")
    
    # Update job status to FAILED
    table.update_item(
        Key={'jobId': job_id},
        UpdateExpression='SET #status = :status, endTime = :end_time, errorMessage = :error',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={
            ':status': 'FAILED',
            ':end_time': str(spark.sql("SELECT current_timestamp()").collect()[0][0]),
            ':error': error_message
        }
    )
    
    raise e

finally:
    job.commit()
