// ─── CONFIG ──────────────────────────────────────────────
// See ../config.js — set window.PORTFOLIO_API_BASE there if your
// backend is hosted on a different domain than this admin page.
const API_BASE = (window.PORTFOLIO_API_BASE || window.location.origin) + '/api';
let token = localStorage.getItem('admin_token') || '';
let currentUsername = localStorage.getItem('admin_username') || '';
let portfolioData = null;
let currentSection = 'overview';

// ─── TINY HELPERS ───────────────────────────────────────
const $ = (id) => document.getElementById(id);

// Escapes text AND quotes, so values are safe inside both HTML and attributes.
function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
const escHtml = esc; // backwards-compatible name

const ICON = {
    edit: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h6a1 1 0 011 1v2"/></svg>',
    plus: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

let toastTimer;
function showToast(message, isError) {
    const t = $('toast');
    t.textContent = message;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), isError ? 4500 : 2600);
}

// Runs an async action with a disabled button, a success toast, and a visible error if it fails.
async function act(fn, okMsg, btn) {
    if (btn) btn.disabled = true;
    try {
        await fn();
        if (okMsg) showToast(okMsg);
        return true;
    } catch (err) {
        showToast(err.message || 'Something went wrong', true);
        return false;
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ─── API ────────────────────────────────────────────────
async function api(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let res;
    try {
        res = await fetch(API_BASE + endpoint, { ...options, headers: { ...headers, ...options.headers } });
    } catch {
        throw new Error('Cannot reach the server. If it was idle, wait ~30 seconds and try again.');
    }
    const data = await res.json().catch(() => ({}));
    // Only an expired/missing *token* should sign you out (a wrong current-password is also a 401).
    if (res.status === 401 && token && /token/i.test(data.error || '')) {
        logout();
        throw new Error('Your session expired. Please sign in again.');
    }
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

// ─── MODALS ─────────────────────────────────────────────
function modalShell({ title, body, actions }) {
    return `
        <div class="modal-head">
            <h3 class="modal-title">${esc(title)}</h3>
            <button type="button" class="btn btn-ghost btn-icon" onclick="closeModal()" aria-label="Close">${ICON.x}</button>
        </div>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">${actions}</div>`;
}
function openModal(html, { wide = false } = {}) {
    const c = $('modalContent');
    c.className = 'modal-content' + (wide ? ' wide' : '');
    c.innerHTML = html;
    $('modal').classList.add('open');
    const first = c.querySelector('input:not([type=file]):not([type=checkbox]), textarea, select');
    if (first && innerWidth > 560) setTimeout(() => first.focus({ preventScroll: true }), 30);
}
function closeModal() {
    $('modal').classList.remove('open');
    if (typeof _cropperInstance !== 'undefined' && _cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    _cropCancel = null;
}
$('modalBackdrop').addEventListener('click', closeModal);

// Promise-based confirm dialog (replaces the browser's confirm())
function askConfirm({ title, message, confirmLabel = 'Delete', danger = true }) {
    return new Promise((resolve) => {
        window.__confirmResolve = (v) => { closeModal(); window.__confirmResolve = null; resolve(v); };
        openModal(modalShell({
            title,
            body: `<p>${esc(message)}</p>`,
            actions: `<button class="btn btn-ghost" onclick="__confirmResolve(false)">Cancel</button>
                      <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" onclick="__confirmResolve(true)">${esc(confirmLabel)}</button>`
        }));
    });
}

// ─── IMAGE UPLOAD + CROP ────────────────────────────────
// Reusable "choose a file, crop it" flow for the profile photo, skill icons and project images.
let _cropperInstance = null;
let _cropCancel = null;

function openImageCropper({ title = 'Upload image', aspectRatio = 1, outWidth = 640, wide = false, onCropped, onCancel }) {
    const outHeight = Math.round(outWidth / aspectRatio);
    _cropCancel = onCancel || null;
    openModal(modalShell({
        title,
        body: `
            <div class="input-group">
                <label class="input-label" for="cropperFileInput">Choose an image from your device</label>
                <input type="file" accept="image/*" id="cropperFileInput" class="input">
            </div>
            <div id="cropperContainer" style="display:none;max-height:300px;background:#000;border-radius:10px;overflow:hidden">
                <img id="cropperImage" alt="" style="max-width:100%;display:block">
            </div>`,
        actions: `<button class="btn btn-ghost" onclick="cancelImageCropper()">Cancel</button>
                  <button class="btn btn-primary" id="cropperConfirmBtn" disabled>Use this image</button>`
    }), { wide });

    const fileInput = $('cropperFileInput');
    const img = $('cropperImage');
    const container = $('cropperContainer');
    const confirmBtn = $('cropperConfirmBtn');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            img.src = evt.target.result;
            container.style.display = 'block';
            if (_cropperInstance) _cropperInstance.destroy();
            _cropperInstance = new Cropper(img, { aspectRatio, viewMode: 1, autoCropArea: 1, background: false, responsive: true });
            confirmBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    });

    confirmBtn.addEventListener('click', () => {
        if (!_cropperInstance) return;
        const canvas = _cropperInstance.getCroppedCanvas({ width: outWidth, height: outHeight, imageSmoothingQuality: 'high' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        _cropperInstance.destroy();
        _cropperInstance = null;
        _cropCancel = null;
        closeModal();
        onCropped(dataUrl);
    });
}

function cancelImageCropper() {
    if (_cropperInstance) { _cropperInstance.destroy(); _cropperInstance = null; }
    const back = _cropCancel;
    _cropCancel = null;
    if (back) back(); else closeModal(); // go back to the form you came from, don't lose it
}

// ─── AUTH ──────────────────────────────────────────────
async function login(username, password) {
    const data = await api('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    token = data.token;
    currentUsername = data.username;
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_username', currentUsername);
    return data;
}

function logout() {
    token = '';
    currentUsername = '';
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    closeModal();
    $('dashboard').classList.add('hidden');
    $('loginScreen').classList.remove('hidden');
}

async function loadData() {
    portfolioData = await api('/portfolio');
    updateNavCounts();
    return portfolioData;
}

function updateNavCounts() {
    const d = portfolioData;
    if (!d) return;
    document.querySelectorAll('[data-count]').forEach((el) => {
        const list = d[el.dataset.count];
        el.textContent = Array.isArray(list) ? list.length : '';
    });
}

// ─── LOGIN FORM ────────────────────────────────────────
function setLoginNote(msg) {
    const n = $('loginNote');
    n.textContent = msg || '';
    n.classList.toggle('hidden', !msg);
}

$('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = $('loginError');
    const btn = $('loginBtn');
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
        await login($('loginUsername').value, $('loginPassword').value);
        $('loginPassword').value = '';
        await initDashboard();
    } catch (err) {
        errEl.textContent = err.message || 'Invalid username or password.';
        errEl.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign in';
    }
});

$('logoutBtn').addEventListener('click', logout);

// ─── CHANGE PASSWORD MODAL ──────────────────────────────
function openChangePasswordModal() {
    ['cpCurrent', 'cpNew', 'cpConfirm'].forEach((id) => { $(id).value = ''; });
    $('cpError').classList.add('hidden');
    $('changePasswordModal').classList.add('open');
    setTimeout(() => $('cpCurrent').focus(), 30);
}
function closeChangePasswordModal() { $('changePasswordModal').classList.remove('open'); }
$('changePasswordBtn')?.addEventListener('click', openChangePasswordModal);

$('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = $('cpCurrent').value;
    const newPassword = $('cpNew').value;
    const confirmPassword = $('cpConfirm').value;
    const errEl = $('cpError');
    errEl.classList.add('hidden');

    const fail = (m) => { errEl.textContent = m; errEl.classList.remove('hidden'); };
    if (newPassword.length < 8) return fail('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return fail('New password and confirmation do not match.');

    try {
        const data = await api('/admin/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
        token = data.token;
        localStorage.setItem('admin_token', token);
        closeChangePasswordModal();
        showToast('Password updated');
    } catch (err) {
        fail(err.message || 'Failed to change password.');
    }
});

// ─── SIDEBAR (mobile) ───────────────────────────────────
function setSidebar(open) {
    $('sidebar').classList.toggle('open', open);
    $('sidebarBackdrop').classList.toggle('show', open);
}
$('mobileToggle')?.addEventListener('click', () => setSidebar(!$('sidebar').classList.contains('open')));
$('sidebarBackdrop')?.addEventListener('click', () => setSidebar(false));

// ─── RESET ──────────────────────────────────────────────
$('resetBtn').addEventListener('click', async () => {
    const ok = await askConfirm({
        title: 'Reset everything?',
        message: 'This restores ALL portfolio content (about, skills, projects, experience, stats, contact) to the defaults. This cannot be undone.',
        confirmLabel: 'Reset all'
    });
    if (!ok) return;
    await act(async () => {
        await api('/reset', { method: 'POST' });
        await loadData();
        switchSection('overview');
    }, 'Portfolio reset to defaults');
});

// ─── DASHBOARD INIT ────────────────────────────────────
async function initDashboard() {
    const v = await api('/admin/verify');
    currentUsername = v.username;
    localStorage.setItem('admin_username', currentUsername);
    $('sidebarUsername').textContent = `Signed in as ${currentUsername}`;
    await loadData();
    $('loginScreen').classList.add('hidden');
    $('dashboard').classList.remove('hidden');
    switchSection(currentSection);
}

// ─── SECTION SWITCHING ─────────────────────────────────
document.querySelectorAll('.sidebar-link').forEach((link) => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        switchSection(link.dataset.section);
    });
});

const TITLES = {
    overview: 'Overview', about: 'About', skills: 'Skills', projects: 'Projects',
    experience: 'Experience', stats: 'Stats', contact: 'Contact'
};

let listFilter = '';
function switchSection(section) {
    if (section !== currentSection) listFilter = '';
    currentSection = section;
    document.querySelectorAll('.sidebar-link').forEach((l) => l.classList.toggle('active', l.dataset.section === section));
    $('pageTitle').textContent = TITLES[section] || 'Dashboard';
    setSidebar(false);
    const content = $('sectionContent');
    window.scrollTo({ top: 0 });
    ({
        overview: renderOverview, about: renderAbout, skills: renderSkills, projects: renderProjects,
        experience: renderExperience, stats: renderStats, contact: renderContact
    }[section] || renderOverview)(content);
}

// Shared bits for list pages
const rowActions = (editFn, delFn, id) => `
    <div class="item-actions">
        <button class="btn btn-ghost btn-icon" title="Edit" aria-label="Edit" onclick="${editFn}('${esc(id)}')">${ICON.edit}</button>
        <button class="btn btn-danger btn-icon" title="Delete" aria-label="Delete" onclick="${delFn}('${esc(id)}')">${ICON.trash}</button>
    </div>`;

function toolbar({ title, count, addLabel, addFn, search }) {
    return `
        <div class="toolbar">
            <h2>${esc(title)}</h2><span class="count-pill">${count}</span>
            <span class="spacer"></span>
            ${search ? `<input class="input input-sm search" type="search" placeholder="Search…" value="${esc(listFilter)}" oninput="onFilter(this.value)" aria-label="Search">` : ''}
            <button class="btn btn-primary btn-sm" onclick="${addFn}()">${ICON.plus} ${esc(addLabel)}</button>
        </div>
        <div id="listBody"></div>`;
}
function onFilter(v) {
    listFilter = v.trim().toLowerCase();
    ({ skills: paintSkills, projects: paintProjects })[currentSection]?.();
}
const matches = (...fields) => !listFilter || fields.join(' ').toLowerCase().includes(listFilter);
const emptyState = (msg, addFn, addLabel) => `<div class="empty-state">${esc(msg)}${addFn ? `<br><button class="btn btn-primary btn-sm" onclick="${addFn}()">${ICON.plus} ${esc(addLabel)}</button>` : ''}</div>`;

// ══════════════════════════════════════════════════════
// OVERVIEW
// ══════════════════════════════════════════════════════
function renderOverview(el) {
    const d = portfolioData;
    const card = (key, label) => `<a href="#" class="card stat-card" data-go="${key}"><div class="stat-value">${(d[key] || []).length}</div><div class="stat-label">${label}</div></a>`;
    el.innerHTML = `
        <div class="stats-grid">
            ${card('skills', 'Skills')}${card('projects', 'Projects')}${card('experience', 'Experience')}${card('stats', 'Stats')}${card('contact', 'Contact')}
        </div>
        <div class="ov-grid">
            <div class="card">
                <h3 class="card-title">Quick actions</h3>
                <div class="quick">
                    <button class="btn btn-primary btn-sm" onclick="openProjectModal()">${ICON.plus} Project</button>
                    <button class="btn btn-ghost btn-sm" onclick="openSkillModal()">${ICON.plus} Skill</button>
                    <button class="btn btn-ghost btn-sm" onclick="openExpModal()">${ICON.plus} Experience</button>
                    <button class="btn btn-ghost btn-sm" onclick="switchSection('about')">Edit About</button>
                </div>
                <p class="hint" style="margin-top:12px">Changes save straight to your database and show on the portfolio right away.</p>
            </div>
            <div class="card">
                <h3 class="card-title">Session</h3>
                <div class="kv"><span>Signed in as</span><span>${esc(currentUsername)}</span></div>
                <div class="kv"><span>Portfolio</span><span><a href="/" target="_blank" rel="noopener" style="color:var(--accent-2)">${esc(location.origin)}</a></span></div>
                <div class="kv"><span>API</span><span>${esc(API_BASE)}</span></div>
            </div>
        </div>`;
    el.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); switchSection(a.dataset.go); }));
}

// ══════════════════════════════════════════════════════
// ABOUT
// ══════════════════════════════════════════════════════
function statEditRow(s = {}) {
    return `
        <div class="stat-edit">
            <input class="input input-sm" value="${esc(s.value)}" placeholder="Value" aria-label="Value">
            <input class="input input-sm" value="${esc(s.label)}" placeholder="Label" aria-label="Label">
            <button type="button" class="btn btn-danger btn-icon" onclick="this.parentElement.remove()" aria-label="Remove">${ICON.x}</button>
        </div>`;
}

function renderAbout(el) {
    const a = portfolioData.about || {};
    el.innerHTML = `
        <div class="two-col">
            <div class="stack">
                <div class="card">
                    <h3 class="card-title">Profile</h3>
                    <div class="profile-row">
                        ${a.profileImage ? `<img src="${esc(a.profileImage)}" alt="Profile photo">` : '<div class="ph"></div>'}
                        <button class="btn btn-ghost btn-sm" onclick="startProfilePhotoUpload()">Change photo</button>
                    </div>
                    <div class="input-group">
                        <label class="input-label" for="aboutSubtitle">Subtitle</label>
                        <input class="input" id="aboutSubtitle" value="${esc(a.subtitle)}">
                    </div>
                    <div class="input-group" style="margin:0">
                        <label class="input-label" for="aboutTags">Hero tags (comma separated)</label>
                        <input class="input" id="aboutTags" value="${esc((a.tags || []).join(', '))}">
                    </div>
                </div>
                <div class="card">
                    <h3 class="card-title">Quick stats</h3>
                    <div id="aboutStatsList">${(a.stats || []).map(statEditRow).join('')}</div>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="addAboutStatRow()">${ICON.plus} Add stat</button>
                </div>
            </div>
            <div class="card">
                <h3 class="card-title">Bio</h3>
                <div class="input-group">
                    <label class="input-label" for="aboutText1">Paragraph 1 (HTML allowed)</label>
                    <textarea class="input" id="aboutText1" rows="6">${esc(a.text1)}</textarea>
                </div>
                <div class="input-group" style="margin:0">
                    <label class="input-label" for="aboutText2">Paragraph 2 (HTML allowed)</label>
                    <textarea class="input" id="aboutText2" rows="5">${esc(a.text2)}</textarea>
                </div>
            </div>
        </div>
        <div class="savebar">
            <span class="hint">Tip: Ctrl/⌘ + S saves</span>
            <button class="btn btn-primary" id="saveAboutBtn" onclick="saveAbout(this)">Save changes</button>
        </div>`;
}

function startProfilePhotoUpload() {
    openImageCropper({
        title: 'Upload profile photo',
        aspectRatio: 1,
        outWidth: 500,
        onCropped: (dataUrl) => act(async () => {
            await api('/about', { method: 'PUT', body: JSON.stringify({ profileImage: dataUrl }) });
            await loadData();
            renderAbout($('sectionContent'));
        }, 'Profile photo updated')
    });
}

function addAboutStatRow() { $('aboutStatsList').insertAdjacentHTML('beforeend', statEditRow()); }

async function saveAbout(btn) {
    btn = btn || $('saveAboutBtn');
    const stats = [...document.querySelectorAll('#aboutStatsList .stat-edit')]
        .map((row) => { const i = row.querySelectorAll('input'); return { value: i[0].value.trim(), label: i[1].value.trim() }; })
        .filter((s) => s.value || s.label);
    await act(async () => {
        await api('/about', {
            method: 'PUT',
            body: JSON.stringify({
                subtitle: $('aboutSubtitle').value,
                tags: $('aboutTags').value.split(',').map((t) => t.trim()).filter(Boolean),
                text1: $('aboutText1').value,
                text2: $('aboutText2').value,
                stats
            })
        });
        await loadData();
    }, 'About section saved', btn);
}

// ══════════════════════════════════════════════════════
// SKILLS
// ══════════════════════════════════════════════════════
function skillGlyph(s) {
    if (s.type === 'upload') return `<img src="${esc(s.icon)}" alt="">`;
    if (s.icon && window.customElements && customElements.get('iconify-icon')) {
        const style = s.type === 'icon' ? ` style="color:${esc(s.color || 'rgba(255,255,255,0.7)')}"` : '';
        return `<iconify-icon icon="${esc(s.icon)}" width="20" height="20"${style}></iconify-icon>`;
    }
    return esc((s.name || '?').charAt(0));
}

function renderSkills(el) {
    el.innerHTML = toolbar({ title: 'Skills', count: portfolioData.skills.length, addLabel: 'Add skill', addFn: 'openSkillModal', search: true });
    paintSkills();
}
function paintSkills() {
    const list = portfolioData.skills.filter((s) => matches(s.name, s.icon));
    $('listBody').innerHTML = list.length
        ? `<div class="item-list tiles">${list.map((s) => `
            <div class="card item-row">
                <div class="item-num">${skillGlyph(s)}</div>
                <div class="item-info">
                    <div class="item-title">${esc(s.name)}</div>
                    <div class="item-sub">${s.type === 'upload' ? 'Uploaded image' : esc(s.icon)}</div>
                </div>
                ${rowActions('openSkillModal', 'deleteSkill', s.id)}
            </div>`).join('')}</div>`
        : emptyState(listFilter ? 'No skills match your search.' : 'No skills yet.', listFilter ? '' : 'openSkillModal', 'Add skill');
}

let skillDraft = null;
function openSkillModal(id) {
    const s = id ? portfolioData.skills.find((x) => x.id === id) : { name: '', icon: '', type: 'img', color: '' };
    if (!s) return;
    skillDraft = { id, name: s.name, icon: s.icon, type: s.type, color: s.color || '' };
    renderSkillModalBody();
}

function skillPreviewHtml(s) {
    return s.type === 'upload' ? `<img src="${esc(s.icon)}" alt="">` : (s.icon ? `<iconify-icon icon="${esc(s.icon)}" width="22" height="22"></iconify-icon>` : '');
}

function renderSkillModalBody() {
    const s = skillDraft;
    const isUpload = s.type === 'upload';
    openModal(modalShell({
        title: `${s.id ? 'Edit' : 'Add'} skill`,
        body: `
            <div class="form-grid">
                <div class="input-group ${isUpload ? 'span-2' : ''}">
                    <label class="input-label" for="mSkillName">Name</label>
                    <input class="input" id="mSkillName" value="${esc(s.name)}" placeholder="React.js" oninput="skillDraft.name=this.value">
                </div>
                ${isUpload ? '' : `
                <div class="input-group">
                    <label class="input-label" for="mSkillType">Icon type</label>
                    <select class="input" id="mSkillType" onchange="skillDraft.type=this.value;renderSkillModalBody()">
                        <option value="img" ${s.type === 'img' ? 'selected' : ''}>Colour icon</option>
                        <option value="icon" ${s.type === 'icon' ? 'selected' : ''}>Line icon</option>
                    </select>
                </div>`}
                <div class="input-group span-2">
                    <label class="input-label">Icon</label>
                    ${isUpload ? `
                        <div class="img-field">
                            <span class="icon-preview">${skillPreviewHtml(s)}</span>
                            <button type="button" class="btn btn-ghost btn-sm" onclick="startSkillIconUpload()">Change image</button>
                            <button type="button" class="btn btn-ghost btn-sm" onclick="useIconNameForSkill()">Use icon name instead</button>
                        </div>` : `
                        <div class="img-field">
                            <span class="icon-preview" id="skillPreview">${skillPreviewHtml(s)}</span>
                            <input class="input" id="mSkillIcon" value="${esc(s.icon)}" placeholder="logos:react" oninput="skillDraft.icon=this.value;document.getElementById('skillPreview').innerHTML=skillPreviewHtml(skillDraft)">
                            <button type="button" class="btn btn-ghost btn-sm" onclick="startSkillIconUpload()">Upload…</button>
                        </div>
                        <div class="hint">Iconify name such as <code>logos:react</code> or <code>lucide:database</code> — or upload your own image.</div>`}
                </div>
                ${!isUpload && s.type === 'icon' ? `
                <div class="input-group span-2">
                    <label class="input-label" for="mSkillColor">Line icon colour</label>
                    <input class="input" id="mSkillColor" value="${esc(s.color)}" placeholder="rgba(255,255,255,0.65)" oninput="skillDraft.color=this.value">
                </div>` : ''}
            </div>`,
        actions: `<button class="btn btn-ghost" onclick="skillDraft=null;closeModal()">Cancel</button>
                  <button class="btn btn-primary" onclick="saveSkill(${s.id ? `'${esc(s.id)}'` : 'null'},this)">${s.id ? 'Save' : 'Add skill'}</button>`
    }));
}

function startSkillIconUpload() {
    openImageCropper({
        title: 'Upload skill icon',
        aspectRatio: 1,
        outWidth: 256,
        onCancel: renderSkillModalBody,
        onCropped: (dataUrl) => { skillDraft.icon = dataUrl; skillDraft.type = 'upload'; renderSkillModalBody(); }
    });
}
function useIconNameForSkill() { skillDraft.type = 'img'; skillDraft.icon = ''; renderSkillModalBody(); }

async function saveSkill(id, btn) {
    if (!skillDraft.name.trim()) return showToast('Please enter a skill name.', true);
    const body = JSON.stringify({
        name: skillDraft.name.trim(), icon: skillDraft.icon, type: skillDraft.type,
        color: skillDraft.type === 'icon' ? (skillDraft.color || '') : ''
    });
    const ok = await act(async () => {
        if (id) await api(`/skills/${id}`, { method: 'PUT', body });
        else await api('/skills', { method: 'POST', body });
        await loadData();
    }, id ? 'Skill saved' : 'Skill added', btn);
    if (ok) { skillDraft = null; closeModal(); renderSkills($('sectionContent')); }
}

async function deleteSkill(id) {
    const s = portfolioData.skills.find((x) => x.id === id);
    if (!await askConfirm({ title: 'Delete skill?', message: `“${s ? s.name : 'This skill'}” will be removed from your portfolio.` })) return;
    await act(async () => { await api(`/skills/${id}`, { method: 'DELETE' }); await loadData(); renderSkills($('sectionContent')); }, 'Skill deleted');
}

// ══════════════════════════════════════════════════════
// PROJECTS
// ══════════════════════════════════════════════════════
function renderProjects(el) {
    el.innerHTML = toolbar({ title: 'Projects', count: portfolioData.projects.length, addLabel: 'Add project', addFn: 'openProjectModal', search: true });
    paintProjects();
}
function paintProjects() {
    const list = portfolioData.projects.filter((p) => matches(p.title, p.category, (p.tags || []).join(' '), p.description));
    $('listBody').innerHTML = list.length
        ? `<div class="item-list">${list.map((p) => `
            <div class="card item-row">
                <img src="${esc(p.image)}" class="item-thumb" alt="">
                <div class="item-info">
                    <div class="item-title">${esc(p.title)} ${p.liveUrl ? '<span class="badge live">Live</span>' : '<span class="badge off">No link</span>'}</div>
                    <div class="item-sub">${esc(p.category)}${p.wide ? ' · Wide' : ''}</div>
                    <div class="item-desc">${esc(p.description)}</div>
                </div>
                ${rowActions('openProjectModal', 'deleteProject', p.id)}
            </div>`).join('')}</div>`
        : emptyState(listFilter ? 'No projects match your search.' : 'No projects yet.', listFilter ? '' : 'openProjectModal', 'Add project');
}

let projectDraft = null;
function openProjectModal(id) {
    const p = id ? portfolioData.projects.find((x) => x.id === id)
        : { title: '', category: '', description: '', tags: [], image: '', liveUrl: '', wide: false, problem: '', solution: '', result: '' };
    if (!p) return;
    projectDraft = {
        id, title: p.title, category: p.category, description: p.description, tags: p.tags || [], image: p.image,
        liveUrl: p.liveUrl || '', wide: !!p.wide, problem: p.problem || '', solution: p.solution || '', result: p.result || ''
    };
    renderProjectModalBody();
}

function renderProjectModalBody() {
    const p = projectDraft;
    const hasCase = p.problem || p.solution || p.result;
    openModal(modalShell({
        title: `${p.id ? 'Edit' : 'Add'} project`,
        body: `
            <div class="form-grid">
                <div class="input-group"><label class="input-label" for="mProjTitle">Title</label><input class="input" id="mProjTitle" value="${esc(p.title)}" placeholder="AI Document Chatbot" oninput="projectDraft.title=this.value"></div>
                <div class="input-group"><label class="input-label" for="mProjCat">Category</label><input class="input" id="mProjCat" value="${esc(p.category)}" placeholder="AI / NLP" oninput="projectDraft.category=this.value"></div>
                <div class="input-group span-2"><label class="input-label" for="mProjDesc">Description</label><textarea class="input" id="mProjDesc" rows="2" placeholder="Brief description…" oninput="projectDraft.description=this.value">${esc(p.description)}</textarea></div>
                <div class="input-group span-2"><label class="input-label" for="mProjTags">Tags (comma separated)</label><input class="input" id="mProjTags" value="${esc(p.tags.join(', '))}" placeholder="React, Node.js" oninput="projectDraft.tags=this.value.split(',').map(t=>t.trim()).filter(Boolean)"></div>
                <div class="input-group">
                    <label class="input-label">Project image</label>
                    <div class="img-field">
                        ${p.image ? `<img src="${esc(p.image)}" alt="">` : ''}
                        <button type="button" class="btn btn-ghost btn-sm" onclick="startProjectImageUpload()">${p.image ? 'Change' : 'Choose image…'}</button>
                    </div>
                </div>
                <div class="input-group">
                    <label class="input-label" for="mProjLive">Live link (optional)</label>
                    <input class="input" id="mProjLive" value="${esc(p.liveUrl)}" placeholder="https://your-project.com" oninput="projectDraft.liveUrl=this.value.trim()">
                </div>
                <div class="span-2 hint" style="margin-top:-4px">With a live link, the project opens in the Desktop/Mobile preview window. Sites that forbid embedding automatically fall back to a snapshot + “Open live site”.</div>
                <div class="span-2">
                    <details class="collapse" ${hasCase ? 'open' : ''}>
                        <summary>Case study (optional)</summary>
                        <div class="form-grid">
                            <div class="input-group span-2"><label class="input-label">Challenge</label><textarea class="input" rows="2" placeholder="What problem did this solve?" oninput="projectDraft.problem=this.value">${esc(p.problem)}</textarea></div>
                            <div class="input-group span-2"><label class="input-label">Solution</label><textarea class="input" rows="2" placeholder="What did you build and how?" oninput="projectDraft.solution=this.value">${esc(p.solution)}</textarea></div>
                            <div class="input-group span-2"><label class="input-label">Result</label><textarea class="input" rows="2" placeholder="Outcome, numbers, learnings…" oninput="projectDraft.result=this.value">${esc(p.result)}</textarea></div>
                        </div>
                    </details>
                </div>
                <label class="checkbox-label span-2"><input type="checkbox" ${p.wide ? 'checked' : ''} onchange="projectDraft.wide=this.checked"> Wide layout (spans the full width of the grid)</label>
            </div>`,
        actions: `<button class="btn btn-ghost" onclick="projectDraft=null;closeModal()">Cancel</button>
                  <button class="btn btn-primary" onclick="saveProject(${p.id ? `'${esc(p.id)}'` : 'null'},this)">${p.id ? 'Save' : 'Add project'}</button>`
    }), { wide: true });
}

function startProjectImageUpload() {
    openImageCropper({
        title: 'Upload project image',
        aspectRatio: 8 / 5,
        outWidth: 800,
        wide: true,
        onCancel: renderProjectModalBody,
        onCropped: (dataUrl) => { projectDraft.image = dataUrl; renderProjectModalBody(); }
    });
}

async function saveProject(id, btn) {
    const d = projectDraft;
    if (!d.title.trim()) return showToast('Please enter a title.', true);
    if (!d.image) return showToast('Please choose a project image first.', true);
    if (d.liveUrl && !/^https?:\/\//i.test(d.liveUrl)) return showToast('Live link must start with http:// or https://', true);
    // Empty strings (not undefined) so that clearing a field really clears it on the server.
    const body = JSON.stringify({
        title: d.title.trim(), category: d.category, description: d.description, tags: d.tags, image: d.image,
        liveUrl: d.liveUrl, problem: d.problem, solution: d.solution, result: d.result, wide: d.wide
    });
    const ok = await act(async () => {
        if (id) await api(`/projects/${id}`, { method: 'PUT', body });
        else await api('/projects', { method: 'POST', body });
        await loadData();
    }, id ? 'Project saved' : 'Project added', btn);
    if (ok) { projectDraft = null; closeModal(); renderProjects($('sectionContent')); }
}

async function deleteProject(id) {
    const p = portfolioData.projects.find((x) => x.id === id);
    if (!await askConfirm({ title: 'Delete project?', message: `“${p ? p.title : 'This project'}” will be removed from your portfolio.` })) return;
    await act(async () => { await api(`/projects/${id}`, { method: 'DELETE' }); await loadData(); renderProjects($('sectionContent')); }, 'Project deleted');
}

// ══════════════════════════════════════════════════════
// EXPERIENCE
// ══════════════════════════════════════════════════════
function renderExperience(el) {
    el.innerHTML = toolbar({ title: 'Experience', count: portfolioData.experience.length, addLabel: 'Add entry', addFn: 'openExpModal' });
    $('listBody').innerHTML = portfolioData.experience.length
        ? `<div class="item-list">${portfolioData.experience.map((t, i) => `
            <div class="card item-row">
                <div class="item-num">${i + 1}</div>
                <div class="item-info">
                    <div class="item-title">${esc(t.title)}</div>
                    <div class="item-sub">${esc(t.label)} · ${esc(t.side)}</div>
                    <div class="item-desc">${esc(t.description)}</div>
                </div>
                ${rowActions('openExpModal', 'deleteExp', t.id)}
            </div>`).join('')}</div>`
        : emptyState('No experience entries yet.', 'openExpModal', 'Add entry');
}

function openExpModal(id) {
    const t = id ? portfolioData.experience.find((x) => x.id === id) : { label: '', title: '', description: '', side: 'left' };
    if (!t) return;
    openModal(modalShell({
        title: `${id ? 'Edit' : 'Add'} experience`,
        body: `
            <div class="form-grid">
                <div class="input-group"><label class="input-label" for="mExpLabel">Label</label><input class="input" id="mExpLabel" value="${esc(t.label)}" placeholder="Ongoing"></div>
                <div class="input-group"><label class="input-label" for="mExpSide">Timeline side</label>
                    <select class="input" id="mExpSide"><option value="left" ${t.side === 'left' ? 'selected' : ''}>Left</option><option value="right" ${t.side === 'right' ? 'selected' : ''}>Right</option></select>
                </div>
                <div class="input-group span-2"><label class="input-label" for="mExpTitle">Title</label><input class="input" id="mExpTitle" value="${esc(t.title)}" placeholder="Full Stack Development"></div>
                <div class="input-group span-2"><label class="input-label" for="mExpDesc">Description</label><textarea class="input" id="mExpDesc" rows="4" placeholder="What you did…">${esc(t.description)}</textarea></div>
            </div>`,
        actions: `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                  <button class="btn btn-primary" onclick="saveExp(${id ? `'${esc(id)}'` : 'null'},this)">${id ? 'Save' : 'Add entry'}</button>`
    }));
}

async function saveExp(id, btn) {
    const body = JSON.stringify({
        label: $('mExpLabel').value, title: $('mExpTitle').value,
        description: $('mExpDesc').value, side: $('mExpSide').value
    });
    if (!$('mExpTitle').value.trim()) return showToast('Please enter a title.', true);
    const ok = await act(async () => {
        if (id) await api(`/experience/${id}`, { method: 'PUT', body });
        else await api('/experience', { method: 'POST', body });
        await loadData();
    }, id ? 'Experience saved' : 'Experience added', btn);
    if (ok) { closeModal(); renderExperience($('sectionContent')); }
}

async function deleteExp(id) {
    if (!await askConfirm({ title: 'Delete entry?', message: 'This experience entry will be removed from your portfolio.' })) return;
    await act(async () => { await api(`/experience/${id}`, { method: 'DELETE' }); await loadData(); renderExperience($('sectionContent')); }, 'Experience deleted');
}

// ══════════════════════════════════════════════════════
// STATS
// ══════════════════════════════════════════════════════
function renderStats(el) {
    el.innerHTML = toolbar({ title: 'Stats', count: portfolioData.stats.length, addLabel: 'Add stat', addFn: 'openStatModal' });
    $('listBody').innerHTML = portfolioData.stats.length
        ? `<div class="item-list tiles">${portfolioData.stats.map((s) => `
            <div class="card item-row">
                <div class="item-num" style="width:auto;min-width:40px;padding:0 8px;font-family:'Playfair Display',serif;color:var(--accent-2)">${esc(s.value)}</div>
                <div class="item-info"><div class="item-title">${esc(s.label)}</div></div>
                ${rowActions('openStatModal', 'deleteStat', s.id)}
            </div>`).join('')}</div>`
        : emptyState('No stats yet.', 'openStatModal', 'Add stat');
}

function openStatModal(id) {
    const s = id ? portfolioData.stats.find((x) => x.id === id) : { value: '', label: '' };
    if (!s) return;
    openModal(modalShell({
        title: `${id ? 'Edit' : 'Add'} stat`,
        body: `
            <div class="form-grid">
                <div class="input-group"><label class="input-label" for="mStatVal">Value (number)</label><input type="number" class="input" id="mStatVal" value="${esc(s.value)}" placeholder="20"></div>
                <div class="input-group"><label class="input-label" for="mStatLabel">Label</label><input class="input" id="mStatLabel" value="${esc(s.label)}" placeholder="Projects completed"></div>
            </div>`,
        actions: `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                  <button class="btn btn-primary" onclick="saveStat(${id ? `'${esc(id)}'` : 'null'},this)">${id ? 'Save' : 'Add stat'}</button>`
    }));
}

async function saveStat(id, btn) {
    const value = parseInt($('mStatVal').value, 10);
    const label = $('mStatLabel').value.trim();
    if (Number.isNaN(value)) return showToast('Enter a number for the value.', true);
    if (!label) return showToast('Please enter a label.', true);
    const stats = id
        ? portfolioData.stats.map((s) => (s.id === id ? { ...s, value, label } : s))
        : [...portfolioData.stats, { value, label }];
    const ok = await act(async () => {
        await api('/stats', { method: 'PUT', body: JSON.stringify(stats) });
        await loadData();
    }, id ? 'Stat saved' : 'Stat added', btn);
    if (ok) { closeModal(); renderStats($('sectionContent')); }
}

async function deleteStat(id) {
    if (!await askConfirm({ title: 'Delete stat?', message: 'This stat will be removed from your portfolio.' })) return;
    await act(async () => {
        await api('/stats', { method: 'PUT', body: JSON.stringify(portfolioData.stats.filter((s) => s.id !== id)) });
        await loadData();
        renderStats($('sectionContent'));
    }, 'Stat deleted');
}

// ══════════════════════════════════════════════════════
// CONTACT
// ══════════════════════════════════════════════════════
function renderContact(el) {
    el.innerHTML = toolbar({ title: 'Contact info', count: portfolioData.contact.length, addLabel: 'Add contact', addFn: 'openContactModal' });
    $('listBody').innerHTML = portfolioData.contact.length
        ? `<div class="item-list">${portfolioData.contact.map((c) => `
            <div class="card item-row">
                <div class="item-num" style="${c.isWhatsApp ? 'color:#25D366;border-color:rgba(37,211,102,0.3)' : ''}">${esc((c.label || '?').charAt(0))}</div>
                <div class="item-info">
                    <div class="item-title">${esc(c.label)}</div>
                    <div class="item-sub">${esc(c.value)}</div>
                    <div class="item-desc">${esc(c.href)}</div>
                </div>
                ${rowActions('openContactModal', 'deleteContact', c.id)}
            </div>`).join('')}</div>`
        : emptyState('No contact items yet.', 'openContactModal', 'Add contact');
}

function openContactModal(id) {
    const c = id ? portfolioData.contact.find((x) => x.id === id) : { icon: 'lucide:globe', label: '', value: '', href: '', isWhatsApp: false };
    if (!c) return;
    openModal(modalShell({
        title: `${id ? 'Edit' : 'Add'} contact`,
        body: `
            <div class="form-grid">
                <div class="input-group"><label class="input-label" for="mContLabel">Label</label><input class="input" id="mContLabel" value="${esc(c.label)}" placeholder="Email"></div>
                <div class="input-group"><label class="input-label" for="mContIcon">Icon (Iconify name)</label><input class="input" id="mContIcon" value="${esc(c.icon)}" placeholder="lucide:mail"></div>
                <div class="input-group"><label class="input-label" for="mContValue">Display value</label><input class="input" id="mContValue" value="${esc(c.value)}" placeholder="you@example.com"></div>
                <div class="input-group"><label class="input-label" for="mContHref">Link URL</label><input class="input" id="mContHref" value="${esc(c.href)}" placeholder="mailto:… or https://…"></div>
                <label class="checkbox-label span-2"><input type="checkbox" id="mContWa" ${c.isWhatsApp ? 'checked' : ''}> WhatsApp (green styling)</label>
            </div>`,
        actions: `<button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                  <button class="btn btn-primary" onclick="saveContact(${id ? `'${esc(id)}'` : 'null'},this)">${id ? 'Save' : 'Add contact'}</button>`
    }));
}

async function saveContact(id, btn) {
    const body = JSON.stringify({
        icon: $('mContIcon').value, label: $('mContLabel').value, value: $('mContValue').value,
        href: $('mContHref').value, isWhatsApp: $('mContWa').checked
    });
    if (!$('mContLabel').value.trim()) return showToast('Please enter a label.', true);
    const ok = await act(async () => {
        if (id) await api(`/contact/${id}`, { method: 'PUT', body });
        else await api('/contact', { method: 'POST', body });
        await loadData();
    }, id ? 'Contact saved' : 'Contact added', btn);
    if (ok) { closeModal(); renderContact($('sectionContent')); }
}

async function deleteContact(id) {
    if (!await askConfirm({ title: 'Delete contact?', message: 'This contact item will be removed from your portfolio.' })) return;
    await act(async () => { await api(`/contact/${id}`, { method: 'DELETE' }); await loadData(); renderContact($('sectionContent')); }, 'Contact deleted');
}

// ─── KEYBOARD SHORTCUTS ─────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if ($('changePasswordModal').classList.contains('open')) closeChangePasswordModal();
        else if ($('modal').classList.contains('open')) { if (window.__confirmResolve) window.__confirmResolve(false); else if (_cropperInstance || _cropCancel) cancelImageCropper(); else closeModal(); }
        else setSidebar(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && currentSection === 'about' && $('saveAboutBtn')) {
        e.preventDefault();
        saveAbout($('saveAboutBtn'));
    }
});

// ─── BOOT: restore the saved session instead of asking for the password on every refresh ───
(async function boot() {
    if (!token) return;
    setLoginNote('Restoring your session…');
    try {
        await initDashboard();
    } catch (err) {
        // Expired token → api() already signed out. Network error → keep the token, let them retry.
        if (token) {
            const e = $('loginError');
            e.textContent = err.message;
            e.classList.remove('hidden');
        }
    } finally {
        setLoginNote('');
    }
})();
