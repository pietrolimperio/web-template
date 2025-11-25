# AI Integration Quick Start

**🎯 Goal**: Integrate AI-powered listing creation from images  
**⏱️ Time**: 2-4 hours  
**📚 Prerequisites**: Read `CHECKPOINT_BEFORE_AI_INTEGRATION.md`

---

## Step 1: Create Checkpoint (5 minutes)

```bash
cd "/Users/pietro.limperio/Desktop/Vibe coding projects/web-template-main"

# Check current status
git status

# Commit any pending changes
git add .
git commit -m "docs: Add AI integration guides and documentation"

# Create checkpoint branch
git checkout -b checkpoint-pre-ai-integration
git push origin checkpoint-pre-ai-integration

# Create feature branch for AI work
git checkout -b feature/ai-listing-creation

# You're now ready to start!
echo "✓ Checkpoint created. Safe to proceed."
```

---

## Step 2: Backend Setup (30 minutes)

### Install Dependencies
```bash
yarn add axios form-data multiparty
```

### Create Directory Structure
```bash
mkdir -p server/api/ai
```

### Create Files (Copy from AI_INTEGRATION_GUIDE.md)

1. **`server/api/ai/aiService.js`**
   - Copy from guide Section: "Backend Setup → Step 3"

2. **`server/api/ai/analyze-listing-image.js`**
   - Copy from guide Section: "Backend Setup → Step 4"

3. **Update `server/apiRouter.js`**
   - Add: `const analyzeListingImage = require('./api/ai/analyze-listing-image');`
   - Add: `router.post('/ai/analyze-listing-image', analyzeListingImage);`

### Configure Environment
```bash
# Add to .env
echo "" >> .env
echo "# AI Agent Configuration" >> .env
echo "AI_AGENT_API_URL=YOUR_AI_API_URL" >> .env
echo "AI_AGENT_API_KEY=YOUR_AI_API_KEY" >> .env
echo "REACT_APP_AI_FEATURES_ENABLED=true" >> .env
```

⚠️ **Replace YOUR_AI_API_URL and YOUR_AI_API_KEY with actual values**

### Test Backend
```bash
# Start server
yarn run dev-backend

# In another terminal, test endpoint
curl -X POST http://localhost:3500/api/ai/analyze-listing-image \
  -F "image=@/path/to/test-image.jpg"

# Expected: JSON response with image and listing data
```

---

## Step 3: Frontend Setup (1 hour)

### Create AI Utility
```bash
mkdir -p src/util
# Create src/util/ai.js (copy from guide)
```

File: `src/util/ai.js`
```javascript
// Copy from AI_INTEGRATION_GUIDE.md → "Frontend Changes → Step 1"
```

### Create AI Component
```bash
mkdir -p src/containers/EditListingPage/EditListingWizard/AIPhotoUpload
```

Create these files:
1. **`src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/AIPhotoUpload.js`**
   - Copy from guide Section: "Frontend Changes → Step 2"

2. **`src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/AIPhotoUpload.module.css`**
   - Copy from guide Section: "Frontend Changes → Step 2"

3. **Export file**:
```bash
# Create index.js
echo "export { default } from './AIPhotoUpload';" > src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/index.js
```

---

## Step 4: Integrate Components (30 minutes)

### Modify EditListingWizard

Edit `src/containers/EditListingPage/EditListingWizard/EditListingWizard.js`:

```javascript
// 1. Add imports at top
import { useState } from 'react'; // if not already imported
import AIPhotoUpload from './AIPhotoUpload';
import { isAIEnabled } from '../../../util/ai';

// 2. Inside EditListingWizard component, add state:
const [aiData, setAIData] = useState(null);
const [showAIUpload, setShowAIUpload] = useState(
  isAIEnabled() && tab === 'details' && isNewListingFlow
);

// 3. Add handlers:
const handleAIAnalysisComplete = (result) => {
  setAIData(result);
  setShowAIUpload(false);
  
  if (result.validation.warnings.length > 0) {
    console.warn('AI warnings:', result.validation.warnings);
  }
};

const handleAIError = (error) => {
  console.error('AI error:', error);
  setShowAIUpload(false);
};

// 4. In render section, add before wizard content:
{showAIUpload && (
  <div className={css.aiSection}>
    <AIPhotoUpload
      onAnalysisComplete={handleAIAnalysisComplete}
      onError={handleAIError}
    />
    <button 
      className={css.skipAI}
      onClick={() => setShowAIUpload(false)}
    >
      Skip AI - Create manually
    </button>
  </div>
)}

{!showAIUpload && (
  // ... existing wizard content ...
)}
```

### Modify EditListingDetailsPanel

Edit `src/containers/EditListingPage/EditListingWizard/EditListingDetails/EditListingDetailsPanel.js`:

```javascript
// 1. Extract aiData from props
const {
  params,
  // ... other props
  aiData, // ADD THIS
} = props;

// 2. Update initialValues to use AI data
const initialValues = {
  title: currentListing?.attributes?.title || aiData?.listing?.title || '',
  description: currentListing?.attributes?.description || aiData?.listing?.description || '',
  // ... other fields
};

// 3. Add AI notice in render (after form title):
{aiData && (
  <div style={{
    backgroundColor: '#f0f8ff',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px'
  }}>
    <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
      ✨ AI-generated content - review and edit as needed
    </p>
    {aiData.validation.warnings.map((warning, index) => (
      <p key={index} style={{ margin: '4px 0', color: '#856404' }}>
        ⚠️ {warning}
      </p>
    ))}
  </div>
)}
```

---

## Step 5: Testing (1 hour)

### Start Application
```bash
# Terminal 1: Backend
yarn run dev-backend

# Terminal 2: Frontend
yarn run dev-frontend

# Or use the combined command:
yarn run dev
```

### Manual Testing Checklist

#### ✅ Basic Flow
```
1. Navigate to http://localhost:3000
2. Log in (create account if needed)
3. Click "Create Listing" or "List your item"
4. Should see "Create with AI" option
5. Upload a test image
6. Wait for AI analysis (watch console for progress)
7. Verify form is auto-filled
8. Edit if needed
9. Proceed through wizard
10. Publish listing
```

#### ✅ Error Scenarios
```
1. Upload non-image file → Should show error
2. Upload 15MB image → Should show size error
3. Disconnect AI API → Should handle gracefully
4. Click "Skip AI" → Should show manual form
```

#### ✅ Edge Cases
```
1. AI returns low confidence → Warning shown
2. AI returns partial data → Form partially filled
3. User edits AI data → Changes preserved
4. Go back from next tab → AI data still there
```

### Debugging

If issues occur:

```bash
# Check backend logs
# Terminal will show any errors

# Check browser console
# Open DevTools → Console tab
# Look for errors or warnings

# Test AI endpoint directly
curl -X POST http://localhost:3500/api/ai/analyze-listing-image \
  -F "image=@./test-image.jpg" \
  -H "Cookie: st-authtoken=YOUR_TOKEN"
```

---

## Step 6: Commit Changes

```bash
# Check what changed
git status

# Review changes
git diff

# Add files
git add server/api/ai/
git add src/util/ai.js
git add src/containers/EditListingPage/EditListingWizard/AIPhotoUpload/
git add src/containers/EditListingPage/EditListingWizard/EditListingWizard.js
git add .env

# Commit
git commit -m "feat: Add AI-powered listing creation

- Add AI agent service and API endpoint
- Create AIPhotoUpload component
- Integrate AI with EditListingWizard
- Support auto-fill from image analysis
- Maintain manual creation fallback"

# Push
git push origin feature/ai-listing-creation
```

---

## Step 7: Deploy (Optional)

### Environment Variables

On your hosting platform (Heroku, AWS, etc.), add:

```bash
AI_AGENT_API_URL=https://your-ai-agent.com/api/analyze
AI_AGENT_API_KEY=your-production-key
REACT_APP_AI_FEATURES_ENABLED=true
```

### Build & Deploy

```bash
# Build production version
yarn run build

# Test build locally
yarn run start

# Deploy to your platform
# (Heroku, AWS, Netlify, etc.)
```

---

## Rollback Instructions

### If Something Goes Wrong

#### Quick Disable (No code changes)
```bash
# Just disable the feature
# In .env:
REACT_APP_AI_FEATURES_ENABLED=false

# Restart servers
```

#### Full Rollback
```bash
# Switch to checkpoint
git checkout checkpoint-pre-ai-integration

# Or reset feature branch
git checkout feature/ai-listing-creation
git reset --hard checkpoint-pre-ai-integration
```

#### Partial Rollback (Keep some changes)
```bash
# Restore specific files
git checkout checkpoint-pre-ai-integration -- src/containers/EditListingPage/

# Or restore everything except docs
git checkout checkpoint-pre-ai-integration -- .
git checkout feature/ai-listing-creation -- *GUIDE.md
```

---

## Troubleshooting Guide

### Issue: "AI Agent API not configured"
**Solution**: Check `.env` file has `AI_AGENT_API_URL` and `AI_AGENT_API_KEY`

### Issue: "Module not found: 'axios'"
**Solution**: Run `yarn install` to install dependencies

### Issue: AI component doesn't show
**Solution**: Check `REACT_APP_AI_FEATURES_ENABLED=true` in `.env`

### Issue: Image upload fails
**Solution**: 
1. Check file size < 10MB
2. Verify image format (jpg, png, etc.)
3. Check server logs for errors

### Issue: Form not auto-filling
**Solution**:
1. Check browser console for errors
2. Verify AI API response format
3. Check `transformAIResponse` function in `aiService.js`

### Issue: "Cannot POST /api/ai/analyze-listing-image"
**Solution**: 
1. Verify route is registered in `apiRouter.js`
2. Restart backend server
3. Check server startup logs

---

## Performance Optimization

### Once Working, Consider:

1. **Add Loading Skeleton**
   ```javascript
   // Show nice loading animation instead of spinner
   <LoadingSkeleton type="listingForm" />
   ```

2. **Image Preprocessing**
   ```javascript
   // Resize large images before upload
   const resizedImage = await resizeImage(file, 1200, 1200);
   ```

3. **Caching**
   ```javascript
   // Cache AI results temporarily
   sessionStorage.setItem('ai-result', JSON.stringify(result));
   ```

4. **Progressive Enhancement**
   ```javascript
   // Show partial results as they arrive
   streamAIAnalysis(file, (partial) => {
     updateForm(partial);
   });
   ```

---

## Next Features to Consider

After basic integration works:

- [ ] Multi-image analysis
- [ ] AI confidence score display
- [ ] Alternative suggestions
- [ ] Batch upload processing
- [ ] AI-powered image enhancement
- [ ] Category auto-detection
- [ ] Price suggestions based on market
- [ ] SEO optimization suggestions

---

## Support Contacts

- **Template Issues**: Check `COMPREHENSIVE_DEVELOPER_GUIDE.md`
- **Sharetribe API**: https://www.sharetribe.com/docs/
- **Git Help**: Use `git --help` or GitHub docs

---

## Summary Checklist

Before going live:

- [ ] Checkpoint created and verified
- [ ] Backend AI service implemented
- [ ] Frontend component created
- [ ] Integration tested thoroughly
- [ ] Error handling works
- [ ] Manual fallback works
- [ ] Environment variables set
- [ ] Code committed to Git
- [ ] Deployed to staging
- [ ] Tested on staging
- [ ] Ready for production!

---

**Quick Start Version**: 1.0  
**Estimated Time**: 2-4 hours  
**Difficulty**: Intermediate  

Good luck! 🚀 You've got this! 💪
