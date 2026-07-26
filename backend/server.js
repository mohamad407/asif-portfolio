require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const ADMIN_DIR = path.join(FRONTEND_DIR, 'admin');

// ─── MONGODB CONNECTION (never hardcoded) ──────────────────
// Get a free connection string from MongoDB Atlas (M0 cluster):
// https://www.mongodb.com/cloud/atlas — then set MONGODB_URI in
// backend/.env locally, or in your host's environment variables
// (Render → Environment tab) in production.
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'portfolio_db';

if (!MONGODB_URI || !MONGODB_URI.trim()) {
    console.error('\n❌ MONGODB_URI is not set.');
    console.error('   Add it to backend/.env (copy from .env.example), or set it as an');
    console.error('   environment variable on your host (e.g. Render → Environment tab).');
    console.error('   Get a free connection string from MongoDB Atlas:');
    console.error('   https://www.mongodb.com/cloud/atlas\n');
    process.exit(1);
}

let mongoClient;
let portfolioCol, adminsCol, configCol;

async function connectDB() {
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);
    portfolioCol = db.collection('portfolio');
    adminsCol = db.collection('admins');
    configCol = db.collection('config');
    console.log('✅ Connected to MongoDB Atlas');
}

// ─── JWT SECRET (never hardcoded) ──────────────────────────
// Uses JWT_SECRET from env if provided. Otherwise, a random secret
// is generated once and persisted in the "config" collection in
// MongoDB — so it survives redeploys/restarts even on hosts with
// no persistent disk (like Render's free tier).
let JWT_SECRET;
async function getJwtSecret() {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
        return process.env.JWT_SECRET.trim();
    }
    const existing = await configCol.findOne({ _id: 'jwt_secret' });
    if (existing && existing.value) return existing.value;
    const generated = crypto.randomBytes(48).toString('hex');
    await configCol.updateOne(
        { _id: 'jwt_secret' },
        { $set: { value: generated } },
        { upsert: true }
    );
    return generated;
}

// ─── ADMIN CREDENTIALS (never hardcoded) ───────────────────
// On first boot, if no admin account exists in MongoDB yet, one is
// created from ADMIN_USERNAME / ADMIN_PASSWORD in env. If those
// aren't set, a random secure password is generated and printed
// once to the console. After that, the dashboard's own "Change
// Password" screen is the source of truth — it persists in
// MongoDB, so it survives redeploys.
async function seedAdminIfNeeded() {
    const existing = await adminsCol.findOne({});
    if (existing) return; // already set up — never overwrite an existing account here

    let username = (process.env.ADMIN_USERNAME || '').trim() || 'admin';
    let password = (process.env.ADMIN_PASSWORD || '').trim();
    let generated = false;
    if (!password) {
        password = crypto.randomBytes(9).toString('base64url');
        generated = true;
    }

    const hashed = await bcrypt.hash(password, 12);
    await adminsCol.insertOne({
        username,
        password: hashed,
        role: 'super_admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    if (generated) {
        console.log('\n🔐 No admin credentials were found — a new admin account was created:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log('   (Not saved anywhere but this log — change it from the dashboard right after logging in.)\n');
    } else {
        console.log(`\n🔐 Admin account created from env — username: ${username}\n`);
    }
}

// ─── PORTFOLIO DATA ─────────────────────────────────────────
async function readData() {
    const doc = await portfolioCol.findOne({ _id: 'singleton' });
    if (!doc) return await getDefaults();
    delete doc._id;
    return doc;
}

async function writeData(data) {
    await portfolioCol.updateOne({ _id: 'singleton' }, { $set: data }, { upsert: true });
    return data;
}

async function getDefaults() {
    const defaults = {
        about: {
            subtitle: 'Full Stack & AI Developer',
            tags: ['React', 'Node.js', 'MongoDB', 'LangChain', 'RAG', 'Gemini AI'],
            text1: 'I am a passionate <span class="text-white font-normal">Full Stack & AI Developer</span> specializing in modern web applications, AI chatbots, <span class="text-white font-normal">Retrieval-Augmented Generation (RAG)</span>, Vector Databases, and scalable cloud-based solutions. I enjoy building innovative products that solve real-world problems.',
            text2: 'With expertise spanning the entire development stack — from crafting pixel-perfect frontends to architecting intelligent AI backends — I bring ideas to life with clean code and thoughtful design.',
            stats: [
                { id: uuidv4(), value: '20+', label: 'Projects' },
                { id: uuidv4(), value: '14+', label: 'Technologies' },
                { id: uuidv4(), value: 'AI/ML', label: 'Specialization' }
            ]
        },
        skills: [
            { id: uuidv4(), name: 'HTML5', icon: 'logos:html-5', type: 'img' },
            { id: uuidv4(), name: 'CSS3', icon: 'logos:css-3', type: 'img' },
            { id: uuidv4(), name: 'JavaScript', icon: 'logos:javascript', type: 'img' },
            { id: uuidv4(), name: 'React.js', icon: 'logos:react', type: 'img' },
            { id: uuidv4(), name: 'Node.js', icon: 'logos:nodejs-icon', type: 'img' },
            { id: uuidv4(), name: 'Express.js', icon: 'simple-icons:express', type: 'icon', color: 'rgba(255,255,255,0.65)' },
            { id: uuidv4(), name: 'MongoDB', icon: 'logos:mongodb-icon', type: 'img' },
            { id: uuidv4(), name: 'Firebase', icon: 'logos:firebase', type: 'img' },
            { id: uuidv4(), name: 'Cloudinary', icon: 'logos:cloudinary-icon', type: 'img' },
            { id: uuidv4(), name: 'Git & GitHub', icon: 'logos:git-icon', type: 'img' },
            { id: uuidv4(), name: 'LangChain', icon: 'simple-icons:langchain', type: 'icon', color: 'rgba(255,255,255,0.65)' },
            { id: uuidv4(), name: 'Vector DBs', icon: 'lucide:database', type: 'icon', color: 'rgba(255,255,255,0.65)' },
            { id: uuidv4(), name: 'RAG', icon: 'lucide:brain-circuit', type: 'icon', color: 'rgba(255,255,255,0.65)' },
            { id: uuidv4(), name: 'Gemini AI', icon: 'logos:google-gemini', type: 'img' }
        ],
        projects: [
            { id: uuidv4(), title: 'AI Document Chatbot', category: 'AI / NLP', description: 'Intelligent chatbot answering questions from uploaded documents using RAG architecture with vector similarity search.', tags: ['LangChain', 'RAG', 'Vector DB', 'Gemini AI'], image: 'https://picsum.photos/seed/ai-doc-chatbot-final/800/500.jpg', wide: false },
            { id: uuidv4(), title: 'VMart Marketplace', category: 'Full Stack', description: 'Full-featured MERN stack marketplace for students to buy, sell, and trade products within their campus community.', tags: ['React', 'Node.js', 'MongoDB', 'Express'], image: 'https://picsum.photos/seed/vmart-final/800/500.jpg', wide: false },
            { id: uuidv4(), title: 'AI Resume Analyzer', category: 'AI / SaaS', description: 'AI-powered tool that analyzes resumes, provides scoring, suggests improvements, and matches with job descriptions.', tags: ['React', 'Node.js', 'Gemini AI'], image: 'https://picsum.photos/seed/ai-resume-final/800/500.jpg', wide: false },
            { id: uuidv4(), title: 'Dental Clinic Website', category: 'Web Design', description: 'Modern responsive business website featuring appointment booking, service showcase, and patient testimonials.', tags: ['HTML5', 'CSS3', 'JavaScript', 'Responsive'], image: 'https://picsum.photos/seed/dental-final/800/500.jpg', wide: false },
            { id: uuidv4(), title: 'Spotify Clone', category: 'Frontend', description: 'Pixel-perfect Spotify clone with real-time API integration, music player, playlist management, and responsive design.', tags: ['React', 'API', 'Tailwind CSS'], image: 'https://picsum.photos/seed/spotify-final/800/600.jpg', wide: true }
        ],
        experience: [
            { id: uuidv4(), label: 'Ongoing', title: 'Full Stack Development', description: 'Building production-ready web applications with React, Node.js, and MongoDB. Focused on clean architecture, scalable solutions, and exceptional user experiences.', side: 'left' },
            { id: uuidv4(), label: 'Recent Focus', title: 'AI Development', description: 'Specializing in LangChain, RAG pipelines, Vector Databases, and Gemini AI integration. Building intelligent chatbots and AI-powered SaaS products.', side: 'right' },
            { id: uuidv4(), label: 'Parallel', title: 'Freelance Projects', description: 'Delivered custom websites and web applications for clients including business sites, e-commerce platforms, and specialized tools with timely delivery.', side: 'left' },
            { id: uuidv4(), label: 'Continuous', title: 'Personal Projects', description: 'Continuously building and open-sourcing projects to explore new technologies, sharpen skills, and contribute to the developer community.', side: 'right' }
        ],
        stats: [
            { id: uuidv4(), value: 20, label: 'Projects Completed' },
            { id: uuidv4(), value: 14, label: 'Technologies Learned' },
            { id: uuidv4(), value: 500, label: 'GitHub Contributions' },
            { id: uuidv4(), value: 10, label: 'Happy Clients' }
        ],
        contact: [
            { id: uuidv4(), icon: 'lucide:mail', label: 'Email', value: 'asihfibrahim600@gmail.com', href: 'mailto:asihfibrahim600@gmail.com', isWhatsApp: false },
            { id: uuidv4(), icon: 'logos:whatsapp-icon', label: 'WhatsApp', value: '+91 96779 88241', href: 'https://wa.me/919677988241', isWhatsApp: true },
            { id: uuidv4(), icon: 'lucide:linkedin', label: 'LinkedIn', value: 'mohamad-asif', href: 'https://www.linkedin.com/in/mohamad-asif', isWhatsApp: false },
            { id: uuidv4(), icon: 'lucide:github', label: 'GitHub', value: 'mohammed-asif', href: 'https://github.com/mohammed-asif', isWhatsApp: false }
        ]
    };
    await writeData(defaults);
    return defaults;
}

// ─── MIDDLEWARE ─────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/admin', (req, res) => {
    res.sendFile(path.join(ADMIN_DIR, 'admin.html'));
});
app.use(express.static(FRONTEND_DIR));
app.use('/admin', express.static(ADMIN_DIR));

// ─── JWT (self-contained, no external dep) ─────────────────
function base64url(input) {
    return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function generateToken(payload) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) }));
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${header}.${body}.${signature}`;
}
function verifyToken(tokenStr) {
    try {
        const [header, body, signature] = tokenStr.split('.');
        const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64')
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        if (expected !== signature) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64').toString('utf-8'));
        if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
        return payload;
    } catch {
        return null;
    }
}

// ─── Auth Middleware ────────────────────────────────────────
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Token expired or invalid. Please login again.' });
    }
    req.admin = decoded;
    next();
}

// ─── Login Rate Limiting ────────────────────────────────────
const loginAttempts = new Map();
function rateLimitLogin(req, res, next) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const limit = 5;
    const windowMs = 15 * 60 * 1000;
    if (!loginAttempts.has(ip)) loginAttempts.set(ip, { count: 0, lastAttempt: 0 });
    const record = loginAttempts.get(ip);
    if (now - record.lastAttempt > windowMs) {
        record.count = 0;
        record.lastAttempt = now;
    }
    if (record.count >= limit) {
        return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
    }
    next();
}

// ─── AUTH ROUTES ─────────────────────────────────────────────
app.post('/api/admin/login', rateLimitLogin, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const admin = await adminsCol.findOne({ username });
        if (!admin) {
            const ip = req.ip || 'unknown';
            const r = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
            r.count++; r.lastAttempt = Date.now(); loginAttempts.set(ip, r);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            const ip = req.ip || 'unknown';
            const r = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
            r.count++; r.lastAttempt = Date.now(); loginAttempts.set(ip, r);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = generateToken({ username: admin.username, role: admin.role });
        res.json({ success: true, token, username: admin.username });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Both passwords are required.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    try {
        const admin = await adminsCol.findOne({ username: req.admin.username });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });
        const hashed = await bcrypt.hash(newPassword, 12);
        await adminsCol.updateOne(
            { username: admin.username },
            { $set: { password: hashed, updatedAt: new Date().toISOString() } }
        );
        const token = generateToken({ username: admin.username, role: admin.role });
        res.json({ success: true, message: 'Password changed successfully.', token });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/change-username', authMiddleware, async (req, res) => {
    const { newUsername, currentPassword } = req.body;
    if (!newUsername || !currentPassword) {
        return res.status(400).json({ error: 'New username and current password are required.' });
    }
    try {
        const admin = await adminsCol.findOne({ username: req.admin.username });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect.' });
        const cleanUsername = newUsername.trim();
        await adminsCol.updateOne(
            { username: admin.username },
            { $set: { username: cleanUsername, updatedAt: new Date().toISOString() } }
        );
        const token = generateToken({ username: cleanUsername, role: admin.role });
        res.json({ success: true, message: 'Username changed successfully.', token, username: cleanUsername });
    } catch (err) {
        console.error('Change username error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/admin/verify', authMiddleware, (req, res) => {
    res.json({ valid: true, username: req.admin.username });
});

app.post('/api/admin/logout', authMiddleware, (req, res) => {
    res.json({ success: true, message: 'Logged out.' });
});

// ── Get ALL portfolio data ──
app.get('/api/portfolio', async (req, res) => {
    try { res.json(await readData()); }
    catch (err) { console.error(err); res.status(500).json({ error: 'Failed to read portfolio data' }); }
});

// ── ABOUT ──
app.put('/api/about', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        d.about = { ...d.about, ...req.body };
        await writeData(d);
        res.json({ success: true, about: d.about });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update about' }); }
});

// ── SKILLS ──
app.get('/api/skills', async (req, res) => { res.json((await readData()).skills); });
app.post('/api/skills', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        const s = { id: uuidv4(), ...req.body };
        d.skills.push(s);
        await writeData(d);
        res.json({ success: true, skill: s });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to add skill' }); }
});
app.put('/api/skills/:id', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        const i = d.skills.findIndex(s => s.id === req.params.id);
        if (i === -1) return res.status(404).json({ error: 'Skill not found' });
        d.skills[i] = { ...d.skills[i], ...req.body, id: req.params.id };
        await writeData(d);
        res.json({ success: true, skill: d.skills[i] });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update skill' }); }
});
app.delete('/api/skills/:id', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        d.skills = d.skills.filter(s => s.id !== req.params.id);
        await writeData(d);
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete skill' }); }
});

// ── PROJECTS ──
app.post('/api/projects', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        const p = { id: uuidv4(), ...req.body };
        d.projects.push(p);
        await writeData(d);
        res.json({ success: true, project: p });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to add project' }); }
});
app.put('/api/projects/:id', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        const i = d.projects.findIndex(p => p.id === req.params.id);
        if (i === -1) return res.status(404).json({ error: 'Project not found' });
        d.projects[i] = { ...d.projects[i], ...req.body, id: req.params.id };
        await writeData(d);
        res.json({ success: true, project: d.projects[i] });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update project' }); }
});
app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        d.projects = d.projects.filter(p => p.id !== req.params.id);
        await writeData(d);
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete project' }); }
});

// ── EXPERIENCE ──
app.post('/api/experience', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        const e = { id: uuidv4(), ...req.body };
        d.experience.push(e);
        await writeData(d);
        res.json({ success: true, experience: e });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to add experience' }); }
});
app.put('/api/experience/:id', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        const i = d.experience.findIndex(e => e.id === req.params.id);
        if (i === -1) return res.status(404).json({ error: 'Experience not found' });
        d.experience[i] = { ...d.experience[i], ...req.body, id: req.params.id };
        await writeData(d);
        res.json({ success: true, experience: d.experience[i] });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update experience' }); }
});
app.delete('/api/experience/:id', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        d.experience = d.experience.filter(e => e.id !== req.params.id);
        await writeData(d);
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete experience' }); }
});

// ── STATS ──
app.put('/api/stats', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        d.stats = req.body;
        await writeData(d);
        res.json({ success: true, stats: d.stats });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update stats' }); }
});

// ── CONTACT ──
app.post('/api/contact', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        const c = { id: uuidv4(), ...req.body };
        d.contact.push(c);
        await writeData(d);
        res.json({ success: true, contact: c });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to add contact' }); }
});
app.put('/api/contact/:id', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        const i = d.contact.findIndex(c => c.id === req.params.id);
        if (i === -1) return res.status(404).json({ error: 'Contact not found' });
        d.contact[i] = { ...d.contact[i], ...req.body, id: req.params.id };
        await writeData(d);
        res.json({ success: true, contact: d.contact[i] });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update contact' }); }
});
app.delete('/api/contact/:id', authMiddleware, async (req, res) => {
    try {
        const d = await readData();
        d.contact = d.contact.filter(c => c.id !== req.params.id);
        await writeData(d);
        res.json({ success: true });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to delete contact' }); }
});

// ── RESET ──
app.post('/api/reset', authMiddleware, async (req, res) => {
    try { await getDefaults(); res.json({ success: true, message: 'Portfolio reset to defaults' }); }
    catch (e) { console.error(e); res.status(500).json({ error: 'Reset failed' }); }
});

// ─── START SERVER ─────────────────────────────────────────────
connectDB()
    .then(async () => {
        JWT_SECRET = await getJwtSecret();
        await seedAdminIfNeeded();
        app.listen(PORT, () => {
            console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║   Mohammed Asif Portfolio Server                       ║
  ╠═══════════════════════════════════════════════════════╣
  ║   Portfolio:  http://localhost:${PORT}                     ║
  ║   Admin:      http://localhost:${PORT}/admin               ║
  ║   API:        http://localhost:${PORT}/api/portfolio       ║
  ║   Storage:    MongoDB Atlas                            ║
  ╚═══════════════════════════════════════════════════════╝
            `);
        });
    })
    .catch(err => {
        console.error('❌ Failed to connect to MongoDB or start server:', err.message);
        console.error('   Double-check MONGODB_URI and that your Atlas cluster allows');
        console.error('   connections from your current network (or 0.0.0.0/0 for hosts');
        console.error('   like Render whose outbound IP isn\'t fixed on the free plan).');
        process.exit(1);
    });
