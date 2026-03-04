'use strict';

const db = require('../models');
const { ServiceCategory } = db;

/**
 * Admin Category Controller
 * Manages service categories (CRUD + reorder)
 */

// List all categories (optionally include hidden ones)
exports.listCategories = async (req, res) => {
    try {
        const { includeHidden } = req.query;

        const where = {};
        if (includeHidden !== 'true') {
            where.isActive = true;
        }

        const categories = await ServiceCategory.findAll({
            where,
            order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
        });

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error listing categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list categories'
        });
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const { name_en, name_ar, icon, sortOrder } = req.body;

        if (!name_en || !name_ar) {
            return res.status(400).json({
                success: false,
                message: 'Both English and Arabic names are required'
            });
        }

        // Auto-generate slug from name_en
        const slug = name_en
            .toLowerCase()
            .replace(/[&]/g, 'and')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        // Check for duplicate slug
        const existing = await ServiceCategory.findOne({ where: { slug } });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'A category with a similar English name already exists'
            });
        }

        // Determine sort order if not provided
        let finalSortOrder = sortOrder;
        if (finalSortOrder === undefined || finalSortOrder === null) {
            const maxSort = await ServiceCategory.max('sortOrder');
            finalSortOrder = (maxSort || 0) + 1;
        }

        const category = await ServiceCategory.create({
            name_en: name_en.trim(),
            name_ar: name_ar.trim(),
            slug,
            icon: icon || null,
            sortOrder: finalSortOrder,
            isActive: true
        });

        res.status(201).json({
            success: true,
            category
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
};

// Update an existing category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name_en, name_ar, icon, sortOrder, isActive } = req.body;

        const category = await ServiceCategory.findByPk(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Update fields
        if (name_en !== undefined) {
            category.name_en = name_en.trim();
            // Regenerate slug if name changed
            category.slug = name_en
                .toLowerCase()
                .replace(/[&]/g, 'and')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
        }
        if (name_ar !== undefined) category.name_ar = name_ar.trim();
        if (icon !== undefined) category.icon = icon;
        if (sortOrder !== undefined) category.sortOrder = sortOrder;
        if (isActive !== undefined) category.isActive = isActive;

        await category.save();

        res.json({
            success: true,
            category
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};

// Delete a category (soft delete by default)
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { hard } = req.query;

        const category = await ServiceCategory.findByPk(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        if (hard === 'true') {
            await category.destroy();
            res.json({
                success: true,
                message: 'Category permanently deleted'
            });
        } else {
            // Soft delete — just hide it
            category.isActive = false;
            await category.save();
            res.json({
                success: true,
                message: 'Category hidden successfully'
            });
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
};

// Batch reorder categories
exports.reorderCategories = async (req, res) => {
    try {
        const { orderMap } = req.body;

        if (!Array.isArray(orderMap) || orderMap.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'orderMap array is required'
            });
        }

        // Update each category's sort order in a transaction
        await db.sequelize.transaction(async (t) => {
            for (const item of orderMap) {
                await ServiceCategory.update(
                    { sortOrder: item.sortOrder },
                    { where: { id: item.id }, transaction: t }
                );
            }
        });

        // Return updated list
        const categories = await ServiceCategory.findAll({
            order: [['sortOrder', 'ASC']]
        });

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error reordering categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reorder categories'
        });
    }
};
