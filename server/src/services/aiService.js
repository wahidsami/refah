const API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Helper to call OpenAI API using native fetch
 */
const callOpenAI = async (messages, model = 'gpt-4o-mini', temperature = 0.7) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OpenAI API key is not configured.');
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                response_format: { type: 'json_object' }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from OpenAI');
        }

        return JSON.parse(content);
    } catch (error) {
        console.error('AI Service Error:', error);
        throw error;
    }
};

/**
 * Search for product information and generate content
 * Modes: 'search' (find real product) | 'enhance' (polish user-entered content)
 */
exports.generateProductContent = async (productName, brand = '', category = '', inputLanguage = 'English', mode = 'search', existingData = {}) => {
    const jsonSchema = `{
  "found": true or false,
  "name_en": "Product name in English",
  "name_ar": "Product name in Arabic",
  "brand": "Brand/manufacturer name (empty string if unknown or not found)",
  "description_en": "2-3 sentence description in English",
  "description_ar": "2-3 sentence description in Arabic",
  "ingredients_en": "Key ingredients in English",
  "ingredients_ar": "Key ingredients in Arabic",
  "howToUse_en": "How to use instructions in English",
  "howToUse_ar": "How to use instructions in Arabic",
  "features_en": "Key features and benefits in English",
  "features_ar": "Key features and benefits in Arabic"
}`;

    let systemPrompt, userPrompt;

    if (mode === 'enhance') {
        systemPrompt = `You are an expert bilingual (English and Arabic) marketing copywriter for a high-end beauty/wellness brand.
Enhance and professionally polish the user-provided product content. Keep the same meaning but make it more professional and marketable.
Always set "found": true in enhance mode.
Return ONLY a valid JSON object with these exact keys:
${jsonSchema}`;
        userPrompt = `Product: ${productName}${brand ? ` by ${brand}` : ''}${category ? ` (${category})` : ''}
Language of product name: ${inputLanguage}
Content to enhance:
${existingData.description_en ? `- Description EN: ${existingData.description_en}` : ''}
${existingData.description_ar ? `- Description AR: ${existingData.description_ar}` : ''}
${existingData.ingredients_en ? `- Ingredients EN: ${existingData.ingredients_en}` : ''}
${existingData.ingredients_ar ? `- Ingredients AR: ${existingData.ingredients_ar}` : ''}
${existingData.howToUse_en ? `- How To Use EN: ${existingData.howToUse_en}` : ''}
${existingData.howToUse_ar ? `- How To Use AR: ${existingData.howToUse_ar}` : ''}
${existingData.features_en ? `- Features EN: ${existingData.features_en}` : ''}
${existingData.features_ar ? `- Features AR: ${existingData.features_ar}` : ''}`;
    } else {
        // SEARCH MODE
        systemPrompt = `You are an expert beauty and wellness product researcher.
Search your training knowledge for the specific product provided.
If you recognize it as a REAL, specific known product, set "found": true and fill all fields with accurate data.
If you do NOT recognize it as a specific real product (generic name, unknown brand), set "found": false and leave all other fields as empty strings.
Return ONLY a valid JSON object with these exact keys:
${jsonSchema}
Rules:
- "found": true ONLY for specific known products (e.g. "L'Oreal Elvive", "The Ordinary Niacinamide 10%", "Dove Men+Care")
- "found": false for generic terms (e.g. "hair shampoo", "face cream") or completely unknown products
- All content must be factually accurate, professional, and bilingual`;
        userPrompt = `Product Name (${inputLanguage}): ${productName}
${brand ? `Brand: ${brand}` : ''}
${category ? `Category: ${category}` : ''}`;
    }

    return callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ]);
};

/**
 * Generate service content (names, descriptions, benefits, expectations)
 * @param {string} serviceName - Service name in English or Arabic
 * @param {string} category - Category name
 * @param {string} inputLanguage - 'English' or 'Arabic' (language of serviceName)
 */
exports.generateServiceContent = async (serviceName, category = '', inputLanguage = 'English') => {
    const systemPrompt = `You are an expert bilingual (English and Arabic) marketing copywriter for a high-end salon/spa/clinic.
Generate compelling service content based on the provided service name.
You MUST return ONLY a valid JSON object with these exact keys, and no other text:
{
  "name_en": "Service name in English",
  "name_ar": "Service name in Arabic",
  "description_en": "A 2-3 sentence engaging description of the service in English.",
  "description_ar": "A 2-3 sentence engaging description of the service in Arabic.",
  "benefits": [
    {"en": "Benefit description in English", "ar": "Benefit description in Arabic"}
  ],
  "whatToExpect": [
    {"en": "What happens during this service in English", "ar": "What happens during this service in Arabic"}
  ]
}
Rules:
- Generate between 2 and 5 items for both 'benefits' and 'whatToExpect' arrays
- Benefits should describe how the service helps the customer
- What To Expect should describe the steps/experience during the service
- If the input name is in Arabic, translate it accurately for name_en, and vice versa
- Content should be professional and appropriate for a luxury beauty/wellness brand`;

    let userPrompt = `Service Name (${inputLanguage}): ${serviceName}\n`;
    if (category) userPrompt += `Category: ${category}\n`;

    return callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ]);
};

/**
 * Translate a single block of text between English and Arabic
 */
exports.translateText = async (text, targetLanguage) => {
    const systemPrompt = `You are a professional translator specializing in beauty and wellness terminology.
Translate the text to ${targetLanguage}. 
Return exactly requested in this JSON format:
{
  "translatedText": "The translated text here"
}`;

    const jsonResponse = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Text to translate: ${text}` }
    ], 'gpt-4o-mini', 0.3); // Lower temp for more accurate translation

    return jsonResponse.translatedText;
};

/**
 * Generate/Enhance About Us page content
 * @param {string} storyText - The admin's story (EN or AR)
 * @param {string} facilitiesText - Optional facilities description
 * @param {string} inputLanguage - 'English' or 'Arabic'
 */
exports.generateAboutUsContent = async (storyText, facilitiesText = '', inputLanguage = 'English') => {
    const ICON_LIST = 'HeartIcon, StarIcon, SparklesIcon, BoltIcon, CheckCircleIcon, GlobeAltIcon, UserGroupIcon, TrophyIcon, ShieldCheckIcon, LightBulbIcon';

    const systemPrompt = `You are an expert bilingual (English and Arabic) brand storyteller for a luxury beauty/wellness business.
Based on the admin's "About Us" story, generate a professional and complete About Us page.
Return ONLY a valid JSON object - no extra text, no markdown:
{
  "storyEn": "Enhanced professional story in English (2-4 paragraphs)",
  "storyAr": "Enhanced professional story in Arabic (2-4 paragraphs)",
  "missions": [
    {
      "titleEn": "Mission title in English",
      "titleAr": "Mission title in Arabic",
      "detailsEn": "Mission details in English (1-2 sentences)",
      "detailsAr": "Mission details in Arabic (1-2 sentences)",
      "iconName": "OneIconFromList"
    }
  ],
  "visions": [
    {
      "titleEn": "Vision title in English",
      "titleAr": "Vision title in Arabic",
      "detailsEn": "Vision details in English (1-2 sentences)",
      "detailsAr": "Vision details in Arabic (1-2 sentences)",
      "iconName": "OneIconFromList"
    }
  ],
  "values": [
    {
      "titleEn": "Value title in English",
      "titleAr": "Value title in Arabic",
      "detailsEn": "Value description in English (1-2 sentences)",
      "detailsAr": "Value description in Arabic (1-2 sentences)",
      "iconName": "OneIconFromList"
    }
  ],
  "facilitiesEn": "Enhanced facilities description in English, or empty string",
  "facilitiesAr": "Enhanced facilities description in Arabic, or empty string"
}
Rules:
- Generate 2 to 5 items for EACH of missions, visions, values (story content guides the count)
- Each iconName MUST be exactly one from: ${ICON_LIST}
- Use different icons across items where possible
- Missions = what we DO for clients. Visions = where we see ourselves. Values = core principles
- Preserve the original story meaning, only enhance the language and professionalism
- If no facilitiesText provided, return empty strings for facilitiesEn and facilitiesAr
- Content must be warm, professional, and fit for a luxury beauty/wellness brand`;

    const userPrompt = `Story Text (${inputLanguage}): ${storyText}${facilitiesText ? `\n\nFacilities Description (${inputLanguage}): ${facilitiesText}` : ''}`;

    return callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ]);
};

