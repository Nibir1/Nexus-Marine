/**
 * File: backend/src/shared/types.ts
 * Description: Shared TypeScript interfaces for the Nexus-Marine application.
 * These types are used by both the backend services and the infrastructure definitions (where applicable).
 */

// ------------------------------------------------------------------
// TELEMETRY DOMAIN
// ------------------------------------------------------------------

/**
 * Represents a raw telemetry packet received from a marine vessel.
 * This corresponds to the items stored in the DynamoDB Telemetry Table.
 */
export interface ShipTelemetry {
    /** Unique identifier for the ship (Partition Key) */
    shipId: string;
    
    /** ISO 8601 Timestamp of the reading (Sort Key) */
    timestamp: string;
    
    /** Engine temperature in Celsius */
    temperature: number;
    
    /** Current fuel level (percentage 0-100) */
    fuelLevel: number;
    
    /** GPS Latitude */
    latitude: number;
    
    /** GPS Longitude */
    longitude: number;
    
    /** Operational status of the engine */
    status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

// ------------------------------------------------------------------
// ORDERING DOMAIN
// ------------------------------------------------------------------

/**
 * Represents a B2B order for ship spare parts.
 * This corresponds to the rows stored in the PostgreSQL Database.
 */
export interface PartOrder {
    /** Unique Order ID (UUID) */
    orderId: string;
    
    /** ID of the ship requesting the part */
    shipId: string;
    
    /** SKU or Part Identifier */
    partId: string;
    
    /** Number of units ordered */
    quantity: number;
    
    /** ISO 8601 Timestamp when order was placed */
    createdAt: string;
}