// Run with: npm run reset-admin
//
// Force-resets the admin account in MongoDB — use this if you're
// locked out and forgot the password set from the dashboard.
// Nothing here is hardcoded: it reads MONGODB_URI, ADMIN_USERNAME,
// and ADMIN_PASSWORD from your .env file. If they aren't set, it
// will refuse to run.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function main() {
    const MONGODB_URI = process.env.MONGODB_URI;
    const DB_NAME = process.env.MONGODB_DB_NAME || 'portfolio_db';
    const username = process.env.ADMIN_USERNAME && process.env.ADMIN_USERNAME.trim();
    const password = process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim();

    if (!MONGODB_URI) {
        console.error('\n❌ MONGODB_URI must be set in backend/.env before running this.\n');
        process.exit(1);
    }
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

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const admins = client.db(DB_NAME).collection('admins');

    const hashed = await bcrypt.hash(password, 12);
    await admins.deleteMany({});
    await admins.insertOne({
        username,
        password: hashed,
        role: 'super_admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    await client.close();

    console.log('\n✅ Admin account reset in MongoDB');
    console.log(`   Username: ${username}`);
    console.log('   Password: (the one in your .env — not printed here for safety)');
    console.log('\n   ⚠️  Consider removing ADMIN_PASSWORD from .env once you\'ve logged in,');
    console.log('       and set a fresh password from the dashboard\'s Change Password screen.\n');
}

main().catch(err => {
    console.error('❌ Failed to reset admin:', err.message);
    process.exit(1);
});
