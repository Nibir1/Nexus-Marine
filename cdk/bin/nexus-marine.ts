#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack.js';
import { ApiStack } from '../lib/api-stack.js'; // Import the new stack

const app = new cdk.App();

// 1. Deploy Database Layer
const dbStack = new DatabaseStack(app, 'NexusMarine-DatabaseStack', {});

// 2. Deploy API Layer (Depends on Database Layer)
new ApiStack(app, 'NexusMarine-ApiStack', {
    telemetryTable: dbStack.telemetryTable, // Pass the table reference
});