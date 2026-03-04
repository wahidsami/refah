require('dotenv').config();

// Pool and timeout are env-driven for all environments
const POOL = {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10)
};

const STATEMENT_TIMEOUT_MS = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10);

const baseDialectOptions = {
    statement_timeout: STATEMENT_TIMEOUT_MS
};

module.exports = {
    development: {
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'dev_password',
        database: process.env.POSTGRES_DB || 'rifah_shared',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5434', 10),
        dialect: 'postgres',
        logging: false,
        pool: POOL,
        dialectOptions: baseDialectOptions
    },
    test: {
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'dev_password',
        database: process.env.POSTGRES_DB || 'rifah_shared',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5434', 10),
        dialect: 'postgres',
        logging: false,
        pool: POOL,
        dialectOptions: baseDialectOptions
    },
    production: {
        use_env_variable: 'DATABASE_URL',
        dialect: 'postgres',
        logging: false,
        pool: POOL,
        dialectOptions: {
            ...baseDialectOptions,
            ...(process.env.DB_SSL === 'true' ? {
                ssl: { require: true, rejectUnauthorized: false }
            } : {})
        }
    }
};
