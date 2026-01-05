import { jest, describe, test, expect, beforeEach, beforeAll } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

// 1. Define Mocks BEFORE importing the service
const mQuery = jest.fn<(...args: any[]) => Promise<any>>();
const mRelease = jest.fn();
const mConnect = jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ 
    query: mQuery, 
    release: mRelease 
});
const mPool = jest.fn(() => ({ connect: mConnect }));

// 2. Use unstable_mockModule for ESM support
// This MUST happen before the import of '../src/orders/service.js'
jest.unstable_mockModule('pg', () => ({
    default: { Pool: mPool },
    Pool: mPool
}));

// 3. Import Service AFTER mocking
// We use dynamic import() inside beforeAll or just top-level await if supported
const { createOrder } = await import('../src/orders/service.js');

const smMock = mockClient(SecretsManagerClient);
const ebMock = mockClient(EventBridgeClient);

describe('Orders Service', () => {
    beforeEach(() => {
        smMock.reset();
        ebMock.reset();
        mQuery.mockReset();
        mConnect.mockClear();
    });

    test('should create order, save to DB, and publish event', async () => {
        smMock.on(GetSecretValueCommand).resolves({
            SecretString: JSON.stringify({ username: 'user', password: 'pw' })
        });

        // Mock SQL responses
        mQuery.mockResolvedValueOnce({}); // BEGIN
        mQuery.mockResolvedValueOnce({}); // CREATE TABLE
        mQuery.mockResolvedValueOnce({}); // INSERT
        mQuery.mockResolvedValueOnce({}); // COMMIT

        const input = {
            shipId: 'SHIP-1',
            partId: 'PART-A',
            quantity: 5
        };

        const result = await createOrder(input);

        expect(result.orderId).toBeDefined();
        expect(mConnect).toHaveBeenCalled();
        expect(mQuery).toHaveBeenCalledWith('BEGIN');
        
        // Verify EventBridge call manually
        expect(ebMock.calls()).toHaveLength(1);
        const ebArgs = ebMock.call(0).args[0] as PutEventsCommand;
        expect(ebArgs.input.Entries?.[0]?.DetailType).toBe('Order.Created');
    });

    test('should rollback DB transaction on error', async () => {
        // 1. Silence console.error
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

        smMock.on(GetSecretValueCommand).resolves({
            SecretString: JSON.stringify({ username: 'user', password: 'pw' })
        });

        mQuery.mockResolvedValueOnce({}); 
        mQuery.mockResolvedValueOnce({}); 
        mQuery.mockRejectedValueOnce(new Error('DB Error')); 

        const input = { shipId: 'S1', partId: 'P1', quantity: 1 };

        await expect(createOrder(input)).rejects.toThrow('Database Transaction Failed');
        expect(mQuery).toHaveBeenCalledWith('ROLLBACK');
        
        // 2. Restore console.error so other tests can use it
        spy.mockRestore();
    });
});