const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'portfolio.json');
const ADMIN_PASSWORD = 'Ummulhaina@20';
const ADMIN_TOKEN = 'ma-admin-token-' + Date.now();

// ─── Middleware ───────────────────────────────────────────
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Serve portfolio as static
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin files
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ─── Data Helpers ────────────────────────────────────────
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
            { id: uuidv4(), title: 'AI Document Chatbot', category: 'AI / NLP', description: 'Intelligent chatbot answering questions from uploaded documents using RAG architecture with vector similarity search.', tags: ['LangChain', 'RAG', 'Vector DB', 'Gemini AI'], image: 'https://picsum.photos/seed/ai-doc-chatbot-v6/800/500.jpg', wide: false },
            { id: uuidv4(), title: 'VMart Marketplace', category: 'Full Stack', description: 'Full-featured MERN stack marketplace for students to buy, sell, and trade products within their campus community.', tags: ['React', 'Node.js', 'MongoDB', 'Express'], image: 'https://picsum.photos/seed/vmart-market-v6/800/500.jpg', wide: false },
            { id: uuidv4(), title: 'AI Resume Analyzer', category: 'AI / SaaS', description: 'AI-powered tool that analyzes resumes, provides scoring, suggests improvements, and matches with job descriptions.', tags: ['React', 'Node.js', 'Gemini AI'], image: 'https://picsum.photos/seed/ai-resume-v6/800/500.jpg', wide: false },
            { id: uuidv4(), title: 'Dental Clinic Website', category: 'Web Design', description: 'Modern responsive business website featuring appointment booking, service showcase, and patient testimonials.', tags: ['HTML5', 'CSS3', 'JavaScript', 'Responsive'], image: 'https://picsum.photos/seed/dental-clinic-v6/800/500.jpg', wide: false },
            { id: uuidv4(), title: 'Spotify Clone', category: 'Frontend', description: 'Pixel-perfect Spotify clone with real-time API integration, music player, playlist management, and responsive design.', tags: ['React', 'API', 'Tailwind CSS'], image: 'https://picsum.photos/seed/spotify-clone-v6/800/600.jpg', wide: true }
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

// Ensure data file exists on startup
if (!fs.existsSync(DATA_FILE)) {
    console.log('📄 No data file found. Creating default portfolio.json...');
    getDefaults();
}

// ─── Auth Middleware ──────────────────────────────────────
function authMiddleware(req, res, next) {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token === ADMIN_TOKEN) return next();
    res.status(401).json({ error: 'Unauthorized. Invalid or missing token.' });
}

// ─── API Routes ──────────────────────────────────────────

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        res.status(401).json({ error: 'Incorrect password' });
    }
});

// Verify token
app.get('/api/admin/verify', authMiddleware, (req, res) => {
    res.json({ valid: true });
});

// ── Get ALL portfolio data ──
app.get('/api/portfolio', (req, res) => {
    try {
        const data = readData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read portfolio data' });
    }
});

// ── ABOUT ──
app.put('/api/about', authMiddleware, (req, res) => {
    try {
        const data = readData();
        data.about = { ...data.about, ...req.body };
        writeData(data);
        res.json({ success: true, about: data.about });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update about section' });
    }
});

// ── SKILLS ──
app.get('/api/skills', (req, res) => {
    const data = readData();
    res.json(data.skills);
});

app.post('/api/skills', authMiddleware, (req, res) => {
    try {
        const data = readData();
        const newSkill = { id: uuidv4(), ...req.body };
        data.skills.push(newSkill);
        writeData(data);
        res.json({ success: true, skill: newSkill });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add skill' });
    }
});

app.put('/api/skills/:id', authMiddleware, (req, res) => {
    try {
        const data = readData();
        const idx = data.skills.findIndex(s => s.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Skill not found' });
        data.skills[idx] = { ...data.skills[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json({ success: true, skill: data.skills[idx] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update skill' });
    }
});

app.delete('/api/skills/:id', authMiddleware, (req, res) => {
    try {
        const data = readData();
        data.skills = data.skills.filter(s => s.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete skill' });
    }
});

// ── PROJECTS ──
app.post('/api/projects', authMiddleware, (req, res) => {
    try {
        const data = readData();
        const newProject = { id: uuidv4(), ...req.body };
        data.projects.push(newProject);
        writeData(data);
        res.json({ success: true, project: newProject });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add project' });
    }
});

app.put('/api/projects/:id', authMiddleware, (req, res) => {
    try {
        const data = readData();
        const idx = data.projects.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Project not found' });
        data.projects[idx] = { ...data.projects[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json({ success: true, project: data.projects[idx] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update project' });
    }
});

app.delete('/api/projects/:id', authMiddleware, (req, res) => {
    try {
        const data = readData();
        data.projects = data.projects.filter(p => p.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// ── EXPERIENCE ──
app.post('/api/experience', authMiddleware, (req, res) => {
    try {
        const data = readData();
        const newExp = { id: uuidv4(), ...req.body };
        data.experience.push(newExp);
        writeData(data);
        res.json({ success: true, experience: newExp });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add experience' });
    }
});

app.put('/api/experience/:id', authMiddleware, (req, res) => {
    try {
        const data = readData();
        const idx = data.experience.findIndex(e => e.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Experience not found' });
        data.experience[idx] = { ...data.experience[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json({ success: true, experience: data.experience[idx] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update experience' });
    }
});

app.delete('/api/experience/:id', authMiddleware, (req, res) => {
    try {
        const data = readData();
        data.experience = data.experience.filter(e => e.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete experience' });
    }
});

// ── STATS ──
app.put('/api/stats', authMiddleware, (req, res) => {
    try {
        const data = readData();
        data.stats = req.body;
        writeData(data);
        res.json({ success: true, stats: data.stats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update stats' });
    }
});

// ── CONTACT ──
app.post('/api/contact', authMiddleware, (req, res) => {
    try {
        const data = readData();
        const newContact = { id: uuidv4(), ...req.body };
        data.contact.push(newContact);
        writeData(data);
        res.json({ success: true, contact: newContact });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add contact' });
    }
});

app.put('/api/contact/:id', authMiddleware, (req, res) => {
    try {
        const data = readData();
        const idx = data.contact.findIndex(c => c.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Contact not found' });
        data.contact[idx] = { ...data.contact[idx], ...req.body, id: req.params.id };
        writeData(data);
        res.json({ success: true, contact: data.contact[idx] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

app.delete('/api/contact/:id', authMiddleware, (req, res) => {
    try {
        const data = readData();
        data.contact = data.contact.filter(c => c.id !== req.params.id);
        writeData(data);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

// ── RESET to defaults ──
app.post('/api/reset', authMiddleware, (req, res) => {
    const defaults = getDefaults();
    res.json({ success: true, message: 'Portfolio reset to defaults' });
});

// ─── Fallback: serve admin.html for /admin route ────────
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin.html'));
});

// ─── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   Mohammed Asif Portfolio Server                    ║
  ╠═══════════════════════════════════════════════════╣
  ║                                                   ║
  ║   Portfolio:  http://localhost:${PORT}                ║
  ║   Admin:      http://localhost:${PORT}/admin          ║
  ║   API:        http://localhost:${PORT}/api/portfolio  ║
  ║                                                   ║
  ║   Admin Password: admin123                         ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
    `);
});
