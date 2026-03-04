/**
 * Environment Variable Validation Middleware
 * Ensures all required environment variables are set at server startup
 */

const WEAK_SUPERADMIN_PASSWORDS = [
    'RifahAdmin@2024',
    'password',
    'admin123',
    'Admin123!',
    'Password1',
    'P@ssw0rd',
    'secret',
    'changeme',
    'admin',
    'superadmin',
    'SuperAdmin1'
];

const DEFAULT_JWT_SECRETS = [
    'your-super-secret-jwt-key-change-in-production',
    'your-secret-key',
    'rifah-super-admin-secret-key-2024'
];

const validateEnvironment = () => {
    const requiredVars = [
        'POSTGRES_USER',
        'POSTGRES_PASSWORD',
        'POSTGRES_DB',
        'DB_HOST',
        'DB_PORT',
        'PORT',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET'
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);

    if (missingVars.length > 0) {
        const errorMessage = `
❌ CRITICAL: Missing required environment variables:
${missingVars.map(v => `   - ${v}`).join('\n')}

Please add these to your .env file.
See .env.example for reference.
        `;
        console.error(errorMessage);
        process.exit(1);
    }

    if (process.env.NODE_ENV === 'production') {
        // Production: require SUPERADMIN_PASSWORD (no default)
        const superAdminPassword = process.env.SUPERADMIN_PASSWORD;
        if (!superAdminPassword || superAdminPassword.length < 12) {
            console.error(`
❌ CRITICAL: In production, SUPERADMIN_PASSWORD is required and must be at least 12 characters.
   Current: ${superAdminPassword ? `${superAdminPassword.length} characters` : 'missing'}

Set SUPERADMIN_PASSWORD in your .env file.
            `);
            process.exit(1);
        }
        const weak = WEAK_SUPERADMIN_PASSWORDS.find(w => superAdminPassword === w || superAdminPassword.toLowerCase() === w.toLowerCase());
        if (weak) {
            console.error(`
❌ CRITICAL: SUPERADMIN_PASSWORD must not be a common weak password (e.g. "${weak}").
Choose a strong, unique password (at least 12 characters).
            `);
            process.exit(1);
        }

        // Production: reject default/weak JWT secrets (exit, no fallback)
        if (DEFAULT_JWT_SECRETS.includes(process.env.JWT_SECRET)) {
            console.error(`
❌ CRITICAL: JWT_SECRET must not be a default/example value in production.
Set a strong, unique JWT_SECRET in your .env file.
            `);
            process.exit(1);
        }
        if (DEFAULT_JWT_SECRETS.includes(process.env.JWT_REFRESH_SECRET)) {
            console.error(`
❌ CRITICAL: JWT_REFRESH_SECRET must not be a default/example value in production.
Set a strong, unique JWT_REFRESH_SECRET in your .env file.
            `);
            process.exit(1);
        }

        if (process.env.POSTGRES_PASSWORD === 'dev_password') {
            console.warn(`
⚠️  WARNING: Using weak database password in production!
This is a SECURITY RISK. Please set a strong POSTGRES_PASSWORD in .env.
            `);
        }
    }

    console.log('✅ Environment variables validated');
};

module.exports = validateEnvironment;
