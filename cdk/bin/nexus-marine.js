#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack.js';
import { ApiStack } from '../lib/api-stack.js';
import { EventStack } from '../lib/event-stack.js';
const app = new cdk.App();
const dbStack = new DatabaseStack(app, 'NexusMarine-DatabaseStack', {});
const eventStack = new EventStack(app, 'NexusMarine-EventStack', {});
new ApiStack(app, 'NexusMarine-ApiStack', {
    telemetryTable: dbStack.telemetryTable,
    eventBus: eventStack.nexusBus,
    // Inject VPC and DB details
    vpc: dbStack.vpc,
    postgresInstance: dbStack.postgresInstance,
    dbSecurityGroup: dbStack.dbSecurityGroup
});
//# sourceMappingURL=nexus-marine.js.map