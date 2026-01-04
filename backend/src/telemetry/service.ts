/**
 * File: backend/src/telemetry/service.ts
 * Description: Business logic for Telemetry ingestion.
 * Updates: Added EventBridge logic for Critical Alerts.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"; // <--- NEW IMPORT
import { z } from "zod";
import type { ShipTelemetry } from "../shared/types.js";

// Initialize Clients
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const ebClient = new EventBridgeClient({}); // <--- NEW CLIENT

// Environment Variables
const TABLE_NAME = process.env.TELEMETRY_TABLE_NAME || '';
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || ''; // <--- NEW ENV VAR

const TelemetrySchema = z.object({
    shipId: z.string().min(1),
    timestamp: z.string().datetime(),
    temperature: z.number(),
    fuelLevel: z.number().min(0).max(100),
    latitude: z.number(),
    longitude: z.number(),
    status: z.enum(['NORMAL', 'WARNING', 'CRITICAL'])
});

export async function ingestTelemetry(data: unknown): Promise<ShipTelemetry> {
    if (!TABLE_NAME || !EVENT_BUS_NAME) {
        throw new Error("Server Configuration Error: Missing Env Vars.");
    }

    const parseResult = TelemetrySchema.safeParse(data);
    if (!parseResult.success) {
        throw new Error(`Validation Failed: ${parseResult.error.message}`);
    }
    const telemetry = parseResult.data as ShipTelemetry;

    // 1. Persist to DynamoDB
    const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: telemetry
    });

    try {
        await docClient.send(command);
        console.log(`[TelemetryService] Saved telemetry for ship: ${telemetry.shipId}`);
    } catch (error) {
        console.error("[TelemetryService] DynamoDB Write Error", error);
        throw new Error("Failed to persist telemetry data.");
    }

    // =================================================================
    // 2. CHECK FOR CRITICAL CONDITION (EDA)
    // =================================================================
    if (telemetry.temperature > 100) {
        console.log(`[TelemetryService] ALERT! Temp ${telemetry.temperature} exceeds threshold. Publishing event.`);
        
        const eventCommand = new PutEventsCommand({
            Entries: [
                {
                    EventBusName: EVENT_BUS_NAME,
                    Source: 'nexus.marine.telemetry',
                    DetailType: 'Marine.CriticalAlert',
                    Detail: JSON.stringify({
                        shipId: telemetry.shipId,
                        temperature: telemetry.temperature,
                        timestamp: telemetry.timestamp,
                        alertMessage: "Engine Temperature Critical"
                    }),
                }
            ]
        });

        try {
            await ebClient.send(eventCommand);
            console.log("[TelemetryService] Critical Alert published to EventBridge.");
        } catch (error) {
            // Note: In production, we might want to retry or log to a DLQ, 
            // but we don't fail the HTTP request just because the alert failed.
            console.error("[TelemetryService] Failed to publish event", error);
        }
    }

    return telemetry;
}