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

    test('DatabaseStack: Created DynamoDB Table', () => {
        const template = Template.fromStack(dbStack);
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            BillingMode: 'PAY_PER_REQUEST'
        });
    });

    test('ApiStack: Created Cognito User Pool', () => {
        const template = Template.fromStack(apiStack);
        template.hasResourceProperties('AWS::Cognito::UserPool', {
            UserPoolName: 'NexusMarine-Users'
        });
    });

    test('ApiStack: Created CloudWatch Dashboard', () => {
        const template = Template.fromStack(apiStack);
        template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
            DashboardName: 'NexusMarine-Ops-Center'
        });
    });

    test('ApiStack: Orders Lambda is NodejsFunction (Secure VPC)', () => {
        const template = Template.fromStack(apiStack);
        
        // Check for the Orders Lambda
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'index.handler', // NodejsFunction bundles to index.handler
            Runtime: 'nodejs20.x',
            VpcConfig: Match.objectLike({
                SubnetIds: Match.anyValue(),
                SecurityGroupIds: Match.anyValue()
            })
        });
    });
});