# AI-Powered Listing Creation Integration Guide

**Integration Type**: Image → AI Analysis → Auto-populate Listing  
**Maintains**: Full Sharetribe SDK/API compatibility  
**Approach**: Progressive enhancement (keeps manual creation)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Integration Strategy](#integration-strategy)
3. [Backend Setup](#backend-setup)
4. [Frontend Changes](#frontend-changes)
5. [Modified Flow](#modified-flow)
6. [Code Implementation](#code-implementation)
7. [Testing & Rollback](#testing--rollback)

---

## Architecture Overview

### Current Flow vs AI-Enhanced Flow

#### Before (Manual)
```
User → Upload Images → Manually Fill Form → Submit
```

#### After (AI-Enhanced)
```
User → Upload Images → AI Analyzes → Auto-Fill Form → User Reviews/Edits → Submit
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  EditListingPage                                     │   │
│  │    ├─ AI Photo Upload (New Component)               │   │
│  │    ├─ AI Analysis Status                            │   │
│  │    └─ EditListingWizard (Modified)                  │   │
│  │         └─ Pre-populated from AI                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ API Calls
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/ai/analyze-listing-image (New)                │   │
│  │    ├─ Receives image                                │   │
│  │    ├─ Uploads to Sharetribe via SDK                 │   │
│  │    ├─ Calls AI Agent API                            │   │
│  │    └─ Returns structured listing data               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Existing Sharetribe Endpoints                       │   │
│  │    ├─ /api/initiate-privileged                      │   │
│  │    └─ /api/transition-privileged                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                             │
           ▼                             ▼
  ┌─────────────────┐         ┌──────────────────┐
  │  AI Agent API   │         │  Sharetribe API  │
  │  (External)     │         │  (Marketplace)   │
  └─────────────────┘         └──────────────────┘
```

---

## Integration Strategy

### Phase 1: Backend AI Service (Server-Side)
1. Create AI service wrapper
2. Add new API endpoint `/api/ai/analyze-listing-image`
3. Integrate with Sharetribe SDK for image upload

### Phase 2: Frontend Components
1. Create `AIPhotoUpload` component
2. Modify `EditListingWizard` to handle AI data
3. Add loading states and error handling

### Phase 3: User Flow Integration
1. Add "Create with AI" option
2. Show AI analysis progress
3. Allow manual editing of AI results

### Phase 4: Testing & Refinement
1. Test with various images
2. Handle edge cases
3. Add analytics

---

## Backend Setup

### Step 1: Install Dependencies

```bash
cd /Users/pietro.limperio/Desktop/Vibe\ coding\ projects/web-template-main
yarn add axios form-data
```

### Step 2: Add Environment Variables

Add to `.env`:
```bash
# AI Agent Configuration
AI_AGENT_API_URL=https://your-ai-agent.com/api/analyze
AI_AGENT_API_KEY=your-secret-key

# Optional: Enable/Disable AI features
REACT_APP_AI_FEATURES_ENABLED=true
```

### Step 3: Create AI Service

Create `server/api/ai/aiService.js`:

```javascript
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
    throw new Error('AI Agent API not configured');
  }

  try {
    const formData = new FormData();
    formData.append('image', imageBuffer, imageName);
    formData.append('task', 'listing_analysis');

    const response = await axios.post(AI_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      timeout: 30000, // 30 second timeout
    });

    // Transform AI response to Sharetribe listing format
    return transformAIResponse(response.data);
  } catch (error) {
    log.error(error, 'ai-agent-api-error');
    throw new Error('Failed to analyze image with AI agent');
  }
};

/**
 * Transform AI agent response to Sharetribe listing format
 * @param {Object} aiData - Raw AI response
 * @returns {Object} Sharetribe-compatible listing data
 */
const transformAIResponse = (aiData) => {
  // Adapt this to match your AI agent's response structure
  return {
    title: aiData.title || '',
    description: aiData.description || '',
    price: aiData.price ? {
      amount: Math.round(aiData.price * 100), // Convert to cents
      currency: 'USD',
    } : null,
    publicData: {
      category: aiData.category || null,
      condition: aiData.condition || null,
      brand: aiData.brand || null,
      // Add other fields based on your AI response
      ...(aiData.customFields || {}),
    },
    confidence: aiData.confidence || 0,
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

  if (!data.title || data.title.length < 3) {
    errors.push('Title is too short or missing');
  }

  if (!data.description || data.description.length < 20) {
    warnings.push('Description might be too short');
  }

  if (data.confidence && data.confidence < 0.7) {
    warnings.push('AI confidence is low - please review carefully');
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
```

### Step 4: Create API Endpoint

Create `server/api/ai/analyze-listing-image.js`:

```javascript
// server/api/ai/analyze-listing-image.js
const multiparty = require('multiparty');
const { analyzeListingImage, validateAIData } = require('./aiService');
const { getSdk } = require('../api-util/sdk');
const log = require('../../log');

module.exports = (req, res) => {
  const form = new multiparty.Form();

  form.parse(req, async (error, fields, files) => {
    if (error) {
      log.error(error, 'multiparty-form-parse-failed');
      return res.status(400).json({ error: 'Failed to parse image upload' });
    }

    try {
      // Get the uploaded image
      const imageFile = files.image && files.image[0];
      if (!imageFile) {
        return res.status(400).json({ error: 'No image provided' });
      }

      // Read image buffer
      const fs = require('fs');
      const imageBuffer = fs.readFileSync(imageFile.path);
      const imageName = imageFile.originalFilename;

      // Step 1: Upload image to Sharetribe
      const sdk = getSdk(req, res);
      const uploadResponse = await sdk.images.upload({
        image: imageBuffer,
      });

      const uploadedImage = uploadResponse.data.data;

      // Step 2: Analyze with AI agent
      const aiAnalysis = await analyzeListingImage(imageBuffer, imageName);

      // Step 3: Validate AI data
      const validation = validateAIData(aiAnalysis);

      // Clean up temporary file
      fs.unlinkSync(imageFile.path);

      // Return combined response
      return res.status(200).json({
        success: true,
        image: {
          id: uploadedImage.id.uuid,
          url: uploadedImage.attributes.variants.default.url,
        },
        listing: aiAnalysis,
        validation,
      });

    } catch (e) {
      log.error(e, 'ai-listing-analysis-failed');

      // Clean up temp file if it exists
      if (files.image && files.image[0]) {
        try {
          const fs = require('fs');
          fs.unlinkSync(files.image[0].path);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }

      return res.status(500).json({
        error: e.message || 'AI analysis failed',
      });
    }
  });
};
```

### Step 5: Register API Route

Add to `server/apiRouter.js`:

```javascript
// server/apiRouter.js
// ... existing imports ...
const analyzeListingImage = require('./api/ai/analyze-listing-image');

// ... existing routes ...

// AI endpoints
router.post('/ai/analyze-listing-image', analyzeListingImage);

module.exports = router;
```

---

## Frontend Changes

### Step 1: Create AI Service Utility

Create `src/util/ai.js`:

```javascript
// src/util/ai.js
import { post } from './api';

/**
 * Upload image and get AI analysis
 * @param {File} imageFile - Image file to analyze
 * @returns {Promise<Object>} AI analysis result
 */
export const analyzeListingImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await post('/api/ai/analyze-listing-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response;
};

/**
 * Check if AI features are enabled
 * @returns {boolean}
 */
export const isAIEnabled = () => {
  return process.env.REACT_APP_AI_FEATURES_ENABLED === 'true';
};
```

### Step 2: Create AIPhotoUpload Component

Create `src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/`:

```javascript
// src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/AIPhotoUpload.js
import React, { useState } from 'react';
import { analyzeListingImage } from '../../../../util/ai';
import { Button, IconSpinner } from '../../../../components';
import css from './AIPhotoUpload.module.css';

const AIPhotoUpload = ({ onAnalysisComplete, onError }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('Image must be smaller than 10MB');
      return;
    }

    setIsAnalyzing(true);
    setProgress('Uploading image...');

    try {
      // Call AI analysis
      setProgress('Analyzing with AI...');
      const result = await analyzeListingImage(file);

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      setProgress('Complete!');
      
      // Pass results to parent
      onAnalysisComplete({
        image: result.image,
        listing: result.listing,
        validation: result.validation,
      });

    } catch (error) {
      console.error('AI analysis error:', error);
      onError(error.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  };

  return (
    <div className={css.root}>
      <div className={css.uploadArea}>
        <h2 className={css.title}>Create Listing with AI</h2>
        <p className={css.description}>
          Upload a photo of your item and let AI generate the listing details for you.
          You can review and edit everything before publishing.
        </p>

        {isAnalyzing ? (
          <div className={css.analyzing}>
            <IconSpinner />
            <p>{progress}</p>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={css.fileInput}
              id="ai-photo-upload"
            />
            <label htmlFor="ai-photo-upload" className={css.uploadButton}>
              <Button>
                📸 Upload Photo to Start
              </Button>
            </label>
          </>
        )}
      </div>

      <div className={css.features}>
        <h3>AI will analyze:</h3>
        <ul>
          <li>✓ Item title and description</li>
          <li>✓ Category and condition</li>
          <li>✓ Suggested pricing</li>
          <li>✓ Key features and details</li>
        </ul>
      </div>
    </div>
  );
};

export default AIPhotoUpload;
```

Create `src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/AIPhotoUpload.module.css`:

```css
/* src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/AIPhotoUpload.module.css */

.root {
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
}

.uploadArea {
  background-color: var(--matterColorLight);
  border: 2px dashed var(--matterColorAnti);
  border-radius: 8px;
  padding: 48px 24px;
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 28px;
  color: var(--matterColorDark);
  margin-bottom: 16px;
}

.description {
  color: var(--matterColor);
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 32px;
}

.fileInput {
  display: none;
}

.uploadButton label {
  cursor: pointer;
}

.analyzing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.analyzing p {
  color: var(--marketplaceColor);
  font-weight: 600;
}

.features {
  background-color: var(--matterColorLight);
  border-radius: 8px;
  padding: 24px;
}

.features h3 {
  font-size: 18px;
  margin-bottom: 16px;
  color: var(--matterColorDark);
}

.features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features li {
  padding: 8px 0;
  color: var(--matterColor);
  font-size: 16px;
}
```

### Step 3: Modify EditListingWizard

Update `src/containers/EditListingPage/EditListingWizard/EditListingWizard.js`:

```javascript
// Add to imports
import AIPhotoUpload from './AIPhotoUpload/AIPhotoUpload';
import { isAIEnabled } from '../../../util/ai';

// Inside EditListingWizard component, add state:
const [aiData, setAIData] = useState(null);
const [showAIUpload, setShowAIUpload] = useState(
  isAIEnabled() && tab === 'details' && !params.id.includes('draft')
);

// Add handler
const handleAIAnalysisComplete = (result) => {
  setAIData(result);
  setShowAIUpload(false);
  
  // Show validation warnings if any
  if (result.validation.warnings.length > 0) {
    // You can use your existing notification system
    console.warn('AI warnings:', result.validation.warnings);
  }
};

const handleAIError = (error) => {
  // Handle error - show notification
  console.error('AI error:', error);
  // Optionally hide AI upload and show manual form
  setShowAIUpload(false);
};

// In the render section, before the wizard tabs:
{showAIUpload && (
  <AIPhotoUpload
    onAnalysisComplete={handleAIAnalysisComplete}
    onError={handleAIError}
  />
)}

{!showAIUpload && (
  // ... existing wizard tabs ...
)}

// Pass aiData to EditListingDetailsPanel
<EditListingDetailsPanel
  {...panelProps}
  aiData={aiData}  // New prop
/>
```

### Step 4: Update EditListingDetailsPanel

Modify `src/containers/EditListingPage/EditListingWizard/EditListingDetails/EditListingDetailsPanel.js`:

```javascript
// Inside EditListingDetailsPanel component

// Extract AI data from props
const { aiData, /* ...other props */ } = props;

// Merge AI data with initial values
const initialValues = {
  title: currentListing?.attributes?.title || aiData?.listing?.title || '',
  description: currentListing?.attributes?.description || aiData?.listing?.description || '',
  // ... other fields
};

// Add a notice if AI data was used
{aiData && (
  <div className={css.aiNotice}>
    <p>✨ AI-generated content - please review and edit as needed</p>
    {aiData.validation.warnings.map((warning, index) => (
      <p key={index} className={css.warning}>{warning}</p>
    ))}
  </div>
)}
```

---

## Modified Flow

### User Journey with AI

```
1. User clicks "Create Listing"
   ↓
2. Sees two options:
   - "Create with AI" (Upload photo first)
   - "Create manually" (Traditional flow)
   ↓
3a. If AI path chosen:
    → Upload photo
    → Wait for AI analysis (5-10 seconds)
    → Review auto-filled form
    → Edit if needed
    → Continue to next tabs
    ↓
3b. If manual path chosen:
    → Traditional wizard flow
    ↓
4. Rest of the flow remains unchanged
```

### State Management

```javascript
// Redux state addition to EditListingPage.duck.js

// Action types
const AI_ANALYSIS_REQUEST = 'app/EditListingPage/AI_ANALYSIS_REQUEST';
const AI_ANALYSIS_SUCCESS = 'app/EditListingPage/AI_ANALYSIS_SUCCESS';
const AI_ANALYSIS_ERROR = 'app/EditListingPage/AI_ANALYSIS_ERROR';

// Initial state
const initialState = {
  // ... existing state
  aiAnalysis: null,
  aiAnalysisInProgress: false,
  aiAnalysisError: null,
};

// Reducer updates
case AI_ANALYSIS_REQUEST:
  return { ...state, aiAnalysisInProgress: true, aiAnalysisError: null };
case AI_ANALYSIS_SUCCESS:
  return { ...state, aiAnalysis: action.payload, aiAnalysisInProgress: false };
case AI_ANALYSIS_ERROR:
  return { ...state, aiAnalysisError: action.payload, aiAnalysisInProgress: false };
```

---

## Code Implementation Checklist

### Backend
- [ ] Install dependencies: `axios`, `form-data`, `multiparty`
- [ ] Create `server/api/ai/aiService.js`
- [ ] Create `server/api/ai/analyze-listing-image.js`
- [ ] Update `server/apiRouter.js`
- [ ] Add environment variables to `.env`
- [ ] Test AI endpoint with Postman/curl

### Frontend
- [ ] Create `src/util/ai.js`
- [ ] Create `AIPhotoUpload` component
- [ ] Create `AIPhotoUpload.module.css`
- [ ] Update `EditListingWizard.js`
- [ ] Update `EditListingDetailsPanel.js`
- [ ] Add AI state to `EditListingPage.duck.js`
- [ ] Add environment variable to `.env-template`

### Testing
- [ ] Test with valid images
- [ ] Test with invalid files
- [ ] Test with large files (>10MB)
- [ ] Test AI API failures
- [ ] Test manual creation still works
- [ ] Test editing AI-generated listings
- [ ] Test on mobile devices

---

## Testing & Rollback

### Testing Strategy

#### 1. Unit Tests

```javascript
// src/util/ai.test.js
import { analyzeListingImage, isAIEnabled } from './ai';

describe('AI utilities', () => {
  test('isAIEnabled returns correct value', () => {
    process.env.REACT_APP_AI_FEATURES_ENABLED = 'true';
    expect(isAIEnabled()).toBe(true);
  });

  // Add more tests...
});
```

#### 2. Integration Tests

Test the full flow:
1. Upload image
2. Receive AI analysis
3. Create listing with AI data
4. Verify Sharetribe receives correct data

#### 3. Manual Testing Scenarios

```
✓ Happy path: Upload → AI success → Form filled → Submit
✓ AI failure: Upload → AI error → Fallback to manual
✓ Network error: Upload → Timeout → Error handling
✓ Invalid image: Select non-image → Validation error
✓ Large file: Upload 15MB → Size validation error
✓ Low confidence: AI returns < 70% → Warning shown
✓ Manual override: Change AI data → Submit custom data
```

### Rollback Plan

#### If AI Integration Fails

1. **Disable AI Feature Flag**
   ```bash
   # In .env
   REACT_APP_AI_FEATURES_ENABLED=false
   ```

2. **Remove AI Components**
   ```bash
   git checkout HEAD -- src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/
   git checkout HEAD -- src/util/ai.js
   ```

3. **Revert to Checkpoint**
   ```bash
   git checkout checkpoint-pre-ai-integration
   ```

4. **Hot-fix for Production**
   - Comment out AI imports
   - Remove `{showAIUpload && ...}` blocks
   - Deploy immediately

---

## Advanced Features (Optional)

### Multiple Image Analysis

Analyze multiple images for better accuracy:

```javascript
const analyzeMultipleImages = async (imageFiles) => {
  const analyses = await Promise.all(
    imageFiles.map(file => analyzeListingImage(file))
  );
  
  // Merge results with confidence weighting
  return mergeAnalyses(analyses);
};
```

### Progressive AI Updates

Show live progress during analysis:

```javascript
// Using Server-Sent Events or WebSockets
const streamAIAnalysis = (imageFile, onProgress) => {
  const eventSource = new EventSource('/api/ai/analyze-stream');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onProgress(data);
  };
};
```

### AI Suggestions Panel

Show alternative AI suggestions:

```javascript
<AISuggestionsPanel
  alternatives={aiData.alternatives}
  onSelect={(suggestion) => updateForm(suggestion)}
/>
```

---

## Monitoring & Analytics

### Track AI Usage

```javascript
// Add to analytics.js
export const trackAIAnalysis = (eventName, data) => {
  if (window.gtag) {
    window.gtag('event', eventName, {
      event_category: 'AI_Listing_Creation',
      ai_confidence: data.confidence,
      processing_time: data.processingTime,
    });
  }
};
```

### Log AI Performance

```javascript
// In aiService.js
const startTime = Date.now();
const result = await analyzeListingImage(imageBuffer, imageName);
const duration = Date.now() - startTime;

log.info({
  event: 'ai-analysis-complete',
  duration,
  confidence: result.confidence,
  success: true,
});
```

---

## Troubleshooting

### Common Issues

#### 1. AI API Timeout
```javascript
// Increase timeout in aiService.js
timeout: 60000, // 60 seconds for slower AI models
```

#### 2. Image Upload Fails
```javascript
// Check file size limits in Express
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

#### 3. CORS Issues (if AI on different domain)
```javascript
// In server/index.js
const cors = require('cors');
app.use('/api/ai', cors({
  origin: process.env.AI_AGENT_DOMAIN,
}));
```

---

## Security Considerations

### 1. API Key Protection
- ✅ Store AI API key in environment variables
- ✅ Never expose in client-side code
- ✅ Use server-side endpoint only

### 2. File Upload Security
- ✅ Validate file types
- ✅ Limit file sizes
- ✅ Sanitize filenames
- ✅ Scan for malware (optional)

### 3. Rate Limiting
```javascript
// Add to server
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
});

app.use('/api/ai', aiLimiter);
```

---

## Next Steps

1. ✅ **Checkpoint created** - Safe restore point established
2. 📝 **Review this guide** - Understand the full integration
3. 🔧 **Set up backend** - Create AI service and endpoints
4. 🎨 **Build frontend** - Create AI upload component
5. 🧪 **Test thoroughly** - All scenarios covered
6. 🚀 **Deploy gradually** - Feature flag rollout
7. 📊 **Monitor performance** - Track usage and issues

---

## Support & References

- **Checkpoint**: See `CHECKPOINT_BEFORE_AI_INTEGRATION.md`
- **Template Docs**: See `COMPREHENSIVE_DEVELOPER_GUIDE.md`
- **Sharetribe SDK**: https://www.sharetribe.com/docs/references/js-sdk/
- **API Reference**: https://www.sharetribe.com/api-reference/

---

**Integration Guide Version**: 1.0  
**Last Updated**: November 3, 2025  
**Status**: Ready for implementation

Happy coding! 🚀✨
