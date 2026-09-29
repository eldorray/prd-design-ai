# Areas to Improve — PRD.ai

Dokumen ini merangkum area perbaikan dari review aplikasi. Format backlog teknis, bukan PRD produk.

**Status saat ini (29 Sep 2026):** 178 Pest tests + 39 vitest tests passing · Laravel 13 + Inertia v3 + React 19

> Semua 8 area di bawah **sudah selesai**. Dokumen ini dipertahankan sebagai catatan keputusan. Backlog berikutnya ada di bagian [Sisa backlog](#sisa-backlog) di akhir.

---

## Prioritas

| # | Area | Prioritas | Effort | Status |
|---|------|-----------|--------|--------|
| 1 | Rate limiting pada endpoint AI | Tinggi | Kecil | ✅ `throttle:ai` 10/menit per user |
| 2 | Refactor komponen frontend besar | Sedang | Sedang | ✅ `components/prd`, `components/design`, `lib/*` |
| 3 | Streaming untuk generate PRD | Sedang | Sedang | ✅ `PrdStreamController` + `lib/stream-sse.ts` |
| 4 | Integrasi PRD ↔ Design Studio | Sedang | Sedang | ✅ Tombol "Generate UI Mockup" (`prd_id`) |
| 5 | Bersihkan dead code `DesignAssistantController` | Rendah | Kecil | ✅ Dihapus |
| 6 | Perbaikan UX kecil | Rendah | Kecil | ✅ Lihat catatan 6c |
| 7 | Laravel Policies untuk authorization | Rendah | Kecil | ✅ `PrdPolicy`, `DesignPolicy` |
| 8 | Tracking penggunaan token / quota | Sedang | Sedang | ✅ `ai_usage_logs` + kuota bulanan |

---

## 1. Rate limiting pada endpoint AI

**Masalah**

Login sudah di-throttle (5/menit via Fortify), tapi endpoint AI tidak:

- `POST /prd-assistant/messages`
- `POST /design-assistant/stream`
- `POST /design-assistant/generate`

User terautentikasi bisa memanggil API provider tanpa batas → risiko biaya API dan abuse.

**Rekomendasi**

- Tambahkan middleware `throttle` per user pada route AI, contoh: 10 request/menit per `user_id`
- Pertimbangkan limit berbeda untuk `interview` vs `generate` vs `stream`
- Return `429` dengan pesan bahasa Indonesia yang jelas

**File terkait**

- `routes/web.php`
- `app/Providers/AppServiceProvider.php` (custom rate limiter)

---

## 2. Refactor komponen frontend besar

**Masalah**

Dua halaman workspace sangat besar dan banyak duplikasi:

| File | Ukuran | Isi |
|------|--------|-----|
| `resources/js/pages/dashboard.tsx` | ~1.535 baris | PRD workspace, sidebar, parser, stage UI |
| `resources/js/pages/design.tsx` | ~1.418 baris | Design workspace, sidebar, preview, inspector |

Komponen yang terduplikasi:

- `HistorySidebar`
- `UserMenu`
- `ModelSelect`

**Rekomendasi**

Ekstrak ke modul terpisah:

```
resources/js/
├── components/workspace/
│   ├── history-sidebar.tsx
│   ├── workspace-header.tsx
│   └── model-select.tsx
├── lib/
│   ├── prd-parser.ts      # parseAssistantQuestion, parsePrdSections
│   └── design-export.ts   # (sudah ada)
└── pages/
    ├── dashboard.tsx      # orchestration saja
    └── design.tsx
```

**Manfaat**

- Lebih mudah di-test dan di-review
- Perubahan UI workspace cukup di satu tempat
- PRD dan Design Studio konsisten secara visual

---

## 3. Streaming untuk generate PRD

**Masalah**

Design Studio sudah pakai SSE (`DesignStreamController`) dengan live preview. PRD Generator masih menunggu response penuh dari `PrdAssistantController` dengan timeout 120 detik.

Generate PRD panjang terasa lebih lambat dibanding design, padahal output-nya juga panjang.

**Rekomendasi**

- Tambahkan `PrdStreamController` dengan pola SSE yang sama seperti design
- Stream token ke frontend, tampilkan PRD terbentuk secara bertahap
- Pertahankan endpoint non-streaming sebagai fallback (opsional)

**File terkait**

- `app/Http/Controllers/PrdAssistantController.php` (referensi)
- `app/Http/Controllers/DesignStreamController.php` (template)
- `resources/js/lib/stream-design.ts` → generalisasi jadi `stream-sse.ts`

---

## 4. Integrasi PRD ↔ Design Studio

**Masalah**

Dua produk ada di satu app tapi tidak terhubung:

- PRD selesai → tidak ada tombol "Generate design dari PRD ini"
- Welcome page hanya mempromosikan PRD Generator, Design Studio tidak disebut
- Alur natural founder: ide → PRD → mockup → development belum didukung

**Rekomendasi**

- Tombol di PRD stage: **"Buat design dari PRD"** → prefill prompt Design Studio dari `content` PRD
- Tambahkan section Design Studio di `welcome.tsx`
- (Opsional) Simpan relasi `prd_id` di tabel `designs` untuk traceability

---

## 5. Bersihkan dead code `DesignAssistantController`

**Masalah**

Ada dua endpoint generate design:

| Endpoint | Dipakai UI? | Dipakai test? |
|----------|-------------|---------------|
| `POST /design-assistant/stream` | ✅ Ya | ✅ Ya |
| `POST /design-assistant/generate` | ❌ Tidak | ✅ Ya |

`DesignAssistantController` (non-streaming) hanya diuji, tidak dipanggil frontend.

**Rekomendasi**

Pilih salah satu:

- **Hapus** endpoint non-streaming jika streaming sudah stabil
- **Pertahankan** sebagai fallback dan dokumentasikan kapan dipakai (mis. SSE tidak didukung di environment tertentu)

---

## 6. Perbaikan UX kecil

### 6a. Konfirmasi sebelum hapus

Hapus PRD/design langsung tanpa dialog. Satu klik salah = data hilang.

→ Tambahkan `AlertDialog` sebelum `router.delete()`.

### 6b. Label loading mengikuti model

Teks loading di interview stage selalu: *"DeepSeek sedang menulis..."* meski user memilih Gemini.

→ Ganti dengan label generik: *"AI sedang menulis..."* atau tampilkan nama model yang aktif.

### 6c. Keamanan `postMessage` di iframe editor

Design preview memakai `parent.postMessage(..., '*')` — origin tidak dibatasi.

→ Sebelum production, batasi ke `window.location.origin`.

**Status:** iframe preview memakai `sandbox="allow-scripts"` tanpa `allow-same-origin`, jadi origin-nya `null` dan target origin tidak bisa dipersempit. Sebagai gantinya, parent hanya menerima pesan yang `event.source`-nya iframe preview itu sendiri.

**File terkait**

- `resources/js/pages/dashboard.tsx` (baris ~1194, delete handler)
- `resources/js/pages/design.tsx` (EDIT_BRIDGE script, ~1172)

---

## 7. Laravel Policies untuk authorization

**Masalah**

Ownership dicek manual di controller:

```php
abort_unless($prd->user_id === $request->user()->id, 403);
```

Pola yang sama di `PrdController` dan `DesignController`. Berfungsi dan sudah ditest, tapi tidak idiomatic Laravel.

**Rekomendasi**

- Buat `PrdPolicy` dan `DesignPolicy`
- Ganti `authorizeOwnership()` dengan `$this->authorize('update', $prd)`
- Route model binding + policy otomatis menolak akses lintas user

**Manfaat jangka panjang**

- Mudah menambah fitur sharing/team workspace nanti
- Authorization terpusat, bukan tersebar di controller

---

## 8. Tracking penggunaan token / quota

**Masalah**

- Token usage ditampilkan di UI PRD (`lastUsage`) tapi **tidak disimpan**
- Tidak ada quota per user
- Tidak ada dasar untuk billing atau limit freemium

**Rekomendasi**

- Tambah kolom `token_usage` di tabel `prds` / `designs`, atau tabel `ai_usage_logs` terpisah
- Simpan `usage` dari response provider setiap request
- (Opsional) Tampilkan total usage di dashboard user
- (Opsional) Blokir request jika quota habis

**Skema minimal**

```sql
ai_usage_logs
  - id
  - user_id
  - model
  - mode          -- interview | generate | refine | design
  - total_tokens
  - created_at
```

---

## Checklist implementasi

```
[x] Rate limiter pada route AI
[x] Ekstrak HistorySidebar, UserMenu, ModelSelect
[x] Ekstrak prd-parser ke lib/
[x] PrdStreamController + frontend streaming
[x] Tombol "Buat design dari PRD"
[x] Design Studio di welcome page
[x] Hapus atau dokumentasikan DesignAssistantController
[x] AlertDialog konfirmasi hapus
[x] Fix label loading + postMessage origin
[x] PrdPolicy + DesignPolicy
[x] Tabel ai_usage_logs + persist token usage
```

---

## Yang sudah baik (tidak perlu diubah dulu)

- Abstraksi `AiProvider` multi-model
- Ownership isolation + test coverage
- Prompt engineering (format interview terstruktur, constraint HTML design)
- Pola `key={current?.id}` untuk remount workspace
- Truncasi message history (18 turn terakhir) sebelum kirim ke API
- Auth lengkap: Fortify, 2FA, passkey, email verification

---

## Sisa backlog

- **Pagination history sidebar** (PRD & design): payload saat ini kecil (id, judul, waktu). Pakai `Inertia::scroll` + `<InfiniteScroll>` kalau ada user dengan ratusan dokumen.
- **Larastan di CI**: belum dipasang.
- **Link share read-only & ekspor DOCX**: belum dibangun. PDF tersedia lewat print browser.
- **Analitik funnel / NPS**: belum dipasang (lihat `blueprint.md` §9).
