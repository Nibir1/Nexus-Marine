import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createOrder } from "./service.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("[OrdersLambda] Received:", event.body);

    try {
        if (!event.body) return { statusCode: 400, body: "Missing Body" };
        
        const body = JSON.parse(event.body);
        const order = await createOrder(body);

        return {
            statusCode: 201,
            body: JSON.stringify(order)
        };
    } catch (error: any) {
        console.error("[OrdersLambda] Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};