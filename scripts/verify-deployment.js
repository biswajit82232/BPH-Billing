#!/usr/bin/env node

/**
 * Pre-Deployment Verification Script
 * Checks all requirements before deploying to production
 */

import { existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

let errors = []
let warnings = []

console.log('🔍 Running pre-deployment verification...\n')

// Check 1: Environment file
console.log('1️⃣  Checking environment configuration...')
const envLocalPath = join(rootDir, '.env.local')
if (!existsSync(envLocalPath)) {
  errors.push('❌ .env.local file not found!')
  console.log('   ⚠️  Create .env.local from ENV_EXAMPLE.txt')
} else {
  const envContent = readFileSync(envLocalPath, 'utf-8')
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_DATABASE_URL',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID'
  ]
  
  requiredVars.forEach(varName => {
    if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your_`) || envContent.includes(`${varName}=your-`)) {
      errors.push(`❌ ${varName} not configured properly in .env.local`)
    }
  })
  
  if (!errors.some(e => e.includes('VITE_FIREBASE'))) {
    console.log('   ✅ Environment variables configured')
  }
}

// Check 2: Firebase config
console.log('\n2️⃣  Checking Firebase configuration...')
const firebaseJsonPath = join(rootDir, 'firebase.json')
if (!existsSync(firebaseJsonPath)) {
  errors.push('❌ firebase.json not found!')
} else {
  console.log('   ✅ firebase.json exists')
}

const firebaseRulesPath = join(rootDir, 'firebase.rules.json')
if (!existsSync(firebaseRulesPath)) {
  errors.push('❌ firebase.rules.json not found!')
} else {
  console.log('   ✅ firebase.rules.json exists')
}

// Check 3: Build output
console.log('\n3️⃣  Checking build output...')
const distPath = join(rootDir, 'dist')
if (!existsSync(distPath)) {
  warnings.push('⚠️  dist/ folder not found. Run "npm run build" first.')
  console.log('   ⚠️  Run "npm run build" before deploying')
} else {
  const indexHtml = join(distPath, 'index.html')
  if (!existsSync(indexHtml)) {
    errors.push('❌ dist/index.html not found. Build may have failed.')
  } else {
    console.log('   ✅ Build output exists')
  }
}

// Check 4: Package.json scripts
console.log('\n4️⃣  Checking package.json scripts...')
const packageJsonPath = join(rootDir, 'package.json')
if (existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  const requiredScripts = ['build', 'deploy']
  
  requiredScripts.forEach(script => {
    if (!packageJson.scripts[script]) {
      errors.push(`❌ Missing script: "npm run ${script}"`)
    }
  })
  
  if (!errors.some(e => e.includes('Missing script'))) {
    console.log('   ✅ Required scripts present')
  }
}

// Check 5: Git ignore
console.log('\n5️⃣  Checking security (gitignore)...')
const gitignorePath = join(rootDir, '.gitignore')
if (existsSync(gitignorePath)) {
  const gitignoreContent = readFileSync(gitignorePath, 'utf-8')
  const sensitiveFiles = ['.env.local', 'src/config/firebaseConfig.js']
  
  sensitiveFiles.forEach(file => {
    if (!gitignoreContent.includes(file)) {
      warnings.push(`⚠️  ${file} should be in .gitignore`)
    }
  })
  
  if (!warnings.some(w => w.includes('.gitignore'))) {
    console.log('   ✅ Sensitive files in .gitignore')
  }
}

// Check 6: Node modules
console.log('\n6️⃣  Checking dependencies...')
const nodeModulesPath = join(rootDir, 'node_modules')
if (!existsSync(nodeModulesPath)) {
  warnings.push('⚠️  node_modules not found. Run "npm install" first.')
  console.log('   ⚠️  Run "npm install" to install dependencies')
} else {
  console.log('   ✅ Dependencies installed')
}

// Summary
console.log('\n' + '='.repeat(50))
console.log('📊 VERIFICATION SUMMARY\n')

if (errors.length > 0) {
  console.log('❌ ERRORS (must fix before deployment):')
  errors.forEach(error => console.log(`   ${error}`))
  console.log('')
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:')
  warnings.forEach(warning => console.log(`   ${warning}`))
  console.log('')
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Ready for deployment.\n')
  console.log('Next steps:')
  console.log('   1. npm run build')
  console.log('   2. npm run preview  (test locally)')
  console.log('   3. npm run deploy   (deploy to Firebase)')
  process.exit(0)
} else if (errors.length === 0) {
  console.log('✅ Ready for deployment (with warnings)\n')
  console.log('Next steps:')
  console.log('   1. npm run build')
  console.log('   2. npm run preview  (test locally)')
  console.log('   3. npm run deploy   (deploy to Firebase)')
  process.exit(0)
} else {
  console.log('❌ Fix errors before deploying!\n')
  process.exit(1)
}

