# PWA Icons Setup

## Required Icons

To complete the PWA setup, you need to create the following icon files:

### 1. icon-192.png
- Size: 192x192 pixels
- Format: PNG
- Purpose: Standard app icon for Android/Chrome
- Design: Use your BPH logo with the brand colors (#0072CE)

### 2. icon-512.png
- Size: 512x512 pixels
- Format: PNG
- Purpose: High-resolution app icon
- Design: Same as icon-192.png but larger

### 3. screenshot-desktop.png (Optional but recommended)
- Size: 1280x720 pixels
- Format: PNG
- Purpose: Shows app preview in browser install prompts
- Content: Screenshot of the dashboard or main interface

### 4. screenshot-mobile.png (Optional but recommended)
- Size: 750x1334 pixels
- Format: PNG
- Purpose: Shows mobile app preview
- Content: Mobile view screenshot of the app

## How to Create Icons

### Option 1: Using Design Tools
1. Open your logo in Figma, Photoshop, or Canva
2. Export as PNG with transparent background
3. Ensure the logo takes up 80% of the canvas (leave padding)
4. Save as icon-192.png and icon-512.png

### Option 2: Using Online Tools
- Use https://www.pwabuilder.com/ to generate all icons from one image
- Upload your logo
- Download the generated icon pack
- Place files in the /public folder

### Option 3: Temporary Placeholders
Until you create proper icons, you can:
1. Copy logo.svg to icon-192.png and icon-512.png
2. Convert SVG to PNG using online converters
3. The app will work but install experience won't be optimal

## Verification

After adding icons, test your PWA:
1. Run `npm run build`
2. Run `npm run preview`
3. Open Chrome DevTools > Application > Manifest
4. Check that all icons load correctly
5. Try installing the app

## Current Status

⚠️ Icons are referenced but not yet created.
📝 Create these files and place them in the /public folder.
✅ All other PWA setup is complete!

