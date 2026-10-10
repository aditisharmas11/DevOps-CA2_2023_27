

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('ZenGen Database Initialization');
console.log('==============================');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found. Please create it first.');
  process.exit(1);
}

// Read .env file to check for DATABASE_URL
const envContent = fs.readFileSync(envPath, 'utf-8');
if (!envContent.includes('DATABASE_URL=')) {
  console.error('Error: DATABASE_URL not found in .env file.');
  process.exit(1);
}

console.log('Initializing database schema...');
try {
  // Run Drizzle push command to update database schema
  execSync('npx drizzle-kit push', { stdio: 'inherit' });

  console.log('\n Database initialization complete!');
  console.log('\nYou can now start the application with:');
  console.log('- npm run dev');
  console.log('- Or using the VS Code launch configuration');
  console.log('- Or running ./start-app.sh (Unix/Mac) or start-app.bat (Windows)');
} catch (error) {
  console.error('Error initializing database:', error.message);
  process.exit(1);
}