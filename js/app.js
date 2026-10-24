/* app.js - fitur per halaman: register, dashboard, tes karakter, profil, tugas, forum, kelompok, mentoring */

document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    const user = getCurrentUser();
    if(document.body.dataset.auth === 'required' && !user) return;
    const pages = {
        register: initRegister,
        dashboard: initDashboard,
        test: initTest,
        profile: initProfile,
        tasks: initTasks,
        forum: initForum,
        groups: initGroups,
        mentoring: initMentoring
    };
    pages[page] && pages[page](user);
});

const isStaff = user => user.role === 'dosen' || user.role === 'admin';

function emptyHtml(text, icon = 'fa-mug-hot'){
    return `<div class="empty"><i class="fas ${icon}" aria-hidden="true"></i><span>${escapeHtml(text)}</span></div>`;
}

function showFormMsg(el, text, ok = false){
    el.textContent = text;
    el.className = 'form-msg ' + (ok ? 'ok' : 'error');
    el.hidden = false;
}

// 'YYYY-MM-DD' -> Date lokal (bukan UTC) agar tidak bergeser sehari
function parseLocalDate(str){
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}

function todayLocal(){
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dueInfo(task){
    const d = parseLocalDate(task.due);
    if(!d) return { text: 'Tanpa tenggat', cls: '' };
    const diff = Math.round((d - todayLocal()) / 86400000);
    const text = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    if(task.done) return { text, cls: '' };
    if(diff < 0) return { text: `${text} • terlambat`, cls: 'tag-danger' };
    if(diff === 0) return { text: `${text} • hari ini`, cls: 'tag-warn' };
    if(diff <= 3) return { text: `${text} • ${diff} hari lagi`, cls: 'tag-warn' };
    return { text, cls: '' };
}

/* ---------- komponen karakter ---------- */
function radarSvg(values){
    const cx = 150, cy = 115, r = 72, n = STRENGTH_AXES.length;
    const pt = (i, scale) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return [cx + Math.cos(a) * r * scale, cy + Math.sin(a) * r * scale];
    };
    const ring = s => STRENGTH_AXES.map((_, i) => pt(i, s).join(',')).join(' ');
    const rings = [1 / 3, 2 / 3, 1].map(s => `<polygon points="${ring(s)}" class="radar-ring"/>`).join('');
    const spokes = STRENGTH_AXES.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="radar-ring"/>`; }).join('');
    const area = values.map((v, i) => pt(i, Math.max(0, Math.min(1, v))).join(',')).join(' ');
    const labels = STRENGTH_AXES.map((label, i) => {
        const [x, y] = pt(i, 1.28);
        const anchor = Math.abs(x - cx) < 4 ? 'middle' : (x > cx ? 'start' : 'end');
        return `<text x="${x}" y="${y + 4}" text-anchor="${anchor}" class="radar-label">${escapeHtml(label)}</text>`;
    }).join('');
    return `<svg viewBox="0 0 300 230" class="radar" role="img" aria-label="Grafik kekuatan: ${STRENGTH_AXES.map((l, i) => `${l} ${Math.round(values[i] * 100)}%`).join(', ')}">${rings}${spokes}<polygon points="${area}" class="radar-area"/>${labels}</svg>`;
}

// persentase pengguna sistem yang bertipe sama
function typeShare(key){
    const all = Object.values(store.getMap(KEYS.personality)).filter(r => r && hasOwn(CHARACTERS, r.key));
    return all.length ? Math.round(all.filter(r => r.key === key).length / all.length * 100) : 0;
}

function answerBarsHtml(scores){
    const total = TEST_QUESTIONS.length;
    return TYPE_ORDER.filter(k => CHARACTERS[k]).map(k => {
        const c = CHARACTERS[k], n = scores && scores[k] || 0;
        return `<div class="bar-line"><span class="bar-name">${escapeHtml(c.emoji + ' ' + c.label)}</span><div class="progress"><span style="width:${n / total * 100}%;background:${escapeHtml(c.color)}"></span></div><span class="bar-val">${n}/${total}</span></div>`;
    }).join('');
}

function characterCardHtml(result){
    const c = CHARACTERS[result.key];
    const mode = LEARNING_MODES[result.mode] || LEARNING_MODES[c.mode];
    const second = result.second && CHARACTERS[result.second];
    const partners = c.partners.filter(k => CHARACTERS[k]).map(k => `
        <div class="partner">${characterFigureHtml(k, 'char-sm')}<span>${escapeHtml(CHARACTERS[k].name)}</span></div>`).join('');
    return `
    <article class="char-card" style="--char:${escapeHtml(c.color)}">
        <div class="char-head">
            <p class="px-kicker">Karakter belajarmu...</p>
            <h2 class="px-title">${escapeHtml(c.name)}</h2>
            <div class="px-tags">${c.tags.map(t => `<span class="px-tag">${escapeHtml(t)}</span>`).join('')}</div>
            <p class="px-share"><b>${typeShare(c.key)}%</b> pengguna EDU-HARMONY juga tipe <b>${escapeHtml(c.label)}</b></p>
            ${second ? `<p class="px-score">Sisi keduamu: ${escapeHtml(second.emoji + ' ' + second.label)}</p>` : ''}
        </div>
        <div class="px-box char-stage">${characterFigureHtml(c.key)}</div>
        <section class="px-box">
            <h3 class="px-box-head">Kekuatan</h3>
            ${radarSvg(c.strengths)}
        </section>
        <section class="px-box px-quote">
            <h3 class="px-box-head">Kata Teman Sekelas</h3>
            <p>${escapeHtml(c.quote)}</p>
        </section>
        <section class="px-box px-guide">
            <h3 class="px-box-head">Panduan Belajar</h3>
            <p>${escapeHtml(c.guide)}</p>
        </section>
        <section class="px-box">
            <h3 class="px-box-head">Komposisi Jawaban</h3>
            <div class="px-bars">${answerBarsHtml(result.scores)}</div>
        </section>
        <div class="px-trio px-wide">
            <section class="px-box"><h3 class="px-box-head">Mode Belajar</h3><p class="px-big"><i class="fas ${mode.icon}" aria-hidden="true"></i> ${escapeHtml(mode.name)}</p></section>
            <section class="px-box"><h3 class="px-box-head">Peran Cocok</h3><p class="px-big">${c.roles.map(escapeHtml).join(', ')}</p></section>
            <section class="px-box"><h3 class="px-box-head">Jimat Belajar</h3><p class="px-big">${escapeHtml(c.energy)}</p></section>
        </div>
        <section class="px-box px-wide">
            <h3 class="px-box-head">Partner Kelompok Ideal</h3>
            <div class="partners">${partners || '<p>-</p>'}</div>
        </section>
    </article>`;
}

function modePickerHtml(result){
    const c = CHARACTERS[result.key];
    return `
    <section class="card">
        <h3>Pilih Mode Belajar</h3>
        <p class="muted">Rekomendasi untuk ${escapeHtml(c.name)}: <b>${escapeHtml(LEARNING_MODES[c.mode].name)}</b>. Kamu tetap bebas berpindah mode kapan saja.</p>
        <div class="mode-grid">
            ${Object.values(LEARNING_MODES).map(m => `
            <button type="button" class="mode-option${result.mode === m.key ? ' active' : ''}" data-mode="${m.key}" aria-pressed="${result.mode === m.key}">
                <i class="fas ${m.icon}" aria-hidden="true"></i>
                <strong>${escapeHtml(m.name)}</strong>
                <span>${escapeHtml(m.desc)}</span>
            </button>`).join('')}
        </div>
    </section>`;
}

function bindModePicker(root, user, rerender){
    root.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => {
        const res = getPersonality(user.id);
        if(!res || !LEARNING_MODES[btn.dataset.mode]) return;
        res.mode = btn.dataset.mode;
        if(savePersonality(user.id, res)){
            toast(`${LEARNING_MODES[res.mode].name} aktif.`, 'ok');
            rerender();
        }
    }));
}

/* ---------- register ---------- */
function initRegister(){
    const form = document.getElementById('registerForm');
    if(!form) return;
    const msg = document.getElementById('registerMsg');
    const idLabel = document.getElementById('regIdLabel');
    const roleSel = document.getElementById('regRole');
    roleSel.addEventListener('change', () => { idLabel.textContent = ID_LABEL[roleSel.value] || 'ID'; });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const role = roleSel.value;
        const id = document.getElementById('regId').value.trim();
        const name = document.getElementById('regName').value.trim().replace(/\s+/g, ' ');
        const pw = document.getElementById('regPassword').value;
        const pw2 = document.getElementById('regPassword2').value;

        if(role !== 'mahasiswa' && role !== 'dosen') return showFormMsg(msg, 'Peran tidak valid.');
        if(!id || !name || !pw) return showFormMsg(msg, 'Lengkapi semua field.');
        if(name.length < 3 || name.length > 60) return showFormMsg(msg, 'Nama harus 3–60 karakter.');
        if(!/^\d{6,12}$/.test(id)) return showFormMsg(msg, `${ID_LABEL[role]} harus berupa 6–12 digit angka.`);
        if(pw.length < 6) return showFormMsg(msg, 'Password minimal 6 karakter.');
        if(pw !== pw2) return showFormMsg(msg, 'Konfirmasi password tidak sama.');
        if(idExists(id)) return showFormMsg(msg, `${ID_LABEL[role]} sudah terdaftar.`);

        const users = store.getMap(KEYS.users);
        users[id] = { id, role, name, password: await hashPassword(pw), created: Date.now() };
        if(!store.set(KEYS.users, users)) return;
        form.querySelector('button[type=submit]').disabled = true;
        showFormMsg(msg, 'Akun berhasil dibuat. Mengalihkan ke halaman login…', true);
        setTimeout(() => location.href = 'index.html', 1000);
    });
}

/* ---------- dashboard ---------- */
function initDashboard(user){
    const tasks = store.getList(KEYS.tasks).filter(t => t.owner === user.id);
    const posts = store.getList(KEYS.forum);
    const groups = store.getList(KEYS.groups);
    const mentors = store.getList(KEYS.mentors);
    const personalities = store.getMap(KEYS.personality);
    const p = getPersonality(user.id);

    document.getElementById('heroTitle').textContent = `Halo, ${user.name.split(' ')[0]}!`;
    document.getElementById('heroText').textContent = user.role === 'mahasiswa'
        ? (p ? `Mode aktif: ${(LEARNING_MODES[p.mode] || LEARNING_MODES.silent).name}. Tetap semangat belajar!` : 'Isi tes karakter dulu supaya fitur belajar menyesuaikan kepribadianmu.')
        : 'Pantau distribusi kepribadian dan aktivitas kelas dari sini.';

    const stats = user.role === 'mahasiswa' ? [
        { n: tasks.filter(t => !t.done).length, label: 'Tugas Aktif', icon: 'fa-list-check' },
        { n: tasks.filter(t => t.done).length, label: 'Tugas Selesai', icon: 'fa-circle-check' },
        { n: groups.filter(g => Array.isArray(g.members) && g.members.includes(user.id)).length, label: 'Kelompok Diikuti', icon: 'fa-users' },
        { n: posts.filter(x => x.authorId === user.id).length, label: 'Postingan Forum', icon: 'fa-comments' }
    ] : [
        { n: Object.values(personalities).filter(r => r && hasOwn(CHARACTERS, r.key)).length, label: 'Mahasiswa Sudah Tes', icon: 'fa-puzzle-piece' },
        { n: groups.length, label: 'Kelompok', icon: 'fa-users' },
        { n: posts.length, label: 'Diskusi Forum', icon: 'fa-comments' },
        { n: mentors.length, label: 'Sesi Mentoring', icon: 'fa-hand-holding-heart' }
    ];
    document.getElementById('statsGrid').innerHTML = stats.map(s => `
        <div class="stat-box"><i class="fas ${s.icon}" aria-hidden="true"></i><div class="num">${s.n}</div><div class="muted">${escapeHtml(s.label)}</div></div>`).join('');

    const upcoming = tasks.filter(t => !t.done).sort(sortByDue).slice(0, 4);
    document.getElementById('upcomingTasks').innerHTML = upcoming.length ? upcoming.map(t => {
        const due = dueInfo(t);
        return `<div class="list-item"><i class="fas fa-file-pen" aria-hidden="true"></i><div class="grow"><strong>${escapeHtml(t.title)}</strong></div><span class="tag ${due.cls}">${escapeHtml(due.text)}</span></div>`;
    }).join('') : emptyHtml('Belum ada tugas aktif.');

    const latest = posts.slice().sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 4);
    document.getElementById('latestPosts').innerHTML = latest.length ? latest.map(x => `
        <div class="list-item"><i class="fas ${(FORUM_TYPES[x.type] || FORUM_TYPES.deep).icon}" aria-hidden="true"></i><div class="grow"><strong>${escapeHtml(x.title)}</strong><div class="muted">${characterBadgeHtml(x.authorId)} ${escapeHtml(x.author)}</div></div></div>`).join('') : emptyHtml('Belum ada diskusi.');

    // panel kanan: karakter untuk mahasiswa, galeri karakter untuk dosen/admin
    const side = document.getElementById('sidePanel');
    if(user.role === 'mahasiswa'){
        side.innerHTML = p ? `
            <h3>Karakter Kamu</h3>
            <a href="test.html" class="side-char" style="--char:${escapeHtml(CHARACTERS[p.key].color)}">
                ${characterFigureHtml(p.key)}
                <strong>${escapeHtml(CHARACTERS[p.key].label)}</strong>
            </a>
            <div class="side-tags">${CHARACTERS[p.key].tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
            <p class="muted">${escapeHtml(CHARACTERS[p.key].guide)}</p>` : `
            <h3>Karakter Kamu</h3>
            <div class="side-char">${characterFigureHtml(null)}<strong>???</strong><span class="muted">Belum mengikuti tes</span></div>
            <a href="test.html" class="btn" style="width:100%">Mulai Tes Karakter</a>`;
    } else {
        side.innerHTML = `<h3>Karakter di Kelas</h3>${characterGalleryHtml()}`;
    }

    if(isStaff(user)){
        const card = document.getElementById('distributionCard');
        card.hidden = false;
        const counts = {};
        Object.values(personalities).forEach(r => { if(r && hasOwn(CHARACTERS, r.key)) counts[r.key] = (counts[r.key] || 0) + 1; });
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        document.getElementById('distribution').innerHTML = Object.values(CHARACTERS).map(c => {
            const pct = total ? (counts[c.key] || 0) / total * 100 : 0;
            return `
            <div class="dist-row">
                <div class="dist-label">${escapeHtml(c.emoji)} <b>${escapeHtml(c.label)}</b><div class="muted">${escapeHtml(c.name)}</div></div>
                <div class="bar-line"><div class="progress"><span style="width:${pct}%;background:${escapeHtml(c.color)}"></span></div><span class="bar-val">${pct.toFixed(1)}% (${counts[c.key] || 0})</span></div>
            </div>`;
        }).join('') + `<p class="muted">${total} mahasiswa sudah mengisi tes karakter.</p>`;
    }
}

function shuffle(arr){
    for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function sortByDue(a, b){
    const da = parseLocalDate(a.due), db = parseLocalDate(b.due);
    if(da && db) return da - db;
    return da ? -1 : db ? 1 : 0;
}

/* ---------- tes karakter ---------- */
function initTest(user){
    const root = document.getElementById('testRoot');
    if(!root) return;

    if(user.role !== 'mahasiswa'){
        root.innerHTML = `<section class="card"><h3>Tes karakter khusus mahasiswa</h3><p class="muted">Dosen dan admin dapat melihat distribusi hasilnya di Dashboard.</p>${characterGalleryHtml()}</section>`;
        return;
    }

    const showResult = () => {
        const res = getPersonality(user.id);
        root.innerHTML = characterCardHtml(res) + modePickerHtml(res) + `
            <div class="actions">
                <a href="dashboard.html" class="btn">Ke Dashboard</a>
                <button type="button" class="btn btn-ghost" id="retakeBtn">Ulangi Tes</button>
            </div>`;
        bindModePicker(root, user, showResult);
        document.getElementById('retakeBtn').addEventListener('click', () => {
            if(confirm('Ulangi tes? Hasil sebelumnya akan diganti setelah kamu menyelesaikan tes baru.')) showIntro();
        });
        renderSidebar(user, 'test');
        renderUserBadge(user);
    };

    const showIntro = () => {
        root.innerHTML = `
        <section class="card test-intro">
            <div class="test-intro-chars">${characterGalleryHtml()}</div>
            <h2>Kamu karakter yang mana?</h2>
            <p class="muted">Jawab ${TEST_QUESTIONS.length} pertanyaan tentang cara kamu belajar dan bekerja dalam kelompok. Hasilnya salah satu dari ${Object.keys(CHARACTERS).length} tipe: ${Object.values(CHARACTERS).map(c => escapeHtml(c.label)).join(', ')}. Tidak ada jawaban benar atau salah, pilih yang paling menggambarkan dirimu.</p>
            <button type="button" class="btn" id="startTestBtn">Mulai Tes <i class="fas fa-arrow-right" aria-hidden="true"></i></button>
        </section>`;
        document.getElementById('startTestBtn').addEventListener('click', showQuestions);
    };

    const showQuestions = () => {
        root.innerHTML = `
        <form id="personalityTestForm" class="card" novalidate>
            <div class="test-progress">
                <span id="progressText">0 / ${TEST_QUESTIONS.length} terjawab</span>
                <div class="progress"><span id="progressBar" style="width:0%"></span></div>
            </div>
            ${TEST_QUESTIONS.map((q, i) => `
            <fieldset class="question-card" id="q${i + 1}">
                <legend><span class="q-num">${i + 1}</span>${escapeHtml(q.q)}</legend>
                <div class="choices">
                    ${shuffle(Object.keys(q.options).filter(k => CHARACTERS[k])).map(k => `
                    <label class="option-item">
                        <input type="radio" name="q${i + 1}" value="${k}" required>
                        <span>${escapeHtml(q.options[k])}</span>
                    </label>`).join('')}
                </div>
            </fieldset>`).join('')}
            <div class="actions">
                <button type="submit" class="btn">Lihat Karakterku</button>
                <button type="button" class="btn btn-ghost" id="cancelTestBtn">Batal</button>
            </div>
        </form>`;
        const form = document.getElementById('personalityTestForm');
        const answered = () => TEST_QUESTIONS.filter((_, i) => form.querySelector(`input[name=q${i + 1}]:checked`)).length;

        form.addEventListener('change', e => {
            const n = answered();
            document.getElementById('progressText').textContent = `${n} / ${TEST_QUESTIONS.length} terjawab`;
            document.getElementById('progressBar').style.width = (n / TEST_QUESTIONS.length * 100) + '%';
            e.target.closest('.question-card')?.classList.remove('missing');
        });
        document.getElementById('cancelTestBtn').addEventListener('click', () => getPersonality(user.id) ? showResult() : showIntro());

        form.addEventListener('submit', e => {
            e.preventDefault();
            const answers = [];
            let firstMissing = null;
            TEST_QUESTIONS.forEach((_, i) => {
                const checked = form.querySelector(`input[name=q${i + 1}]:checked`);
                const v = checked ? checked.value : null;
                if(!v || !hasOwn(CHARACTERS, v)){
                    const fs = document.getElementById('q' + (i + 1));
                    fs.classList.add('missing');
                    firstMissing = firstMissing || fs;
                } else answers.push(v);
            });
            if(firstMissing){
                toast('Masih ada pernyataan yang belum dijawab.', 'error');
                firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            const { key, second, scores } = classifyAnswers(answers);
            const prev = getPersonality(user.id);
            const result = { key, second, scores, answers, mode: prev && prev.key === key ? prev.mode : CHARACTERS[key].mode, takenAt: Date.now() };
            if(savePersonality(user.id, result)){
                showResult();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    };

    getPersonality(user.id) ? showResult() : showIntro();
}

/* ---------- profil ---------- */
function initProfile(user){
    const root = document.getElementById('profileRoot');
    if(!root) return;
    const render = () => {
        const p = getPersonality(user.id);
        const users = store.getMap(KEYS.users);
        const joined = hasOwn(users, user.id) && users[user.id].created ? formatDateTime(users[user.id].created) : 'Akun demo';
        root.innerHTML = `
        <section class="card profile-card">
            <div class="avatar avatar-xl" aria-hidden="true">${escapeHtml(initials(user.name))}</div>
            <div>
                <h2>${escapeHtml(user.name)}</h2>
                <p class="muted">${escapeHtml(ID_LABEL[user.role])}: ${escapeHtml(user.id)}</p>
                <div class="side-tags"><span class="tag">${escapeHtml(ROLE_LABEL[user.role])}</span>${p ? `<span class="tag" style="background:${escapeHtml(CHARACTERS[p.key].color)}">${escapeHtml(CHARACTERS[p.key].emoji + ' ' + CHARACTERS[p.key].label)}</span>` : ''}</div>
                <p class="muted">Terdaftar: ${escapeHtml(joined)}</p>
            </div>
        </section>
        ${user.role !== 'mahasiswa' ? '' : p ? characterCardHtml(p) + modePickerHtml(p) : `
        <section class="card"><h3>Karakter belum diketahui</h3><p class="muted">Ikuti tes karakter untuk mendapatkan rekomendasi mode belajar.</p><a href="test.html" class="btn">Mulai Tes</a></section>`}`;
        bindModePicker(root, user, () => { render(); renderUserBadge(user); });
    };
    render();
}

/* ---------- tugas ---------- */
function initTasks(user){
    const form = document.getElementById('createTaskForm');
    const list = document.getElementById('taskList');
    if(!form || !list) return;
    const msg = document.getElementById('taskMsg');

    const render = () => {
        const arr = store.getList(KEYS.tasks).filter(t => t.owner === user.id)
            .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0) || sortByDue(a, b));
        list.innerHTML = arr.length ? arr.map(t => {
            const due = dueInfo(t);
            return `
            <div class="list-item${t.done ? ' is-done' : ''}">
                <label class="check"><input type="checkbox" data-toggle="${escapeHtml(t.id)}"${t.done ? ' checked' : ''}><span class="sr-only">Tandai selesai</span></label>
                <div class="grow"><strong>${escapeHtml(t.title)}</strong></div>
                <span class="tag ${due.cls}">${escapeHtml(due.text)}</span>
                <button type="button" class="icon-btn" data-delete="${escapeHtml(t.id)}" aria-label="Hapus tugas"><i class="fas fa-trash"></i></button>
            </div>`;
        }).join('') : emptyHtml('Belum ada tugas. Tambahkan tugas pertamamu!');
    };

    form.addEventListener('submit', e => {
        e.preventDefault();
        const title = document.getElementById('taskTitle').value.trim();
        const due = document.getElementById('taskDue').value;
        if(!title) return showFormMsg(msg, 'Judul tugas wajib diisi.');
        if(title.length > 120) return showFormMsg(msg, 'Judul maksimal 120 karakter.');
        if(due && !parseLocalDate(due)) return showFormMsg(msg, 'Format tanggal tidak valid.');
        msg.hidden = true;
        const arr = store.getList(KEYS.tasks);
        arr.push({ id: uid('T'), title, due, owner: user.id, done: false, created: Date.now() });
        if(store.set(KEYS.tasks, arr)){ form.reset(); render(); toast('Tugas ditambahkan.', 'ok'); }
    });

    list.addEventListener('change', e => {
        const id = e.target.dataset.toggle;
        if(!id) return;
        const arr = store.getList(KEYS.tasks);
        const t = arr.find(x => x.id === id && x.owner === user.id);
        if(t){ t.done = e.target.checked; store.set(KEYS.tasks, arr); render(); }
    });
    list.addEventListener('click', e => {
        const id = e.target.closest('[data-delete]')?.dataset.delete;
        if(!id || !confirm('Hapus tugas ini?')) return;
        store.set(KEYS.tasks, store.getList(KEYS.tasks).filter(x => !(x.id === id && x.owner === user.id)));
        render();
    });
    render();
}

/* ---------- forum ---------- */
function initForum(user){
    const form = document.getElementById('createPostForm');
    const area = document.getElementById('postsArea');
    if(!form || !area) return;
    const msg = document.getElementById('postMsg');
    const typeSel = document.getElementById('postType');
    const body = document.getElementById('postBody');
    const counter = document.getElementById('bodyCounter');
    let filter = 'all';

    // default kategori mengikuti mode belajar (Silent -> Deep Discussion, Collaboration -> Quick Chat)
    const p = getPersonality(user.id);
    if(p) typeSel.value = p.mode === 'silent' ? 'deep' : 'quick';

    const updateCounter = () => {
        const max = (FORUM_TYPES[typeSel.value] || FORUM_TYPES.deep).maxBody;
        body.maxLength = max;
        counter.textContent = `${body.value.length} / ${max}`;
    };
    typeSel.addEventListener('change', updateCounter);
    body.addEventListener('input', updateCounter);

    const render = () => {
        const arr = store.getList(KEYS.forum)
            .filter(x => filter === 'all' || x.type === filter)
            .sort((a, b) => (b.created || 0) - (a.created || 0));
        area.innerHTML = arr.length ? arr.map(x => {
            const type = FORUM_TYPES[x.type];
            const canDelete = x.authorId === user.id || isStaff(user);
            return `
            <article class="post ${type ? 'post-' + type.key : ''}">
                <header>
                    <div class="avatar avatar-sm" aria-hidden="true">${escapeHtml(initials(x.author))}</div>
                    <div class="grow">
                        <strong>${escapeHtml(x.author)}</strong> ${characterBadgeHtml(x.authorId)}
                        <div class="muted">${escapeHtml(formatDateTime(x.created))}</div>
                    </div>
                    <span class="tag">${type ? `<i class="fas ${type.icon}" aria-hidden="true"></i> ${type.name}` : 'Umum'}</span>
                    ${canDelete ? `<button type="button" class="icon-btn" data-delete="${escapeHtml(x.id)}" aria-label="Hapus postingan"><i class="fas fa-trash"></i></button>` : ''}
                </header>
                <h4>${escapeHtml(x.title)}</h4>
                <p class="post-body">${escapeHtml(x.body)}</p>
            </article>`;
        }).join('') : emptyHtml('Belum ada posting di kategori ini.');
    };

    document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
        filter = b.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
        render();
    }));

    form.addEventListener('submit', e => {
        e.preventDefault();
        const title = document.getElementById('postTitle').value.trim();
        const text = body.value.trim();
        const type = FORUM_TYPES[typeSel.value] ? typeSel.value : 'deep';
        if(!title || !text) return showFormMsg(msg, 'Judul dan isi diskusi wajib diisi.');
        if(title.length > 120) return showFormMsg(msg, 'Judul maksimal 120 karakter.');
        if(text.length > FORUM_TYPES[type].maxBody) return showFormMsg(msg, `Isi ${FORUM_TYPES[type].name} maksimal ${FORUM_TYPES[type].maxBody} karakter.`);
        msg.hidden = true;
        const arr = store.getList(KEYS.forum);
        arr.push({ id: uid('P'), title, body: text, type, author: user.name, authorId: user.id, created: Date.now() });
        if(store.set(KEYS.forum, arr)){
            const keepType = typeSel.value;
            form.reset();
            typeSel.value = keepType;
            updateCounter();
            render();
            toast('Diskusi diposting.', 'ok');
        }
    });

    area.addEventListener('click', e => {
        const id = e.target.closest('[data-delete]')?.dataset.delete;
        if(!id || !confirm('Hapus postingan ini?')) return;
        store.set(KEYS.forum, store.getList(KEYS.forum).filter(x => !(x.id === id && (x.authorId === user.id || isStaff(user)))));
        render();
    });

    updateCounter();
    render();
}

/* ---------- kelompok ---------- */
function initGroups(user){
    const form = document.getElementById('createGroupForm');
    const list = document.getElementById('groupsList');
    if(!form || !list) return;
    const msg = document.getElementById('groupMsg');

    const render = () => {
        const arr = store.getList(KEYS.groups);
        list.innerHTML = arr.length ? arr.map(g => {
            const members = Array.isArray(g.members) ? g.members : [];
            const isMember = members.includes(user.id);
            const full = members.length >= g.size;
            const canDelete = g.creatorId === user.id || isStaff(user);
            const comp = {};
            members.forEach(id => { const p = getPersonality(id); const k = p ? p.key : 'unknown'; comp[k] = (comp[k] || 0) + 1; });
            const compText = Object.values(CHARACTERS).filter(c => comp[c.key]).map(c => `${c.emoji} ${comp[c.key]}`).concat(comp.unknown ? [`? ${comp.unknown}`] : []).join('  ');
            const action = user.role !== 'mahasiswa' ? ''
                : isMember ? `<button type="button" class="btn btn-sm btn-ghost" data-leave="${escapeHtml(g.id)}">Keluar</button>`
                : `<button type="button" class="btn btn-sm" data-join="${escapeHtml(g.id)}"${full ? ' disabled' : ''}>${full ? 'Penuh' : 'Gabung'}</button>`;
            return `
            <article class="group-card">
                <header>
                    <h4>${escapeHtml(g.name)}</h4>
                    ${canDelete ? `<button type="button" class="icon-btn" data-delete="${escapeHtml(g.id)}" aria-label="Hapus kelompok"><i class="fas fa-trash"></i></button>` : ''}
                </header>
                <div class="muted">Pembuat: ${escapeHtml(g.creator)}</div>
                <div class="progress" title="${members.length} dari ${g.size} anggota"><span style="width:${Math.min(100, members.length / g.size * 100)}%"></span></div>
                <div class="muted">${members.length} / ${escapeHtml(g.size)} anggota ${compText ? '• komposisi ' + escapeHtml(compText) : ''}</div>
                <div class="member-list">${members.map(id => `<span class="member" title="${escapeHtml(getUserName(id))}">${escapeHtml(initials(getUserName(id)))}${characterBadgeHtml(id)}</span>`).join('')}</div>
                <div class="actions">${action}</div>
            </article>`;
        }).join('') : emptyHtml('Belum ada kelompok.');
    };

    form.addEventListener('submit', e => {
        e.preventDefault();
        const name = document.getElementById('groupName').value.trim();
        const size = parseInt(document.getElementById('groupSize').value, 10);
        if(!name) return showFormMsg(msg, 'Nama kelompok wajib diisi.');
        if(name.length > 60) return showFormMsg(msg, 'Nama maksimal 60 karakter.');
        if(!Number.isInteger(size) || size < 2 || size > 10) return showFormMsg(msg, 'Kapasitas harus 2–10 orang.');
        const arr = store.getList(KEYS.groups);
        if(arr.some(g => String(g.name).toLowerCase() === name.toLowerCase())) return showFormMsg(msg, 'Nama kelompok sudah dipakai.');
        msg.hidden = true;
        arr.push({ id: uid('G'), name, size, creator: user.name, creatorId: user.id, members: user.role === 'mahasiswa' ? [user.id] : [] });
        if(store.set(KEYS.groups, arr)){ form.reset(); render(); toast('Kelompok dibuat.', 'ok'); }
    });

    list.addEventListener('click', e => {
        const btn = e.target.closest('[data-join],[data-leave],[data-delete]');
        if(!btn) return;
        const arr = store.getList(KEYS.groups);
        const g = arr.find(x => x.id === (btn.dataset.join || btn.dataset.leave || btn.dataset.delete));
        if(!g) return render();
        g.members = Array.isArray(g.members) ? g.members : [];
        if(btn.dataset.join && user.role === 'mahasiswa'){
            if(g.members.includes(user.id)) return;
            if(g.members.length >= g.size) return toast('Kelompok sudah penuh.', 'error');
            g.members.push(user.id);
        } else if(btn.dataset.leave){
            g.members = g.members.filter(id => id !== user.id);
        } else if(btn.dataset.delete){
            if(!(g.creatorId === user.id || isStaff(user)) || !confirm(`Hapus kelompok "${g.name}"?`)) return;
            arr.splice(arr.indexOf(g), 1);
        }
        store.set(KEYS.groups, arr);
        render();
    });
    render();
}

/* ---------- mentoring ---------- */
function initMentoring(user){
    const form = document.getElementById('createMentorForm');
    const list = document.getElementById('mentorsList');
    if(!list) return;
    const msg = document.getElementById('mentorMsg');

    if(!isStaff(user)){
        document.getElementById('mentorFormCard').hidden = true;
    }

    const render = () => {
        const arr = store.getList(KEYS.mentors);
        list.innerHTML = arr.length ? arr.map(m => `
            <div class="list-item">
                <div class="avatar avatar-sm" aria-hidden="true">${escapeHtml(initials(m.name))}</div>
                <div class="grow"><strong>${escapeHtml(m.name)}</strong><div class="muted">${escapeHtml(m.topic)} • ditambahkan oleh ${escapeHtml(m.addedBy)}</div></div>
                ${isStaff(user) ? `<button type="button" class="icon-btn" data-delete="${escapeHtml(m.id)}" aria-label="Hapus mentor"><i class="fas fa-trash"></i></button>` : ''}
            </div>`).join('') : emptyHtml('Belum ada mentor.');
    };

    form && form.addEventListener('submit', e => {
        e.preventDefault();
        if(!isStaff(user)) return showFormMsg(msg, 'Hanya dosen/admin yang dapat menambah mentor.');
        const name = document.getElementById('mentorName').value.trim();
        const topic = document.getElementById('mentorTopic').value.trim();
        if(!name || !topic) return showFormMsg(msg, 'Nama mentor dan topik wajib diisi.');
        if(name.length > 60 || topic.length > 100) return showFormMsg(msg, 'Nama maks. 60 dan topik maks. 100 karakter.');
        msg.hidden = true;
        const arr = store.getList(KEYS.mentors);
        arr.push({ id: uid('M'), name, topic, addedBy: user.name, created: Date.now() });
        if(store.set(KEYS.mentors, arr)){ form.reset(); render(); toast('Mentor ditambahkan.', 'ok'); }
    });

    list.addEventListener('click', e => {
        const id = e.target.closest('[data-delete]')?.dataset.delete;
        if(!id || !isStaff(user) || !confirm('Hapus mentor ini?')) return;
        store.set(KEYS.mentors, store.getList(KEYS.mentors).filter(x => x.id !== id));
        render();
    });
    render();
}
