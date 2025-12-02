import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class EtlPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const suffix = '120120251606';

    // S3 Buckets
    const inputBucket = new s3.Bucket(this, `EtlInputBucket${suffix}`, {
      bucketName: `etl-input-bucket-${suffix}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }]
    });

    const outputBucket = new s3.Bucket(this, `EtlOutputBucket${suffix}`, {
      bucketName: `etl-output-bucket-${suffix}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }]
    });

    const glueScriptBucket = new s3.Bucket(this, `GlueScriptBucket${suffix}`, {
      bucketName: `glue-scripts-${suffix}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // DynamoDB Table
    const jobsTable = new dynamodb.Table(this, `EtlJobsTable${suffix}`, {
      tableName: `etl-jobs-${suffix}`,
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Enable auto scaling
    jobsTable.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: 10
    });
    jobsTable.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 10
    });

    // Glue Job Role
    const glueRole = new iam.Role(this, `GlueJobRole${suffix}`, {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')
      ],
      inlinePolicies: {
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
              resources: [
                inputBucket.arnForObjects('*'),
                outputBucket.arnForObjects('*'),
                glueScriptBucket.arnForObjects('*')
              ]
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [inputBucket.bucketArn, outputBucket.bucketArn, glueScriptBucket.bucketArn]
            })
          ]
        }),
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
              resources: [jobsTable.tableArn]
            })
          ]
        })
      }
    });

    // Deploy Glue script
    const glueScriptDeployment = new s3deploy.BucketDeployment(this, `GlueScriptDeployment${suffix}`, {
      sources: [s3deploy.Source.asset('./glue')],
      destinationBucket: glueScriptBucket,
      destinationKeyPrefix: 'scripts/'
    });

    // Glue Job using CloudFormation
    const etlJob = new cdk.CfnResource(this, `EtlGlueJob${suffix}`, {
      type: 'AWS::Glue::Job',
      properties: {
        Name: `etl-parquet-to-json-${suffix}`,
        Role: glueRole.roleArn,
        Command: {
          Name: 'glueetl',
          ScriptLocation: `s3://${glueScriptBucket.bucketName}/scripts/etl_script.py`,
          PythonVersion: '3'
        },
        DefaultArguments: {
          '--job-language': 'python',
          '--job-bookmark-option': 'job-bookmark-disable'
        },
        GlueVersion: '4.0',
        WorkerType: 'G.1X',
        NumberOfWorkers: 2
      }
    });

    etlJob.node.addDependency(glueScriptDeployment);

    // Lambda Functions
    const uploadHandler = new lambda.Function(this, `UploadHandler${suffix}`, {
      functionName: `etl-upload-handler-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/upload-handler'),
      environment: {
        INPUT_BUCKET: inputBucket.bucketName,
        JOBS_TABLE: jobsTable.tableName
      },
      timeout: cdk.Duration.minutes(5)
    });

    const jobTrigger = new lambda.Function(this, `JobTrigger${suffix}`, {
      functionName: `etl-job-trigger-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/job-trigger'),
      environment: {
        INPUT_BUCKET: inputBucket.bucketName,
        OUTPUT_BUCKET: outputBucket.bucketName,
        JOBS_TABLE: jobsTable.tableName
      }
    });

    const statusChecker = new lambda.Function(this, `StatusChecker${suffix}`, {
      functionName: `etl-status-checker-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/status-checker'),
      environment: {
        JOBS_TABLE: jobsTable.tableName
      }
    });

    const outputHandler = new lambda.Function(this, `OutputHandler${suffix}`, {
      functionName: `etl-output-handler-${suffix}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('./lambda/output-handler'),
      environment: {
        OUTPUT_BUCKET: outputBucket.bucketName,
        JOBS_TABLE: jobsTable.tableName
      }
    });

    // Grant permissions
    inputBucket.grantReadWrite(uploadHandler);
    outputBucket.grantRead(outputHandler);
    jobsTable.grantReadWriteData(uploadHandler);
    jobsTable.grantReadWriteData(jobTrigger);
    jobsTable.grantReadData(statusChecker);
    jobsTable.grantReadData(outputHandler);

    // Grant Glue permissions
    jobTrigger.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['glue:StartJobRun', 'glue:GetJobRun'],
      resources: [`arn:aws:glue:${this.region}:${this.account}:job/etl-parquet-to-json-${suffix}`]
    }));

    statusChecker.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['glue:GetJobRun'],
      resources: [`arn:aws:glue:${this.region}:${this.account}:job/etl-parquet-to-json-${suffix}`]
    }));

    // API Gateway
    const api = new apigateway.RestApi(this, `EtlApi${suffix}`, {
      restApiName: `etl-pipeline-api-${suffix}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token']
      }
    });

    // API Endpoints
    const upload = api.root.addResource('upload');
    upload.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler));

    const jobs = api.root.addResource('jobs');
    jobs.addMethod('GET', new apigateway.LambdaIntegration(statusChecker));

    const jobById = jobs.addResource('{jobId}');
    const start = jobById.addResource('start');
    start.addMethod('POST', new apigateway.LambdaIntegration(jobTrigger));

    const status = jobById.addResource('status');
    status.addMethod('GET', new apigateway.LambdaIntegration(statusChecker));

    const output = jobById.addResource('output');
    output.addMethod('GET', new apigateway.LambdaIntegration(outputHandler));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL'
    });

    new cdk.CfnOutput(this, 'InputBucketName', {
      value: inputBucket.bucketName,
      description: 'Input S3 Bucket Name'
    });

    new cdk.CfnOutput(this, 'OutputBucketName', {
      value: outputBucket.bucketName,
      description: 'Output S3 Bucket Name'
    });
  }
}
