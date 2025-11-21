const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'logo.png');
const outputPath = path.join(__dirname, 'public', 'logo-compressed.png');
const backupPath = path.join(__dirname, 'public', 'logo-original.png');

async function compressLogo() {
  try {
    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSize = (originalStats.size / 1024).toFixed(2);
    console.log(`Original logo size: ${originalSize} KB`);

    // Create backup
    fs.copyFileSync(inputPath, backupPath);
    console.log('✓ Backup created: logo-original.png');

    // Compress and resize logo
    // Create 512x512 version (for PWA)
    await sharp(inputPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({
        quality: 85,
        compressionLevel: 9,
        adaptiveFiltering: true
      })
      .toFile(outputPath);

    // Get compressed file size
    const compressedStats = fs.statSync(outputPath);
    const compressedSize = (compressedStats.size / 1024).toFixed(2);
    const reduction = ((1 - compressedStats.size / originalStats.size) * 100).toFixed(1);

    console.log(`Compressed logo size: ${compressedSize} KB`);
    console.log(`Size reduction: ${reduction}%`);

    // Replace original with compressed version
    fs.copyFileSync(outputPath, inputPath);
    console.log('✓ Logo compressed and replaced');

    // Also create 192x192 version for PWA
    const icon192Path = path.join(__dirname, 'public', 'icon-192.png');
    await sharp(inputPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({
        quality: 85,
        compressionLevel: 9
      })
      .toFile(icon192Path);

    console.log('✓ Created icon-192.png for PWA');

    console.log('\n✅ Logo compression complete!');
    console.log(`Original: ${originalSize} KB → Compressed: ${compressedSize} KB`);

  } catch (error) {
    console.error('Error compressing logo:', error);
    process.exit(1);
  }
}

compressLogo();

