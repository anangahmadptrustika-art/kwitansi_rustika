# 🧾 Aplikasi Kwitansi Otomatis — Rustika Consultant

Aplikasi web untuk membuat **kwitansi / form request otomatis** PT Rustika Global
Indonesia. Mengikuti format dokumen resmi (Operasional Office & BBM), lengkap
dengan **dashboard**, **upload bukti transfer**, dan **ekspor PDF**.

Aplikasi berjalan **100% di browser** (tanpa server). Semua data tersimpan lokal
di perangkat Anda menggunakan IndexedDB — aman, cepat, dan bisa dipakai offline.

---

## ✨ Fitur

- **📊 Dashboard** — total kwitansi, total nominal, nominal bulan ini, rata-rata,
  grafik nominal per bulan, dan daftar kwitansi terbaru.
- **➕ Buat Kwitansi** — formulir sesuai contoh dokumen:
  - Kop dengan logo, Document Code, Version, Effective Date, Department
  - **A. Request Information** (Request Date, Requested By, Departemen/Divisi)
  - **B. Request Details** — tabel multi-baris (Description, Amount, Virtual
    Account Number, Remarks) + TOTAL otomatis + **terbilang** otomatis
  - Tanda tangan (Yang Mengajukan & Menyetujui)
  - **Nomor kwitansi & Document Code di-generate otomatis**
  - **Pratinjau langsung (live preview)** di samping form
- **📎 Upload Bukti Transfer** — unggah satu atau beberapa gambar; tampil
  otomatis di **bagian bawah kwitansi** saat dicetak.
- **🧾 Daftar Kwitansi** — pencarian, filter per bulan, lihat/edit/hapus,
  ekspor **CSV** dan **backup JSON**.
- **⚙️ Pengaturan** — ubah identitas perusahaan, **unggah logo asli**, atur
  default judul/divisi/penanda tangan, prefix & nomor urut, impor data historis,
  backup & restore.
- **🖨️ Cetak / PDF** — tombol cetak menghasilkan PDF rapi ukuran A4
  (gunakan "Save as PDF" pada dialog cetak browser).
- **📥 Impor Data Historis** — 219 kwitansi dari file Excel (April 2025 – Juni
  2026) dapat diimpor sekali klik untuk mengisi dashboard.

---

## 🚀 Cara Menjalankan

### Opsi 1 — Langsung buka file
Buka `index.html` di browser (Chrome/Edge/Firefox). Sebagian besar fitur jalan.

### Opsi 2 — Server lokal (disarankan)
Agar fitur "Impor Data Historis" (membaca `data/seed.json`) berjalan mulus:

```bash
# dengan Python
python3 -m http.server 8080
# lalu buka http://localhost:8080

# atau dengan Node
npx serve .
```

### Opsi 3 — GitHub Pages
Aktifkan GitHub Pages (branch ini, folder root). Aplikasi langsung online.

---

## 🖼️ Mengganti Logo

Ada dua cara, pilih salah satu:

**Cara 1 — Lewat aplikasi (cepat, per-browser).** Cocok bila Anda pemakai utama.
1. Buka menu **⚙️ Pengaturan**
2. Bagian *Identitas & Logo* → klik **pilih file** dan unggah logo Anda (PNG/JPG/SVG)
3. Klik **Simpan Pengaturan** → logo dipakai di semua kwitansi.

**Cara 2 — Jadikan logo default situs (untuk semua pengunjung).**
Unggah file logo asli Anda ke repo dengan nama **`assets/logo.png`**
(di GitHub: *Add file → Upload files* ke folder `assets/`). Aplikasi otomatis
mendeteksi dan memakainya sebagai logo bawaan di mana-mana — tanpa ubah kode.
Bila `assets/logo.png` tidak ada, aplikasi memakai `assets/logo.svg`.

---

## 💾 Data & Cadangan

- Semua kwitansi & pengaturan tersimpan di **IndexedDB** browser ini.
- Pindah perangkat / cadangan: **Pengaturan → Export Backup (JSON)**, lalu
  **Import Backup** di perangkat lain.
- Menghapus data browser akan menghapus kwitansi — lakukan backup berkala.

---

## 📁 Struktur Proyek

```
index.html          Shell aplikasi
css/style.css       Tampilan aplikasi + dokumen kwitansi
css/print.css       Aturan cetak / PDF (A4)
js/utils.js         Format Rupiah, terbilang, tanggal, kompres gambar
js/config.js        Pengaturan default & generator nomor
js/db.js            Penyimpanan IndexedDB
js/receipt.js       Template render dokumen kwitansi
js/app.js           Router + semua tampilan (dashboard, buat, daftar, setting)
assets/logo.svg     Logo bawaan (bisa diganti via Pengaturan)
data/seed.json      219 data kwitansi historis (untuk impor)
```

---

## 🛠️ Teknologi

Vanilla JavaScript, HTML, CSS — tanpa framework, tanpa proses build, tanpa
dependensi runtime. Ringan dan mudah dipelihara.
