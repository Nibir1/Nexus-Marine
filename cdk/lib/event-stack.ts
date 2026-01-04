/**
 * File: cdk/lib/event-stack.ts
 * Description: Deploys the EventBridge Bus and SQS Queues.
 * Resources:
 * 1. EventBus: The central hub for all system events.
 * 2. AlertsQueue: An SQS queue that subscribes to 'Marine.CriticalAlert'.
 * (This allows us to verify events are flowing immediately).
 */

import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class EventStack extends cdk.Stack {
    public readonly nexusBus: events.EventBus;
    public readonly alertsQueue: sqs.Queue;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // =================================================================
        // 1. EVENT BUS
        // =================================================================
        /**
         * Custom Event Bus for Nexus Marine.
         * Segregates our application traffic from the default AWS account bus.
         */
        this.nexusBus = new events.EventBus(this, 'NexusMarineBus', {
            eventBusName: 'NexusMarineBus'
        });

        // =================================================================
        // 2. CRITICAL ALERTS QUEUE (Subscriber)
        // =================================================================
        /**
         * This Queue will receive any event marked 'Marine.CriticalAlert'.
         * In a real app, a Lambda or Notification Service would pull from here.
         */
        this.alertsQueue = new sqs.Queue(this, 'CriticalAlertsQueue', {
            queueName: 'NexusMarine_CriticalAlerts',
            retentionPeriod: cdk.Duration.days(1),
        });

        // =================================================================
        // 3. RULE: Filter for Critical Alerts
        // =================================================================
        /**
         * Pattern Matching:
         * Source: 'nexus.marine.telemetry'
         * DetailType: 'Marine.CriticalAlert'
         */
        const criticalRule = new events.Rule(this, 'CriticalAlertRule', {
            eventBus: this.nexusBus,
            eventPattern: {
                source: ['nexus.marine.telemetry'],
                detailType: ['Marine.CriticalAlert'],
            },
        });

        // Add the Queue as the target for this rule
        criticalRule.addTarget(new targets.SqsQueue(this.alertsQueue));

        // Output the Bus Name/ARN
        new cdk.CfnOutput(this, 'EventBusName', {
            value: this.nexusBus.eventBusName,
            description: 'Custom Event Bus Name',
        });
    }
}