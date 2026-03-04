/**
 * Public Tenant Controller
 * Handles public-facing API endpoints for tenant websites
 * No authentication required
 */

const db = require('../models');
const { Op, fn, col } = require('sequelize');
const { parseLimitOffset, DEFAULT_MAX_PAGE_SIZE } = require('../utils/pagination');

/**
 * Get all active tenants (public listing)
 */
exports.getAllTenants = async (req, res) => {
    try {
        const { limit, offset, page } = parseLimitOffset(req, 20, DEFAULT_MAX_PAGE_SIZE);
        const { search, sort, categorySlug } = req.query;

        // When user taps a category (e.g. Nails), filter to tenants that have at least one service in that category
        let tenantIdsWithCategory = null;
        if (categorySlug && typeof categorySlug === 'string' && categorySlug.trim()) {
            const slug = categorySlug.trim();
            const servicesInCategory = await db.Service.findAll({
                where: {
                    isActive: true,
                    category: { [Op.iLike]: slug }
                },
                attributes: ['tenantId'],
                raw: true
            });
            tenantIdsWithCategory = [...new Set(servicesInCategory.map(s => s.tenantId).filter(Boolean))];
            if (tenantIdsWithCategory.length === 0) {
                return res.json({
                    success: true,
                    tenants: [],
                    pagination: { total: 0, page: 1, limit, totalPages: 0 }
                });
            }
        }

        // Determine sort order
        let order;
        if (sort === 'trending') {
            order = [[db.sequelize.literal('(SELECT COUNT(*) FROM appointments WHERE appointments."tenantId" = "Tenant"."id")'), 'DESC']];
        } else if (sort === 'name') {
            order = [['name', 'ASC']];
        } else {
            order = [['createdAt', 'DESC']];
        }

        const where = {
            status: ['active', 'approved']
        };
        if (tenantIdsWithCategory) {
            where.id = { [Op.in]: tenantIdsWithCategory };
        }
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { name_en: { [Op.iLike]: `%${search}%` } },
                { name_ar: { [Op.iLike]: `%${search}%` } },
                { slug: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows: tenants } = await db.Tenant.findAndCountAll({
            where,
            attributes: [
                'id',
                'name',
                'name_en',
                'name_ar',
                'slug',
                'businessType',
                'logo',
                'coverImage',
                'city',
                'status'
            ],
            order,
            limit,
            offset
        });

        const tenantIds = tenants.map(t => t.id);
        if (tenantIds.length === 0) {
            return res.json({
                success: true,
                tenants: [],
                pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
            });
        }

        // Batched counts: 3 queries instead of 3*N (N+1 fix)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const currentTime = today.toTimeString().split(' ')[0].substring(0, 5);

        const [serviceCountRows, staffCountRows, staffWithShiftsToday] = await Promise.all([
            db.Service.findAll({
                where: { tenantId: { [Op.in]: tenantIds }, isActive: true },
                attributes: ['tenantId', [fn('COUNT', col('id')), 'count']],
                group: ['tenantId'],
                raw: true
            }),
            db.Staff.findAll({
                where: { tenantId: { [Op.in]: tenantIds }, isActive: true },
                attributes: ['tenantId', [fn('COUNT', col('id')), 'count']],
                group: ['tenantId'],
                raw: true
            }),
            db.StaffShift.findAll({
                where: {
                    dayOfWeek,
                    isActive: true,
                    endTime: { [Op.gt]: currentTime }
                },
                include: [{
                    model: db.Staff,
                    as: 'staff',
                    attributes: ['tenantId'],
                    where: { tenantId: { [Op.in]: tenantIds }, isActive: true },
                    required: true
                }],
                attributes: []
            }).then(rows => rows.map(r => r.staff && r.staff.tenantId).filter(Boolean))
        ]);

        const servicesByTenant = Object.fromEntries(
            serviceCountRows.map(r => [r.tenantId, parseInt(r.count, 10)])
        );
        const staffByTenant = Object.fromEntries(
            staffCountRows.map(r => [r.tenantId, parseInt(r.count, 10)])
        );
        const tenantIdsWithShifts = new Set(staffWithShiftsToday);

        const tenantsWithCounts = tenants.map(tenant => {
            const tenantData = tenant.toJSON();
            return {
                ...tenantData,
                servicesCount: servicesByTenant[tenantData.id] ?? 0,
                staffCount: staffByTenant[tenantData.id] ?? 0,
                isAvailable: tenantIdsWithShifts.has(tenantData.id)
            };
        });

        res.json({
            success: true,
            tenants: tenantsWithCounts,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error('Get all tenants error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tenants',
            error: error.message
        });
    }
};

/**
 * Get tenant basic info by slug
 */
exports.getTenantBySlug = async (req, res) => {
    try {
        const { slug } = req.params;

        const tenant = await db.Tenant.findOne({
            where: { slug },
            attributes: [
                'id',
                'name',
                'name_en',
                'name_ar',
                'slug',
                'businessType',
                'logo',
                'coverImage',
                'email',
                'phone',
                'mobile',
                'buildingNumber',
                'street',
                'district',
                'city',
                'country',
                'postalCode',
                'googleMapLink',
                'facebookUrl',
                'instagramUrl',
                'twitterUrl',
                'linkedinUrl',
                'tiktokUrl',
                'youtubeUrl',
                'snapchatUrl',
                'pinterestUrl',
                'whatsapp',
                'workingHours'
            ]
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                message: 'Tenant not found'
            });
        }

        // Map coverImage to profileImage and whatsapp to whatsappNumber for frontend compatibility
        const tenantData = tenant.toJSON();
        tenantData.profileImage = tenantData.coverImage;
        tenantData.whatsappNumber = tenantData.whatsapp;
        // Keep coverImage for Client App compatibility
        // delete tenantData.coverImage;
        delete tenantData.whatsapp;

        // Fetch tenant's custom colors from PublicPageData (for Client App theming)
        try {
            const publicPageData = await db.PublicPageData.findOne({
                where: { tenantId: tenant.id },
                attributes: ['generalSettings']
            });

            if (publicPageData && publicPageData.generalSettings && publicPageData.generalSettings.theme) {
                tenantData.customColors = publicPageData.generalSettings.theme;
            }
        } catch (colorError) {
            console.warn('Could not fetch custom colors:', colorError.message);
            // Continue without colors - client will use defaults
        }

        res.json({
            success: true,
            data: tenantData
        });
    } catch (error) {
        console.error('Get tenant by slug error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tenant information',
            error: error.message
        });
    }
};

/**
 * Get public page data (hero sliders, about us, general settings)
 */
exports.getPublicPageData = async (req, res) => {
    try {
        const { tenantId } = req.params;

        let pageData = await db.PublicPageData.findOne({
            where: { tenantId }
        });

        // Create default record if doesn't exist
        if (!pageData) {
            pageData = await db.PublicPageData.create({
                tenantId,
                aboutUs_storyTitle: 'ourStory',
                aboutUs_missions: [],
                aboutUs_visions: [],
                aboutUs_values: [],
                aboutUs_facilitiesImages: [],
                aboutUs_finalWordType: 'image',
                heroSliders: [],
                homePage_data: {},
                contactUs_data: {},
                generalSettings: {
                    template: 'template1',
                    theme: {
                        primaryColor: '#3B82F6',
                        secondaryColor: '#8B5CF6',
                        helperColor: '#10B981'
                    },
                    sections: {
                        heroSlider: true,
                        services: true,
                        products: true,
                        callToAction: true
                    }
                }
            });
        }

        // Fetch tenant business info for About tab and location map
        let tenantInfo = null;
        try {
            const tenant = await db.Tenant.findByPk(tenantId, {
                attributes: [
                    'id', 'name', 'name_en', 'name_ar', 'slug',
                    'description', 'descriptionAr',
                    'address', 'buildingNumber', 'street', 'district', 'city', 'country', 'postalCode',
                    'googleMapLink', 'coordinates', 'workingHours',
                    'phone', 'mobile', 'email', 'website',
                    'facebookUrl', 'instagramUrl', 'twitterUrl', 'linkedinUrl', 'whatsapp',
                    'logo', 'coverImage', 'businessType'
                ]
            });
            if (tenant) {
                tenantInfo = tenant.toJSON();
            }
        } catch (e) {
            // Non-fatal; client can still use page data
        }

        let defaultDeliveryFee = 0;
        try {
            const settings = await db.TenantSettings.findOne({
                where: { tenantId },
                attributes: ['defaultDeliveryFee']
            });
            if (settings && settings.defaultDeliveryFee != null) {
                defaultDeliveryFee = parseFloat(settings.defaultDeliveryFee) || 0;
            }
        } catch (e) {
            // Non-fatal
        }

        res.json({
            success: true,
            data: {
                defaultDeliveryFee,
                aboutUs: {
                    heroImage: pageData.aboutUs_heroImage,
                    storyTitle: pageData.aboutUs_storyTitle,
                    storyEn: pageData.aboutUs_storyEn,
                    storyAr: pageData.aboutUs_storyAr,
                    missions: pageData.aboutUs_missions || [],
                    visions: pageData.aboutUs_visions || [],
                    values: pageData.aboutUs_values || [],
                    facilitiesDescriptionEn: pageData.aboutUs_facilitiesDescriptionEn,
                    facilitiesDescriptionAr: pageData.aboutUs_facilitiesDescriptionAr,
                    facilitiesImages: pageData.aboutUs_facilitiesImages || [],
                    finalWordTitleEn: pageData.aboutUs_finalWordTitleEn,
                    finalWordTitleAr: pageData.aboutUs_finalWordTitleAr,
                    finalWordTextEn: pageData.aboutUs_finalWordTextEn,
                    finalWordTextAr: pageData.aboutUs_finalWordTextAr,
                    finalWordType: pageData.aboutUs_finalWordType,
                    finalWordImageUrl: pageData.aboutUs_finalWordImageUrl,
                    finalWordIconName: pageData.aboutUs_finalWordIconName
                },
                heroSliders: pageData.heroSliders || [],
                pageBanners: {
                    services: pageData.pageBanner_services || null,
                    products: pageData.pageBanner_products || null,
                    about: pageData.pageBanner_about || null,
                    contact: pageData.pageBanner_contact || null
                },
                generalSettings: {
                    ...(pageData.generalSettings || {
                        template: 'template1',
                        theme: {
                            primaryColor: '#3B82F6',
                            secondaryColor: '#8B5CF6',
                            helperColor: '#10B981'
                        },
                        sections: {
                            heroSlider: true,
                            services: true,
                            products: true,
                            callToAction: true,
                            reviews: true,
                            about: true
                        }
                    }),
                    sections: {
                        ...(pageData.generalSettings?.sections || {
                            heroSlider: true,
                            services: true,
                            products: true,
                            callToAction: true,
                            reviews: true,
                            about: true
                        })
                    },
                    logo: pageData.generalSettings?.logo || null
                },
                tenantInfo: tenantInfo || null
            }
        });
    } catch (error) {
        console.error('Get public page data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public page data',
            error: error.message
        });
    }
};

/**
 * Get active services (public)
 */
exports.getPublicServices = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { category, minPrice, maxPrice, search } = req.query;

        const where = {
            tenantId,
            isActive: true
        };

        if (category && category !== 'all') {
            where.category = category;
        }

        if (minPrice || maxPrice) {
            where.finalPrice = {};
            if (minPrice) {
                where.finalPrice[Op.gte] = parseFloat(minPrice);
            }
            if (maxPrice) {
                where.finalPrice[Op.lte] = parseFloat(maxPrice);
            }
        }

        if (search) {
            where[Op.or] = [
                { name_en: { [Op.iLike]: `%${search}%` } },
                { name_ar: { [Op.iLike]: `%${search}%` } },
                { description_en: { [Op.iLike]: `%${search}%` } },
                { description_ar: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const services = await db.Service.findAll({
            where,
            attributes: [
                'id',
                'name_en',
                'name_ar',
                'description_en',
                'description_ar',
                'category',
                'rawPrice',
                'finalPrice',
                'duration',
                'image',
                'availableInCenter',
                'availableHomeVisit',
                'benefits',
                'whatToExpect',
                'hasOffer',
                'offerDetails',
                'offerFrom',
                'offerTo',
                'hasGift',
                'giftType',
                'giftDetails'
            ],
            order: [['createdAt', 'DESC']]
        });

        const today = new Date().toISOString().slice(0, 10);
        const servicesWithBasePrice = services.map(s => {
            const j = s.toJSON();
            j.basePrice = j.finalPrice != null ? Number(j.finalPrice) : undefined;
            if (j.rawPrice != null) j.rawPrice = Number(j.rawPrice);
            if (j.finalPrice != null) j.finalPrice = Number(j.finalPrice);
            let offerActive = false;
            if (j.hasOffer) {
                const fromOk = !j.offerFrom || j.offerFrom <= today;
                const toOk = !j.offerTo || j.offerTo >= today;
                offerActive = fromOk && toOk;
            }
            j.offerActive = offerActive;
            return j;
        });

        res.json({
            success: true,
            services: servicesWithBasePrice
        });
    } catch (error) {
        console.error('Get public services error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services',
            error: error.message
        });
    }
};

/**
 * Get single service details (public)
 */
exports.getPublicService = async (req, res) => {
    try {
        const { tenantId, id } = req.params;

        const service = await db.Service.findOne({
            where: {
                id,
                tenantId,
                isActive: true
            },
            attributes: [
                'id',
                'name_en',
                'name_ar',
                'description_en',
                'description_ar',
                'category',
                'rawPrice',
                'finalPrice',
                'duration',
                'image',
                'availableInCenter',
                'availableHomeVisit',
                'benefits',
                'whatToExpect',
                'hasOffer',
                'offerDetails',
                'offerFrom',
                'offerTo',
                'hasGift',
                'giftType',
                'giftDetails'
            ],
            include: [
                {
                    model: db.Staff,
                    as: 'employees',
                    attributes: ['id', 'name', 'photo', 'rating', 'bio', 'experience', 'skills'],
                    through: { attributes: [] },
                    required: false // Left join - service can exist without employees
                }
            ]
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Map staff photo to image for frontend compatibility
        const serviceData = service.toJSON();
        serviceData.basePrice = serviceData.finalPrice != null ? Number(serviceData.finalPrice) : undefined;
        if (serviceData.rawPrice != null) serviceData.rawPrice = Number(serviceData.rawPrice);
        if (serviceData.finalPrice != null) serviceData.finalPrice = Number(serviceData.finalPrice);
        const today = new Date().toISOString().slice(0, 10);
        let offerActive = false;
        if (serviceData.hasOffer) {
            const fromOk = !serviceData.offerFrom || serviceData.offerFrom <= today;
            const toOk = !serviceData.offerTo || serviceData.offerTo >= today;
            offerActive = fromOk && toOk;
        }
        serviceData.offerActive = offerActive;
        if (serviceData.employees && Array.isArray(serviceData.employees)) {
            serviceData.employees = serviceData.employees.map((employee) => {
                const employeeData = { ...employee };
                employeeData.image = employeeData.photo;
                employeeData.name_ar = employeeData.name; // Staff only has 'name', not 'name_ar'
                employeeData.specialty = Array.isArray(employeeData.skills) && employeeData.skills.length > 0
                    ? employeeData.skills[0]
                    : null;
                delete employeeData.photo;
                return employeeData;
            });
        }

        // When gift is a product, load product details for display (name, image)
        if (serviceData.hasGift && serviceData.giftType === 'product' && serviceData.giftDetails) {
            const giftProductId = String(serviceData.giftDetails).trim();
            if (giftProductId && giftProductId.length > 10) {
                const giftProduct = await db.Product.findOne({
                    where: { id: giftProductId, tenantId, isAvailable: true },
                    attributes: ['id', 'name_en', 'name_ar', 'image', 'images']
                });
                if (giftProduct) {
                    const p = giftProduct.toJSON();
                    serviceData.giftProduct = {
                        id: p.id,
                        name_en: p.name_en,
                        name_ar: p.name_ar,
                        image: p.image,
                        images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : [])
                    };
                }
            }
        }

        res.json({
            success: true,
            service: serviceData
        });
    } catch (error) {
        console.error('Get public service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service',
            error: error.message
        });
    }
};

/**
 * Get available products (public)
 */
exports.getPublicProducts = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { category, minPrice, maxPrice, search } = req.query;

        const where = {
            tenantId,
            isAvailable: true
        };

        if (category && category !== 'all') {
            where.category = category;
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) {
                where.price[Op.gte] = parseFloat(minPrice);
            }
            if (maxPrice) {
                where.price[Op.lte] = parseFloat(maxPrice);
            }
        }

        if (search) {
            where[Op.or] = [
                { name_en: { [Op.iLike]: `%${search}%` } },
                { name_ar: { [Op.iLike]: `%${search}%` } },
                { description_en: { [Op.iLike]: `%${search}%` } },
                { description_ar: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const products = await db.Product.findAll({
            where,
            attributes: [
                'id',
                'name_en',
                'name_ar',
                'description_en',
                'description_ar',
                'category',
                'price',
                'rawPrice',
                'images',
                'stock',
                'isAvailable',
                'allowsDelivery',
                'allowsPickup'
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Get public products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products',
            error: error.message
        });
    }
};

/**
 * Get single product details (public)
 */
exports.getPublicProduct = async (req, res) => {
    try {
        const { tenantId, id } = req.params;

        const product = await db.Product.findOne({
            where: {
                id,
                tenantId,
                isAvailable: true
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            product
        });
    } catch (error) {
        console.error('Get public product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product',
            error: error.message
        });
    }
};

/**
 * Get active staff members (public)
 */
exports.getPublicStaff = async (req, res) => {
    try {
        const { tenantId } = req.params;

        const staff = await db.Staff.findAll({
            where: {
                tenantId,
                isActive: true
            },
            attributes: [
                'id',
                'name',
                'photo',
                'rating',
                'experience',
                'skills',
                'bio'
            ],
            order: [['rating', 'DESC']]
        });

        // Map photo to image for frontend compatibility
        const staffData = staff.map(member => {
            const memberData = member.toJSON();
            memberData.image = memberData.photo;
            memberData.specialty = Array.isArray(memberData.skills) && memberData.skills.length > 0
                ? memberData.skills[0]
                : null;
            delete memberData.photo;
            return memberData;
        });

        res.json({
            success: true,
            staff: staffData
        });
    } catch (error) {
        console.error('Get public staff error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff',
            error: error.message
        });
    }
};

/**
 * Get a single staff member by id (public). Used for employee details page.
 * Same review data appears here and in the staff app (GET /staff/me/reviews) for that employee.
 */
exports.getPublicStaffById = async (req, res) => {
    try {
        const { tenantId, staffId } = req.params;

        const member = await db.Staff.findOne({
            where: {
                id: staffId,
                tenantId,
                isActive: true
            },
            attributes: [
                'id',
                'name',
                'photo',
                'rating',
                'totalBookings',
                'experience',
                'skills',
                'bio'
            ]
        });

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Staff not found'
            });
        }

        const memberData = member.toJSON();
        memberData.image = memberData.photo;
        memberData.specialty = Array.isArray(memberData.skills) && memberData.skills.length > 0
            ? memberData.skills[0]
            : null;
        delete memberData.photo;

        res.json({
            success: true,
            staff: memberData
        });
    } catch (error) {
        console.error('Get public staff by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff',
            error: error.message
        });
    }
};

/**
 * Get staff members assigned to a specific service (public)
 */
exports.getPublicStaffByService = async (req, res) => {
    try {
        const { tenantId, serviceId } = req.params;

        // First verify the service exists and belongs to this tenant
        const service = await db.Service.findOne({
            where: {
                id: serviceId,
                tenantId,
                isActive: true
            }
        });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Get staff assigned to this service through ServiceEmployee table
        const staff = await db.Staff.findAll({
            where: {
                tenantId,
                isActive: true
            },
            attributes: [
                'id',
                'name',
                'photo',
                'rating',
                'experience',
                'skills',
                'bio'
            ],
            include: [
                {
                    model: db.Service,
                    as: 'services',
                    where: { id: serviceId },
                    attributes: [],
                    through: { attributes: [] },
                    required: true // Inner join - only staff assigned to this service
                }
            ],
            order: [['rating', 'DESC']]
        });

        // Map photo to image for frontend compatibility
        const staffData = staff.map(member => {
            const memberData = member.toJSON();
            memberData.image = memberData.photo;
            memberData.specialty = Array.isArray(memberData.skills) && memberData.skills.length > 0
                ? memberData.skills[0]
                : null;
            delete memberData.photo;
            return memberData;
        });

        res.json({
            success: true,
            staff: staffData,
            count: staffData.length
        });
    } catch (error) {
        console.error('Get public staff by service error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff for service',
            error: error.message
        });
    }
};

/**
 * Create booking (public, no auth required)
 * Uses unified BookingService with PlatformUser integration
 */
exports.createPublicBooking = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const {
            serviceId,
            staffId,
            date,
            time,
            serviceType,
            customerName,
            customerEmail,
            customerPhone,
            specialRequests,
            paymentMethod,
            paymentIntent,
            location
        } = req.body;

        // Validate required fields
        if (!serviceId || !date || !time || !customerName || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: serviceId, date, time, customerName, and customerPhone are required'
            });
        }

        // Import services
        const userService = require('../services/userService');
        const bookingService = require('../services/bookingService');

        // Find or create PlatformUser (not Customer)
        // Split customerName into firstName and lastName
        const nameParts = customerName.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Guest';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        const platformUser = await userService.findOrCreatePlatformUser({
            email: customerEmail || null,
            phone: customerPhone,
            firstName,
            lastName
        });

        // Combine date and time into startTime
        const startTime = new Date(`${date}T${time}`);
        if (isNaN(startTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date or time format'
            });
        }

        // Use unified booking service
        // This handles all validation, conflict checking, pricing, etc.
        const appointment = await bookingService.createBooking({
            serviceId,
            staffId: staffId || null, // null = "Any Staff"
            platformUserId: platformUser.id,
            tenantId,
            startTime: startTime.toISOString(),
            paymentIntent: paymentIntent || 'full' // 'full' | 'deposit'
        });

        // Get service for pricing info (for response)
        const service = await db.Service.findByPk(serviceId);
        const pricing = {
            totalAmount: appointment.price,
            rawPrice: appointment.rawPrice,
            taxAmount: appointment.taxAmount,
            platformFee: appointment.platformFee,
            depositAmount: appointment.depositAmount != null ? parseFloat(appointment.depositAmount) : 0,
            remainderAmount: appointment.remainderAmount != null ? parseFloat(appointment.remainderAmount) : 0
        };

        // Calculate booking fee if needed (for future payment processing)
        let bookingFee = 0;
        if (paymentMethod === 'booking-fee') {
            bookingFee = 50; // Default booking fee (can be configured later)
        }

        res.json({
            success: true,
            message: 'Booking created successfully',
            data: {
                bookingId: appointment.id,
                bookingReference: appointment.id.substring(0, 8).toUpperCase(),
                appointment: {
                    id: appointment.id,
                    startTime: appointment.startTime,
                    endTime: appointment.endTime,
                    status: appointment.status,
                    service: {
                        id: service.id,
                        name_en: service.name_en,
                        name_ar: service.name_ar
                    }
                },
                pricing,
                depositAmount: appointment.depositAmount != null ? parseFloat(appointment.depositAmount) : 0,
                remainderAmount: appointment.remainderAmount != null ? parseFloat(appointment.remainderAmount) : 0,
                bookingFee,
                // Note: customerId is deprecated, using platformUserId
                platformUserId: platformUser.id
            }
        });
    } catch (error) {
        console.error('Create public booking error:', error);

        let statusCode = 500;
        let message = error.message || 'Failed to create booking';
        if (error.code === 'REDIS_UNAVAILABLE') {
            statusCode = 503;
            message = 'Booking service temporarily unavailable. Please try again shortly.';
        } else if (error.code === 'SLOT_BUSY' || error.code === 'SLOT_ALREADY_TAKEN') {
            statusCode = 409;
            message = error.message || 'Time slot already taken.';
        } else if (error.message.includes('required') || error.message.includes('Invalid')) {
            statusCode = 400;
        } else if (error.message.includes('not found')) {
            statusCode = 404;
        } else if (error.message.includes('conflict') || error.message.includes('not available')) {
            statusCode = 409;
        } else if (error.message.includes('inactive') || error.message.includes('banned')) {
            statusCode = 403;
        }

        res.status(statusCode).json({
            success: false,
            message
        });
    }
};

/**
 * Create product order (public, no auth required)
 * Supports deliveryType: 'pickup' | 'delivery', paymentMethod: 'online' | 'cash_on_delivery' | 'pay_on_visit'
 */
exports.createPublicOrder = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const {
            items, // [{ productId, quantity }]
            customerName,
            customerEmail,
            customerPhone,
            shippingAddress, // Object: { street, city, district, building, floor, apartment, phone, notes }
            city,
            district,
            postalCode,
            street,
            building,
            floor,
            apartment,
            notes,
            deliveryType, // 'pickup' | 'delivery'
            deliveryMethod, // Legacy: 'standard' | 'express' (ignored if deliveryType provided)
            paymentMethod, // 'online' | 'cash_on_delivery' | 'pay_on_visit' (or 'cash-on-delivery')
            shippingFee // When deliveryType === 'delivery', fee in SAR (from tenant default)
        } = req.body;

        // Validate required fields
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order items are required'
            });
        }

        if (!customerName || !customerEmail || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'Customer information is required'
            });
        }

        const isDelivery = deliveryType === 'delivery';
        if (isDelivery) {
            const hasAddress = shippingAddress && (shippingAddress.street || shippingAddress.city) ||
                (city && (street || district));
            if (!hasAddress) {
                return res.status(400).json({
                    success: false,
                    message: 'Shipping address is required for delivery orders'
                });
            }
        }

        const normalizedPayment = paymentMethod === 'cash-on-delivery' ? 'cash_on_delivery' : (paymentMethod || 'cash_on_delivery');
        if (!['online', 'cash_on_delivery', 'pay_on_visit'].includes(normalizedPayment)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method. Use online, cash_on_delivery, or pay_on_visit'
            });
        }

        // Get or create customer
        let customer = await db.Customer.findOne({
            where: {
                tenantId,
                email: customerEmail
            }
        });

        if (!customer) {
            customer = await db.Customer.create({
                tenantId,
                name: customerName,
                email: customerEmail,
                phone: customerPhone
            });
        }

        // Calculate order total
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await db.Product.findOne({
                where: { id: item.productId, tenantId, isAvailable: true }
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product ${item.productId} not found`
                });
            }

            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                productId: product.id,
                productName: product.name_en,
                quantity: item.quantity,
                unitPrice: product.price,
                total: itemTotal
            });
        }

        // Delivery fee: only when deliveryType === 'delivery'; from request or legacy deliveryMethod
        let deliveryFee = 0;
        if (isDelivery) {
            if (typeof shippingFee === 'number' && shippingFee >= 0) {
                deliveryFee = Number(shippingFee);
            } else if (deliveryMethod === 'express') {
                deliveryFee = 50;
            } else {
                deliveryFee = subtotal >= 200 ? 0 : 25;
            }
        }
        const tax = subtotal * 0.15; // 15% VAT
        const total = subtotal + tax + deliveryFee;

        // Generate order number
        const orderNumber = await db.Order.generateOrderNumber();

        // Create order using Order model
        // For public orders, we need to create or find a guest user
        // First, try to find existing user by email
        let guestUser = await db.PlatformUser.findOne({
            where: {
                email: customerEmail
            }
        });

        if (!guestUser) {
            // Create a guest user for public orders
            // Split name into first and last
            const nameParts = customerName.trim().split(' ');
            const firstName = nameParts[0] || customerName;
            const lastName = nameParts.slice(1).join(' ') || firstName;

            guestUser = await db.PlatformUser.create({
                email: customerEmail,
                phone: customerPhone,
                firstName: firstName,
                lastName: lastName,
                emailVerified: false,
                phoneVerified: false,
                // Generate a random password for guest users
                password: require('crypto').randomBytes(32).toString('hex')
            });
        }

        // Prepare shipping address as JSONB when delivery
        let shippingAddressData = null;
        if (isDelivery) {
            if (shippingAddress && typeof shippingAddress === 'object') {
                shippingAddressData = {
                    street: shippingAddress.street || '',
                    city: shippingAddress.city || '',
                    district: shippingAddress.district || '',
                    building: shippingAddress.building || '',
                    floor: shippingAddress.floor || '',
                    apartment: shippingAddress.apartment || '',
                    phone: shippingAddress.phone || customerPhone,
                    notes: shippingAddress.notes || ''
                };
            } else {
                shippingAddressData = {
                    street: street || '',
                    city: city || '',
                    district: district || '',
                    building: building || '',
                    floor: floor || '',
                    apartment: apartment || '',
                    phone: customerPhone,
                    notes: notes || ''
                };
            }
        }

        const orderStatus = normalizedPayment === 'online' ? 'pending' : 'confirmed';
        const orderPaymentStatus = normalizedPayment === 'online' ? 'pending' : 'pending';

        // Create the order
        const order = await db.Order.create({
            orderNumber,
            platformUserId: guestUser.id,
            tenantId,
            status: orderStatus,
            paymentMethod: normalizedPayment,
            paymentStatus: orderPaymentStatus,
            deliveryType: isDelivery ? 'delivery' : 'pickup',
            shippingAddress: shippingAddressData,
            subtotal: subtotal,
            taxAmount: tax,
            shippingFee: deliveryFee,
            platformFee: 0,
            totalAmount: total,
            notes: null
        });

        // Create order items
        for (const item of orderItems) {
            await db.OrderItem.create({
                orderId: order.id,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.total
            });
        }

        res.json({
            success: true,
            message: 'Order created successfully',
            data: {
                orderId: order.id,
                orderReference: order.orderNumber,
                total,
                items: orderItems
            }
        });
    } catch (error) {
        console.error('Create public order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

/**
 * Submit contact form (public)
 */
exports.submitContactForm = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { name, email, phone, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }

        res.json({
            success: true,
            message: 'Contact form submitted successfully'
        });
    } catch (error) {
        console.error('Submit contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit contact form',
            error: error.message
        });
    }
};

/**
 * Get visible reviews for a tenant (public, for tenant page).
 * Optional query staffId: only reviews for that staff (e.g. employee details page).
 * Same reviews appear in the staff app (GET /staff/me/reviews) for that employee.
 */
exports.getPublicReviews = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { staffId } = req.query;

        const where = { tenantId, isVisible: true };
        if (staffId) where.staffId = staffId;

        const reviews = await db.Review.findAll({
            where,
            include: [
                { model: db.Staff, as: 'staff', attributes: ['id', 'name'] },
                { model: db.PlatformUser, as: 'platformUser', attributes: ['id', 'profileImage'], required: false }
            ],
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'rating', 'comment', 'customerName', 'staffReply', 'staffRepliedAt', 'createdAt']
        });

        const total = reviews.length;
        const avgRating = total > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
            : null;

        const serialized = reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            customerName: r.customerName,
            staffReply: r.staffReply,
            staffRepliedAt: r.staffRepliedAt,
            createdAt: r.createdAt,
            staff: r.staff ? { id: r.staff.id, name: r.staff.name } : null,
            customerProfileImage: r.platformUser?.profileImage || null
        }));

        res.json({
            success: true,
            reviews: serialized,
            avgRating: avgRating ? parseFloat(avgRating) : null,
            total
        });
    } catch (error) {
        console.error('Get public reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: error.message
        });
    }
};

/**
 * Submit a review for a tenant.
 * Two flows:
 * 1) With appointmentId: review for a completed appointment (staffId required; one per appointment).
 * 2) Without appointmentId: general tenant review from the tenant page (rating + optional comment + customerName).
 */
exports.createReview = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { staffId, appointmentId, customerName, rating, comment } = req.body;

        if (!rating || (rating < 1 || rating > 5)) {
            return res.status(400).json({
                success: false,
                message: 'rating is required and must be between 1 and 5'
            });
        }

        let finalStaffId = staffId || null;
        let finalAppointmentId = appointmentId || null;

        if (appointmentId) {
            // Flow 1: review linked to a completed appointment
            if (!staffId) {
                return res.status(400).json({
                    success: false,
                    message: 'staffId is required when submitting a review for an appointment'
                });
            }
            const appointment = await db.Appointment.findOne({
                where: {
                    id: appointmentId,
                    tenantId,
                    status: 'completed'
                }
            });
            if (!appointment) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or incomplete appointment'
                });
            }
            const existingReview = await db.Review.findOne({
                where: { appointmentId, tenantId }
            });
            if (existingReview) {
                return res.status(400).json({
                    success: false,
                    message: 'A review has already been submitted for this appointment'
                });
            }
        }
        // If no appointmentId: general tenant review (no duplicate check per user; optional staffId)
        const platformUserId = req.userId || null;
        let finalCustomerName = customerName || 'Valued Customer';
        if (platformUserId && !customerName) {
            const user = await db.PlatformUser.findByPk(platformUserId, { attributes: ['firstName', 'lastName'] });
            if (user) finalCustomerName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || finalCustomerName;
        }

        const review = await db.Review.create({
            tenantId,
            staffId: finalStaffId,
            appointmentId: finalAppointmentId,
            platformUserId,
            customerName: finalCustomerName,
            rating: parseInt(rating),
            comment: comment || null,
            isVisible: true
        });

        if (finalStaffId) {
            try {
                const staffReviews = await db.Review.findAll({
                    where: { staffId: finalStaffId, tenantId, isVisible: true },
                    attributes: ['rating']
                });
                const totalRating = staffReviews.reduce((sum, r) => sum + r.rating, 0);
                const avgRating = staffReviews.length > 0 ? totalRating / staffReviews.length : 5.0;
                await db.Staff.update(
                    { rating: parseFloat(avgRating.toFixed(1)) },
                    { where: { id: finalStaffId } }
                );
            } catch (ratingError) {
                console.error('Error updating staff rating:', ratingError);
            }
        }

        res.json({
            success: true,
            message: 'Review submitted successfully',
            data: review
        });

    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit review',
            error: error.message
        });
    }
};

/**
 * Get top service providers (staff) across active tenants, ordered by rating and totalBookings.
 * GET /api/v1/public/top-providers?limit=10
 * No auth. For customer app "Top providers" section.
 */
exports.getTopProviders = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
        const staff = await db.Staff.findAll({
            where: { isActive: true },
            include: [
                {
                    model: db.Tenant,
                    as: 'tenant',
                    attributes: ['id', 'name', 'name_en', 'name_ar'],
                    required: true,
                    where: { status: { [Op.in]: ['active', 'approved'] } }
                }
            ],
            attributes: ['id', 'name', 'tenantId', 'rating', 'totalBookings', 'photo', 'specialty'],
            order: [
                [db.sequelize.col('rating'), 'DESC'],
                [db.sequelize.col('totalBookings'), 'DESC']
            ],
            limit
        });

        const list = staff.map(s => {
            const t = s.tenant;
            const tenantName = t && (t.name_en || t.name_ar || t.name);
            return {
                id: s.id,
                name: s.name,
                rating: s.rating != null ? parseFloat(s.rating) : 0,
                avatar: s.photo || null,
                image: s.photo || null,
                tenantId: s.tenantId,
                tenantName: tenantName || '',
                specialty: s.specialty || null,
                skills: s.specialty ? [s.specialty] : []
            };
        });

        res.json({ success: true, providers: list });
    } catch (error) {
        console.error('Get top providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top providers',
            error: error.message
        });
    }
};
