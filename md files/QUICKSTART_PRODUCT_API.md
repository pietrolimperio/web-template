# 🚀 Quick Start - Product API Integration

## ✅ What's Already Done

- Product API client utility
- Complete AI listing creation page with 5-step flow
- Redux state management
- Routing integration (`/l/ai-create`)
- All UI components and styling
- Data mapping utilities

## ⚡ 3 Steps to Get Started

### Step 1: Add Translations (2 minutes)

Open `src/translations/en.json` and add these at the end (before the closing `}`):

```json
  "AIListingCreationPage.title": "Create Listing with AI",
  "AIListingCreationPage.schemaTitle": "Create a new listing with AI assistance",
  "AIListingCreationPage.heading": "Create Your Listing with AI",
  "AIListingCreationPage.subtitle": "Upload product images and let AI generate a complete listing for you",
  "AIListingCreationPage.analyzing": "Analyzing your product...",
  "AIListingCreationPage.analyzingDescription": "Our AI is examining your images to create a detailed listing. This usually takes 10-30 seconds.",
  "AIListingCreationPage.createManually": "Or create a listing manually",
  "ProductImageUpload.title": "Upload Product Images",
  "ProductImageUpload.description": "Drag and drop up to 10 images, or click to browse",
  "ProductImageUpload.browseButton": "Choose Images",
  "ProductImageUpload.hint": "Supported: JPG, PNG, WebP, HEIF (max 5MB each)",
  "ProductImageUpload.imagesCount": "{count, plural, one {# image selected} other {# images selected}}",
  "ProductImageUpload.analyzeButton": "Analyze with AI",
  "ProductImageUpload.cancelButton": "Cancel",
  "ProductDataReview.questionsTitle": "Help Us Refine Your Listing",
  "ProductDataReview.questionsDescription": "Answer a few quick questions to improve accuracy",
  "ProductDataReview.refineButton": "Refine with Answers",
  "ProductDataReview.refining": "Refining your listing...",
  "ProductDataReview.dataTitle": "Review & Edit AI-Generated Data",
  "ProductDataReview.additionalFields": "Additional Details",
  "ProductDataReview.proceedButton": "Proceed to Preview",
  "ProductDataReview.startOverButton": "Start Over",
  "ListingPreview.title": "Preview Your Listing",
  "ListingPreview.subtitle": "Review how your listing will appear to customers",
  "ListingPreview.imagesTitle": "Photos",
  "ListingPreview.detailsTitle": "Listing Details",
  "ListingPreview.creating": "Creating your listing...",
  "ListingPreview.createButton": "Create Listing",
  "ListingPreview.backButton": "Back to Edit",
  "ListingPreview.startOverButton": "Start Over"
```

### Step 2: Start Product API Backend (1 minute)

```bash
# In a separate terminal
cd /path/to/ai-leaz-models-main/backend
npm install  # Only needed first time
npm start
```

Verify it's running: http://localhost:3001

### Step 3: Start Sharetribe Template (1 minute)

```bash
cd "/Users/pietro.limperio/Desktop/Vibe coding projects/web-template-main"

# Create .env if needed
if [ ! -f .env ]; then cp .env-template .env; fi

# Add Product API URL
echo "REACT_APP_PRODUCT_API_URL=http://localhost:3001/api/products" >> .env

# Start the app
yarn run dev
```

## 🎯 Test It Out

1. Go to: http://localhost:3000/l/create
2. Upload 1-10 product images
3. Wait for AI analysis (~10-30 seconds)
4. Review and edit the generated data
5. Create your listing!

## 📍 Routes

- **AI Creation**: `http://localhost:3000/l/create` (NEW)
- **Manual Creation**: `http://localhost:3000/l/new` (Original - unchanged)
- **Home**: `http://localhost:3000/`

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to analyze" | Make sure Product API is running on port 3001 |
| Translation missing | Add messages to `src/translations/en.json` |
| Route not found | Restart dev server with `yarn run dev` |
| Image too large | Max 5MB per image, 10 images total |

## 📚 Full Documentation

See `PRODUCT_API_INTEGRATION_GUIDE.md` for:
- Complete technical details
- API integration workflow
- Customization options
- Security considerations
- Analytics implementation
- Advanced features

## ✨ Key Features

- 📸 **Multi-image upload**: Drag & drop, 1-10 images
- 🤖 **AI Analysis**: Gemini 2.0 generates complete listing
- ✏️ **Edit & Refine**: Modify any field, answer questions
- 🔄 **Regenerate**: Re-generate specific fields
- 👁️ **Preview**: See final listing before creation
- 🚀 **One-click publish**: Creates and publishes to Sharetribe

## 🎊 That's It!

Your AI-powered listing creation is ready to use!

Total setup time: **~5 minutes**
