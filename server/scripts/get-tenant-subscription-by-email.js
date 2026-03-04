/**
 * Look up a tenant by owner/contact email and print their subscription.
 * Usage: node scripts/get-tenant-subscription-by-email.js <email>
 * Example: node scripts/get-tenant-subscription-by-email.js vivid.work.aw@gmail.com
 */
require('dotenv').config();
const path = require('path');

// Use server's db (must run from server directory so config resolves)
const db = require(path.join(__dirname, '../src/models'));
const { Op } = db.Sequelize;

const email = (process.argv[2] || 'vivid.work.aw@gmail.com').trim().toLowerCase();

async function run() {
    try {
        // 1) Try Tenant by email or ownerEmail (case-insensitive)
        const tenantByEmail = await db.Tenant.findOne({
            where: {
                [Op.or]: [
                    db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('email')), email),
                    db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('ownerEmail')), email)
                ]
            },
            include: [{
                model: db.TenantSubscription,
                as: 'subscription',
                required: false,
                include: [{ model: db.SubscriptionPackage, as: 'package' }]
            }]
        });

        if (tenantByEmail) {
            printTenantAndSubscription(tenantByEmail);
            await db.sequelize.close();
            process.exit(0);
        }

        // 2) Try User (auth_users) by email, then get tenant + subscription
        const user = await db.User.findOne({
            where: db.sequelize.where(db.sequelize.fn('LOWER', db.sequelize.col('email')), email),
            attributes: ['id', 'email', 'tenantId', 'role']
        });
        if (!user || !user.tenantId) {
            console.log('No tenant found for email:', email);
            process.exit(1);
        }

        const tenantByUser = await db.Tenant.findByPk(user.tenantId, {
            include: [{
                model: db.TenantSubscription,
                as: 'subscription',
                required: false,
                include: [{ model: db.SubscriptionPackage, as: 'package' }]
            }]
        });
        if (tenantByUser) {
            console.log('Found via auth user:', user.email, 'role:', user.role);
            printTenantAndSubscription(tenantByUser);
        } else {
            console.log('User found but tenant not found for tenantId:', user.tenantId);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    } finally {
        await db.sequelize.close();
    }
}

function printTenantAndSubscription(tenant) {
    console.log('\n--- Tenant ---');
    console.log('id:', tenant.id);
    console.log('name:', tenant.name_en || tenant.name_ar || tenant.name);
    console.log('slug:', tenant.slug);
    console.log('email:', tenant.email);
    console.log('ownerEmail:', tenant.ownerEmail);

    const sub = tenant.subscription;
    if (!sub) {
        console.log('\n--- Subscription ---');
        console.log('No subscription record found for this tenant.');
        return;
    }

    const pkg = sub.package;
    console.log('\n--- Subscription ---');
    console.log('status:', sub.status);
    console.log('billingCycle:', sub.billingCycle);
    console.log('currentPeriodEnd:', sub.currentPeriodEnd);
    console.log('\n--- Package ---');
    if (pkg) {
        console.log('id:', pkg.id);
        console.log('name:', pkg.name);
        console.log('name_ar:', pkg.name_ar);
        console.log('slug:', pkg.slug);
        if (pkg.limits && typeof pkg.limits === 'object') {
            console.log('limits (relevant):', JSON.stringify({
                maxStaff: pkg.limits.maxStaff,
                maxServices: pkg.limits.maxServices,
                inAppMarketingNotifications: pkg.limits.inAppMarketingNotifications,
                pushNotifications: pkg.limits.pushNotifications
            }, null, 2));
        }
    } else {
        console.log('Package not loaded (packageId:', sub.packageId, ')');
    }
}

run();
