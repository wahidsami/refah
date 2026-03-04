'use strict';

/** Grant tenants.delete permission to existing super admins so they can delete clients */
module.exports = {
    async up(queryInterface) {
        const [rows] = await queryInterface.sequelize.query(
            `SELECT id, permissions FROM super_admins WHERE permissions IS NOT NULL`
        );
        for (const row of rows || []) {
            let perms = row.permissions || {};
            if (typeof perms === 'string') perms = JSON.parse(perms);
            if (!perms.tenants) perms.tenants = {};
            if (perms.tenants.delete === true) continue;
            perms.tenants = { ...perms.tenants, delete: true };
            await queryInterface.sequelize.query(
                `UPDATE super_admins SET permissions = :perms WHERE id = :id`,
                { replacements: { perms: JSON.stringify(perms), id: row.id } }
            );
        }
    },

    async down() {
        // Optional: set tenants.delete back to false; skip to avoid breaking existing workflows
    }
};
