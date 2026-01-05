import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DatabaseStack } from '../lib/database-stack.js';
import { EventStack } from '../lib/event-stack.js';
import { ApiStack } from '../lib/api-stack.js';

// Mock App environment
const app = new cdk.App();
const dbStack = new DatabaseStack(app, 'TestDbStack');
const eventStack = new EventStack(app, 'TestEventStack');
const apiStack = new ApiStack(app, 'TestApiStack', {
    telemetryTable: dbStack.telemetryTable,
    eventBus: eventStack.nexusBus,
    vpc: dbStack.vpc,
    postgresInstance: dbStack.postgresInstance,
    dbSecurityGroup: dbStack.dbSecurityGroup,
    salesforceQueue: eventStack.salesforceQueue
});

describe('Nexus Marine Infrastructure', () => {

    test('DatabaseStack: Created DynamoDB Table with Correct Key', () => {
        const template = Template.fromStack(dbStack);
        
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            KeySchema: [
                { AttributeName: 'shipId', KeyType: 'HASH' },
                { AttributeName: 'timestamp', KeyType: 'RANGE' }
            ],
            BillingMode: 'PAY_PER_REQUEST'
        });
    });

    test('DatabaseStack: Created RDS Instance', () => {
        const template = Template.fromStack(dbStack);
        template.hasResourceProperties('AWS::RDS::DBInstance', {
            Engine: 'postgres',
            DBInstanceClass: 'db.t3.micro'
        });
    });

    test('EventStack: Created Event Bus and SQS Queues', () => {
        const template = Template.fromStack(eventStack);
        
        template.hasResourceProperties('AWS::Events::EventBus', {
            Name: 'NexusMarineBus'
        });

        // Check for 2 queues (CriticalAlerts + SalesforceSync)
        template.resourceCountIs('AWS::SQS::Queue', 2);
    });

    test('ApiStack: Created API Gateway with Routes', () => {
        const template = Template.fromStack(apiStack);
        
        // Check for API Gateway
        template.hasResourceProperties('AWS::ApiGateway::RestApi', {
            Name: 'Nexus Marine API'
        });

        // Check for 3 Lambda Functions (Telemetry, Orders, Salesforce)
        template.resourceCountIs('AWS::Lambda::Function', 3);
    });
    
    test('ApiStack: Orders Lambda has VPC Config', () => {
        const template = Template.fromStack(apiStack);
        
        // Find the Orders Lambda (the one with VpcConfig)
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'index.handler',
            VpcConfig: Match.objectLike({
                SubnetIds: Match.anyValue(),
                SecurityGroupIds: Match.anyValue()
            })
        });
    });
});