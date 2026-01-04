/**
 * File: cdk/lib/api-stack.ts
 * Description: Defines the API Gateway and Lambda Functions.
 * Resources:
 * 1. NodejsFunction: Telemetry Lambda (bundled with esbuild).
 * 2. RestApi: Public API Gateway.
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { Construct } from 'constructs';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ApiStackProps extends cdk.StackProps {
    telemetryTable: dynamodb.Table; // Dependency injection from DatabaseStack
}

export class ApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        // =================================================================
        // 1. LAMBDA: Telemetry Ingestion
        // =================================================================
        
        /**
         * We use NodejsFunction to automatically bundle TypeScript and dependencies.
         * It will find 'backend/src/telemetry/handler.ts' and bundle it.
         */
        const telemetryLambda = new nodejs.NodejsFunction(this, 'TelemetryHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            // Assuming your cdk folder is "nexus-marine/cdk" or "nexus-marine/backend/cdk"
            // We need to point to the backend source relative to this file.
            // Adjust '../backend/src' based on your exact folder structure.
            entry: path.join(__dirname, '../../backend/src/telemetry/handler.ts'), 
            handler: 'handler',
            environment: {
                TELEMETRY_TABLE_NAME: props.telemetryTable.tableName
            },
            bundling: {
                minify: true,
                sourceMap: true,
            }
        });

        // Grant permission: Lambda can WRITE to DynamoDB
        props.telemetryTable.grantWriteData(telemetryLambda);

        // =================================================================
        // 2. API GATEWAY
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

        // Resource: /telemetry
        const telemetryResource = api.root.addResource('telemetry');
        
        // POST /telemetry -> TelemetryLambda
        telemetryResource.addMethod('POST', new apigateway.LambdaIntegration(telemetryLambda));
        
        // Output the API URL for easy testing
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'The URL of the API Gateway',
        });
    }
}