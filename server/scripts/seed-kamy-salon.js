/**
 * Seed: Kamy Salon & Spa — 5 services, 5 products, 4 employees
 * Tenant: vivid.work.aw@gmail.com (Kamy Salon & Spa)
 * Run: node server/scripts/seed-kamy-salon.js
 * Images can be uploaded later via the tenant dashboard.
 */

require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/models');

const TENANT_EMAIL = 'vivid.work.aw@gmail.com';

const SERVICES = [
  { name_en: 'Women\'s Haircut & Styling', name_ar: 'قص وتصفيف شعر نسائي', description_en: 'Professional haircut with wash, blow-dry and styling.', description_ar: 'قص شعر احترافي مع الغسيل والتنشيف والتصفيف', category: 'hair', duration: 60, rawPrice: 120 },
  { name_en: 'Hair Coloring (Full)', name_ar: 'صبغ الشعر كامل', description_en: 'Full head coloring with premium dye and aftercare.', description_ar: 'صبغ كامل للرأس مع صبغة مميزة وعناية لاحقة', category: 'hair', duration: 120, rawPrice: 280 },
  { name_en: 'Classic Facial', name_ar: 'فيسيال كلاسيكي', description_en: 'Cleansing, exfoliation, mask and moisturizer.', description_ar: 'تنظيف، تقشير، قناع ومرطب', category: 'facial', duration: 45, rawPrice: 150 },
  { name_en: 'Manicure & Nail Polish', name_ar: 'مانيكير وطلاء أظافر', description_en: 'Nail shaping, cuticle care and polish of your choice.', description_ar: 'تشكيل الأظافر، عناية بال cuticle وطلاء حسب اختيارك', category: 'nails', duration: 45, rawPrice: 80 },
  { name_en: 'Relaxing Body Massage', name_ar: 'مساج body استرخائي', description_en: 'Full body relaxation massage with aromatic oils.', description_ar: 'مساج استرخاء للجسم مع زيوت عطرية', category: 'spa', duration: 60, rawPrice: 200 },
];

const PRODUCTS = [
  { name_en: 'Hydrating Shampoo 250ml', name_ar: 'شامبو مرطب 250 مل', description_en: 'Sulfate-free hydrating shampoo for all hair types.', description_ar: 'شامبو مرطب خالٍ من السلفات لجميع أنواع الشعر', category: 'Hair Care', rawPrice: 45, stock: 25 },
  { name_en: 'Nourishing Hair Mask', name_ar: 'ماسك شعر مغذي', description_en: 'Deep conditioning mask for damaged and dry hair.', description_ar: 'ماسك ترطيب عميق للشعر التالف والجاف', category: 'Hair Care', rawPrice: 65, stock: 18 },
  { name_en: 'Vitamin C Serum', name_ar: 'سيروم فيتامين سي', description_en: 'Brightening and antioxidant facial serum.', description_ar: 'سيروم وجه مضيء ومضاد للأكسدة', category: 'Skin Care', rawPrice: 95, stock: 12 },
  { name_en: 'Nail Polish Set (3 colours)', name_ar: 'طقم طلاء أظافر (3 ألوان)', description_en: 'Set of three long-lasting nail polish shades.', description_ar: 'ثلاثة ألوان طلاء أظافر يدوم طويلاً', category: 'Nails', rawPrice: 35, stock: 30 },
  { name_en: 'Body Lotion 200ml', name_ar: 'لوشن جسم 200 مل', description_en: 'Lightweight body lotion with shea butter.', description_ar: 'لوشن جسم خفيف مع زبدة الشيا', category: 'Body Care', rawPrice: 42, stock: 22 },
];

const EMPLOYEES = [
  { name: 'Sara Al-Rashid', email: 'sara.kamy@example.com', phone: '+966501111001', nationality: 'Saudi', bio: 'خبيرة شعر وتصفيف', experience: '5', skills: ['Haircut', 'Styling', 'Coloring'], salary: 4500, commissionRate: 15 },
  { name: 'Noura Al-Otaibi', email: 'noura.kamy@example.com', phone: '+966501111002', nationality: 'Saudi', bio: 'متخصصة عناية بالبشرة والفيشيال', experience: '4', skills: ['Facial', 'Skin Care', 'Massage'], salary: 4000, commissionRate: 12 },
  { name: 'Lina Hassan', email: 'lina.kamy@example.com', phone: '+966501111003', nationality: 'Egyptian', bio: 'فنية أظافر ومانيكير', experience: '3', skills: ['Manicure', 'Pedicure', 'Nail Art'], salary: 3500, commissionRate: 10 },
  { name: 'Rania Mahmoud', email: 'rania.kamy@example.com', phone: '+966501111004', nationality: 'Egyptian', bio: 'مساج وتدليك وخدمات سبا', experience: '6', skills: ['Body Massage', 'Aromatherapy', 'Spa'], salary: 4200, commissionRate: 14 },
];

function calcFinalPrice(raw, taxPct = 15, commissionPct = 10) {
  const tax = raw * (taxPct / 100);
  const commission = raw * (commissionPct / 100);
  return Math.round((raw + tax + commission) * 100) / 100;
}

async function run() {
  try {
    console.log('\n🌱 Kamy Salon & Spa — Seed (5 services, 5 products, 4 employees)\n');

    const tenant = await db.Tenant.findOne({ where: { email: TENANT_EMAIL } });
    if (!tenant) {
      throw new Error(`Tenant not found with email: ${TENANT_EMAIL}. Create "Kamy Salon & Spa" and use this email.`);
    }
    console.log(`✅ Tenant: ${tenant.name_en || tenant.name} (${tenant.email})\n`);

    const tenantId = tenant.id;

    // ——— Services ———
    console.log('📋 Creating 5 services...');
    const createdServices = [];
    for (const s of SERVICES) {
      const raw = s.rawPrice;
      const finalPrice = calcFinalPrice(raw);
      const [service] = await db.Service.findOrCreate({
        where: { tenantId, name_en: s.name_en },
        defaults: {
          tenantId,
          name_en: s.name_en,
          name_ar: s.name_ar,
          description_en: s.description_en || null,
          description_ar: s.description_ar || null,
          category: s.category,
          duration: s.duration,
          rawPrice: raw,
          taxRate: 15,
          commissionRate: 10,
          finalPrice,
          isActive: true,
          image: null,
        },
      });
      createdServices.push(service);
      console.log(`   • ${service.name_en}`);
    }
    console.log(`   Done: ${createdServices.length} services.\n`);

    // ——— Products ———
    console.log('🛍️ Creating 5 products...');
    const createdProducts = [];
    for (let i = 0; i < PRODUCTS.length; i++) {
      const p = PRODUCTS[i];
      const raw = p.rawPrice;
      const price = calcFinalPrice(raw);
      const sku = `KAMY-${String(i + 1).padStart(3, '0')}-${Date.now().toString(36)}`;
      const [product] = await db.Product.findOrCreate({
        where: { tenantId, name_en: p.name_en },
        defaults: {
          tenantId,
          name_en: p.name_en,
          name_ar: p.name_ar,
          description_en: p.description_en || null,
          description_ar: p.description_ar || null,
          rawPrice: raw,
          taxRate: 15,
          commissionRate: 10,
          price,
          category: p.category,
          stock: p.stock,
          sku,
          isAvailable: true,
          image: null,
          images: [],
        },
      });
      createdProducts.push(product);
      console.log(`   • ${product.name_en} (SKU: ${product.sku})`);
    }
    console.log(`   Done: ${createdProducts.length} products.\n`);

    // ——— Employees ———
    console.log('👥 Creating 4 employees...');
    const createdStaff = [];
    for (const e of EMPLOYEES) {
      const [staff] = await db.Staff.findOrCreate({
        where: { tenantId, email: e.email },
        defaults: {
          tenantId,
          name: e.name,
          email: e.email,
          phone: e.phone,
          nationality: e.nationality,
          bio: e.bio,
          experience: e.experience,
          skills: e.skills || [],
          salary: e.salary,
          commissionRate: e.commissionRate,
          isActive: true,
          photo: null,
          rating: 5,
        },
      });
      createdStaff.push(staff);
      console.log(`   • ${staff.name} (${staff.email})`);
    }
    console.log(`   Done: ${createdStaff.length} employees.\n`);

    // ——— Assign employees to services ———
    console.log('🔗 Assigning employees to services...');
    let assignments = 0;
    for (const staff of createdStaff) {
      for (const service of createdServices) {
        const [rec] = await db.ServiceEmployee.findOrCreate({
          where: { staffId: staff.id, serviceId: service.id },
          defaults: {
            staffId: staff.id,
            serviceId: service.id,
            commissionRate: staff.commissionRate,
            isPrimary: false,
          },
        });
        if (rec) assignments++;
      }
    }
    console.log(`   Done: ${assignments} service–employee assignments.\n`);

    // ——— Shifts (Sun–Sat 9:00–18:00) ———
    console.log('⏰ Creating weekly shifts (9:00–18:00)...');
    for (const staff of createdStaff) {
      const existing = await db.StaffShift.count({ where: { staffId: staff.id } });
      if (existing > 0) {
        console.log(`   ⚠️ ${staff.name} already has shifts, skipping.`);
        continue;
      }
      for (let day = 0; day <= 6; day++) {
        await db.StaffShift.create({
          staffId: staff.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '18:00',
          isRecurring: true,
          isActive: true,
          label: 'Regular',
        });
      }
      console.log(`   • ${staff.name}: 7 days`);
    }
    console.log('   Done.\n');

    console.log('════════════════════════════════════════');
    console.log('🎉 Seed complete for Kamy Salon & Spa');
    console.log('════════════════════════════════════════');
    console.log(`   Services: ${createdServices.length}`);
    console.log(`   Products: ${createdProducts.length}`);
    console.log(`   Employees: ${createdStaff.length}`);
    console.log('   You can now upload images from the tenant dashboard.\n');
    process.exit(0);
  } catch (err) {
    console.error('❌', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run();
