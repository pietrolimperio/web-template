// server/api/ai/aiService.js
const axios = require('axios');
const FormData = require('form-data');
const log = require('../../log');

const AI_API_URL = process.env.AI_AGENT_API_URL;
const AI_API_KEY = process.env.AI_AGENT_API_KEY;

/**
 * Analyze an image using the AI agent API
 * @param {Buffer} imageBuffer - Image data
 * @param {string} imageName - Original filename
 * @returns {Promise<Object>} Structured listing data
 */
const analyzeListingImage = async (imageBuffer, imageName) => {
  if (!AI_API_URL || !AI_API_KEY) {
    throw new Error('AI Agent API not configured. Please set AI_AGENT_API_URL and AI_AGENT_API_KEY in your .env file.');
  }

  try {
    const formData = new FormData();
    formData.append('image', imageBuffer, imageName);
    formData.append('task', 'listing_analysis');

    log.info('Calling AI agent API for image analysis');

    const response = await axios.post(AI_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      timeout: 30000, // 30 second timeout
    });

    log.info('AI agent API response received');

    // Transform AI response to Sharetribe listing format
    return transformAIResponse(response.data);
  } catch (error) {
    log.error(error, 'ai-agent-api-error', {
      url: AI_API_URL,
      imageName,
    });
    
    if (error.response) {
      throw new Error(`AI agent API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('AI agent API is not responding. Please check your network connection.');
    } else {
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }
};

/**
 * Transform AI agent response to Sharetribe listing format
 * @param {Object} aiData - Raw AI response
 * @returns {Object} Sharetribe-compatible listing data
 */
const transformAIResponse = (aiData) => {
  // Adapt this to match your AI agent's response structure
  // This is a generic template - modify based on your actual AI API response
  
  return {
    title: aiData.title || aiData.name || '',
    description: aiData.description || aiData.details || '',
    price: aiData.price ? {
      amount: Math.round(parseFloat(aiData.price) * 100), // Convert to cents
      currency: aiData.currency || 'USD',
    } : null,
    publicData: {
      category: aiData.category || null,
      condition: aiData.condition || null,
      brand: aiData.brand || null,
      // Add other fields based on your AI response
      // You can map any custom fields here
      ...(aiData.customFields || {}),
      ...(aiData.attributes || {}),
    },
    // Confidence score from AI (if available)
    confidence: aiData.confidence || aiData.score || 0,
  };
};

/**
 * Validate AI-generated data
 * @param {Object} data - Listing data to validate
 * @returns {Object} Validation result
 */
const validateAIData = (data) => {
  const errors = [];
  const warnings = [];

  // Title validation
  if (!data.title || data.title.length < 3) {
    errors.push('Title is too short or missing');
  } else if (data.title.length > 100) {
    warnings.push('Title might be too long (over 100 characters)');
  }

  // Description validation
  if (!data.description || data.description.length < 20) {
    warnings.push('Description might be too short');
  } else if (data.description.length > 5000) {
    warnings.push('Description is very long (over 5000 characters)');
  }

  // Confidence score validation
  if (data.confidence && data.confidence < 0.7) {
    warnings.push('AI confidence is low - please review carefully');
  } else if (data.confidence && data.confidence < 0.5) {
    errors.push('AI confidence is very low - manual review required');
  }

  // Price validation
  if (data.price) {
    if (data.price.amount < 0) {
      errors.push('Price cannot be negative');
    } else if (data.price.amount === 0) {
      warnings.push('Price is set to zero');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

module.exports = {
  analyzeListingImage,
  transformAIResponse,
  validateAIData,
};
