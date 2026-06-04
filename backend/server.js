const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'portfolio.json');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'portfolio_admin';
let db = null;
let adminsCollection = null;

async function connectDB() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    adminsCollection = db.collection('admins');
    console.log('✅ Connected to MongoDB');
    return client;
}

connectDB().then(() => {
    app.listen(PORT, startServer);
}).catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('Make sure MongoDB is running: mongod');
    process.exit(1);
});

app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

function readData() {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error reading data file:', err.message);
        return getDefaults();
    }
}

function writeData(data) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return data;
}

function getDefaults() {
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
            { id: uuidv4(), title: 'AI Resume Analyzer', category: 'AI / SaaS', description: 'AI-powered tool that analyzes resumes, provides scoring, suggests improvements, and matches with job descriptions.', tags: ['React', 'Node.js', 'Gemini AI'], image: 'https://picsum/seed/ai-resume-final/800/500.jpg', wide: false },
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
    writeData(defaults);
    return defaults;
}

if (!fs.existsSync(DATA_FILE)) {
    console.log('📄 No data file found. Creating default portfolio.json...');
    getDefaults();
}

// ─── JWT Token ────────────────────────────────────────────────
const jwt = require('crypto');
function generateToken(payload) {
    return jwt.sign(
        { ...payload, exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) },
        'your-super-secret-jwt-key-change-in-production'
    );
}
function verifyToken(tokenStr) {
    try {
        return jwt.verify(tokenStr, 'your-super-secret-jwt-key-change-in-production');
    } catch {
        return null;
    }
}

// ─── Auth Middleware ──────────────────────────────────────
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

// ─── Login Rate Limiting ──────────────────────────────────
const loginAttempts = new Map();
function rateLimitLogin(req, res, next) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const limit = 5;
    const windowMs = 15 * 60 * 1000;
    if (!loginAttempts.has(ip)) {
        loginAttempts.set(ip, { count: 0, lastAttempt: 0 });
    }
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

// ─── API Routes ──────────────────────────────────────────

app.post('/api/admin/login', rateLimitLogin, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const admin = await adminsCollection.findOne({ username });
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            const ip = req.ip || 'unknown';
            const r = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
            r.count++;
            r.lastAttempt = Date.now();
            loginAttempts.set(ip, r);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = generateToken({
            id: admin._id.toString(),
            username: admin.username,
            role: admin.role
        });
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
        const admin = await adminsCollection.findOne({ _id: req.admin.id });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }
        const hashed = await bcrypt.hash(newPassword, 12);
        await adminsCollection.updateOne(
            { _id: req.admin.id },
            { $set: { password: hashed, updatedAt: new Date().toISOString() } }
        );
        const token = generateToken({ id: admin._id.toString(), username: admin.username, role: admin.role });
        res.json({ success: true, message: 'Password changed successfully.', token });
    } catch (err) {
        console.error('Change password error:', err);
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
app.get('/api/portfolio', (req, res) => {
    try { res.json(readData()); }
    catch (err) { res.status(500).json({ error: 'Failed to read portfolio data' }); }
});

// ── ABOUT ──
app.put('/api/about', authMiddleware, (req, res) => { try { const d = readData(); d.about = { ...d.about, ...req.body }; writeData(d); res.json({ success: true, about: d.about }); } catch(e) { res.status(500).json({error:'Failed to update about'}); }});

// ── SKILLS ──
app.get('/api/skills', (req, res) => { res.json(readData().skills); });
app.post('/api/skills', authMiddleware, (req, res) => { try { const d = readData(); const s = { id: uuidv4(), ...req.body }; d.skills.push(s); writeData(d); res.json({ success: true, skill: s }); } catch(e) { res.status(500).json({error:'Failed to add skill'}); }});
app.put('/api/skills/:id', authMiddleware, (req, res) => { try { const d = readData(); const i = d.skills.findIndex(s => s.id === req.params.id); if (i === -1) return res.status(404).json({ error: 'Skill not found' }); d.skills[i] = { ...d.skills[i], ...req.body, id: req.params.id }; writeData(d); res.json({ success: true, skill: d.skills[i] }); } catch(e) { res.status(500).json({error:'Failed to update skill'}); }});
app.delete('/api/skills/:id', authMiddleware, (req, res) => { try { const d = readData(); d.skills = d.skills.filter(s => s.id !== req.params.id); writeData(d); res.json({ success: true }); } catch(e) { res.status(500).json({error:'Failed to delete skill'}); }});

// ── PROJECTS ──
app.post('/api/projects', authMiddleware, (req, res) => { try { const d = readData(); const p = { id: uuidv4(), ...req.body }; d.projects.push(p); writeData(d); res.json({ success: true, project: p }); } catch(e) { res.status(500).json({error:'Failed to add project'}); }});
app.put('/api/projects/:id', authMiddleware, (req, res) => { try { const d = readData(); const i = d.projects.findIndex(p => p.id === req.params.id); if (i === -1) return res.status(404).json({ error: 'Project not found' }); d.projects[i] = { ...d.projects[i], ...req.body, id: req.params.id }; writeData(d); res.json({ success: true, project: d.projects[i] }); } catch(e) { res.status(500).json({error:'Failed to update project'}); }});
app.delete('/api/projects/:id', authMiddleware, (req, res) => { try { const d = readData(); d.projects = d.projects.filter(p => p.id !== req.params.id); writeData(d); res.json({ success: true }); } catch(e) { res.status(500).json({error:'Failed to delete project'}); }});

// ── EXPERIENCE ──
app.post('/api/experience', authMiddleware, (req, res) => { try { const d = readData(); const e = { id: uuidv4(), ...req.body }; d.experience.push(e); writeData(d); res.json({ success: true, experience: e }); } catch(e) { res.status(500).json({error:'Failed to add experience'}); }});
app.put('/api/experience/:id', authMiddleware, (req, res) => { try { const d = readData(); const i = d.experience.findIndex(e => e.id === req.params.id); if (i === -1) return res.status(404).json({ error: 'Experience not found' }); d.experience[i] = { ...d.experience[i], ...req.body, id: req.params.id }; writeData(d); res.json({ success: true, experience: d.experience[i] }); } catch(e) { res.status(500).json({error:'Failed to update experience'}); }});
app.delete('/api/experience/:id', authMiddleware, (req, res) => { try { const d = readData(); d.experience = d.experience.filter(e => e.id !== req.params.id); writeData(d); res.json({ success: true }); } catch(e) { res.status(500).json({error:'Failed to delete experience'}); }});

// ── STATS ──
app.put('/api/stats', authMiddleware, (req, res) => { try { const d = readData(); d.stats = req.body; writeData(d); res.json({ success: true, stats: d.stats }); } catch(e) { res.status(500).json({error:'Failed to update stats'}); }});

// ── CONTACT ──
app.post('/api/contact', authMiddleware, (req, res) => { try { const d = readData(); const c = { id: uuidv4(), ...req.body }; d.contact.push(c); writeData(d); res.json({ success: true, contact: c }); } catch(e) { res.status(500).json({error:'Failed to add contact'}); }});
app.put('/api/contact/:id', authMiddleware, (req, res) => { try { const d = readData(); const i = d.contact.findIndex(c => c.id === req.params.id); if (i === -1) return res.status(404).json({ error: 'Contact not found' }); d.contact[i] = { ...d.contact[i], ...req.body, id: req.params.id }; writeData(d); res.json({ success: true, contact: d.contact[i] }); } catch(e) { res.status(500).json({error:'Failed to update contact'}); }});
app.delete('/api/contact/:id', authMiddleware, (req, res) => { try { const d = readData(); d.contact = d.contact.filter(c => c.id !== req.params.id); writeData(d); res.json({ success: true }); } catch(e) { res.status(500).json({error:'Failed to delete contact'}); }});

// ── RESET ──
app.post('/api/reset', authMiddleware, (req, res) => { try { getDefaults(); res.json({ success: true, message: 'Portfolio reset to defaults' }); } catch(e) { res.status(500).json({error:'Reset failed'}); }});

// ── Fallback: serve admin.html ──
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// ─── START SERVER ──
function startServer() {
    console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║   Mohammed Asif Portfolio Server                    ║
  ╠═════════════════════════════════════════════════╣
  ║                                                   ║
  ║   Portfolio:  http://localhost:${PORT}                ║
  ║   Admin:      http://localhost:${PORT}/admin          ║
  ║   API:        http://localhost:${PORT}/api/portfolio  ║
  ║                                                   ║
  ║   Auth:      MongoDB + bcrypt              ║
  ║   Run setup:  npm run setup                     ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
    `);
}

// ─── PORTFOLIO HTML ───────────────────────────────────────
<code>public/index.html</code> — (your portfolio, unchanged from before)

<code>admin/admin.html</code> — (the admin dashboard)

<code>admin/admin.css</code> — (admin styles, unchanged from before)

<code>admin/admin.js</code> — (admin JS, unchanged from before)

<code>data/portfolio.json</code> — (default data, gets overwritten by admin)

<code>server.js</code> — (this file replaces the old one entirely)

<code>setup.js</code> — (new file — run once)

<code>package.json</code> — (updated with bcryptjs)

<code>setup.js</code> — (new file — run once)

<code>data/portfolio.json</code> — (default data, gets overwritten by admin)
