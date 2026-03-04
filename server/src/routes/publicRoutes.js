/**
 * Public Routes
 * No authentication required - for public tenant websites
 * publicTenantContext applied only to tenant-scoped routes (/:tenantId or /:slug), not to /tenants.
 */

const express = require('express');
const router = express.Router();
const publicTenantController = require('../controllers/publicTenantController');
const publicBillPaymentController = require('../controllers/publicBillPaymentController');
const publicTenantContext = require('../middleware/publicTenantContext');
const { optionalAuth } = require('../middleware/authUser');

// Token-based bill payment (no auth)
router.get('/bills/by-token/:token', publicBillPaymentController.getBillByToken);
router.post('/bills/by-token/:token/pay', publicBillPaymentController.payBillByToken);

// Discovery: all active tenants — no tenant context, no slug lookup
router.get('/tenants', publicTenantController.getAllTenants);

// Top service providers (staff across tenants) for customer app home
router.get('/top-providers', publicTenantController.getTopProviders);

// Tenant-scoped routes: derive req.tenantId from :slug or :tenantId and set RLS context
router.get('/tenant/:slug', publicTenantContext, publicTenantController.getTenantBySlug);
router.get('/tenant/:tenantId/page-data', publicTenantContext, publicTenantController.getPublicPageData);
router.get('/tenant/:tenantId/services', publicTenantContext, publicTenantController.getPublicServices);
router.get('/tenant/:tenantId/services/:serviceId/staff', publicTenantContext, publicTenantController.getPublicStaffByService);
router.get('/tenant/:tenantId/services/:id', publicTenantContext, publicTenantController.getPublicService);
router.get('/tenant/:tenantId/products', publicTenantContext, publicTenantController.getPublicProducts);
router.get('/tenant/:tenantId/products/:id', publicTenantContext, publicTenantController.getPublicProduct);
router.get('/tenant/:tenantId/staff', publicTenantContext, publicTenantController.getPublicStaff);
router.get('/tenant/:tenantId/staff/:staffId', publicTenantContext, publicTenantController.getPublicStaffById);
router.post('/tenant/:tenantId/bookings', publicTenantContext, publicTenantController.createPublicBooking);
router.post('/tenant/:tenantId/orders', publicTenantContext, publicTenantController.createPublicOrder);
router.get('/tenant/:tenantId/reviews', publicTenantContext, publicTenantController.getPublicReviews);
router.post('/tenant/:tenantId/reviews', optionalAuth, publicTenantContext, publicTenantController.createReview);
router.post('/tenant/:tenantId/contact', publicTenantContext, publicTenantController.submitContactForm);

module.exports = router;

