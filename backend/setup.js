const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const ADMIN_USERNAME = 'mohammed_asif';
const ADMIN_PASSWORD = 'Asif@2025#Admin!';

async function setup() {
    console.log('\n🔧 Setting up admin credentials...\n');

    const client = new MongoClient('mongodb://localhost:27017');
    try {
        const db = client.db('portfolio_admin');
        const admins = db.collection('admins');

        const existing = await admins.findOne({ username: ADMIN_USERNAME });

        if (existing) {
            const match = await bcrypt.compare(ADMIN_PASSWORD, existing.password);
            if (match) {
                console.log('✅ Admin user already exists. No changes needed.');
            } else {
                const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
                await admins.updateOne(
                    { username: ADMIN_USERNAME },
                    { $set: { password: hashed, updatedAt: new Date().toISOString() } }
                );
                console.log('✅ Admin password updated successfully.');
            }
        } else {
            const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
            await admins.insertOne({
                username: ADMIN_USERNAME,
                password: hashed,
                role: 'super_admin',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log('✅ Admin user created successfully.');
        }

        console.log(`\n  📝 Username: ${ADMIN_USERNAME}`);
        console.log(`  🔑 Password: ${ADMIN_PASSWORD}`);
        console.log('  🗄️ Stored as bcrypt hash in MongoDB\n');
        console.log('  ⚠️  DELETE the password from this file after setup!\n');

    } catch (err) {
        console.error('❌ Setup failed:', err.message);
        console.error('Make sure MongoDB is running on localhost:27017');
    } finally {
        await client.close();
    }
}

setup();
