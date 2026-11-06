# Sistem Pencatatan IMBS (Imam Muzani Boarding School)

Sistem Informasi Terpadu Pencatatan Pelanggaran, Poin Positif/Prestasi, dan Kedisiplinan Santri Halaqah Al-Qur'an & Kesantrian IMBS.

---

## 🚀 Panduan Menjalankan Sistem (Localhost)

### 1. Prasyarat
- **Node.js** (v18 atau lebih baru)
- **NPM** atau package manager yang kompatibel

### 2. Menjalankan Server & Aplikasi Sekaligus
Jalankan perintah berikut di root folder:

```bash
npm run dev:all
```

Perintah ini akan menjalankan dua service secara bersamaan:
1. **Backend Server (Express + SQLite)**:
   - Alamat: [http://localhost:5000](http://localhost:5000)
   - API Endpoint: [http://localhost:5000/api](http://localhost:5000/api)
2. **Frontend Client (Vite + React)**:
   - Alamat Local: [http://localhost:5173](http://localhost:5173)
   - Akses Perangkat Lain di Jaringan yang Sama (LAN/WiFi): `http://<IP_KOMPUTER>:5173` (otomatis aktif via `host: true` di Vite)

---

## 🛠️ Script yang Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev:all` | Menjalankan Backend Server (port 5000) dan Frontend Vite (port 5173) secara bersamaan |
| `npm run dev` | Menjalankan Frontend Vite saja |
| `npm run server` | Menjalankan Backend Server Node.js (tsx watch) saja |
| `npm run build` | Melakukan build frontend dan bundling backend untuk production / Vercel deployment |
| `npm run lint` | Menjalankan audit kode dengan Oxlint |

---

## 📁 Struktur Proyek

```text
├── api/                # Output bundle serverless untuk Vercel
├── public/             # Asset statis, logo, favicon, dan web manifest
├── server/
│   ├── data/           # Database SQLite lokal (halaqah.db - gitignored)
│   └── src/            # Express routes, controllers, DB schema, dan cloud storage provider
├── src/                # Kode sumber React (Pages, Components, Context, Services)
├── .env.example        # Contoh variabel lingkungan
├── .gitignore          # Konfigurasi proteksi file credential, build, dan DB lokal
├── package.json        # Dependensi dan script NPM
└── vite.config.ts      # Konfigurasi Vite & proxy backend
```

---

## 🔒 Konfigurasi Keamanan & Gitignore

File-file berikut telah diproteksi dan dikecualikan dari Git repository secara otomatis:
- `.env*` (kredensial dan variabel rahasia)
- `node_modules/`
- `dist/` dan hasil build
- `server/data/*.db*` (database SQLite lokal santri/transaksi)
- Log dan temporary files
