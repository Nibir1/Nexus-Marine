import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class EventStack extends cdk.Stack {
    public readonly nexusBus: events.EventBus;
    public readonly alertsQueue: sqs.Queue;
    public readonly salesforceQueue: sqs.Queue;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // 1. Event Bus
        this.nexusBus = new events.EventBus(this, 'NexusMarineBus', {
            eventBusName: 'NexusMarineBus'
        });

        // 2. Critical Alerts Queue (Existing)
        this.alertsQueue = new sqs.Queue(this, 'CriticalAlertsQueue', {
            queueName: 'NexusMarine_CriticalAlerts',
            retentionPeriod: cdk.Duration.days(1),
        });

        const criticalRule = new events.Rule(this, 'CriticalAlertRule', {
            eventBus: this.nexusBus,
            eventPattern: {
                source: ['nexus.marine.telemetry'],
                detailType: ['Marine.CriticalAlert'],
            },
        });
        criticalRule.addTarget(new targets.SqsQueue(this.alertsQueue));

        // =================================================================
        // 3. SALESFORCE SYNC QUEUE (NEW)
        // =================================================================
        /**
         * Pattern: Asynchronous Decoupling.
         * We buffer 'Order.Created' events here so the Lambda can process them
         * reliably without blocking the main API.
         */
        this.salesforceQueue = new sqs.Queue(this, 'SalesforceQueue', {
            queueName: 'NexusMarine_SalesforceSync',
            visibilityTimeout: cdk.Duration.seconds(30), // Give Lambda time to process
        });

        const orderRule = new events.Rule(this, 'OrderCreatedRule', {
            eventBus: this.nexusBus,
            eventPattern: {
                source: ['nexus.marine.orders'],
                detailType: ['Order.Created'],
            },
        });

        // Route Order events to the Salesforce Queue
        orderRule.addTarget(new targets.SqsQueue(this.salesforceQueue));
    }
}