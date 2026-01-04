/**
 * File: backend/src/telemetry/handler.ts
 * Description: AWS Lambda Entry Point for Telemetry Ingestion.
 * Pattern: Adapter pattern - Converts API Gateway Event -> Service Call -> HTTP Response.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ingestTelemetry } from "./service.js"; // ESM import

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("[TelemetryLambda] Received event:", event.body);

    try {
        if (!event.body) {
            return { statusCode: 400, body: JSON.stringify({ error: "Empty request body" }) };
        }

        // Parse JSON body
        const body = JSON.parse(event.body);

        // Call Business Logic
        const result = await ingestTelemetry(body);

        // Return Success
        return {
            statusCode: 201, // Created
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Telemetry ingested successfully", data: result }),
        };

    } catch (error: any) {
        console.error("[TelemetryLambda] Error:", error);
        
        // Differentiate Validation errors (400) from Server errors (500)
        const isValidationError = error.message.includes("Validation Failed");
        
        return {
            statusCode: isValidationError ? 400 : 500,
            body: JSON.stringify({ 
                error: isValidationError ? "Invalid Data" : "Internal Server Error",
                details: error.message 
            }),
        };
    }
};