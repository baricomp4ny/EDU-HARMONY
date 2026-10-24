/* common.js - penyimpanan, autentikasi, layout (sidebar) & helper karakter (dipakai semua halaman) */

/*
 * Skema data (localStorage). Setiap fakta disimpan sekali; nama orang & hasil tipe dihitung saat ditampilkan.
 *   users        { [nim/nip]: { role, name, passwordHash, createdAt } }
 *   personality  { [userId]: { answers: [typeKey x10], mode, takenAt } }
 *   tasks        [ { id, ownerId, title, due, done, createdAt } ]
 *   forum        [ { id, authorId, type, title, body, createdAt } ]
 *   groups       [ { id, creatorId, name, size, memberIds: [userId] } ]
 *   mentors      [ { id, addedById, name, topic, createdAt } ]
 * id = UUID acak, bukan nomor urut (auto increment).
 */
const KEYS = {
    users: 'edu_users_v2',
    personality: 'edu_personality_v2',
    tasks: 'edu_tasks_v2',
    forum: 'edu_forum_v2',
    groups: 'edu_groups_v2',
    mentors: 'edu_mentors_v2'
};

const ROLE_LABEL = { mahasiswa: 'Mahasiswa', dosen: 'Dosen', admin: 'Admin' };
const ID_LABEL = { mahasiswa: 'NIM', dosen: 'NIP', admin: 'Username' };

// demo accounts
const demoAccounts = {
    mahasiswa: [
        { id: '19240372', password: 'mahasiswa', name: 'Hariri' },
        { id: '19240475', password: 'mahasiswa', name: "Muhammad Arrafi'ie" }
    ],
    dosen: [
        { id: '123456', password: 'dosen', name: 'Dr. Hilda Rachmi, S.Kom., M.Kom.' }
    ],
    admin: [
        { id: 'admin', password: 'admin', name: 'Administrator' }
    ]
};

/* ---------- storage ---------- */
const store = {
    get(key, fallback){
        try{ const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
        catch(e){ return fallback; }
    },
    getList(key){ const v = this.get(key, []); return Array.isArray(v) ? v : []; },
    getMap(key){ const v = this.get(key, {}); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; },
    set(key, value){
        try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch(e){ toast('Gagal menyimpan data (penyimpanan browser penuh atau diblokir).', 'error'); return false; }
    }
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function escapeHtml(value){
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

// UUID v4 acak; tidak berurutan dan tidak bisa ditebak dari waktu pembuatan
function uid(){
    if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function initials(name){
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/* ---------- auth ---------- */
async function hashPassword(pw){
    if(window.crypto && crypto.subtle && window.TextEncoder){
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
        return 'sha256:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // fallback non-kriptografis bila browser tidak menyediakan crypto.subtle
    let h = 5381;
    for(const c of pw) h = ((h << 5) + h + c.codePointAt(0)) >>> 0;
    return 'djb2:' + h.toString(16);
}

async function verifyPassword(pw, hash){
    return typeof hash === 'string' && (await hashPassword(pw)) === hash;
}

function findDemoAccount(role, id){
    return (demoAccounts[role] || []).find(u => u.id === id) || null;
}

function findRegisteredAccount(role, id){
    const users = store.getMap(KEYS.users);
    return hasOwn(users, id) && users[id].role === role ? users[id] : null;
}

function idExists(id){
    return Object.values(demoAccounts).some(list => list.some(u => u.id === id)) || hasOwn(store.getMap(KEYS.users), id);
}

function getUserName(id){
    for(const list of Object.values(demoAccounts)){
        const u = list.find(a => a.id === id);
        if(u) return u.name;
    }
    const users = store.getMap(KEYS.users);
    return hasOwn(users, id) ? users[id].name : id;
}

async function authenticate(role, id, password){
    if(!hasOwn(ROLE_LABEL, role) || !id || !password) return null;
    const demo = findDemoAccount(role, id);
    if(demo) return demo.password === password ? { role, id: demo.id, name: demo.name } : null;
    const reg = findRegisteredAccount(role, id);
    return reg && await verifyPassword(password, reg.passwordHash) ? { role, id, name: reg.name } : null;
}

function getCurrentUser(){
    try{
        const u = JSON.parse(sessionStorage.getItem('currentUser'));
        return u && hasOwn(ROLE_LABEL, u.role) && typeof u.id === 'string' ? u : null;
    }catch(e){ return null; }
}

function setCurrentUser(user){
    sessionStorage.setItem('currentUser', JSON.stringify({ role: user.role, id: user.id, name: user.name }));
}

function logout(){
    sessionStorage.removeItem('currentUser');
    location.replace('index.html');
}

/* ---------- kepribadian / karakter ---------- */
// yang disimpan hanya jawaban + mode; tipe, sisi kedua & skor selalu dihitung ulang dari jawaban
function derivePersonality(rec){
    const valid = rec && Array.isArray(rec.answers) && rec.answers.length === TEST_QUESTIONS.length
        && rec.answers.every(k => hasOwn(CHARACTERS, k));
    if(!valid) return null;
    const res = classifyAnswers(rec.answers);
    return { ...res, answers: rec.answers, mode: hasOwn(LEARNING_MODES, rec.mode) ? rec.mode : CHARACTERS[res.key].mode, takenAt: rec.takenAt };
}

function getPersonality(userId){
    const all = store.getMap(KEYS.personality);
    return hasOwn(all, userId) ? derivePersonality(all[userId]) : null;
}

function getAllPersonalities(){
    return Object.values(store.getMap(KEYS.personality)).map(derivePersonality).filter(Boolean);
}

function savePersonality(userId, { answers, mode, takenAt }){
    const all = store.getMap(KEYS.personality);
    all[userId] = { answers, mode, takenAt };
    return store.set(KEYS.personality, all);
}

function homeFor(user){
    return user.role === 'mahasiswa' && !getPersonality(user.id) ? 'test.html' : 'dashboard.html';
}

function characterPlaceholderHtml(emoji, label){
    return `<div class="char-placeholder"><span aria-hidden="true">${escapeHtml(emoji)}</span><small>${escapeHtml(label)}</small></div>`;
}

// slot gambar karakter; tanpa `image` langsung tampil placeholder, path yang salah diganti lewat listener 'error' di bawah
function characterFigureHtml(key, extraClass = ''){
    const c = CHARACTERS[key];
    if(!c) return `<div class="char-figure ${extraClass}">${characterPlaceholderHtml('?', 'belum tes')}</div>`;
    const inner = c.image
        ? `<img class="char-img" src="${escapeHtml(c.image)}" alt="Karakter ${escapeHtml(c.name)}" data-emoji="${escapeHtml(c.emoji)}" data-name="${escapeHtml(c.name)}">`
        : characterPlaceholderHtml(c.emoji, c.name);
    return `<div class="char-figure ${extraClass}" style="--char:${escapeHtml(c.color)}">${inner}</div>`;
}

function characterBadgeHtml(userId){
    const p = getPersonality(userId);
    if(!p) return '';
    const c = CHARACTERS[p.key];
    return `<span class="char-badge" style="--char:${escapeHtml(c.color)}" title="${escapeHtml(c.name + ' • ' + c.label)}">${escapeHtml(c.emoji)}</span>`;
}

function characterGalleryHtml(){
    return `<div class="gallery">${Object.values(CHARACTERS).map(c => `
        <div class="gallery-item" style="--char:${escapeHtml(c.color)}">
            ${characterFigureHtml(c.key)}
            <strong>${escapeHtml(c.label)}</strong>
        </div>`).join('')}</div>`;
}

document.addEventListener('error', e => {
    const img = e.target;
    if(!(img instanceof HTMLImageElement) || !img.classList.contains('char-img')) return;
    console.warn('Gambar karakter tidak ditemukan:', img.getAttribute('src'));
    img.outerHTML = characterPlaceholderHtml(img.dataset.emoji || '?', img.dataset.name || '');
}, true);

/* ---------- ui helpers ---------- */
function toast(message, type = 'info'){
    let box = document.getElementById('toastBox');
    if(!box){
        box = document.createElement('div');
        box.id = 'toastBox';
        box.className = 'toast-box';
        box.setAttribute('role', 'status');
        document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
}

function formatDateTime(ts){
    const d = new Date(ts);
    return isNaN(d) ? '' : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const NAV_ITEMS = [
    { page: 'dashboard', href: 'dashboard.html', icon: 'fa-house', label: 'Dashboard' },
    { page: 'test', href: 'test.html', icon: 'fa-puzzle-piece', label: 'Tes Karakter', roles: ['mahasiswa'] },
    { page: 'profile', href: 'profile.html', icon: 'fa-user', label: 'Profil' },
    { page: 'tasks', href: 'tasks.html', icon: 'fa-list-check', label: 'Tugas' },
    { page: 'groups', href: 'groups.html', icon: 'fa-users', label: 'Kelompok' },
    { page: 'forum', href: 'forum.html', icon: 'fa-comments', label: 'Forum' },
    { page: 'mentoring', href: 'mentoring.html', icon: 'fa-hand-holding-heart', label: 'Mentoring' }
];

function renderSidebar(user, page){
    const el = document.getElementById('sidebar');
    if(!el) return;
    const links = NAV_ITEMS.filter(n => !n.roles || n.roles.includes(user.role)).map(n =>
        `<a href="${n.href}" class="nav-link${n.page === page ? ' active' : ''}"${n.page === page ? ' aria-current="page"' : ''}><i class="fas ${n.icon}" aria-hidden="true"></i><span>${n.label}</span></a>`
    ).join('');
    const needsTest = user.role === 'mahasiswa' && !getPersonality(user.id) && page !== 'test';
    el.innerHTML = `
        <a href="dashboard.html" class="brand">Edu-Harmony<span>.</span></a>
        <nav class="nav" aria-label="Menu utama">${links}</nav>
        <div class="sidebar-bottom">
            ${needsTest ? `<div class="promo-card">
                <div class="promo-emoji" aria-hidden="true">${Object.values(CHARACTERS).map(c => escapeHtml(c.emoji)).join('')}</div>
                <strong>Karakter belajarmu apa?</strong>
                <a href="test.html" class="btn btn-sm">Mulai Tes</a>
            </div>` : ''}
            <a href="#" class="nav-link" data-logout><i class="fas fa-right-from-bracket" aria-hidden="true"></i><span>Keluar</span></a>
        </div>`;
}

function renderUserBadge(user){
    const el = document.getElementById('userWelcome');
    if(!el) return;
    const p = getPersonality(user.id);
    const sub = p ? `${CHARACTERS[p.key].emoji} ${CHARACTERS[p.key].name}` : ROLE_LABEL[user.role];
    el.innerHTML = `
        <div class="avatar" aria-hidden="true">${escapeHtml(initials(user.name))}</div>
        <div><strong>${escapeHtml(user.name)}</strong><div class="muted">${escapeHtml(sub)}</div></div>`;
}

/* ---------- login page ---------- */
function initLogin(){
    const form = document.getElementById('loginForm');
    if(!form) return;
    const idInput = document.getElementById('loginId');
    const idLabel = document.getElementById('loginIdLabel');
    const pwInput = document.getElementById('password');
    const err = document.getElementById('loginError');
    let role = 'mahasiswa';
    const chars = document.getElementById('authChars');
    if(chars) chars.outerHTML = characterGalleryHtml();

    const setRole = r => {
        role = r;
        document.querySelectorAll('.role-option').forEach(o => {
            const on = o.dataset.role === r;
            o.classList.toggle('active', on);
            o.setAttribute('aria-pressed', on);
        });
        idLabel.textContent = ID_LABEL[r];
        idInput.placeholder = 'Masukkan ' + ID_LABEL[r];
        idInput.inputMode = r === 'admin' ? 'text' : 'numeric';
        err.hidden = true;
    };
    document.querySelectorAll('.role-option').forEach(opt => opt.addEventListener('click', () => setRole(opt.dataset.role)));

    document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
        const [r, id, pw] = b.dataset.demo.split('|');
        setRole(r);
        idInput.value = id;
        pwInput.value = pw;
    }));

    const tp = document.getElementById('togglePassword');
    tp && tp.addEventListener('click', () => {
        const show = pwInput.type === 'password';
        pwInput.type = show ? 'text' : 'password';
        tp.innerHTML = show ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        tp.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        const user = await authenticate(role, idInput.value.trim(), pwInput.value);
        btn.disabled = false;
        if(!user){
            err.textContent = `${ID_LABEL[role]} atau password salah.`;
            err.hidden = false;
            pwInput.value = '';
            pwInput.focus();
            return;
        }
        setCurrentUser(user);
        location.replace(homeFor(user));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page || '';
    const user = getCurrentUser();

    if(document.body.dataset.auth === 'required'){
        if(!user){ location.replace('index.html'); return; }
        renderSidebar(user, page);
        renderUserBadge(user);
    }
    if(page === 'login'){
        if(user){ location.replace(homeFor(user)); return; }
        initLogin();
    }
    document.body.classList.add('ready');

    document.addEventListener('click', e => {
        if(!e.target.closest('[data-logout]')) return;
        e.preventDefault();
        if(confirm('Keluar dari akun?')) logout();
    });
});
