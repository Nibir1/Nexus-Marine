#!/usr/bin/env node
/**
 * File: cdk/bin/nexus-marine.ts
 * Description: The entry point for the CDK application.
 * It instantiates the stacks defined in the /lib directory.
 */
// import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack.js';

const app = new cdk.App();

/**
 * Instantiate the Database Stack.
 * This stack contains stateful resources (DynamoDB, RDS).
 */
new DatabaseStack(app, 'NexusMarine-DatabaseStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});