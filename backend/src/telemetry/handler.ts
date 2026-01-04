/**
 * File: backend/src/telemetry/handler.ts
 * Description: AWS Lambda Entry Point for Telemetry Ingestion.
 * Pattern: Adapter pattern - Converts API Gateway Event -> Service Call -> HTTP Response.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { ingestTelemetry } from "./service.js";

// Standard CORS Headers
const headers = {
    "Access-Control-Allow-Origin": "*", // Allow any domain (for this demo)
    "Access-Control-Allow-Credentials": true,
    "Content-Type": "application/json"
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("[TelemetryLambda] Received event:", event.body);

    try {
        if (!event.body) {
            return { 
                statusCode: 400, 
                headers, 
                body: JSON.stringify({ error: "Empty request body" }) 
            };
        }

        const body = JSON.parse(event.body);
        const result = await ingestTelemetry(body);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ message: "Telemetry ingested successfully", data: result }),
        };

    } catch (error: any) {
        console.error("[TelemetryLambda] Error:", error);
        
        const isValidationError = error.message.includes("Validation Failed");
        
        return {
            statusCode: isValidationError ? 400 : 500,
            headers,
            body: JSON.stringify({ 
                error: isValidationError ? "Invalid Data" : "Internal Server Error",
                details: error.message 
            }),
        };
    }
};