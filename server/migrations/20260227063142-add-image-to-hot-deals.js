'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hot_deals', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Relative path to image file in uploads/hot-deals'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('hot_deals', 'image');
  }
};
