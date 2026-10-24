/* data.js - data karakter, mode belajar & soal tes (ubah di sini untuk menambah/mengganti karakter) */

/*
 * CARA MENAMBAH / MENGGANTI GAMBAR KARAKTER
 * 1. Simpan gambar (PNG/WebP, rasio 1:1, disarankan pixel-art 512x512) ke folder assets/characters/
 * 2. Isi properti `image` di bawah dengan path file tersebut (mis. 'assets/characters/analytical.png')
 * 3. Selama `image` masih kosong, slot karakter menampilkan emoji (tanpa request gambar).
 *
 * Empat tipe kepribadian: Analytical, Pragmatic, Relational, Creative.
 * Setiap pilihan jawaban di TEST_QUESTIONS menunjuk ke salah satu key di CHARACTERS;
 * tipe dengan jumlah jawaban terbanyak menjadi karakter mahasiswa.
 */

const STRENGTH_AXES = ['Analisis', 'Eksekusi', 'Kerja Tim', 'Kreativitas', 'Komunikasi', 'Ketelitian'];

const CHARACTERS = {
    analytical: {
        key: 'analytical',
        label: 'Analytical',
        name: 'AUREL',
        emoji: '🦉',
        image: '', // isi 'assets/characters/analytical.png' setelah file gambarnya ada
        color: '#93A8F4',
        tags: ['#Sherlock', '#DataDulu', '#KenapaBegitu'],
        strengths: [0.95, 0.6, 0.45, 0.5, 0.45, 0.95],
        quote: 'Kamu seperti detektif di kelompok: sebelum mulai, kamu sudah membaca semua materi dan menemukan celah yang tidak dilihat orang lain.',
        guide: 'Ambil peran yang butuh berpikir mendalam: riset, analisis data, dan pengecekan akhir. Gunakan Deep Discussion untuk menuangkan analisismu.',
        mode: 'silent',
        roles: ['Riset materi', 'Analis data', 'Quality check'],
        partners: ['creative', 'relational'],
        energy: 'Kaca pembesar'
    },
    pragmatic: {
        key: 'pragmatic',
        label: 'Pragmatic',
        name: 'BRAVEN',
        emoji: '🦫',
        image: '', // isi 'assets/characters/pragmatic.png' setelah file gambarnya ada
        color: '#8ED1A0',
        tags: ['#LangsungGas', '#DeadlineAman', '#ToDoList'],
        strengths: [0.6, 0.95, 0.6, 0.45, 0.55, 0.75],
        quote: 'Saat yang lain masih berdiskusi, kamu sudah membagi tugas dan membuat jadwal. Berkat kamu, kelompok selalu selesai tepat waktu.',
        guide: 'Pegang manajemen tugas dan tenggat waktu kelompok. Pakai fitur Tugas untuk memecah pekerjaan jadi langkah kecil yang jelas.',
        mode: 'collaboration',
        roles: ['Ketua pelaksana', 'Manajer tugas', 'Penjaga deadline'],
        partners: ['creative', 'relational'],
        energy: 'Checklist'
    },
    relational: {
        key: 'relational',
        label: 'Relational',
        name: 'LUMORA',
        emoji: '🐬',
        image: '', // isi 'assets/characters/relational.png' setelah file gambarnya ada
        color: '#F8C33C',
        tags: ['#PerekatTim', '#PendengarBaik', '#AdaApaCerita'],
        strengths: [0.45, 0.55, 0.95, 0.55, 0.95, 0.5],
        quote: 'Kamu yang memastikan semua anggota ikut bersuara. Kelompok terasa nyaman dan kompak karena ada kamu.',
        guide: 'Jadi penghubung tim: moderasi diskusi, pastikan teman yang pendiam ikut berkontribusi, dan bawakan presentasi kelompok.',
        mode: 'collaboration',
        roles: ['Moderator diskusi', 'Presenter', 'Penghubung tim'],
        partners: ['analytical', 'pragmatic'],
        energy: 'Mikrofon'
    },
    creative: {
        key: 'creative',
        label: 'Creative',
        name: 'ELARA',
        emoji: '🦋',
        image: '', // isi 'assets/characters/creative.png' setelah file gambarnya ada
        color: '#F7B6C8',
        tags: ['#BanyakIde', '#OutOfTheBox', '#BrainIsFried'],
        strengths: [0.5, 0.45, 0.6, 0.95, 0.7, 0.45],
        quote: 'Idemu sering terdengar aneh di awal, tapi justru itu yang membuat tugas kelompok berbeda dari yang lain.',
        guide: 'Pegang tahap brainstorming, desain, dan konsep. Tulis idemu di forum supaya bisa dikembangkan oleh tipe Pragmatic dan Analytical.',
        mode: 'silent',
        roles: ['Desainer konsep', 'Brainstormer', 'Pembuat visual'],
        partners: ['pragmatic', 'analytical'],
        energy: 'Pensil warna'
    }
};

// urutan prioritas bila jumlah jawaban sama
const TYPE_ORDER = ['analytical', 'pragmatic', 'relational', 'creative'];

function classifyAnswers(answers){
    const scores = Object.fromEntries(TYPE_ORDER.map(k => [k, 0]));
    answers.forEach(a => { if(scores[a] !== undefined) scores[a]++; });
    const ranked = TYPE_ORDER.slice().sort((a, b) => scores[b] - scores[a] || TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
    return { key: ranked[0], second: scores[ranked[1]] > 0 ? ranked[1] : null, scores };
}

const LEARNING_MODES = {
    silent: {
        key: 'silent',
        name: 'Silent Mode',
        icon: 'fa-headphones',
        desc: 'Belajar mandiri, notifikasi minim, forum diarahkan ke Deep Discussion.'
    },
    collaboration: {
        key: 'collaboration',
        name: 'Collaboration Mode',
        icon: 'fa-people-group',
        desc: 'Kerja kelompok aktif, forum diarahkan ke Quick Chat.'
    }
};

const FORUM_TYPES = {
    quick: { key: 'quick', name: 'Quick Chat', icon: 'fa-bolt', maxBody: 280 },
    deep: { key: 'deep', name: 'Deep Discussion', icon: 'fa-feather', maxBody: 3000 }
};

// 10 pertanyaan; tiap pilihan menunjuk ke satu tipe (urutan pilihan diacak saat tes)
const TEST_QUESTIONS = [
    {
        q: 'Dosen memberi tugas kelompok baru. Hal pertama yang kamu lakukan adalah…',
        options: {
            analytical: 'Membaca instruksi dan rubrik penilaian dengan teliti.',
            pragmatic: 'Membagi tugas dan menentukan jadwal pengerjaan.',
            relational: 'Mengajak anggota kelompok berkumpul dan berkenalan.',
            creative: 'Memikirkan ide atau tema yang beda dari kelompok lain.'
        }
    },
    {
        q: 'Cara belajar yang paling cocok untukmu adalah…',
        options: {
            analytical: 'Membaca materi dan membuat catatan terstruktur.',
            pragmatic: 'Langsung mengerjakan latihan soal atau praktik.',
            relational: 'Belajar bersama teman sambil berdiskusi.',
            creative: 'Membuat mind map, gambar, atau video ringkasan.'
        }
    },
    {
        q: 'Saat diskusi kelompok buntu, kamu biasanya…',
        options: {
            analytical: 'Mencari data atau referensi untuk menentukan pilihan terbaik.',
            pragmatic: 'Mengusulkan voting supaya cepat diputuskan.',
            relational: 'Menanyakan pendapat anggota yang belum bicara.',
            creative: 'Melempar ide baru yang belum terpikirkan.'
        }
    },
    {
        q: 'Bagian tugas yang paling kamu sukai adalah…',
        options: {
            analytical: 'Menganalisis masalah dan mengolah data.',
            pragmatic: 'Menyusun rencana kerja dan memastikan semua selesai.',
            relational: 'Mempresentasikan hasil kerja kelompok.',
            creative: 'Mendesain tampilan atau konsep proyek.'
        }
    },
    {
        q: 'Kalau ada materi yang belum kamu pahami, kamu…',
        options: {
            analytical: 'Mencari sumber lain sampai benar-benar paham.',
            pragmatic: 'Mencari contoh soal dan cara cepat menyelesaikannya.',
            relational: 'Bertanya pada teman atau dosen.',
            creative: 'Mencoba memahaminya dengan cara atau analogi sendiri.'
        }
    },
    {
        q: 'Teman sekelompok biasanya mengenalmu sebagai orang yang…',
        options: {
            analytical: 'Teliti dan kritis.',
            pragmatic: 'Tegas dan tepat waktu.',
            relational: 'Ramah dan mudah diajak bicara.',
            creative: 'Penuh ide dan imajinatif.'
        }
    },
    {
        q: 'Mendekati deadline, kamu…',
        options: {
            analytical: 'Memeriksa ulang semua bagian agar tidak ada yang salah.',
            pragmatic: 'Sudah selesai karena dikerjakan sesuai jadwal.',
            relational: 'Memastikan semua anggota kelompok baik-baik saja dan siap.',
            creative: 'Masih menambahkan sentuhan ide di menit terakhir.'
        }
    },
    {
        q: 'Lingkungan belajar yang paling nyaman bagimu adalah…',
        options: {
            analytical: 'Tenang, rapi, dan minim gangguan.',
            pragmatic: 'Punya target yang jelas dan terukur.',
            relational: 'Ramai bersama teman-teman.',
            creative: 'Bebas bereksperimen tanpa banyak aturan.'
        }
    },
    {
        q: 'Saat menilai hasil kerja kelompok, yang paling penting menurutmu adalah…',
        options: {
            analytical: 'Isinya akurat dan logis.',
            pragmatic: 'Selesai tepat waktu dan sesuai instruksi.',
            relational: 'Semua anggota ikut berkontribusi.',
            creative: 'Hasilnya unik dan menarik.'
        }
    },
    {
        q: 'Jika boleh memilih peran di kelompok, kamu ingin menjadi…',
        options: {
            analytical: 'Peneliti atau analis.',
            pragmatic: 'Ketua pelaksana atau koordinator tugas.',
            relational: 'Moderator atau juru bicara.',
            creative: 'Desainer atau pencetus ide.'
        }
    }
];
