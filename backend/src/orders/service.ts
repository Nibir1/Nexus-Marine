/**
 * File: backend/src/orders/service.ts
 * Description: Business logic for Order Management.
 * Responsibilities:
 * 1. Fetch DB Credentials from Secrets Manager.
 * 2. Connect to PostgreSQL.
 * 3. Persist Order.
 * 4. Publish 'Order.Created' event.
 */

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import pkg from 'pg'; // Default import for 'pg' in ESM
const { Pool } = pkg;
import { z } from "zod";
import type { PartOrder } from "../shared/types.js";
import * as crypto from 'crypto';

// Initialize AWS Clients
const smClient = new SecretsManagerClient({});
const ebClient = new EventBridgeClient({});

// Environment Variables
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || '';
const DB_PROXY_ENDPOINT = process.env.DB_HOST || ''; // Using Direct Instance Host for now
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || '';

// Connection Pool (Singleton outside handler)
let pool: pkg.Pool | null = null;

// Validation Schema
const OrderSchema = z.object({
    shipId: z.string(),
    partId: z.string(),
    quantity: z.number().positive(),
});

/**
 * Helper: Get DB Credentials securely
 */
async function getDbConfig() {
    if (!DB_SECRET_NAME) throw new Error("Missing DB_SECRET_NAME");
    
    const command = new GetSecretValueCommand({ SecretId: DB_SECRET_NAME });
    const response = await smClient.send(command);
    
    if (!response.SecretString) throw new Error("Secret is empty");
    
    const secret = JSON.parse(response.SecretString);
    return {
        user: secret.username,
        password: secret.password,
        host: secret.host || DB_PROXY_ENDPOINT, // Fallback if host not in secret
        port: secret.port || 5432,
        database: 'nexus_orders', // Defined in DatabaseStack
        ssl: { rejectUnauthorized: false } // Required for AWS RDS
    };
}

/**
 * Main Logic: Place an Order
 */
export async function createOrder(data: unknown): Promise<PartOrder> {
    // 1. Validate Input
    const parseResult = OrderSchema.safeParse(data);
    if (!parseResult.success) throw new Error(`Invalid Order: ${parseResult.error.message}`);
    const input = parseResult.data;

    // 2. Initialize DB Pool (Lazy Loading)
    if (!pool) {
        const dbConfig = await getDbConfig();
        pool = new Pool(dbConfig);
    }

    const orderId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const newOrder: PartOrder = {
        orderId,
        shipId: input.shipId,
        partId: input.partId,
        quantity: input.quantity,
        createdAt
    };

    // 3. SQL Transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Ensure table exists (Quick hack for demo - ideally done via Flyway/Liquibase)
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                order_id VARCHAR(50) PRIMARY KEY,
                ship_id VARCHAR(50) NOT NULL,
                part_id VARCHAR(50) NOT NULL,
                quantity INT NOT NULL,
                created_at TIMESTAMP NOT NULL
            );
        `);

        // Insert Order
        const insertQuery = `
            INSERT INTO orders (order_id, ship_id, part_id, quantity, created_at)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(insertQuery, [orderId, input.shipId, input.partId, input.quantity, createdAt]);

        await client.query('COMMIT');
        console.log(`[OrderService] Order persisted: ${orderId}`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("[OrderService] SQL Error", e);
        throw new Error("Database Transaction Failed");
    } finally {
        client.release();
    }

    // 4. Publish Event (EventBridge)
    const eventCmd = new PutEventsCommand({
        Entries: [{
            EventBusName: EVENT_BUS_NAME,
            Source: 'nexus.marine.orders',
            DetailType: 'Order.Created',
            Detail: JSON.stringify(newOrder)
        }]
    });

    await ebClient.send(eventCmd);
    console.log(`[OrderService] Event published: Order.Created`);

    return newOrder;
}