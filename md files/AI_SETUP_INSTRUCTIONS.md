# AI-Powered Listing Creation - Setup Instructions

## ✅ Implementation Complete!

The AI-powered listing creation feature has been successfully integrated into your Sharetribe marketplace. Here's what was done and how to set it up.

---

## 📦 What Was Implemented

### Backend (Server-side)
✅ **Dependencies installed**: `axios`, `form-data`, `multiparty`
✅ **AI Service**: `server/api/ai/aiService.js` - Handles AI API communication
✅ **API Endpoint**: `server/api/ai/analyze-listing-image.js` - Processes image uploads
✅ **Router Updated**: `server/apiRouter.js` - Registered `/api/ai/analyze-listing-image` endpoint

### Frontend (Client-side)
✅ **AI Utility**: `src/util/ai.js` - Client-side AI functions
✅ **AIPhotoUpload Component**: Complete upload and analysis UI
✅ **EditListingDetailsPanel Updated**: Integrated AI upload option
✅ **CSS Styles**: Beautiful, responsive UI for AI features

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Configure Environment Variables

Create or edit your `.env` file in the project root:

```bash
# Copy from template if you don't have .env yet
cp .env-template .env
```

Add these lines to your `.env` file:

```bash
# AI Agent Configuration
AI_AGENT_API_URL=https://your-ai-api.com/analyze
AI_AGENT_API_KEY=your-secret-api-key-here
REACT_APP_AI_FEATURES_ENABLED=true
```

**Important**: Replace with your actual AI API credentials from the `ai-leaz-models-main` backend.

### Step 2: Start the Development Server

```bash
# In the web-template-main directory
yarn run dev
```

This starts both frontend (port 3000) and backend (port 3500).

### Step 3: Test It!

1. Navigate to http://localhost:3000
2. Log in or create an account
3. Click "Create Listing" or "List your item"
4. You should see: **"Create your listing faster with AI!"** with an option to upload a photo
5. Upload a test image
6. Watch the AI analyze it!
7. Review and edit the auto-filled form
8. Publish your listing

---

## 🔧 Configuration Details

### AI API Requirements

Your AI API (`ai-leaz-models-main`) should:

1. **Accept POST requests** with multipart/form-data
2. **Receive an image** in the request body (field name: `image`)
3. **Return JSON** with this structure:

```json
{
  "title": "Extracted title",
  "description": "Generated description",
  "price": 99.99,
  "currency": "USD",
  "category": "electronics",
  "condition": "new",
  "brand": "Apple",
  "confidence": 0.85,
  "customFields": {
    "color": "black",
    "size": "large"
  }
}
```

### Response Transformation

The AI response is automatically transformed in `server/api/ai/aiService.js`:

```javascript
const transformAIResponse = (aiData) => {
  return {
    title: aiData.title || '',
    description: aiData.description || '',
    price: {
      amount: Math.round(aiData.price * 100), // Converts to cents
      currency: 'USD',
    },
    publicData: {
      category: aiData.category,
      condition: aiData.condition,
      brand: aiData.brand,
      ...aiData.customFields
    },
    confidence: aiData.confidence || 0,
  };
};
```

**Customize this function** to match your AI API's response format!

---

## 🎯 User Flow

### For New Listings:

1. **User clicks "Create Listing"**
   - System checks if AI is enabled (via `REACT_APP_AI_FEATURES_ENABLED`)

2. **AI Option Shown**
   - "Create with AI" button
   - "Create manually" link

3. **If User Chooses AI:**
   - Upload photo interface appears
   - Image is uploaded to Sharetribe (via SDK)
   - Image is analyzed by your AI API
   - Form is auto-filled with AI suggestions
   - User can edit before saving

4. **If User Chooses Manual:**
   - Standard form appears
   - No AI involvement

### For Existing Listings:
- AI option is **not shown** when editing existing listings
- Only manual editing is available

---

## 🎨 UI Features

### AI Upload Component
- Drag-and-drop friendly interface
- File type validation (JPEG, PNG, WebP, GIF)
- File size validation (max 10MB)
- Loading spinner during analysis
- Progress messages

### Auto-filled Form
- Pre-populated title and description
- AI confidence warnings (if < 70%)
- Visual indicators for AI-generated content
- Full editing capabilities

### Error Handling
- Network errors
- Invalid file types
- File size errors
- AI API errors
- Graceful fallback to manual creation

---

## 🔍 Testing Checklist

### Basic Functionality
- [ ] AI option appears for new listings
- [ ] Can upload an image
- [ ] AI analysis completes successfully
- [ ] Form is auto-filled with AI data
- [ ] Can edit AI-generated content
- [ ] Can publish listing normally

### Error Scenarios
- [ ] Upload non-image file → Shows error
- [ ] Upload 15MB file → Shows size error
- [ ] AI API is down → Shows error, allows manual
- [ ] Click "Skip AI" → Shows manual form
- [ ] Low AI confidence → Shows warning

### Edge Cases
- [ ] Edit existing listing → No AI option shown
- [ ] Multiple images → First image analyzed
- [ ] Network timeout → Error handled gracefully
- [ ] Empty AI response → Form shows blanks

---

## 🐛 Troubleshooting

### "AI Agent API not configured"
**Solution**: Check your `.env` file has both `AI_AGENT_API_URL` and `AI_AGENT_API_KEY` set correctly.

### AI Upload Button Doesn't Appear
**Solutions**:
1. Check `REACT_APP_AI_FEATURES_ENABLED=true` in `.env`
2. Restart your development server
3. Make sure you're creating a **new** listing (not editing)

### "Failed to analyze image"
**Solutions**:
1. Check your AI API is running
2. Verify the API URL is correct
3. Check the AI API logs for errors
4. Test the AI API independently with curl:
```bash
curl -X POST "YOUR_AI_API_URL" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "image=@test-image.jpg"
```

### Form Not Auto-filling
**Solutions**:
1. Check browser console for errors
2. Verify AI API response format matches expected structure
3. Update `transformAIResponse` function in `server/api/ai/aiService.js` if needed

### "Module not found" Errors
**Solution**: Run `yarn install` to ensure all dependencies are installed

---

## 📝 Customization

### Adjust AI Response Mapping

Edit `server/api/ai/aiService.js` to map your AI's response to Sharetribe format:

```javascript
const transformAIResponse = (aiData) => {
  return {
    title: aiData.yourTitleField || '',
    description: aiData.yourDescField || '',
    // Add your custom mappings here
    publicData: {
      myCustomField: aiData.customValue,
    },
  };
};
```

### Change UI Text

Edit `src/containers/EditListingPage/EditListingWizard/EditListingDetailsPanel/EditListingDetailsPanel.js`:

```javascript
<p>Your custom text here!</p>
```

### Modify Validation Rules

Edit `server/api/ai/aiService.js` in the `validateAIData` function:

```javascript
if (data.confidence < 0.8) { // Change threshold
  warnings.push('Your custom warning');
}
```

---

## 🚦 Environment Variables Summary

### Required for AI
```bash
AI_AGENT_API_URL=https://your-ai-api.com/analyze
AI_AGENT_API_KEY=your-secret-key
REACT_APP_AI_FEATURES_ENABLED=true
```

### Required for Sharetribe
```bash
REACT_APP_SHARETRIBE_SDK_CLIENT_ID=your-client-id
SHARETRIBE_SDK_CLIENT_SECRET=your-client-secret
REACT_APP_STRIPE_PUBLISHABLE_KEY=your-stripe-key
REACT_APP_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

---

## 📚 Next Steps

1. **Test with Real Images**: Upload actual product images to test AI accuracy
2. **Tune AI Confidence Thresholds**: Adjust validation rules based on results
3. **Customize Mappings**: Map all your AI fields to Sharetribe fields
4. **Add Analytics**: Track AI usage and success rates
5. **Deploy to Production**: Add env vars to your hosting platform

---

## 🆘 Need Help?

### Documentation
- Full integration guide: `AI_INTEGRATION_GUIDE.md`
- Quick reference: `AI_INTEGRATION_QUICKSTART.md`
- Architecture overview: `AI_INTEGRATION_README.md`

### Logs
- Backend: Check terminal running `yarn run dev`
- Frontend: Open browser DevTools → Console tab
- API: Check your AI API logs

---

## ✨ Features Summary

✅ **Smart Image Analysis**: AI extracts title, description, price, category
✅ **Seamless Integration**: Works with existing Sharetribe SDK
✅ **Manual Fallback**: Always allows manual creation
✅ **Error Handling**: Graceful degradation on failures
✅ **Responsive UI**: Works on mobile and desktop
✅ **Validation**: Checks AI confidence and data quality
✅ **Editable Results**: Users can modify AI suggestions
✅ **Feature Flag**: Easy enable/disable via environment variable

---

**Ready to test! 🎉**

Start your server with `yarn run dev` and create your first AI-powered listing!
