#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * Validates local development environment setup
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkStatus(condition, message) {
  if (condition) {
    log(`✓ ${message}`, 'green');
    return true;
  } else {
    log(`✗ ${message}`, 'red');
    return false;
  }
}

function checkWarning(condition, message) {
  if (!condition) {
    log(`⚠ ${message}`, 'yellow');
    return false;
  }
  return true;
}

function checkInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

async function checkEnvironment() {
  log('\n🔍 FIRS MBS Environment Check', 'bold');
  log('================================\n');

  let allGood = true;

  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  allGood &= checkStatus(majorVersion >= 18, `Node.js version ${nodeVersion} (requires v18+)`);

  // Check npm
  try {
    const { execSync } = require('child_process');
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    allGood &= checkStatus(true, `npm version ${npmVersion}`);
  } catch (error) {
    allGood &= checkStatus(false, 'npm is installed');
  }

  // Check package.json
  const packageJsonExists = fs.existsSync('package.json');
  allGood &= checkStatus(packageJsonExists, 'package.json exists');

  // Check node_modules
  const nodeModulesExists = fs.existsSync('node_modules');
  checkWarning(nodeModulesExists, 'node_modules directory exists (run npm install if missing)');

  // Check .env file
  const envExists = fs.existsSync('.env');
  allGood &= checkStatus(envExists, '.env file exists');

  if (envExists) {
    const envContent = fs.readFileSync('.env', 'utf8');
    
    // Check DATABASE_URL
    const hasDbUrl = envContent.includes('DATABASE_URL=') && !envContent.includes('your-database-url-here');
    checkWarning(hasDbUrl, 'DATABASE_URL is configured');

    // Check JWT_SECRET
    const hasJwtSecret = envContent.includes('JWT_SECRET=') && !envContent.includes('your-super-secret-jwt-key-change-this-in-production');
    checkWarning(hasJwtSecret, 'JWT_SECRET is configured');

    // Check FIRS_API_KEY
    const hasFirsKey = envContent.includes('FIRS_API_KEY=') && !envContent.includes('your-firs-api-key-here');
    checkWarning(hasFirsKey, 'FIRS_API_KEY is configured');

    // Check NODE_ENV
    const hasNodeEnv = envContent.includes('NODE_ENV=development');
    checkWarning(hasNodeEnv, 'NODE_ENV is set to development');
  }

  // Check TypeScript config
  const tsconfigExists = fs.existsSync('tsconfig.json');
  allGood &= checkStatus(tsconfigExists, 'tsconfig.json exists');

  // Check key directories
  const clientExists = fs.existsSync('client');
  allGood &= checkStatus(clientExists, 'client directory exists');

  const serverExists = fs.existsSync('server');
  allGood &= checkStatus(serverExists, 'server directory exists');

  const sharedExists = fs.existsSync('shared');
  allGood &= checkStatus(sharedExists, 'shared directory exists');

  // Check uploads directory
  const uploadsExists = fs.existsSync('uploads');
  checkWarning(uploadsExists, 'uploads directory exists (created automatically)');

  // Check key files
  const keyFiles = [
    'server/index.ts',
    'server/routes.ts',
    'server/storage.ts',
    'shared/schema.ts',
    'client/src/App.tsx',
    'vite.config.ts'
  ];

  keyFiles.forEach(file => {
    const exists = fs.existsSync(file);
    allGood &= checkStatus(exists, `${file} exists`);
  });

  // Check port availability
  const net = require('net');
  const checkPort = (port) => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  };

  const port5000Available = await checkPort(5000);
  checkWarning(port5000Available, 'Port 5000 is available');

  // Print summary
  log('\n📋 Summary', 'bold');
  log('==========\n');

  if (allGood) {
    log('✅ All core requirements are met!', 'green');
    log('\nNext steps:');
    log('1. Configure your .env file with actual values');
    log('2. Run: npm run dev');
    log('3. Open: http://localhost:5000');
  } else {
    log('❌ Some requirements are missing', 'red');
    log('\nPlease fix the issues above and run this check again.');
  }

  log('\n🔧 Quick fixes:', 'bold');
  log('- Missing dependencies: npm install');
  log('- Missing .env: cp .env.example .env');
  log('- Missing uploads: mkdir uploads');
  log('- Port in use: lsof -ti:5000 | xargs kill -9');

  log('\n📚 Documentation:');
  log('- Setup guide: LOCAL-SETUP.md');
  log('- Docker guide: DOCKER-README.md');
  log('- Run setup script: ./setup-local.sh');

  return allGood;
}

// Run the check
checkEnvironment().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Environment check failed:', error);
  process.exit(1);
});