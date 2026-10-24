Slot gambar karakter EDU-HARMONY
================================

Taruh gambar karakter di folder ini dengan nama file berikut:

  analytical.png  -> AUREL	(Analytical)
  pragmatic.png   -> BRAVEN	(Pragmatic)
  relational.png  -> LUMORA	(Relational)
  creative.png    -> ELARA	(Creative)

Saran: PNG/WebP transparan, rasio 1:1 (mis. 512x512), gaya pixel-art.

Setelah file ditaruh di sini, isi properti `image` karakter tersebut di js/data.js,
mis. image: 'assets/characters/analytical.png'.
Selama `image` masih kosong, aplikasi menampilkan emoji sebagai placeholder.

Nama, warna, tag, dan deskripsi tiap karakter diatur di js/data.js (objek CHARACTERS).
Soal tes ada di TEST_QUESTIONS; setiap pilihan jawaban menunjuk ke salah satu tipe.
