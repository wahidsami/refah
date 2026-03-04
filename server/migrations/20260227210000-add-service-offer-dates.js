'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('services', 'offerFrom', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Offer valid from (inclusive); null = no start limit'
    });
    await queryInterface.addColumn('services', 'offerTo', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Offer valid to (inclusive); null = no end limit'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('services', 'offerFrom');
    await queryInterface.removeColumn('services', 'offerTo');
  }
};
