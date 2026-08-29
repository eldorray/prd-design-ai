# Deploy

Catatan untuk menaikkan aplikasi ini ke server. Urutannya penting.

## 1. Environment production

Salin `.env.example` ke `.env` di server, lalu ganti nilai berikut. Nilai
default di `.env.example` ditujukan untuk mesin lokal, bukan production.

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domain-anda.com
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nama_database
DB_USERNAME=user_database
DB_PASSWORD=rahasia

SESSION_SECURE_COOKIE=true
```

`APP_DEBUG=false` bukan pilihan gaya. Dengan `true`, halaman error Laravel
menampilkan seluruh isi `.env` — termasuk setiap API key provider AI dan
`APP_KEY` — kepada siapa pun yang berhasil memicu satu exception.

Jangan menyalin `APP_KEY` dari mesin lokal. Bangkitkan yang baru di server:

```bash
php artisan key:generate
```

## 2. Kenapa MySQL, bukan SQLite

Design studio membuka sampai tiga stream SSE paralel per generate, masing-masing
hidup beberapa menit. Selama stream berjalan, session dan cache tetap menulis ke
database yang sama. Di SQLite semua itu berebut satu lock file dan berakhir
sebagai `SQLITE_BUSY: database is locked`.

`SESSION_DRIVER`, `CACHE_STORE`, dan `QUEUE_CONNECTION` boleh tetap `database`
selama backend-nya MySQL.

Isi `database/database.sqlite` yang ada sekarang hanya data percobaan lokal.
Cara paling ringkas adalah mulai dari database MySQL kosong:

```bash
php artisan migrate --force
```

lalu buat ulang akun (bagian 5) dan daftarkan provider AI lewat
**Admin → Pengaturan AI**. Tidak ada langkah ekspor-impor yang perlu dijalankan.

## 3. Batas PHP dan web server

Endpoint AI memaksa batas default melewati angka bawaan sebagian besar hosting.

`php.ini`:

```ini
; Upload screenshot untuk mode vision dikirim sebagai base64 (maks ~8 juta
; karakter). Di bawah 12M, request ditolak tanpa pesan error yang jelas.
post_max_size = 16M
upload_max_filesize = 16M

; PRD assistant menunggu provider sampai 110 detik.
max_execution_time = 180
memory_limit = 512M

; Stream SSE harus keluar per potongan, bukan ditahan sampai selesai.
output_buffering = Off
zlib.output_compression = Off
```

PHP-FPM pool:

```ini
request_terminate_timeout = 300
```

Nginx:

```nginx
location ~ \.php$ {
    fastcgi_read_timeout 300;
    fastcgi_buffering off;      # wajib untuk SSE
    gzip off;                   # gzip menahan stream sampai buffer penuh
}
```

Aplikasi sudah mengirim `X-Accel-Buffering: no`, tapi itu hanya bekerja kalau
buffering di sisi PHP dan gzip juga dimatikan untuk jalur tersebut.

## 4. Build dan cache

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build

php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Setelah `npm run build`, pastikan file penanda dev server tidak ikut terbawa:

```bash
rm -f public/hot public/fonts-manifest.dev.json
```

`public/hot` membuat Laravel menarik seluruh asset dari Vite dev server yang
tidak berjalan di production. Akibatnya halaman tampil kosong total.

## 5. Membuat akun

Registrasi publik ditutup — setiap akun membakar token provider AI, jadi akun
dibuat manual. Akun pertama:

```bash
php artisan user:create owner@domain-anda.com --name="Nama Anda" --role=admin --quota=1000000
```

Akun berikutnya, dengan kuota yang wajar:

```bash
php artisan user:create staf@domain-anda.com --quota=50000
```

Kuota default untuk akun baru adalah 0, jadi `--quota` harus disebut kalau akun
itu perlu bisa generate. Kuota juga bisa diubah kapan saja dari panel admin.

Mempromosikan akun yang sudah ada:

```bash
php artisan user:promote-admin staf@domain-anda.com
```

## 6. Email

`MAIL_MAILER=log` berarti tidak ada email yang benar-benar terkirim. Konsekuensi
selama SMTP belum dipasang:

- Verifikasi email **dimatikan** di `config/fortify.php`. Ini disengaja —
  mengaktifkannya tanpa mailer akan mengunci setiap akun baru di balik email
  verifikasi yang tidak pernah sampai.
- Tautan "Forgot password" di halaman login **tidak berfungsi**. Halaman tetap
  menampilkan pesan sukses, tapi emailnya hanya masuk ke `storage/logs`.
  Reset password sementara dilakukan lewat konsol:

  ```bash
  php artisan user:create email@user.com --quota=50000
  ```

  Perintah yang sama memperbarui akun yang sudah ada, termasuk passwordnya.

Setelah SMTP tersedia, isi blok `MAIL_*` di `.env`, lalu aktifkan kembali
`Features::emailVerification()` di `config/fortify.php` dan tambahkan
`implements MustVerifyEmail` pada `App\Models\User`.

## 7. Setelah deploy

Periksa cepat:

```bash
curl -I https://domain-anda.com/up          # health check, harus 200
curl -s https://domain-anda.com/ | head -5  # harus HTML, bukan halaman error
```

Lalu masuk sebagai admin, buka **Admin → Pengaturan AI**, dan pastikan daftar
model termuat. Kalau kosong, Base URL atau API key provider salah.
