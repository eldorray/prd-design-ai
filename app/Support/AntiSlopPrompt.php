<?php

namespace App\Support;

final class AntiSlopPrompt
{
    public static function forPrd(): string
    {
        return <<<'PROMPT'
GUARDRAIL ANTI-SLOP UNTUK PRD (WAJIB, BERLAKU SELAMA PENULISAN):
- Tulis spesifik berdasarkan informasi pengguna. Jangan mengarang fitur, keputusan, nama, angka, tanggal, kutipan, statistik, testimoni, klaim keamanan, kepatuhan, atau performa.
- Bila data belum tersedia, tandai sebagai pertanyaan terbuka atau asumsi yang perlu divalidasi. Jangan menyamarkan placeholder sebagai fakta.
- Hindari bahasa promosi kosong seperti "AI powered", "revolusioner", "next generation", "seamless", "cutting edge", "intelligent", "ultimate", "powerful", atau "effortless". Jelaskan perilaku produk secara konkret.
- Jangan gunakan karakter em dash. Gunakan titik, koma, titik dua, atau tanda kurung.
- Jangan memaksakan daftar berisi tiga item, kalimat dramatis terpotong-potong, pembuka basa-basi, kesimpulan optimistis generik, atau pengulangan sinonim.
- Gunakan kalimat aktif dan sebutkan pelaku bila diketahui. Jangan memberi sifat manusia pada sistem, data, atau dashboard.
- Pertahankan suara pengguna dan istilah domain yang sudah diberikan. Jangan mensterilkan detail yang nyata dan khas.
- Struktur dokumen mengikuti kebutuhan produk dan format PRD yang diwajibkan, bukan pola pemasaran generik.
- Metrik hanya boleh berupa target yang secara eksplisit diberikan pengguna. Jika belum ada target, tulis "Belum ditentukan" dan masukkan penentuannya ke Pertanyaan Terbuka.
- Rekomendasi harus memiliki alasan yang terkait kebutuhan yang diketahui. Nyatakan asumsi secara terbuka.
PROMPT;
    }

    public static function forDesign(string $mode = 'generate'): string
    {
        $refinementRule = $mode === 'refine'
            ? '- Pertahankan identitas, tata letak, dan komponen yang tidak diminta berubah. Terapkan guardrail ini pada bagian baru atau bagian yang sedang diperbaiki tanpa mendesain ulang seluruh halaman.'
            : '- Terapkan guardrail sejak keputusan visual pertama sampai HTML selesai, bukan sebagai audit setelah hasil dibuat.';

        return <<<PROMPT
GUARDRAIL ANTI-SLOP UNTUK DESAIN (WAJIB, BERLAKU SELAMA PENULISAN):
{$refinementRule}
- Baca permintaan sebagai arah desain. Nyatakan arah itu di komentar HTML singkat dengan format "Design read: [jenis halaman], [audiens], [bahasa visual], ENERGY n / RHYTHM n / MOTION n". Bila arah tidak cukup, gunakan "draft tanpa arah" dengan ENERGY 1 / RHYTHM 1 / MOTION 1.
- Setiap keputusan utama untuk warna, tipografi, layout, spacing, card, ikon, ilustrasi, efek, dan motion harus memiliki alasan satu baris dalam komentar CSS di dekat implementasinya.
- Jangan memakai gradient biru-ungu, glow, glassmorphism, grid latar, shadow besar, dark mode, asimetri, atau animasi sebagai default. Pakai hanya bila mendukung arah atau hierarki yang dinyatakan. Backdrop blur dan glow masing-masing maksimal pada satu atau dua elemen.
- Batasi palet aktif menjadi dua atau tiga warna inti dan satu aksen, di luar warna netral. Gunakan aksen hanya pada fokus utama.
- Buat satu focal point yang jelas per layar. Gunakan whitespace sebagai struktur dan variasikan komposisi sesuai dial RHYTHM, bukan template hero dan grid kartu generik.
- Jangan otomatis membuat social proof, statistik, testimonial, FAQ, logo, avatar, klaim, atau navigasi yang tidak bersumber dari permintaan. Hilangkan bila datanya tidak ada atau beri label placeholder yang jujur.
- Semua tautan, tombol, menu, tab, dialog, dan form harus bekerja. Hapus kontrol tanpa perilaku. Dialog harus dapat ditutup dengan Escape.
- Setiap tampilan data harus memiliki state loading, kosong, dan error yang relevan.
- Pastikan keyboard navigation, urutan fokus, indikator fokus terlihat, HTML semantik, aria-label yang relevan, dan kontras WCAG AA.
- Mobile adalah bagian dari desain: tanpa overflow horizontal, teks terpotong, atau tabrakan; target sentuh minimal 44px.
- Bila menyediakan light dan dark mode, keduanya harus lengkap dan berfungsi. Jangan menambahkan toggle tema yang hanya dekoratif.
- Gunakan CTA yang menyebut tindakan nyata. Hindari "Get Started", "Learn More", "Try Now", "Explore", dan "Discover" sebagai teks default.
- Hindari buzzword seperti "AI powered", "revolusioner", "next generation", "seamless", "cutting edge", "intelligent", "ultimate", "powerful", dan "effortless".
- Jangan gunakan karakter em dash. Jangan mengarang nama, angka, statistik, testimonial, fitur, atau klaim realistis.
- Jangan meniru keseluruhan identitas Linear, Vercel, Stripe, Notion, Apple, atau produk populer lain kecuali pengguna memintanya secara eksplisit.
- Sebelum menyelesaikan HTML, periksa secara internal seluruh aturan ini dan perbaiki pelanggaran. Jangan mencetak laporan audit atau penjelasan di luar dokumen HTML.
PROMPT;
    }
}
