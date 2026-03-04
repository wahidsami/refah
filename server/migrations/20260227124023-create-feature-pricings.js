'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FeaturePricings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      featureKey: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true
      },
      label: {
        type: Sequelize.STRING(128),
        allowNull: false
      },
      unitLabel: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      unitPrice: {
        type: Sequelize.DECIMAL(12, 6),
        allowNull: false,
        defaultValue: 0.000000
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Seed initial features
    const initialFeatures = [
      { featureKey: 'subscriptionFee', label: 'Subscription Fee', unitLabel: 'per month', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'bookingsPerMonth', label: 'Bookings / Month', unitLabel: 'per booking', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'maxStaff', label: 'Max Staff', unitLabel: 'per staff member', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'maxServices', label: 'Max Services', unitLabel: 'per service', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'maxProducts', label: 'Max Products', unitLabel: 'per product', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'storage', label: 'Storage', unitLabel: 'per MB', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'productsAndOrders', label: 'Products & Orders (E-commerce)', unitLabel: 'per month', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'internalMessaging', label: 'Internal Messaging', unitLabel: 'per month', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'hotDeals', label: 'Hot Deals', unitLabel: 'per hot deal', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'whatsappNotifications', label: 'WhatsApp Notifications', unitLabel: 'per message', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'inAppMarketingNotifications', label: 'Marketing Notifications', unitLabel: 'per message', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'aiContentAssistant', label: 'AI Content Assistant', unitLabel: 'per 1K tokens', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'promotionalEmails', label: 'Promotional Emails', unitLabel: 'per email', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'searchRankingBoost', label: 'Search Ranking Boost', unitLabel: 'per month', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
      { featureKey: 'newToRefah', label: 'New to Refah Tag', unitLabel: 'per day', unitPrice: 0.0, createdAt: new Date(), updatedAt: new Date() },
    ];

    // Give each feature a newly generated UUIDv4
    const crypto = require('crypto');
    initialFeatures.forEach(f => f.id = crypto.randomUUID());

    await queryInterface.bulkInsert('FeaturePricings', initialFeatures, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FeaturePricings');
  }
};
