/**
 * File: cdk/lib/database-stack.ts
 * Description: Defines the persistent storage layer for Nexus-Marine.
 * Resources:
 * 1. VPC: Network isolation for the RDS instance.
 * 2. DynamoDB: NoSQL table for high-volume Ship Telemetry.
 * 3. RDS (Postgres): Relational database for Order Management.
 */

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
    // Expose resources as public properties so other Stacks (ApiStack) can access them
    public readonly telemetryTable: dynamodb.Table;
    public readonly vpc: ec2.Vpc;
    public readonly postgresInstance: rds.DatabaseInstance;
    public readonly dbSecurityGroup: ec2.SecurityGroup;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // =================================================================
        // 1. DYNAMODB (Telemetry Data Layer)
        // =================================================================
        
        /**
         * Create the DynamoDB table for Ship Telemetry.
         * Pattern: Time-series data.
         * Partition Key: shipId (to group data by ship)
         * Sort Key: timestamp (to allow range queries by time)
         */
        this.telemetryTable = new dynamodb.Table(this, 'ShipTelemetryTable', {
            tableName: 'NexusMarine_Telemetry',
            partitionKey: { name: 'shipId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Serverless billing
            removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT for production: Ensures clean cleanup during dev
        });

        // =================================================================
        // 2. NETWORKING (VPC for RDS)
        // =================================================================

        /**
         * Create a VPC for the RDS instance.
         * We minimize cost by setting natGateways to 0 or 1 for this demo project.
         */
        this.vpc = new ec2.Vpc(this, 'NexusMarineVpc', {
            maxAzs: 2, // High availability across 2 Availability Zones
            natGateways: 1, // Required for Lambda in VPC to reach internet (optional for this specific phase but good practice)
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'Public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 24,
                    name: 'Private',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                }
            ]
        });

        // =================================================================
        // 3. RELATIONAL DATABASE (PostgreSQL for Orders)
        // =================================================================

        /**
         * Security Group for the Database.
         * We will allow ingress from the Lambda functions later in the ApiStack.
         */
        this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
            vpc: this.vpc,
            description: 'Allow access to Postgres DB',
            allowAllOutbound: true
        });

        /**
         * RDS PostgreSQL Instance.
         * Using a burstable instance (t3.micro) for cost effectiveness during development.
         */
        this.postgresInstance = new rds.DatabaseInstance(this, 'NexusOrdersDb', {
            engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16 }),
            vpc: this.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
            securityGroups: [this.dbSecurityGroup],
            databaseName: 'nexus_orders',
            // In a real scenario, use Secrets Manager for credentials. 
            // CDK generates a secret automatically if credentials are not provided.
            backupRetention: cdk.Duration.days(0), // Disable backups for dev to save time/cost
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            deletionProtection: false, // Allow easy teardown
        });

        // Output the Secret Name so we can find the password later
        new cdk.CfnOutput(this, 'DbSecretName', {
            value: this.postgresInstance.secret?.secretName || 'Unknown',
            description: 'The name of the secret in Secrets Manager containing DB credentials',
        });
    }
}