/**
 * File: backend/src/salesforce/handler.ts
 * Description: Simulates syncing orders to an external CRM (Salesforce).
 * Trigger: SQS (NexusMarine_SalesforceSync)
 */

import type { SQSEvent, SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event: SQSEvent) => {
    console.log(`[SalesforceSync] Processing ${event.Records.length} records.`);

    for (const record of event.Records) {
        try {
            // SQS wraps the EventBridge event in 'body'
            // EventBridge wraps the actual detail in 'detail'
            const ebEvent = JSON.parse(record.body);
            const order = ebEvent.detail;

            console.log(`[SalesforceSync] Syncing Order: ${order.orderId} for Ship: ${order.shipId}`);
            
            // SIMULATION: Artificial delay to represent an external API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log(`[SalesforceSync] ✅ Successfully synced Order ${order.orderId} to CRM.`);
            
        } catch (error) {
            console.error(`[SalesforceSync] Failed to process record: ${record.messageId}`, error);
            // In a real app, throwing an error here would trigger SQS retries
        }
    }
};