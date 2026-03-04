const aiService = require('../../services/aiService');

/**
 * Generate AI content for a Product
 * @route POST /api/v1/tenant/ai/generate-product
 */
exports.generateProduct = async (req, res) => {
    try {
        const { name_en, name_ar, brand, category, inputLanguage, mode, existingData } = req.body;

        const productName = name_en || name_ar;
        if (!productName) {
            return res.status(400).json({
                success: false,
                message: 'Product name (English or Arabic) is required for AI generation.'
            });
        }

        const lang = inputLanguage || (name_en ? 'English' : 'Arabic');
        const aiMode = mode || 'search';
        const generatedData = await aiService.generateProductContent(
            productName, brand, category, lang, aiMode, existingData || {}
        );

        res.status(200).json({
            success: true,
            data: generatedData
        });
    } catch (error) {
        console.error('AI Generate Product Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate AI content. Ensure the API key is configured and try again.',
            error: error.message
        });
    }
};

/**
 * Generate AI content for a Service
 * @route POST /api/v1/tenant/ai/generate-service
 */
exports.generateService = async (req, res) => {
    try {
        const { name_en, name_ar, category, inputLanguage } = req.body;

        const serviceName = name_en || name_ar;
        if (!serviceName) {
            return res.status(400).json({
                success: false,
                message: 'Service name (English or Arabic) is required for AI generation.'
            });
        }

        const lang = inputLanguage || (name_en ? 'English' : 'Arabic');
        const generatedData = await aiService.generateServiceContent(serviceName, category, lang);

        res.status(200).json({
            success: true,
            data: generatedData
        });
    } catch (error) {
        console.error('AI Generate Service Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate AI content. Ensure the API key is configured and try again.',
            error: error.message
        });
    }
};

/**
 * Generate AI content for About Us
 * @route POST /api/v1/tenant/ai/generate-about-us
 */
exports.generateAboutUs = async (req, res) => {
    try {
        const { storyText, facilitiesText, inputLanguage } = req.body;

        if (!storyText || storyText.trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Story text is required for AI enhancement.'
            });
        }

        const generatedData = await aiService.generateAboutUsContent(
            storyText,
            facilitiesText || '',
            inputLanguage || 'English'
        );

        res.status(200).json({
            success: true,
            data: generatedData
        });
    } catch (error) {
        console.error('AI Generate About Us Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enhance About Us content.',
            error: error.message
        });
    }
};

/**
 * Translate a piece of text
 * @route POST /api/v1/tenant/ai/translate
 */
exports.translateText = async (req, res) => {
    try {
        const { text, targetLanguage } = req.body;

        if (!text || !targetLanguage) {
            return res.status(400).json({
                success: false,
                message: 'Both text and targetLanguage are required.'
            });
        }

        if (!['English', 'Arabic'].includes(targetLanguage)) {
            return res.status(400).json({
                success: false,
                message: 'Target language must be either "English" or "Arabic".'
            });
        }

        const translatedText = await aiService.translateText(text, targetLanguage);

        res.status(200).json({
            success: true,
            translatedText
        });
    } catch (error) {
        console.error('AI Translate Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to translate text.',
            error: error.message
        });
    }
};
