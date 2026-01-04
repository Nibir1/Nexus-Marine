#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack.js';
import { ApiStack } from '../lib/api-stack.js';
import { EventStack } from '../lib/event-stack.js';
import { FrontendStack } from '../lib/frontend-stack.js';

const app = new cdk.App();

// 1. Database Layer
const dbStack = new DatabaseStack(app, 'NexusMarine-DatabaseStack', {});

// 2. Event Layer
const eventStack = new EventStack(app, 'NexusMarine-EventStack', {});

// 3. API Layer
new ApiStack(app, 'NexusMarine-ApiStack', {
    telemetryTable: dbStack.telemetryTable,
    eventBus: eventStack.nexusBus,
    vpc: dbStack.vpc,
    postgresInstance: dbStack.postgresInstance,
    dbSecurityGroup: dbStack.dbSecurityGroup,
    salesforceQueue: eventStack.salesforceQueue
});

// 4. Frontend Layer (Static Site)
new FrontendStack(app, 'NexusMarine-FrontendStack', {});