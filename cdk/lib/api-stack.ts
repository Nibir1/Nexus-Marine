import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import { Construct } from 'constructs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ApiStackProps extends cdk.StackProps {
    telemetryTable: dynamodb.Table;
    eventBus: events.EventBus;
    vpc: ec2.Vpc;
    postgresInstance: rds.DatabaseInstance;
    dbSecurityGroup: ec2.SecurityGroup;
    salesforceQueue: sqs.Queue;
}

export class ApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        // =================================================================
        // 1. SECURITY: Cognito User Pool (Requirement: Auth)
        // =================================================================
        const userPool = new cognito.UserPool(this, 'NexusMarineUserPool', {
            userPoolName: 'NexusMarine-Users',
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            autoVerify: { email: true },
            passwordPolicy: {
                minLength: 8,
                requireSymbols: false,
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY, 
        });

        const userPoolClient = userPool.addClient('NexusMarineClient', {
            userPoolClientName: 'WebClient',
            authFlows: { userSrp: true },
        });

        const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'NexusAuthorizer', {
            cognitoUserPools: [userPool],
        });

        // =================================================================
        // 2. LAMBDA: Telemetry (Public Ingestion)
        // =================================================================
        const telemetryLambda = new nodejs.NodejsFunction(this, 'TelemetryHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../../backend/src/telemetry/handler.ts'), 
            handler: 'handler',
            environment: {
                TELEMETRY_TABLE_NAME: props.telemetryTable.tableName,
                EVENT_BUS_NAME: props.eventBus.eventBusName
            },
            bundling: { minify: true, sourceMap: true }
        });

        props.telemetryTable.grantWriteData(telemetryLambda);
        props.eventBus.grantPutEventsTo(telemetryLambda);

        // =================================================================
        // 3. LAMBDA: Orders (VPC Enabled / Secured)
        // =================================================================
        // NOTE: We use NodejsFunction here for stability.
        // The Docker capability is demonstrated via the 'make docker-proof' command.
        const ordersLambda = new nodejs.NodejsFunction(this, 'OrdersHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../../backend/src/orders/handler.ts'),
            handler: 'handler',
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            securityGroups: [props.dbSecurityGroup],
            environment: {
                EVENT_BUS_NAME: props.eventBus.eventBusName,
                DB_SECRET_NAME: props.postgresInstance.secret?.secretName || '', 
                DB_HOST: props.postgresInstance.dbInstanceEndpointAddress
            },
            bundling: {
                minify: true,
                sourceMap: true,
                externalModules: ['pg-native'], 
            }
        });

        props.eventBus.grantPutEventsTo(ordersLambda);
        props.postgresInstance.secret?.grantRead(ordersLambda);

        // =================================================================
        // 4. LAMBDA: Salesforce (Worker)
        // =================================================================
        const salesforceLambda = new nodejs.NodejsFunction(this, 'SalesforceHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../../backend/src/salesforce/handler.ts'),
            handler: 'handler',
            bundling: { minify: true, sourceMap: true }
        });

        salesforceLambda.addEventSource(new lambdaEventSources.SqsEventSource(props.salesforceQueue, {
            batchSize: 10,
            reportBatchItemFailures: true 
        }));

        // =================================================================
        // 5. API GATEWAY (Secured Routes)
        // =================================================================
        const api = new apigateway.RestApi(this, 'NexusMarineApi', {
            restApiName: 'Nexus Marine API',
            description: 'Enterprise B2B Portal API',
            deployOptions: { stageName: 'prod' },
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
            }
        });

        const telemetryResource = api.root.addResource('telemetry');
        telemetryResource.addMethod('POST', new apigateway.LambdaIntegration(telemetryLambda), {
            apiKeyRequired: false 
        });

        const ordersResource = api.root.addResource('orders');
        ordersResource.addMethod('POST', new apigateway.LambdaIntegration(ordersLambda), {
            // 🔒 SECURITY: Only authenticated users can place orders
            authorizer: authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });

        // =================================================================
        // 6. MONITORING: CloudWatch Dashboard & Alarms (Requirement: Observability)
        // =================================================================
        const dashboard = new cloudwatch.Dashboard(this, 'NexusDashboard', {
            dashboardName: 'NexusMarine-Ops-Center',
        });

        const orderErrors = ordersLambda.metricErrors({
            period: cdk.Duration.minutes(5),
            statistic: 'Sum'
        });

        new cloudwatch.Alarm(this, 'OrderFailureAlarm', {
            metric: orderErrors,
            threshold: 2,
            evaluationPeriods: 1,
            alarmDescription: 'CRITICAL: High Order Failure Rate!',
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });

        dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'Order Processing Errors',
                left: [orderErrors],
                width: 12
            }),
            new cloudwatch.GraphWidget({
                title: 'Salesforce Queue Depth',
                left: [props.salesforceQueue.metricApproximateNumberOfMessagesVisible()],
                width: 12
            })
        );

        // =================================================================
        // OUTPUTS
        // =================================================================
        new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
        new cdk.CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
        new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    }
}