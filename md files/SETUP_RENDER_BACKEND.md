# 🚀 Setup for Render-Hosted Backend

## The Issue

Your backend is hosted on **Render** (e.g., `https://your-app.onrender.com`), but your frontend is trying to call `http://localhost:3001`. 

This causes a **404 error** because localhost:3001 doesn't exist!

---

## ✅ Quick Fix (2 Steps)

### Step 1: Create `.env` File

In your project root, create a `.env` file:

```bash
cd "/Users/pietro.limperio/Desktop/Vibe coding projects/web-template-main"

# Create .env file (if it doesn't exist)
touch .env
```

### Step 2: Add Your Render Backend URL

Open `.env` and add:

```bash
# Replace with YOUR actual Render URL!
REACT_APP_PRODUCT_API_URL=https://your-render-app-name.onrender.com/api/products
```

**Example** (replace with your actual URL):
```bash
# If your Render backend is at: https://ai-product-backend.onrender.com
REACT_APP_PRODUCT_API_URL=https://ai-product-backend.onrender.com/api/products
```

### Step 3: Restart Frontend

```bash
# Stop your dev server (Ctrl+C)
# Then restart:
yarn run dev
```

---

## 🔍 How to Find Your Render URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your backend service
3. Look for the **URL** (e.g., `https://ai-backend-xyz.onrender.com`)
4. Copy that URL

---

## ✅ Verify Your Backend CORS Settings

On Render, make sure your backend has CORS configured for:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',           // For local development
    'http://localhost:3500',           // Sharetribe API server
    'https://your-domain.com'          // Your production domain (if deployed)
  ],
  credentials: true
}));
```

You mentioned you already added `localhost:3000` to allowed origins - perfect! ✅

---

## 🧪 Test Your Setup

### Test 1: Check Backend is Live

Open browser and go to:
```
https://your-render-app.onrender.com/health
```

Should see JSON response. If not, your backend might be sleeping (Render free tier sleeps after inactivity).

### Test 2: Test from Browser Console

```javascript
fetch('https://your-render-app.onrender.com/api/products/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### Test 3: Check Debug Logs

With my updated `productApi.js`, when you try to upload an image, check console for:

```
🔍 [Product API] Calling: https://your-render-app.onrender.com/api/products/analyze
📦 [Product API] Payload type: FormData
🌐 [Product API] Base URL: https://your-render-app.onrender.com/api/products
```

This confirms it's calling the RIGHT URL now!

---

## 🎯 Complete `.env` Example

```bash
# Sharetribe required variables (from .env-template)
REACT_APP_SHARETRIBE_SDK_CLIENT_ID=your-client-id
REACT_APP_SHARETRIBE_SDK_BASE_URL=https://flex-api.sharetribe.com
REACT_APP_MARKETPLACE_ROOT_URL=http://localhost:3000

# Your Render backend
REACT_APP_PRODUCT_API_URL=https://ai-product-backend-abc123.onrender.com/api/products

# If you need other Sharetribe variables, copy from .env-template
```

---

## ⚠️ Common Issues

### Issue 1: Backend Sleeping (Render Free Tier)

**Problem**: First request takes 30+ seconds or times out

**Solution**: Render free tier services sleep after 15 minutes of inactivity. First request wakes them up.

**Fix**: 
- Wait for first request to complete (can take 30-60 seconds)
- Or upgrade to paid Render plan
- Or add a keep-alive ping service

### Issue 2: Still Getting CORS Error

**Problem**: CORS error even after adding localhost:3000

**Checklist**:
- [ ] Restart your Render backend after adding CORS config
- [ ] Verify CORS middleware is BEFORE your routes
- [ ] Check Render logs for startup errors
- [ ] Verify the origin is exactly `http://localhost:3000` (no trailing slash)

### Issue 3: 404 Not Found

**Problem**: Endpoint not found

**Check**:
- [ ] Is your Render URL correct? (Check Render dashboard)
- [ ] Does `/api/products/analyze` exist on your backend?
- [ ] Try accessing `/health` endpoint first to verify backend is up

---

## 🎨 Update `.env-template` for Team

If you want to help your team, update the template:

```bash
# Edit .env-template
nano .env-template
```

Change:
```bash
# FROM:
REACT_APP_PRODUCT_API_URL=http://localhost:3001/api/products

# TO:
# Product Analysis API (hosted on Render)
# Get your URL from: https://dashboard.render.com
REACT_APP_PRODUCT_API_URL=https://your-render-app-name.onrender.com/api/products
```

---

## 🚀 Deployment Tips

### For Production Deployment:

When you deploy your Sharetribe frontend to production:

1. **Update CORS on Render Backend**:
   ```javascript
   app.use(cors({
     origin: [
       'http://localhost:3000',              // Dev
       'https://your-marketplace.com',       // Production frontend
       'https://www.your-marketplace.com'    // www subdomain
     ]
   }));
   ```

2. **Set Production Environment Variable**:
   On your production hosting (Heroku, Vercel, Render, etc.):
   ```bash
   REACT_APP_PRODUCT_API_URL=https://your-render-backend.onrender.com/api/products
   ```

3. **Test HTTPS**:
   Make sure your Render backend URL uses HTTPS (Render provides this automatically)

---

## 📋 Quick Setup Commands

```bash
# Navigate to project
cd "/Users/pietro.limperio/Desktop/Vibe coding projects/web-template-main"

# Create .env file
cat > .env << 'EOF'
# Replace with YOUR actual Render URL!
REACT_APP_PRODUCT_API_URL=https://your-render-app.onrender.com/api/products
EOF

# Edit with your actual URL
nano .env

# Restart frontend
yarn run dev
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `.env` file exists in project root
- [ ] `.env` has `REACT_APP_PRODUCT_API_URL` with YOUR Render URL
- [ ] Render URL uses `https://` (not `http://`)
- [ ] URL ends with `/api/products` (not `/analyze`)
- [ ] Frontend restarted after `.env` change
- [ ] Backend is awake (visit health endpoint)
- [ ] CORS configured on Render for `http://localhost:3000`

---

## 🎉 Expected Result

After fixing the URL, you should see in console:

```
🔍 [Product API] Calling: https://your-render-app.onrender.com/api/products/analyze
📦 [Product API] Payload type: FormData
🌐 [Product API] Base URL: https://your-render-app.onrender.com/api/products
📡 [Product API] Response status: 200 OK
✅ [Product API] Success: {category: "Electronics", ...}
```

No more 404! 🎯

---

## 🆘 Still Having Issues?

Share:
1. Your Render backend URL
2. Browser console logs (the 🔍 📦 messages)
3. Network tab screenshot showing the request
4. Render backend logs

The debug logs I added will show exactly what URL is being called!
