require('dotenv').config();
const db = require('./src/models');
const { v4: uuidv4 } = require('uuid');

async function seedAppointment() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ DB connected');

        // 1. Find Tenant (Jasmin Spa)
        const tenant = await db.Tenant.findOne({ where: { name: 'Jasmin Spa' } });
        if (!tenant) throw new Error('Tenant Jasmin Spa not found');
        console.log(`✅ Found Tenant: ${tenant.name_en}`);

        // 2. Find Staff
        const staff = await db.Staff.findOne({ where: { email: 'wahidsami@gmail.com', tenantId: tenant.id } });
        if (!staff) throw new Error('Staff wahidsami@gmail.com not found in Jasmin Spa');
        console.log(`✅ Found Staff: ${staff.name}`);

        // 3. Find or Create Service
        let service = await db.Service.findOne({ where: { tenantId: tenant.id } });
        if (!service) {
            service = await db.Service.create({
                tenantId: tenant.id,
                name_en: 'Premium Haircut & Beard Trim',
                name_ar: 'قص شعر وتشذيب لحية ممتاز',
                description_en: 'Full service grooming experience',
                duration: 60,
                price: 150,
                isActive: true
            });
            console.log('✅ Created new service');
        } else {
            console.log(`✅ Found Service: ${service.name_en}`);
        }

        // 4. Find or Create Customer
        let customer = await db.Customer.findOne({ where: { phone: '+966500000000' } });
        if (!customer) {
            customer = await db.Customer.create({
                phone: '+966500000000',
                name: 'Ahmed Customer',
                email: 'testcustomer@example.com',
                totalBookings: 0,
                totalSpent: 0
            });
            console.log('✅ Created Customer Profile');
        }

        // 5. Create Appointment for Today
        const today = new Date();
        const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0); // Today at 2:00 PM
        const endTime = new Date(startTime.getTime() + service.duration * 60000); // 3:00 PM

        const appointment = await db.Appointment.create({
            tenantId: tenant.id,
            customerId: customer.id,
            serviceId: service.id,
            staffId: staff.id,
            startTime: startTime,
            endTime: endTime,
            status: 'confirmed',
            price: 150.00,
            rawPrice: 150.00,
            depositAmount: 0.00,
            remainderAmount: 150.00,
            totalPaid: 0.00,
            notes: 'First time client, prefers quiet environment.',
            date: startTime.toISOString().split('T')[0] // Just the date part if needed by schema
        });
        console.log(`✅ Created Appointment at ${startTime.toLocaleTimeString()}`);

        console.log('\n🎉 Successfully seeded appointment! Refresh the app to see it.');

    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        console.error(error);
    } finally {
        await db.sequelize.close();
        process.exit(0);
    }
}

seedAppointment();
