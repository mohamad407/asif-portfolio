// Run with: npm run reset-admin
//
// Force-resets the admin account from backend/.env — use this if
// you're locked out and forgot the password set from the dashboard.
// Nothing here is hardcoded: it reads ADMIN_USERNAME / ADMIN_PASSWORD
// from your .env file. If they aren't set, it will refuse to run.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

async function main() {
    const username = process.env.ADMIN_USERNAME && process.env.ADMIN_USERNAME.trim();
    const password = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim();

    if (!username || !password) {
        console.error('\n❌ ADMIN_USERNAME and ADMIN_PASSWORD must be set in backend/.env before running this.\n');
        console.error('   Copy .env.example to .env, fill in your own values, then re-run:\n');
        console.error('     npm run reset-admin\n');
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('\n❌ ADMIN_PASSWORD must be at least 8 characters.\n');
        process.exit(1);
    }

    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const hashed = await bcrypt.hash(password, 12);
    fs.writeFileSync(ADMIN_FILE, JSON.stringify({
        username,
        password: hashed,
        role: 'super_admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');

    console.log('\n✅ Admin account reset from backend/.env');
    console.log(`   Username: ${username}`);
    console.log('   Password: (the one in your .env — not printed here for safety)');
    console.log('\n   ⚠️  Consider removing ADMIN_PASSWORD from .env once you\'ve logged in,');
    console.log('       and set a fresh password from the dashboard\'s Change Password screen.\n');
}

main();
