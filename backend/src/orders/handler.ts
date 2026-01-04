import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createOrder } from "./service.js";

// Standard CORS Headers
const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
    "Content-Type": "application/json"
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("[OrdersLambda] Received:", event.body);

    try {
        if (!event.body) {
            return { 
                statusCode: 400, 
                headers, 
                body: JSON.stringify({ error: "Missing Body" }) 
            };
        }
        
        const body = JSON.parse(event.body);
        const order = await createOrder(body);

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify(order)
        };
    } catch (error: any) {
        console.error("[OrdersLambda] Error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};