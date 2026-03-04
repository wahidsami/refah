/**
 * Seed: Kamy Salon & Spa — About Us (story, mission, vision, values, facilities)
 * Tenant: vivid.work.aw@gmail.com (Kamy Salon & Spa)
 * Run: node server/scripts/seed-kamy-about-us.js
 * Facility images can be uploaded later via the tenant dashboard.
 */

require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const db = require('../src/models');
const crypto = require('crypto');
const uuid = () => crypto.randomUUID();

const TENANT_EMAIL = 'vivid.work.aw@gmail.com';

const item = (titleEn, titleAr, detailsEn, detailsAr, iconName = 'SparklesIcon') => ({
  id: uuid(),
  titleEn,
  titleAr,
  detailsEn,
  detailsAr,
  type: 'icon',
  iconName,
});

const MISSIONS = [
  item(
    'Quality & Care',
    'الجودة والرعاية',
    'Deliver the highest quality hair, beauty and spa services with care and attention to detail.',
    'تقديم أعلى مستوى من خدمات الشعر والتجميل والسبا مع العناية والاهتمام بالتفاصيل.'
  ),
  item(
    'Client Satisfaction',
    'رضا العملاء',
    'Every visit should leave our clients feeling refreshed, confident and valued.',
    'كل زيارة يجب أن تترك عملاءنا يشعرون بالانتعاش والثقة والتقدير.'
  ),
  item(
    'Continuous Improvement',
    'التطوير المستمر',
    'We keep learning and improving our skills, products and environment.',
    'نواصل التعلم وتحسين مهاراتنا ومنتجاتنا وبيئة العمل.'
  ),
];

const VISIONS = [
  item(
    'Your Go-To Salon & Spa',
    'صالونك وسبا المفضل',
    'To be the first choice for hair, beauty and relaxation in our community.',
    'أن نكون الخيار الأول للشعر والتجميل والاسترخاء في مجتمعنا.',
    'EyeIcon'
  ),
  item(
    'Trusted Brand',
    'علامة موثوقة',
    'A trusted name that families and professionals recommend with confidence.',
    'اسم موثوق يوصي به العائلات والمحترفون بثقة.',
    'HeartIcon'
  ),
];

const VALUES = [
  item(
    'Integrity',
    'النزاهة',
    'We are honest in our work, transparent in our pricing and fair in our dealings.',
    'نحن نكون صادقين في عملنا وشفافين في أسعارنا ومنصفين في تعاملاتنا.',
    'ShieldCheckIcon'
  ),
  item(
    'Excellence',
    'التميز',
    'We strive for excellence in every cut, every treatment and every guest experience.',
    'نسعى للتميز في كل قصّة وكل علاج وكل تجربة ضيف.',
    'StarIcon'
  ),
  item(
    'Respect',
    'الاحترام',
    'We respect our clients\' time, preferences and diversity.',
    'نحترم وقت عملائنا وتفضيلاتهم وتنوعهم.',
    'UserGroupIcon'
  ),
  item(
    'Teamwork',
    'العمل الجماعي',
    'We support each other and work together to create a welcoming environment.',
    'ندعم بعضنا ونتعاون لخلق بيئة ترحيبية.',
    'UsersIcon'
  ),
];

const ABOUT_US = {
  storyTitle: 'ourStory',
  storyEn: `Kamy Salon & Spa was founded with a simple belief: everyone deserves to look and feel their best. We started as a small team of passionate stylists and therapists, and have grown into a full-service salon and spa where quality, hygiene and customer care come first.

We offer a wide range of services—from haircuts and coloring to facials, nails and relaxing massages—all in a clean, modern and welcoming space. Our team is trained, experienced and committed to making every visit a positive experience.`,
  storyAr: `تأسس صالون وسبا كامي على إيمان بسيط: الجميع يستحق أن يبدو ويشعر بأفضل حال. بدأنا كفريق صغير من مصففي الشعر والمعالجين المتحمسين، ونمونا لنصبح صالوناً وسبا متكاملاً حيث تأتي الجودة والنظافة ورعاية العملاء أولاً.

نقدم مجموعة واسعة من الخدمات—من قص الشعر والصبغ إلى الفيسيال والأظافر والمساجات المريحة—كل ذلك في مكان نظيف وعصري وترحيبي. فريقنا مدرب وذو خبرة وملتزم بجعل كل زيارة تجربة إيجابية.`,
  facilitiesDescriptionEn: `Our space is designed for your comfort and convenience. We have dedicated areas for hair styling and coloring, private treatment rooms for facials and massages, and a nail bar. All areas are kept clean and sanitized. We use quality products and modern equipment to ensure the best results. Free WiFi and refreshments are available for waiting guests.`,
  facilitiesDescriptionAr: `تم تصميم مكاننا لراحتك وراحتك. لدينا مناطق مخصصة لتصفيف الشعر والصبغ، وغرف علاج خاصة للفيشيال والمساج، وبار أظافر. جميع المناطق تُحافظ عليها نظيفة ومعقمة. نستخدم منتجات ذات جودة ومعدات حديثة لضمان أفضل النتائج. واي فاي مجاني والمشروبات متاحة للضيوف المنتظرين.`,
};

async function run() {
  try {
    console.log('\n🌱 Kamy Salon & Spa — About Us seed (story, mission, vision, values, facilities)\n');

    const tenant = await db.Tenant.findOne({ where: { email: TENANT_EMAIL } });
    if (!tenant) {
      throw new Error(`Tenant not found with email: ${TENANT_EMAIL}.`);
    }
    console.log(`✅ Tenant: ${tenant.name_en || tenant.name} (${tenant.email})\n`);

    let pageData = await db.PublicPageData.findOne({
      where: { tenantId: tenant.id },
    });

    if (!pageData) {
      console.log('📄 Creating PublicPageData for tenant...');
      pageData = await db.PublicPageData.create({
        tenantId: tenant.id,
        aboutUs_storyTitle: ABOUT_US.storyTitle,
        aboutUs_storyEn: ABOUT_US.storyEn,
        aboutUs_storyAr: ABOUT_US.storyAr,
        aboutUs_missions: MISSIONS,
        aboutUs_visions: VISIONS,
        aboutUs_values: VALUES,
        aboutUs_facilitiesDescriptionEn: ABOUT_US.facilitiesDescriptionEn,
        aboutUs_facilitiesDescriptionAr: ABOUT_US.facilitiesDescriptionAr,
        aboutUs_facilitiesImages: [],
        aboutUs_finalWordType: 'image',
      });
      console.log('   Created.\n');
    } else {
      console.log('📄 Updating existing PublicPageData...');
      await pageData.update({
        aboutUs_storyTitle: ABOUT_US.storyTitle,
        aboutUs_storyEn: ABOUT_US.storyEn,
        aboutUs_storyAr: ABOUT_US.storyAr,
        aboutUs_missions: MISSIONS,
        aboutUs_visions: VISIONS,
        aboutUs_values: VALUES,
        aboutUs_facilitiesDescriptionEn: ABOUT_US.facilitiesDescriptionEn,
        aboutUs_facilitiesDescriptionAr: ABOUT_US.facilitiesDescriptionAr,
        aboutUs_facilitiesImages: pageData.aboutUs_facilitiesImages || [],
      });
      console.log('   Updated.\n');
    }

    console.log('════════════════════════════════════════');
    console.log('🎉 About Us seed complete for Kamy Salon & Spa');
    console.log('════════════════════════════════════════');
    console.log('   • Our Story (EN/AR)');
    console.log(`   • Missions: ${MISSIONS.length}`);
    console.log(`   • Visions: ${VISIONS.length}`);
    console.log(`   • Values: ${VALUES.length}`);
    console.log('   • Facilities description (EN/AR)');
    console.log('   • Facility images: upload from tenant dashboard (My Page → About Us → Facilities)');
    console.log('');
    process.exit(0);
  } catch (err) {
    console.error('❌', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run();
