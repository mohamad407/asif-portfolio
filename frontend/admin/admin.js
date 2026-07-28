// ─── CONFIG ──────────────────────────────────────────────
// See ../config.js — set window.PORTFOLIO_API_BASE there if your
// backend is hosted on a different domain than this admin page.
const API_BASE = (window.PORTFOLIO_API_BASE || window.location.origin) + '/api';
let token = localStorage.getItem('admin_token') || '';
let portfolioData = null;

// ─── API HELPER ─────────────────────────────────────────
async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API_BASE + endpoint, {
        ...options,
        headers: { ...headers, ...options.headers }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ─── UTILS ──────────────────────────────────────────────
function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message) {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function openModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modal').classList.add('open');
}
function closeModal() {
    document.getElementById('modal').classList.remove('open');
}
document.getElementById('modalBackdrop').addEventListener('click', closeModal);

// ─── IMAGE UPLOAD + CROP ────────────────────────────────
// Reusable "choose a file from your device, crop it, upload" flow.
// Used for the profile photo, skill icons, and project images —
// nowhere in the dashboard should you need to paste an image URL.
let _cropperInstance = null;

function openImageCropper({ title = 'Upload Image', aspectRatio = 1, outWidth = 640, onCropped }) {
    const outHeight = Math.round(outWidth / aspectRatio);
    openModal(`
        <h3 class="modal-title">${title}</h3>
        <div class="input-group">
            <label class="input-label">Choose an image from your device</label>
            <input type="file" accept="image/*" id="cropperFileInput" class="input">
        </div>
        <div id="cropperContainer" style="display:none;max-height:360px;margin-bottom:20px;background:#000;border-radius:12px;overflow:hidden;">
            <img id="cropperImage" style="max-width:100%;display:block;">
        </div>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="cancelImageCropper()">Cancel</button>
            <button class="btn btn-primary" id="cropperConfirmBtn" disabled>Use This Image</button>
        </div>
    `);

    const fileInput = document.getElementById('cropperFileInput');
    const img = document.getElementById('cropperImage');
    const container = document.getElementById('cropperContainer');
    const confirmBtn = document.getElementById('cropperConfirmBtn');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            img.src = evt.target.result;
            container.style.display = 'block';
            if (_cropperInstance) _cropperInstance.destroy();
            _cropperInstance = new Cropper(img, {
                aspectRatio,
                viewMode: 1,
                autoCropArea: 1,
                background: false,
                responsive: true
            });
            confirmBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    });

    confirmBtn.addEventListener('click', () => {
        if (!_cropperInstance) return;
        const canvas = _cropperInstance.getCroppedCanvas({
            width: outWidth,
            height: outHeight,
            imageSmoothingQuality: 'high'
        });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        _cropperInstance.destroy();
        _cropperInstance = null;
        closeModal();
        onCropped(dataUrl);
    });
}

function cancelImageCropper() {
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    closeModal();
}

// ─── AUTH ──────────────────────────────────────────────
let currentUsername = localStorage.getItem('admin_username') || '';

async function login(username, password) {
    const data = await api('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    token = data.token;
    currentUsername = data.username;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_username', currentUsername);
    return data;
}

async function verifyToken() {
    try {
        await api('/admin/verify');
        return true;
    } catch { return false; }
}

function logout() {
    token = '';
    currentUsername = '';
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

// ─── DATA ──────────────────────────────────────────────
async function loadData() {
    portfolioData = await api('/portfolio');
    return portfolioData;
}

// ─── LOGIN FORM ────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const uname = document.getElementById('loginUsername').value;
    const pw = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');
    try {
        await login(uname, pw);
        errEl.classList.add('hidden');
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        await initDashboard();
    } catch (err) {
        errEl.textContent = err.message || 'Invalid username or password.';
        errEl.classList.remove('hidden');
    }
});

document.getElementById('logoutBtn').addEventListener('click', logout);

// ─── CHANGE PASSWORD MODAL ──────────────────────────────
function openChangePasswordModal() {
    document.getElementById('cpCurrent').value = '';
    document.getElementById('cpNew').value = '';
    document.getElementById('cpConfirm').value = '';
    document.getElementById('cpError').classList.add('hidden');
    document.getElementById('changePasswordModal').classList.add('open');
}
function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.remove('open');
}
document.getElementById('changePasswordBtn')?.addEventListener('click', openChangePasswordModal);

document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('cpCurrent').value;
    const newPassword = document.getElementById('cpNew').value;
    const confirmPassword = document.getElementById('cpConfirm').value;
    const errEl = document.getElementById('cpError');
    errEl.classList.add('hidden');

    if (newPassword.length < 8) {
        errEl.textContent = 'New password must be at least 8 characters.';
        errEl.classList.remove('hidden');
        return;
    }
    if (newPassword !== confirmPassword) {
        errEl.textContent = 'New password and confirmation do not match.';
        errEl.classList.remove('hidden');
        return;
    }
    try {
        const data = await api('/admin/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        token = data.token;
        localStorage.setItem('admin_token', token);
        closeChangePasswordModal();
        showToast('Password updated successfully!');
    } catch (err) {
        errEl.textContent = err.message || 'Failed to change password.';
        errEl.classList.remove('hidden');
    }
});

// ─── MOBILE SIDEBAR TOGGLE ───────────────────────────
// (button already exists in admin.html — just wire it up)
document.getElementById('mobileToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});
document.getElementById('sidebar')?.addEventListener('click', (e) => {
    // tapping outside the nav links (e.g. the dimmed backdrop area) closes it on mobile
    if (e.target === e.currentTarget) document.getElementById('sidebar').classList.remove('open');
});

// ─── RESET BUTTON ──────────────────────────────────────
document.getElementById('resetBtn').addEventListener('click', async () => {
    if (!confirm('Reset ALL portfolio data to defaults? This cannot be undone.')) return;
    try {
        await api('/reset', { method: 'POST' });
        await loadData();
        switchSection('overview');
        showToast('Portfolio reset to defaults!');
    } catch (err) {
        showToast('Reset failed: ' + err.message);
    }
});

// ─── DASHBOARD INIT ────────────────────────────────────
async function initDashboard() {
    try {
        const v = await api('/admin/verify');
        currentUsername = v.username;
        localStorage.setItem('admin_username', currentUsername);
        const unameEl = document.getElementById('sidebarUsername');
        if (unameEl) unameEl.textContent = `Signed in as ${currentUsername}`;
        await loadData();
        switchSection('overview');
    } catch (err) {
        showToast('Failed to load data: ' + err.message);
        logout();
    }
}

// ─── SECTION SWITCHING ─────────────────────────────────
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        switchSection(link.dataset.section);
        document.getElementById('sidebar').classList.remove('open');
    });
});

function switchSection(section) {
    const titles = {
        overview: 'Dashboard Overview',
        about: 'Edit About Section',
        skills: 'Manage Skills',
        projects: 'Manage Projects',
        experience: 'Manage Experience',
        stats: 'Manage Stats',
        contact: 'Manage Contact Info'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';
    const content = document.getElementById('sectionContent');

    switch (section) {
        case 'overview': renderOverview(content); break;
        case 'about': renderAbout(content); break;
        case 'skills': renderSkills(content); break;
        case 'projects': renderProjects(content); break;
        case 'experience': renderExperience(content); break;
        case 'stats': renderStats(content); break;
        case 'contact': renderContact(content); break;
    }
}

// ══════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════
function renderOverview(el) {
    const d = portfolioData;
    el.innerHTML = `
        <div class="stats-grid">
            <div class="card stat-card"><div class="stat-value">${d.skills.length}</div><div class="stat-label">Skills</div></div>
            <div class="card stat-card"><div class="stat-value">${d.projects.length}</div><div class="stat-label">Projects</div></div>
            <div class="card stat-card"><div class="stat-value">${d.experience.length}</div><div class="stat-label">Experience</div></div>
            <div class="card stat-card"><div class="stat-value">${d.stats.length}</div><div class="stat-label">Stats</div></div>
        </div>
        <div class="info-box">💡 Click any section in the sidebar to manage content. All changes save to <code>data/portfolio.json</code> and appear on your portfolio instantly.</div>
        <div class="info-box">🔐 Logged in as <code>${escHtml(currentUsername)}</code> — use the "Change Password" button up top to update your credentials anytime.</div>
        <div class="info-box">🌐 Portfolio URL: <code><a href="/" style="color:rgba(255,255,255,0.6);text-decoration:underline">${window.location.origin}</a></code></div>
    `;
}

// ══════════════════════════════════════════════════════
// ABOUT
// ══════════════════════════════════════════════════════
function renderAbout(el) {
    const a = portfolioData.about;
    el.innerHTML = `
        <div class="card" style="margin-bottom:20px">
            <h3 style="font-size:14px;font-weight:500;margin-bottom:12px">Profile Photo</h3>
            <div style="display:flex;align-items:center;gap:16px">
                <img src="${a.profileImage || ''}" alt="Profile" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:1px solid var(--border);background:rgba(255,255,255,0.05)">
                <button class="btn btn-ghost btn-sm" onclick="startProfilePhotoUpload()">Change Photo</button>
            </div>
        </div>
        <div class="card">
            <div class="input-group">
                <label class="input-label">Subtitle</label>
                <input class="input" id="aboutSubtitle" value="${a.subtitle}">
            </div>
            <div class="input-group">
                <label class="input-label">Tags (comma separated)</label>
                <input class="input" id="aboutTags" value="${a.tags.join(', ')}">
            </div>
            <div class="input-group">
                <label class="input-label">Paragraph 1 (HTML allowed)</label>
                <textarea class="input" id="aboutText1" rows="4">${escHtml(a.text1)}</textarea>
            </div>
            <div class="input-group">
                <label class="input-label">Paragraph 2 (HTML allowed)</label>
                <textarea class="input" id="aboutText2" rows="4">${escHtml(a.text2)}</textarea>
            </div>
            <h3 style="font-size:14px;font-weight:500;margin:24px 0 12px">Quick Stats</h3>
            <div id="aboutStatsList">
                ${a.stats.map((s) => `
                    <div class="item-row" style="margin-bottom:8px">
                        <input class="input" style="flex:1" value="${s.value}" data-field="value">
                        <input class="input" style="flex:1" value="${s.label}" data-field="label">
                        <button class="btn btn-danger btn-icon" onclick="removeAboutStat(this)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-ghost btn-sm" onclick="addAboutStatRow()" style="margin-top:8px">+ Add Stat</button>
            <div style="margin-top:24px"><button class="btn btn-primary" onclick="saveAbout()">Save About Section</button></div>
        </div>
    `;
}

function startProfilePhotoUpload() {
    openImageCropper({
        title: 'Upload Profile Photo',
        aspectRatio: 1,
        outWidth: 500,
        onCropped: async (dataUrl) => {
            try {
                await api('/about', { method: 'PUT', body: JSON.stringify({ profileImage: dataUrl }) });
                await loadData();
                renderAbout(document.getElementById('sectionContent'));
                showToast('Profile photo updated!');
            } catch (err) {
                showToast('Failed to update photo: ' + err.message);
            }
        }
    });
}

function addAboutStatRow() {
    document.getElementById('aboutStatsList').insertAdjacentHTML('beforeend', `
        <div class="item-row" style="margin-bottom:8px">
            <input class="input" style="flex:1" value="" data-field="value" placeholder="Value">
            <input class="input" style="flex:1" value="" data-field="label" placeholder="Label">
            <button class="btn btn-danger btn-icon" onclick="this.parentElement.remove()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        </div>
    `);
}

function removeAboutStat(btn) { btn.parentElement.remove(); }

async function saveAbout() {
    const stats = [];
    document.querySelectorAll('#aboutStatsList .item-row').forEach(row => {
        const inputs = row.querySelectorAll('input');
        stats.push({ value: inputs[0].value, label: inputs[1].value });
    });
    await api('/about', {
        method: 'PUT',
        body: JSON.stringify({
            subtitle: document.getElementById('aboutSubtitle').value,
            tags: document.getElementById('aboutTags').value.split(',').map(t => t.trim()).filter(Boolean),
            text1: document.getElementById('aboutText1').value,
            text2: document.getElementById('aboutText2').value,
            stats
        })
    });
    await loadData();
    showToast('About section saved!');
}

// ══════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════
function renderSkills(el) {
    el.innerHTML = `
        <div class="section-header">
            <h2>Skills (${portfolioData.skills.length})</h2>
            <button class="btn btn-primary" onclick="openSkillModal()">+ Add Skill</button>
        </div>
        <div class="item-list">
            ${portfolioData.skills.map(s => `
                <div class="card item-row">
                    ${s.type === 'upload'
                        ? `<img src="${s.icon}" class="item-num" style="object-fit:cover;padding:0" alt="${s.name}">`
                        : `<div class="item-num">${s.name.charAt(0)}</div>`}
                    <div class="item-info">
                        <div class="item-title">${s.name}</div>
                        <div class="item-sub">${s.type === 'upload' ? 'Custom uploaded image' : s.icon} · ${s.type === 'img' ? 'Image' : s.type === 'upload' ? 'Upload' : 'Line'}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-ghost btn-sm" onclick="openSkillModal('${s.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteSkill('${s.id}')">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

let skillDraft = null;

function openSkillModal(id) {
    const s = id ? portfolioData.skills.find(x => x.id === id) : { name: '', icon: '', type: 'img', color: '' };
    skillDraft = { id, name: s.name, icon: s.icon, type: s.type, color: s.color || '' };
    renderSkillModalBody();
}

function renderSkillModalBody() {
    const s = skillDraft;
    const isUpload = s.type === 'upload';
    openModal(`
        <h3 class="modal-title">${s.id ? 'Edit' : 'Add'} Skill</h3>
        <div class="input-group">
            <label class="input-label">Name</label>
            <input class="input" id="mSkillName" value="${s.name}" placeholder="React.js" oninput="skillDraft.name=this.value">
        </div>
        <div class="input-group">
            <label class="input-label">Icon</label>
            ${isUpload
                ? `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                        <img src="${s.icon}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:1px solid var(--border)">
                        <button type="button" class="btn btn-ghost btn-sm" onclick="startSkillIconUpload()">Change Image</button>
                        <button type="button" class="btn btn-ghost btn-sm" onclick="useIconNameForSkill()">Use Icon Name Instead</button>
                   </div>`
                : `<input class="input" id="mSkillIcon" value="${s.icon}" placeholder="logos:react" oninput="skillDraft.icon=this.value" style="margin-bottom:8px">
                   <button type="button" class="btn btn-ghost btn-sm" onclick="startSkillIconUpload()">Upload Custom Image Instead</button>`
            }
        </div>
        ${!isUpload ? `
        <div class="input-group">
            <label class="input-label">Type</label>
            <select class="input" id="mSkillType" onchange="skillDraft.type=this.value">
                <option value="img" ${s.type === 'img' ? 'selected' : ''}>Image Icon</option>
                <option value="icon" ${s.type === 'icon' ? 'selected' : ''}>Line Icon</option>
            </select>
        </div>
        <div class="input-group"><label class="input-label">Color (for line icons)</label><input class="input" id="mSkillColor" value="${s.color || ''}" placeholder="rgba(255,255,255,0.65)" oninput="skillDraft.color=this.value"></div>
        ` : ''}
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="skillDraft=null;closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="${s.id ? `saveSkill('${s.id}')` : 'addSkill()'}">${s.id ? 'Save' : 'Add'}</button>
        </div>
    `);
}

function startSkillIconUpload() {
    openImageCropper({
        title: 'Upload Skill Icon',
        aspectRatio: 1,
        outWidth: 256,
        onCropped: (dataUrl) => {
            skillDraft.icon = dataUrl;
            skillDraft.type = 'upload';
            renderSkillModalBody();
        }
    });
}

function useIconNameForSkill() {
    skillDraft.type = 'img';
    skillDraft.icon = '';
    renderSkillModalBody();
}

async function addSkill() {
    await api('/skills', { method: 'POST', body: JSON.stringify({
        name: skillDraft.name,
        icon: skillDraft.icon,
        type: skillDraft.type,
        color: skillDraft.color || undefined
    })});
    skillDraft = null;
    closeModal(); await loadData(); renderSkills(document.getElementById('sectionContent')); showToast('Skill added!');
}

async function saveSkill(id) {
    await api(`/skills/${id}`, { method: 'PUT', body: JSON.stringify({
        name: skillDraft.name,
        icon: skillDraft.icon,
        type: skillDraft.type,
        color: skillDraft.color || undefined
    })});
    skillDraft = null;
    closeModal(); await loadData(); renderSkills(document.getElementById('sectionContent')); showToast('Skill saved!');
}

async function deleteSkill(id) {
    if (!confirm('Delete this skill?')) return;
    await api(`/skills/${id}`, { method: 'DELETE' });
    await loadData(); renderSkills(document.getElementById('sectionContent')); showToast('Skill deleted!');
}

// ══════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════
function renderProjects(el) {
    el.innerHTML = `
        <div class="section-header">
            <h2>Projects (${portfolioData.projects.length})</h2>
            <button class="btn btn-primary" onclick="openProjectModal()">+ Add Project</button>
        </div>
        <div class="item-list">
            ${portfolioData.projects.map(p => `
                <div class="card item-row">
                    <img src="${p.image}" class="item-thumb" alt="${p.title}">
                    <div class="item-info">
                        <div class="item-title">${p.title}</div>
                        <div class="item-sub">${p.category} ${p.wide ? '· Wide layout' : ''}</div>
                        <div class="item-desc">${p.description}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-ghost btn-sm" onclick="openProjectModal('${p.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

let projectDraft = null;

function openProjectModal(id) {
    const p = id ? portfolioData.projects.find(x => x.id === id) : { title: '', category: '', description: '', tags: [], image: '', liveUrl: '', wide: false };
    projectDraft = { id, title: p.title, category: p.category, description: p.description, tags: p.tags, image: p.image, liveUrl: p.liveUrl || '', wide: p.wide };
    renderProjectModalBody();
}

function renderProjectModalBody() {
    const p = projectDraft;
    openModal(`
        <h3 class="modal-title">${p.id ? 'Edit' : 'Add'} Project</h3>
        <div class="input-group"><label class="input-label">Title</label><input class="input" id="mProjTitle" value="${p.title}" placeholder="AI Document Chatbot" oninput="projectDraft.title=this.value"></div>
        <div class="input-group"><label class="input-label">Category</label><input class="input" id="mProjCat" value="${p.category}" placeholder="AI / NLP" oninput="projectDraft.category=this.value"></div>
        <div class="input-group"><label class="input-label">Description</label><textarea class="input" id="mProjDesc" rows="3" placeholder="Brief description..." oninput="projectDraft.description=this.value">${p.description}</textarea></div>
        <div class="input-group"><label class="input-label">Tags (comma separated)</label><input class="input" id="mProjTags" value="${p.tags.join(', ')}" placeholder="React, Node.js" oninput="projectDraft.tags=this.value.split(',').map(t=>t.trim()).filter(Boolean)"></div>
        <div class="input-group">
            <label class="input-label">Project Image</label>
            ${p.image
                ? `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                        <img src="${p.image}" style="width:80px;height:50px;border-radius:8px;object-fit:cover;border:1px solid var(--border)">
                        <button type="button" class="btn btn-ghost btn-sm" onclick="startProjectImageUpload()">Change Image</button>
                   </div>`
                : `<button type="button" class="btn btn-ghost btn-sm" onclick="startProjectImageUpload()" style="margin-bottom:8px">Choose Image From Device</button>`
            }
        </div>
        <div class="input-group">
            <label class="input-label">Live Link (optional)</label>
            <input class="input" id="mProjLive" value="${p.liveUrl}" placeholder="https://your-live-project.com" oninput="projectDraft.liveUrl=this.value">
            <div style="font-size:11px;color:var(--text-secondary);margin-top:6px">If set, clicking this project on your portfolio opens this link in a new tab.</div>
        </div>
        <label class="checkbox-label" style="margin-bottom:24px">
            <input type="checkbox" id="mProjWide" ${p.wide ? 'checked' : ''} onchange="projectDraft.wide=this.checked">
            Wide layout (spans full width)
        </label>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="projectDraft=null;closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="${p.id ? `saveProject('${p.id}')` : 'addProject()'}">${p.id ? 'Save' : 'Add'}</button>
        </div>
    `);
}

function startProjectImageUpload() {
    openImageCropper({
        title: 'Upload Project Image',
        aspectRatio: 8 / 5,
        outWidth: 800,
        onCropped: (dataUrl) => {
            projectDraft.image = dataUrl;
            renderProjectModalBody();
        }
    });
}

async function addProject() {
    if (!projectDraft.image) { showToast('Please choose a project image first.'); return; }
    await api('/projects', { method: 'POST', body: JSON.stringify({
        title: projectDraft.title,
        category: projectDraft.category,
        description: projectDraft.description,
        tags: projectDraft.tags,
        image: projectDraft.image,
        liveUrl: projectDraft.liveUrl || undefined,
        wide: projectDraft.wide
    })});
    projectDraft = null;
    closeModal(); await loadData(); renderProjects(document.getElementById('sectionContent')); showToast('Project added!');
}

async function saveProject(id) {
    await api(`/projects/${id}`, { method: 'PUT', body: JSON.stringify({
        title: projectDraft.title,
        category: projectDraft.category,
        description: projectDraft.description,
        tags: projectDraft.tags,
        image: projectDraft.image,
        liveUrl: projectDraft.liveUrl || undefined,
        wide: projectDraft.wide
    })});
    projectDraft = null;
    closeModal(); await loadData(); renderProjects(document.getElementById('sectionContent')); showToast('Project saved!');
}

async function deleteProject(id) {
    if (!confirm('Delete this project?')) return;
    await api(`/projects/${id}`, { method: 'DELETE' });
    await loadData(); renderProjects(document.getElementById('sectionContent')); showToast('Project deleted!');
}

// ══════════════════════════════════════════════════════
// EXPERIENCE
// ══════════════════════════════════════════════════════
function renderExperience(el) {
    el.innerHTML = `
        <div class="section-header">
            <h2>Experience (${portfolioData.experience.length})</h2>
            <button class="btn btn-primary" onclick="openExpModal()">+ Add Entry</button>
        </div>
        <div class="item-list">
            ${portfolioData.experience.map((t, i) => `
                <div class="card item-row">
                    <div class="item-num">${i + 1}</div>
                    <div class="item-info">
                        <div class="item-title">${t.title}</div>
                        <div class="item-sub">${t.label} · ${t.side}</div>
                        <div class="item-desc">${t.description}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-ghost btn-sm" onclick="openExpModal('${t.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteExp('${t.id}')">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function openExpModal(id) {
    const t = id ? portfolioData.experience.find(x => x.id === id) : { label: '', title: '', description: '', side: 'left' };
    openModal(`
        <h3 class="modal-title">${id ? 'Edit' : 'Add'} Experience</h3>
        <div class="input-group"><label class="input-label">Label</label><input class="input" id="mExpLabel" value="${t.label}" placeholder="Ongoing"></div>
        <div class="input-group"><label class="input-label">Title</label><input class="input" id="mExpTitle" value="${t.title}" placeholder="Full Stack Development"></div>
        <div class="input-group"><label class="input-label">Description</label><textarea class="input" id="mExpDesc" rows="4" placeholder="What you did...">${t.description}</textarea></div>
        <div class="input-group">
            <label class="input-label">Side</label>
            <select class="input" id="mExpSide">
                <option value="left" ${t.side === 'left' ? 'selected' : ''}>Left</option>
                <option value="right" ${t.side === 'right' ? 'selected' : ''}>Right</option>
            </select>
        </div>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="${id ? `saveExp('${id}')` : 'addExp()'}">${id ? 'Save' : 'Add'}</button>
        </div>
    `);
}

async function addExp() {
    await api('/experience', { method: 'POST', body: JSON.stringify({
        label: document.getElementById('mExpLabel').value,
        title: document.getElementById('mExpTitle').value,
        description: document.getElementById('mExpDesc').value,
        side: document.getElementById('mExpSide').value
    })});
    closeModal(); await loadData(); renderExperience(document.getElementById('sectionContent')); showToast('Experience added!');
}

async function saveExp(id) {
    await api(`/experience/${id}`, { method: 'PUT', body: JSON.stringify({
        label: document.getElementById('mExpLabel').value,
        title: document.getElementById('mExpTitle').value,
        description: document.getElementById('mExpDesc').value,
        side: document.getElementById('mExpSide').value
    })});
    closeModal(); await loadData(); renderExperience(document.getElementById('sectionContent')); showToast('Experience saved!');
}

async function deleteExp(id) {
    if (!confirm('Delete this experience entry?')) return;
    await api(`/experience/${id}`, { method: 'DELETE' });
    await loadData(); renderExperience(document.getElementById('sectionContent')); showToast('Experience deleted!');
}

// ══════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════
function renderStats(el) {
    el.innerHTML = `
        <div class="section-header">
            <h2>Stats (${portfolioData.stats.length})</h2>
            <button class="btn btn-primary" onclick="openStatModal()">+ Add Stat</button>
        </div>
        <div class="item-list">
            ${portfolioData.stats.map(s => `
                <div class="card item-row">
                    <div class="item-num" style="font-family:'Playfair Display',serif">${s.value}</div>
                    <div class="item-info">
                        <div class="item-title">${s.label}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-ghost btn-sm" onclick="openStatModal('${s.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStat('${s.id}')">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function openStatModal(id) {
    const s = id ? portfolioData.stats.find(x => x.id === id) : { value: 0, label: '' };
    openModal(`
        <h3 class="modal-title">${id ? 'Edit' : 'Add'} Stat</h3>
        <div class="input-group"><label class="input-label">Value (number)</label><input type="number" class="input" id="mStatVal" value="${s.value}" placeholder="20"></div>
        <div class="input-group"><label class="input-label">Label</label><input class="input" id="mStatLabel" value="${s.label}" placeholder="Projects Completed"></div>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="${id ? `saveStat('${id}')` : 'addStat()'}">${id ? 'Save' : 'Add'}</button>
        </div>
    `);
}

async function addStat() {
    const stats = [...portfolioData.stats, { value: parseInt(document.getElementById('mStatVal').value), label: document.getElementById('mStatLabel').value }];
    await api('/stats', { method: 'PUT', body: JSON.stringify(stats) });
    closeModal(); await loadData(); renderStats(document.getElementById('sectionContent')); showToast('Stat added!');
}

async function saveStat(id) {
    const stats = portfolioData.stats.map(s => s.id === id ? { ...s, value: parseInt(document.getElementById('mStatVal').value), label: document.getElementById('mStatLabel').value } : s);
    await api('/stats', { method: 'PUT', body: JSON.stringify(stats) });
    closeModal(); await loadData(); renderStats(document.getElementById('sectionContent')); showToast('Stat saved!');
}

async function deleteStat(id) {
    if (!confirm('Delete this stat?')) return;
    const stats = portfolioData.stats.filter(s => s.id !== id);
    await api('/stats', { method: 'PUT', body: JSON.stringify(stats) });
    await loadData(); renderStats(document.getElementById('sectionContent')); showToast('Stat deleted!');
}

// ══════════════════════════════════════════════════════
// CONTACT
// ══════════════════════════════════════════════════════
function renderContact(el) {
    el.innerHTML = `
        <div class="section-header">
            <h2>Contact Info (${portfolioData.contact.length})</h2>
            <button class="btn btn-primary" onclick="openContactModal()">+ Add Contact</button>
        </div>
        <div class="item-list">
            ${portfolioData.contact.map(c => `
                <div class="card item-row">
                    <div class="item-num" style="${c.isWhatsApp ? 'color:#25D366;border-color:rgba(37,211,102,0.3)' : ''}">${c.label.charAt(0)}</div>
                    <div class="item-info">
                        <div class="item-title">${c.label}</div>
                        <div class="item-sub">${c.value}</div>
                        <div class="item-desc">${c.href}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-ghost btn-sm" onclick="openContactModal('${c.id}')">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteContact('${c.id}')">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function openContactModal(id) {
    const c = id ? portfolioData.contact.find(x => x.id === id) : { icon: 'lucide:globe', label: '', value: '', href: '', isWhatsApp: false };
    openModal(`
        <h3 class="modal-title">${id ? 'Edit' : 'Add'} Contact</h3>
        <div class="input-group"><label class="input-label">Icon (Iconify name)</label><input class="input" id="mContIcon" value="${c.icon}" placeholder="lucide:mail"></div>
        <div class="input-group"><label class="input-label">Label</label><input class="input" id="mContLabel" value="${c.label}" placeholder="Email"></div>
        <div class="input-group"><label class="input-label">Display Value</label><input class="input" id="mContValue" value="${c.value}" placeholder="you@example.com"></div>
        <div class="input-group"><label class="input-label">Link URL</label><input class="input" id="mContHref" value="${c.href}" placeholder="mailto:..."></div>
        <label class="checkbox-label" style="margin-bottom:24px">
            <input type="checkbox" id="mContWa" ${c.isWhatsApp ? 'checked' : ''}>
            WhatsApp (green styling)
        </label>
        <div class="modal-actions">
            <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="${id ? `saveContact('${id}')` : 'addContact()'}">${id ? 'Save' : 'Add'}</button>
        </div>
    `);
}

async function addContact() {
    await api('/contact', { method: 'POST', body: JSON.stringify({
        icon: document.getElementById('mContIcon').value,
        label: document.getElementById('mContLabel').value,
        value: document.getElementById('mContValue').value,
        href: document.getElementById('mContHref').value,
        isWhatsApp: document.getElementById('mContWa').checked
    })});
    closeModal(); await loadData(); renderContact(document.getElementById('sectionContent')); showToast('Contact added!');
}

async function saveContact(id) {
    await api(`/contact/${id}`, { method: 'PUT', body: JSON.stringify({
        icon: document.getElementById('mContIcon').value,
        label: document.getElementById('mContLabel').value,
        value: document.getElementById('mContValue').value,
        href: document.getElementById('mContHref').value,
        isWhatsApp: document.getElementById('mContWa').checked
    })});
    closeModal(); await loadData(); renderContact(document.getElementById('sectionContent')); showToast('Contact saved!');
}

async function deleteContact(id) {
    if (!confirm('Delete this contact?')) return;
    await api(`/contact/${id}`, { method: 'DELETE' });
    await loadData(); renderContact(document.getElementById('sectionContent')); showToast('Contact deleted!');
}
