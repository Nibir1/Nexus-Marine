// This runs before any test file is loaded, ensuring Env Vars exist
// before the service files try to read them.
process.env.TELEMETRY_TABLE_NAME = 'TestTable';
process.env.EVENT_BUS_NAME = 'TestBus';
process.env.DB_SECRET_NAME = 'TestSecret';
process.env.DB_HOST = 'localhost';