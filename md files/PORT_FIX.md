# 🔧 Port Configuration Fix - ERR_CONNECTION_REFUSED

## Issue Fixed ✅

**Error**: `Failed to load resource: net::ERR_CONNECTION_REFUSED` from `:3006/static/scripts/mapbox/mapbox-sdk.min.js`

**Root Cause**: `.env` file had wrong port (3006 instead of 3000)

---

## The Problem

### What Happened
Your `.env` file was configured with:
```bash
REACT_APP_MARKETPLACE_ROOT_URL=http://localhost:3006
```

But your dev server actually runs on:
- **Frontend**: Port **3000** (React dev server)
- **Backend API**: Port **3500** (Node.js API server)

### Result
When the app tried to load Mapbox SDK:
```
http://localhost:3006/static/scripts/mapbox/mapbox-sdk.min.js
     └──> ❌ Nothing listening on port 3006!
```

The browser couldn't connect → **ERR_CONNECTION_REFUSED**

---

## The Solution

### Fixed `.env` Configuration
```bash
# Before (WRONG):
REACT_APP_MARKETPLACE_ROOT_URL=http://localhost:3006

# After (CORRECT):
REACT_APP_MARKETPLACE_ROOT_URL=http://localhost:3000
```

---

## How to Apply the Fix

### 1. The `.env` file has already been updated! ✅

### 2. Restart Your Dev Server

**Stop the current server** (Ctrl+C in the terminal where it's running)

**Then restart**:
```bash
cd "/Users/pietro.limperio/Desktop/Vibe coding projects/web-template-main"
yarn run dev
```

### 3. Clear Browser Cache (Optional but Recommended)

In Chrome:
- Open DevTools (F12)
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"

Or just:
- Ctrl+Shift+R (Mac: Cmd+Shift+R)

---

## Verification

After restarting, check:

### 1. Browser Console (F12)
**Before Fix** (error):
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
http://localhost:3006/static/scripts/mapbox/mapbox-sdk.min.js
```

**After Fix** (success):
```
✅ Mapbox SDK loaded successfully
```

### 2. Network Tab
Check that Mapbox script loads from the correct port:
```
✅ http://localhost:3000/static/scripts/mapbox/mapbox-sdk.min.js (200 OK)
```

### 3. Map Displays Correctly
If your app uses maps, they should now display without errors.

---

## Your Dev Server Ports

For reference, here's your complete port setup:

| Service | Port | URL |
|---------|------|-----|
| **Frontend** | 3000 | http://localhost:3000 |
| **Backend API** | 3500 | http://localhost:3500 |
| **AI Backend** | Render | https://ai-leaz-models.onrender.com |

### How It Works
```
Browser (http://localhost:3000)
    ↓
Frontend React App (port 3000)
    ↓
├─> Backend API (port 3500) ──> Sharetribe SDK
    ↓
└─> AI Backend (Render) ──> Product API
```

---

## Why Port 3006?

Looking at your `.env`, it seems you had it set to 3006 at some point. This might have been:
- A custom port from another project
- An old configuration
- A typo (3000 + 6 = 3006?)

The **default Sharetribe port is 3000**, so we've reverted to that.

---

## Common Port Issues

### Issue 1: "Port 3000 already in use"
**Solution**: Kill the process using port 3000
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Then restart
yarn run dev
```

### Issue 2: "Cannot GET /static/..."
**Solution**: Make sure the backend server is running (it serves static files)
```bash
# Check that BOTH frontend and backend are running
# You should see output from both when running 'yarn run dev'
```

### Issue 3: Environment Variables Not Updating
**Solution**: Always restart the dev server after changing `.env`
```bash
# Stop server (Ctrl+C)
# Restart
yarn run dev
```

---

## .env Template Reference

For future reference, here are the key port-related settings from `.env-template`:

```bash
# Frontend URL (where React app runs)
REACT_APP_MARKETPLACE_ROOT_URL=http://localhost:3000

# Backend API port (set in dev script)
REACT_APP_DEV_API_SERVER_PORT=3500

# AI Backend (your Render deployment)
REACT_APP_PRODUCT_API_URL=https://ai-leaz-models.onrender.com/api/products
```

---

## Quick Fix Summary

1. ✅ Updated `.env`: Port 3006 → 3000
2. 🔄 **Restart dev server** (required!)
3. 🧹 Clear browser cache (optional)
4. ✨ Mapbox should load correctly now!

---

## Next Steps

1. **Stop your current dev server** (if running)
2. **Restart**: `yarn run dev`
3. **Open**: http://localhost:3000
4. **Check**: Mapbox scripts load without errors

The error should be gone! 🎉
