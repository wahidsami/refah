const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

/**
 * Email Service Utility - Resend
 * Handles sending emails using Resend API
 */

let resendInstance = null;

// Initialize Resend with API key
const initializeResend = () => {
    if (resendInstance) return resendInstance;

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || apiKey === 're_your_resend_api_key') {
        console.error('[Email] RESEND_API_KEY missing or placeholder. Set it in server/.env to send password reset emails.');
        return null;
    }

    resendInstance = new Resend(apiKey);
    return resendInstance;
};

/**
 * Send email using template
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name (welcome, approved, rejected)
 * @param {Object} options.data - Data to populate template
 * @returns {Promise} - Resolves when email is sent
 */
const sendEmail = async (options) => {
    try {
        const { to, subject, template, data } = options;

        // Initialize Resend
        const resend = initializeResend();
        if (!resend) {
            throw new Error('Resend not initialized - missing API key');
        }

        // Load template
        const templatePath = path.join(__dirname, '../templates/emails', `${template}.html`);

        if (!fs.existsSync(templatePath)) {
            throw new Error(`Email template '${template}' not found at ${templatePath}`);
        }

        let htmlContent = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders with actual data
        Object.keys(data).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            htmlContent = htmlContent.replace(placeholder, data[key] || '');
        });

        // Replace local logo path with CID for email embedding
        htmlContent = htmlContent.replace(/src="RifahNewLogoWhite\.png"/g, 'src="cid:logo"');

        // Load logo and convert to base64
        const logoPath = path.join(__dirname, '../templates/emails', 'RifahNewLogoWhite.png');
        let attachments = [];

        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const logoBase64 = logoBuffer.toString('base64');

            attachments.push({
                content: logoBase64,
                filename: 'logo.png'
            });
        }

        // Email message object
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Rifah <noreply@rifah.sa>';
        const msg = {
            to,
            from: fromEmail,
            subject,
            html: htmlContent,
            attachments: attachments.length > 0 ? attachments : undefined
        };

        // Send email
        const { data: responseData, error: responseError } = await resend.emails.send(msg);

        if (responseError) {
            throw new Error(`Resend Error: ${responseError.message}`);
        }

        console.log(`[Email] Sent successfully to ${to}`);

        return {
            success: true,
            messageId: responseData.id
        };

    } catch (error) {
        console.error(`[Email] Failed to send email:`, error.message);

        if (error.name === 'ResendError') {
            console.error(`[Email] Resend Error Details:`, error.message);
        }

        // Don't throw error - just log it
        // We don't want email failures to crash the app
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Send welcome email after registration
 */
const sendWelcomeEmail = async (tenantData) => {
    return sendEmail({
        to: tenantData.email,
        subject: 'Welcome to Rifah - Registration Received',
        template: 'welcome',
        data: {
            tenantName: tenantData.name_en || tenantData.name,
            tenantNameAr: tenantData.name_ar || tenantData.nameAr,
            email: tenantData.email
        }
    });
};

/**
 * Send approval email
 */
const sendApprovalEmail = async (tenantData) => {
    return sendEmail({
        to: tenantData.email,
        subject: 'Congratulations! Your Rifah Account is Approved ✨',
        template: 'approved',
        data: {
            tenantName: tenantData.name_en || tenantData.name,
            tenantNameAr: tenantData.name_ar || tenantData.nameAr,
            email: tenantData.email,
            loginUrl: process.env.TENANT_DASHBOARD_URL || 'http://localhost:3003/ar/login'
        }
    });
};

/**
 * Send rejection email
 */
const sendRejectionEmail = async (tenantData, reason) => {
    return sendEmail({
        to: tenantData.email,
        subject: 'Rifah Account Application Update',
        template: 'rejected',
        data: {
            tenantName: tenantData.name_en || tenantData.name,
            tenantNameAr: tenantData.name_ar || tenantData.nameAr,
            reason: reason || 'Please contact support for more information'
        }
    });
};

/**
 * Send approval email for paid plan — please pay within 48 hours (with Pay Now link)
 */
const sendApprovalEmailPaid = async (tenantData, { paymentUrl, billNumber, amount, dueDate, currency = 'SAR' }) => {
    return sendEmail({
        to: tenantData.email,
        subject: 'Rifah – Account Approved. Please Pay Within 48 Hours',
        template: 'approved_please_pay',
        data: {
            tenantName: tenantData.name_en || tenantData.name,
            tenantNameAr: tenantData.name_ar || tenantData.nameAr,
            paymentUrl: paymentUrl || '',
            billNumber: billNumber || '',
            amount: amount != null ? String(amount) : '0',
            dueDate: dueDate || '',
            currency: currency || 'SAR'
        }
    });
};

/**
 * Send payment success email
 */
const sendPaymentSuccessEmail = async (tenantData, { billNumber, amount, currency = 'SAR' }) => {
    return sendEmail({
        to: tenantData.email,
        subject: 'Rifah – Payment Received. Your Subscription Is Active',
        template: 'payment_success',
        data: {
            tenantName: tenantData.name_en || tenantData.name,
            tenantNameAr: tenantData.name_ar || tenantData.nameAr,
            billNumber: billNumber || '',
            amount: amount != null ? String(amount) : '0',
            currency: currency || 'SAR',
            loginUrl: process.env.TENANT_DASHBOARD_URL || 'http://localhost:3003/ar/login'
        }
    });
};

/**
 * Send suspended / payment overdue email
 */
const sendSuspendedEmail = async (tenantData, { billNumber }) => {
    return sendEmail({
        to: tenantData.email,
        subject: 'Rifah – Subscription Suspended. Please Pay to Restore Access',
        template: 'suspended',
        data: {
            tenantName: tenantData.name_en || tenantData.name,
            tenantNameAr: tenantData.name_ar || tenantData.nameAr,
            billNumber: billNumber || '',
            paymentUrl: process.env.TENANT_DASHBOARD_URL ? `${process.env.TENANT_DASHBOARD_URL.replace(/\/$/, '')}/bills` : 'http://localhost:3003/ar/dashboard/bills'
        }
    });
};

/**
 * Send password reset email (customer app - Refah)
 * Uses deep link: refah://reset-password?token=...&email=...
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.userName - User first name or display name
 * @param {string} options.resetLink - Deep link URL for the app
 * @param {number} [options.expiryMinutes=60] - Expiry in minutes for the link
 */
const sendPasswordResetEmail = async ({ to, userName, resetLink, expiryMinutes = 60 }) => {
    return sendEmail({
        to,
        subject: 'Refah – Reset Your Password',
        template: 'user_password_reset',
        data: {
            userName: userName || 'Customer',
            resetLink: resetLink || '#',
            expiryMinutes: String(expiryMinutes)
        }
    });
};

/**
 * Send password reset email (staff app - Refah staff)
 * Uses deep link: rifahstaff://reset-password?token=...&email=...
 * Same logic as customer: template-based, 1h expiry, no email enumeration on failure.
 */
const sendStaffPasswordResetEmail = async ({ to, userName, resetLink, expiryMinutes = 60 }) => {
    return sendEmail({
        to,
        subject: 'Refah staff – Reset Your Password',
        template: 'staff_password_reset',
        data: {
            userName: userName || 'Staff',
            resetLink: resetLink || '#',
            expiryMinutes: String(expiryMinutes)
        }
    });
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendApprovalEmail,
    sendApprovalEmailPaid,
    sendRejectionEmail,
    sendPaymentSuccessEmail,
    sendSuspendedEmail,
    sendPasswordResetEmail,
    sendStaffPasswordResetEmail
};
