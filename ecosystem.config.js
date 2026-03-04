// PM2 ecosystem for Rifah platform.
// Next.js apps (client, admin, tenant, PublicPage) need NEXT_PUBLIC_* set at BUILD time.
// Set them in each app's .env.production before running npm run build, or via env when building.
module.exports = {
    apps: [
        {
            name: "rifah-client",
            cwd: "./client",
            script: "npm",
            args: "start",
            env: {
                NODE_ENV: "production",
                PORT: 3000
            }
        },
        {
            name: "rifah-admin",
            cwd: "./admin",
            script: "npm",
            args: "start",
            env: {
                NODE_ENV: "production",
                PORT: 3001
            }
        },
        {
            name: "rifah-tenant",
            cwd: "./tenant",
            script: "npm",
            args: "start",
            env: {
                NODE_ENV: "production",
                PORT: 3002
            }
        },
        {
            name: "rifah-public",
            cwd: "./PublicPage",
            script: "npm",
            args: "start",
            env: {
                NODE_ENV: "production",
                PORT: 3004
            }
        },
        {
            name: "rifah-server",
            cwd: "./server",
            script: "src/index.js",
            env: {
                NODE_ENV: "production",
                PORT: 5000
            }
        }
    ]
};
