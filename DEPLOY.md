# 🚀 Panduan Deploy

Aplikasi ini **situs statis murni** (HTML/CSS/JS, tanpa build). Bisa langsung
di-deploy ke GitHub Pages maupun Vercel. Semua data tersimpan di browser
(IndexedDB), jadi tidak perlu database/server.

---

## A. GitHub Pages (otomatis via GitHub Actions)

Repo ini sudah berisi workflow `.github/workflows/deploy.yml` yang otomatis
men-deploy setiap kali ada push.

**Langkah sekali saja:**

1. Buka repo di GitHub → **Settings** → **Pages**
2. Bagian **Build and deployment** → **Source** pilih **GitHub Actions**
3. Selesai. Setiap push akan otomatis ter-deploy.

Cek progres di tab **Actions**. Setelah selesai, alamat situs muncul di
**Settings → Pages**, biasanya:

```
https://anangahmadptrustika-art.github.io/kwitansi_rustika/
```

> Jalankan manual kapan saja: tab **Actions** → workflow *Deploy ke GitHub
> Pages* → **Run workflow**.

---

## B. Vercel (rekomendasi: paling cepat)

Repo ini sudah berisi `vercel.json`. Tidak perlu konfigurasi build.

**Cara 1 — Lewat dashboard (paling mudah):**

1. Masuk ke <https://vercel.com> → **Add New…** → **Project**
2. **Import Git Repository** → pilih `kwitansi_rustika`
3. Pengaturan biarkan default:
   - **Framework Preset:** Other
   - **Build Command:** (kosongkan)
   - **Output Directory:** (kosongkan / `.`)
4. Klik **Deploy**

Selesai — Vercel memberi URL seperti `https://kwitansi-rustika.vercel.app`.
Setiap push ke repo akan otomatis di-deploy ulang.

**Cara 2 — Lewat CLI:**

```bash
npm i -g vercel
vercel          # deploy preview
vercel --prod   # deploy production
```

---

## Catatan penting

- **Data tersimpan per-browser/perangkat.** Setiap pengguna menyimpan kwitansi
  di browser masing-masing. Untuk memindahkan data, pakai **Pengaturan →
  Export Backup (JSON)** lalu **Import Backup** di perangkat lain.
- **HTTPS** di GitHub Pages & Vercel membuat IndexedDB dan unggah gambar
  berjalan normal.
- Aplikasi memakai **path relatif**, jadi aman dijalankan baik di domain utama
  (Vercel) maupun di subpath (GitHub Pages).
