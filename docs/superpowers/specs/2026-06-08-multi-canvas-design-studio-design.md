# Multi-Canvas Design Studio — Design Spec

**Tanggal:** 2026-06-08
**Status:** Disetujui (siap masuk tahap rencana implementasi)
**Area:** Design Studio ([resources/js/pages/design.tsx](../../../resources/js/pages/design.tsx) + backend Design)

## Latar Belakang

Saat ini "Jenis halaman" (`kind`) bersifat **single-select**: satu `Design` = satu `kind` + satu `html` + satu canvas + satu thread chat. User hanya bisa mengerjakan satu jenis halaman per design.

## Tujuan

Mengubah panel "Jenis halaman" menjadi **multi-select**, di mana tiap jenis halaman punya **canvas sendiri**, dan beberapa jenis bisa **digenerate sekaligus** dari satu prompt.

## Keputusan Inti (disepakati dengan user)

1. **Cara generate:** Satu prompt → generate semua canvas terpilih **secara paralel** (satu AI stream per kind), masing-masing ke canvas-nya sendiri.
2. **Penyimpanan:** Satu `Design` = **satu project** berisi banyak canvas (bukan record terpisah per jenis).
3. **Layout preview:** **Tab** antar canvas (satu area preview, ganti via tab).
4. **Model data:** Pendekatan A — kolom **JSON `canvases`** di tabel `designs` (bukan tabel baru).
5. **Refine/Edit:** Beroperasi pada **canvas tab aktif** saja. Tiap canvas punya thread chat + riwayat versi sendiri.

## Model Data

### Tabel `designs`
- **Tambah** kolom `canvases` (JSON, nullable). Struktur tiap elemen:
  ```json
  {
    "kind": "landing-page | dashboard | mobile-app",
    "html": "string | null",
    "messages": [{ "role": "user|assistant", "content": "..." }],
    "prompt": "string | null"
  }
  ```
- Kolom lama `kind`, `html`, `messages` **dipertahankan** (back-compat) dan diisi dari canvas pertama saat menyimpan. Sumber kebenaran baru = `canvases`.
- `title`, `prompt` (deskripsi produk bersama), `model` tetap di level project.

### Migrasi data lama
- Migration baru: untuk tiap design lama, isi `canvases = [{ kind, html, messages, prompt }]` dari kolom lamanya. Design lama tampil sebagai project 1-canvas tanpa kerusakan.

### Model `Design.php`
- Tambahkan `canvases` ke `$casts` sebagai `array`/`AsCollection` (mengikuti pola `messages` saat ini).
- Tambahkan ke fillable.

## UI — Panel "Jenis halaman" (multi-select)

- 3 kartu (Landing/Dashboard/Mobile) menjadi **toggle multi-select**: bisa pilih 1–3.
- Minimal 1 jenis wajib dipilih (disable tombol Generate jika 0 terpilih).
- State aktif visual (border/ring) pada kartu terpilih; klik untuk pilih/lepas.

## Alur Generate (paralel)

1. User isi 1 prompt, pilih ≥1 jenis, klik **Generate**.
2. Frontend memanggil `streamDesign` (endpoint `DesignStreamController` yang **sudah ada**, tanpa perubahan backend) **paralel** (`Promise.all`) untuk tiap kind terpilih, masing-masing dengan `kind` berbeda.
3. Tiap stream menulis ke state streaming **per-canvas** (di-key oleh `kind`), sehingga tiap tab membangun live sendiri.
4. Setelah semua selesai → simpan project (semua canvas) lewat satu `persistDesign`.

## Area Preview (tabs)

- Tab muncul untuk kind yang terpilih/punya hasil.
- Klik tab → tampilkan canvas itu (iframe preview, code view, edit mode — semua per-canvas).
- Indikator loading per-tab saat canvas itu masih streaming.

## Refine / Edit

- Beroperasi pada **canvas tab aktif**: pakai `html` + `kind` + `messages` canvas tersebut.
- Tiap canvas punya thread chat + riwayat versi (`versions`) sendiri.

## Export

- Tombol export meng-export **canvas tab aktif** (perilaku ZIP/HTML seperti sekarang).
- Nama file diberi suffix kind, mis. `project-landing-page.zip`.
- Export gabungan semua canvas = **di luar scope** (bisa menyusul).

## Perubahan State Frontend (terbesar di design.tsx)

State yang saat ini tunggal akan menjadi **per-canvas** (di-key oleh `kind`), dengan satu `activeKind` penanda tab aktif:
- `streamingHtml`, `html`, `messages`, `editMode`, `selected`, `versions`, `currentVersionIndex`, `viewMode` → per-canvas.
- Tambah: `selectedKinds: DesignKind[]` (jenis terpilih), `activeKind: DesignKind` (tab aktif).

Disarankan mengekstrak state per-canvas ke struktur tunggal (mis. `Record<DesignKind, CanvasState>`) untuk menjaga design.tsx tetap terkelola.

## Out of Scope (YAGNI)

- Perubahan backend streaming controller, policy, kuota AI.
- Export gabungan semua canvas dalam satu arsip.
- Drag-reorder canvas.
- Prompt terpisah per canvas (yang dipilih: satu prompt bersama untuk generate awal; refine per-canvas-aktif).

## Validasi & Keamanan

- `kind` tetap divalidasi `Rule::in([...])` di tiap request stream (satu kind per panggilan).
- `StoreDesignRequest`: tambahkan validasi untuk `canvases` (array, tiap item: `kind` in-list, `html` nullable string max, `messages` array, dst.) mengikuti batas yang ada.
- Ukuran payload: tiap canvas `html` dibatasi seperti sekarang (`max:120000`); total project bisa berisi hingga 3 canvas.

## Catatan

Project ini **bukan git repo** (`git rev-parse` = false), jadi spec ini tidak di-commit; cukup disimpan sebagai file.
