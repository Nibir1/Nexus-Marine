#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack.js';
import { ApiStack } from '../lib/api-stack.js';
import { EventStack } from '../lib/event-stack.js';

const app = new cdk.App();

// 1. Deploy Database Layer
const dbStack = new DatabaseStack(app, 'NexusMarine-DatabaseStack', {});

// 2. Event Layer (EDA Backbone)
const eventStack = new EventStack(app, 'NexusMarine-EventStack', {});

// 3. API Layer (Depends on DB and Event Bus)
new ApiStack(app, 'NexusMarine-ApiStack', {
    telemetryTable: dbStack.telemetryTable,
    eventBus: eventStack.nexusBus,
});