import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
// Import the service dynamically to ensure mocks apply if we were using module mocks (not needed here but good practice)
import { ingestTelemetry } from '../src/telemetry/service.js';

const ddbMock = mockClient(DynamoDBDocumentClient);
const ebMock = mockClient(EventBridgeClient);

describe('Telemetry Service', () => {
    beforeEach(() => {
        ddbMock.reset();
        ebMock.reset();
    });

    test('should save NORMAL telemetry to DynamoDB without triggering EventBridge', async () => {
        const input = {
            shipId: 'TEST-SHIP',
            timestamp: '2024-01-01T00:00:00.000Z',
            temperature: 85,
            fuelLevel: 50,
            latitude: 10,
            longitude: 10,
            status: 'NORMAL'
        };

        await ingestTelemetry(input);

        // Verify DynamoDB call
        expect(ddbMock.calls()).toHaveLength(1);
        const ddbArgs = ddbMock.call(0).args[0] as PutCommand;
        expect(ddbArgs.input).toEqual({
            TableName: 'TestTable',
            Item: input
        });

        // Verify EventBridge was NOT called
        expect(ebMock.calls()).toHaveLength(0);
    });

    test('should trigger CriticalAlert event when temperature > 100', async () => {
        const input = {
            shipId: 'TEST-SHIP',
            timestamp: '2024-01-01T00:00:00.000Z',
            temperature: 105,
            fuelLevel: 50,
            latitude: 10,
            longitude: 10,
            status: 'CRITICAL'
        };

        await ingestTelemetry(input);

        // Verify EventBridge call
        expect(ebMock.calls()).toHaveLength(1);
        const ebArgs = ebMock.call(0).args[0] as PutEventsCommand;
        
        expect(ebArgs.input.Entries).toHaveLength(1);
        expect(ebArgs.input.Entries![0]).toMatchObject({
            Source: 'nexus.marine.telemetry',
            DetailType: 'Marine.CriticalAlert',
        });
    });

    test('should throw error on invalid input data', async () => {
        const invalidInput = { shipId: '' }; 
        await expect(ingestTelemetry(invalidInput)).rejects.toThrow('Validation Failed');
    });
});