/**
 * File: backend/src/telemetry/service.ts
 * Description: Business logic for Telemetry ingestion.
 * Responsibilities:
 * 1. Validate incoming data structure.
 * 2. Persist data to DynamoDB.
 * 3. (Phase 3 placeholder) Check for critical thresholds.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { z } from "zod";
import type { ShipTelemetry } from "../shared/types.js"; // Note the .js extension for ESM/nodenext

// Initialize DynamoDB Client (Outside handler for connection reuse)
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Get Table Name from Environment Variable (injected by CDK)
const TABLE_NAME = process.env.TELEMETRY_TABLE_NAME || '';

/**
 * Zod Schema for runtime validation of incoming telemetry.
 * This ensures we don't save garbage data to our database.
 */
const TelemetrySchema = z.object({
    shipId: z.string().min(1),
    timestamp: z.string().datetime(), // ISO 8601 validation
    temperature: z.number(),
    fuelLevel: z.number().min(0).max(100),
    latitude: z.number(),
    longitude: z.number(),
    status: z.enum(['NORMAL', 'WARNING', 'CRITICAL'])
});

/**
 * Service function to process and save telemetry data.
 * @param data - Raw input object (usually from JSON body)
 * @returns The saved ShipTelemetry object
 */
export async function ingestTelemetry(data: unknown): Promise<ShipTelemetry> {
    if (!TABLE_NAME) {
        throw new Error("Server Configuration Error: TELEMETRY_TABLE_NAME is missing.");
    }

    // 1. Validate Data
    const parseResult = TelemetrySchema.safeParse(data);
    if (!parseResult.success) {
        throw new Error(`Validation Failed: ${parseResult.error.message}`);
    }
    const telemetry = parseResult.data as ShipTelemetry;

    // 2. Persist to DynamoDB
    const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: telemetry
    });

    try {
        await docClient.send(command);
        console.log(`[TelemetryService] Saved telemetry for ship: ${telemetry.shipId}`);
        
        // (Phase 3: EventBridge logic will go here)

        return telemetry;
    } catch (error) {
        console.error("[TelemetryService] DynamoDB Write Error", error);
        throw new Error("Failed to persist telemetry data.");
    }
}