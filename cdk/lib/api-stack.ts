/**
 * File: cdk/lib/api-stack.ts
 * Description: Defines the API Gateway and Lambda Functions.
 * Resources:
 * 1. Telemetry Lambda (Serverless, Public Internet access).
 * 2. Orders Lambda (VPC-enabled, access to RDS Postgres).
 * 3. Salesforce Lambda (SQS Triggered Worker).
 * 4. RestApi: Public API Gateway.
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources'; // <--- NEW IMPORT
import * as sqs from 'aws-cdk-lib/aws-sqs'; // <--- NEW IMPORT
import * as path from 'path';
import { Construct } from 'constructs';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ApiStackProps extends cdk.StackProps {
    telemetryTable: dynamodb.Table; // Dependency injection from DatabaseStack
    eventBus: events.EventBus;      // Dependency injection from EventStack
    vpc: ec2.Vpc;                   // Required for Orders Lambda networking
    postgresInstance: rds.DatabaseInstance; // Dependency injection from DatabaseStack
    dbSecurityGroup: ec2.SecurityGroup;     // Dependency injection from DatabaseStack
    salesforceQueue: sqs.Queue;     // <--- NEW PROP: Dependency injection from EventStack
}

export class ApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        // =================================================================
        // 1. LAMBDA: Telemetry Ingestion (Public / DynamoDB)
        // =================================================================
        
        const telemetryLambda = new nodejs.NodejsFunction(this, 'TelemetryHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../../backend/src/telemetry/handler.ts'), 
            handler: 'handler',
            environment: {
                TELEMETRY_TABLE_NAME: props.telemetryTable.tableName,
                EVENT_BUS_NAME: props.eventBus.eventBusName
            },
            bundling: {
                minify: true,
                sourceMap: true,
            }
        });

        // Permissions: Write to DynamoDB + Put Events
        props.telemetryTable.grantWriteData(telemetryLambda);
        props.eventBus.grantPutEventsTo(telemetryLambda);


        // =================================================================
        // 2. LAMBDA: Orders Management (VPC / RDS Postgres)
        // =================================================================

        const ordersLambda = new nodejs.NodejsFunction(this, 'OrdersHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../../backend/src/orders/handler.ts'),
            handler: 'handler',
            // Network Configuration: Place inside the VPC
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [props.dbSecurityGroup], // Allow access to the DB SG
            environment: {
                EVENT_BUS_NAME: props.eventBus.eventBusName,
                // Pass the Secret Name (not the password itself) for runtime fetching
                DB_SECRET_NAME: props.postgresInstance.secret?.secretName || '', 
                DB_HOST: props.postgresInstance.dbInstanceEndpointAddress
            },
            bundling: {
                minify: true,
                sourceMap: true,
                // 'pg-native' is an optional dependency of 'pg' that fails in Lambda environments.
                externalModules: ['pg-native'], 
            }
        });

        // Permissions: Put Events
        props.eventBus.grantPutEventsTo(ordersLambda);
        
        // Permissions: Read DB Credentials from Secrets Manager
        props.postgresInstance.secret?.grantRead(ordersLambda);


        // =================================================================
        // 3. LAMBDA: Salesforce Sync (Worker / SQS Trigger)
        // =================================================================
        /**
         * This function is triggered by SQS events.
         * It simulates an external API call to Salesforce.
         * Since it only makes HTTP calls (simulated), it can stay on the public internet (outside VPC)
         * to save costs and complexity (no NAT Gateway needed for this specific function).
         */
        const salesforceLambda = new nodejs.NodejsFunction(this, 'SalesforceHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../../backend/src/salesforce/handler.ts'),
            handler: 'handler',
            environment: {
                // No specific env vars needed for this simulation
            },
            bundling: {
                minify: true,
                sourceMap: true,
            }
        });

        // Add SQS Trigger
        // The Lambda will automatically poll the queue and invoke the handler with a batch of records.
        salesforceLambda.addEventSource(new lambdaEventSources.SqsEventSource(props.salesforceQueue, {
            batchSize: 10, // Process up to 10 orders at once
            reportBatchItemFailures: true // Good practice for partial failures in a batch
        }));


        // =================================================================
        // 4. API GATEWAY
        // =================================================================

        const api = new apigateway.RestApi(this, 'NexusMarineApi', {
            restApiName: 'Nexus Marine API',
            description: 'B2B Portal API for Telemetry and Orders',
            deployOptions: {
                stageName: 'prod',
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
            }
        });

        // --- Route: /telemetry ---
        const telemetryResource = api.root.addResource('telemetry');
        telemetryResource.addMethod('POST', new apigateway.LambdaIntegration(telemetryLambda));

        // --- Route: /orders ---
        const ordersResource = api.root.addResource('orders');
        ordersResource.addMethod('POST', new apigateway.LambdaIntegration(ordersLambda));
        
        // Output the API URL for easy testing
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'The URL of the API Gateway',
        });
    }
}