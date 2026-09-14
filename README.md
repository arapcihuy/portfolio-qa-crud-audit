# Portofolio QA & Test Automation

Contoh hasil kerja audit fungsional CRUD: dari test case sheet, eksekusi, bukti mentah, sampai laporan prioritas.

## Isi repo ini

| Berkas | Isi |
|---|---|
| `LAPORAN-AUDIT.md` | Laporan audit 8 temuan, lengkap dengan bukti mentah dan langkah reproduksi |
| `TEST-CASES.md` | Test case sheet 19 skenario (format siap dipindah ke Google Sheets) |
| `tests/regresi.spec.js` | 5 test Playwright untuk menjaga alur yang sudah benar |
| `tests/perilaku-diharapkan.spec.js` | 14 test yang mendokumentasikan bug sebagai "living documentation" |
| `demo-app/` | Aplikasi demo (Node.js, tanpa dependensi) — dibuat sendiri, bug ditanam sengaja |

## Kenapa aplikasi demo-nya dibuat sendiri

Supaya hasil kerja bisa diverifikasi siapa pun tanpa perlu akses ke sistem klien, dan tanpa menyentuh data milik orang lain. Bug di dalamnya disengaja, ditandai BUG-01 sampai BUG-08 pada kode.

## Cara menjalankan

```bash
npm install
npx playwright install chromium
npx playwright test
```

Hasil: 19 test berjalan, 0 gagal tak terduga. Laporan HTML otomatis tersimpan di `laporan-playwright/`.

Menjalankan aplikasinya saja:
```bash
node demo-app/server.js      # http://127.0.0.1:4173
```

## Pendekatan kerja

1. Petakan seluruh aksi CRUD dan jalur alternatifnya (edit, cari, paginasi, hapus berelasi) — bukan cuma alur bahagia.
2. Susun test case sheet; semua sel terisi, termasuk hasil nyata dan bukti.
3. Uji manual untuk alur utama, lalu kunci dengan otomasi Playwright.
4. Setiap temuan disertai bukti mentah — agar tidak ada perdebatan "kok bisa?" saat dibahas dengan developer.
5. Laporan diurutkan berdasarkan dampak ke pengguna dan kepercayaan data, bukan urutan penemuan.

## Kelas bug yang paling sering terlewat

- Perhitungan paginasi (offset) — sebagian data jadi tidak bisa diakses, tapi halaman tetap "kelihatan benar"
- Aksi yang tersimpan di server tetapi UI tidak diperbarui — memicu input ganda
- Nilai yang gagal diparsing tapi tersimpan sebagai kosong — data lama hilang tanpa error
- Relasi yang tidak dijaga saat hapus — data jadi yatim
- Validasi yang cuma ada di UI, tidak di API — lolos begitu API dipanggil langsung

## Kontak

Rasyid Ahmad Fauzi — QA & Test Automation
Email: arapcihuy@gmail.com
LinkedIn: https://linkedin.com/in/rasyid-ahmad-840b8b250
GitHub: https://github.com/arapcihuy
Portofolio: https://arapcihuy.github.io
