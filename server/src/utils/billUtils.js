const db = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

async function generateBillNumber() {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const count = await db.Bill.count({
        where: { billNumber: { [Op.like]: `${prefix}%` } }
    });
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}${seq}`;
}

function generatePaymentToken() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateBillNumber, generatePaymentToken };
