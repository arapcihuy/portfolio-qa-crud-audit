# LAPORAN AUDIT FUNGSIONAL — Warung App (demo)

Auditor: QA & Test Automation
Tanggal: 14 September 2026
Objek uji: Warung App v1.0 — aplikasi demo CRUD produk & pesanan (dibuat sendiri untuk portofolio)
Metode: uji fungsional CRUD (manual + otomasi Playwright), 19 skenario, disusun lewat test case sheet
Status akhir: **8 temuan** — 3 Prioritas Tinggi, 3 Sedang, 2 Rendah

> Catatan penting: aplikasi ini saya bangun sendiri dan bug-nya saya tanam sengaja.
> Tujuannya memperagakan cara kerja audit, termasuk bukti mentah dan langkah reproduksi.
> Bukan aplikasi milik orang lain.

---

## Ringkasan Temuan

| ID | Judul | Prioritas | Dampak ke pengguna | Modul |
|---|---|---|---|---|
| BUG-03 | Stok bisa jadi minus, tanpa peringatan | **Tinggi** | Data stok rusak permanen, user tidak tahu | Pesanan |
| BUG-04 | Produk terhapus walau masih dipakai pesanan | **Tinggi** | Riwayat pesanan jadi yatim, laporan tidak balance | Hapus |
| BUG-07 | Paginasi salah hitung | **Tinggi** | 5 produk pertama tidak bisa dilihat sama sekali | Daftar |
| BUG-08 | Daftar tidak diperbarui setelah simpan | **Tinggi** | User mengira gagal simpan → input ganda | Tambah |
| BUG-05 | Harga non-angka merusak data (senyap) | Sedang | Harga berubah jadi kosong tanpa error | Tambah/Edit |
| BUG-02 | SKU duplikat diterima | Sedang | Dua produk dengan identitas sama | Tambah |
| BUG-01 | Validasi field wajib tidak jalan | Sedang | Produk tanpa nama tersimpan | Tambah/Edit |
| BUG-06 | Pencarian sensitif huruf besar/kecil | Rendah | "kopi" tidak menemukan "Kopi Arabika" | Daftar |

Rinciannya di bawah. Setiap temuan menyertakan bukti mentah dari eksekusi nyata
(perintah curl + respons yang diterima), bukan perkiraan.

---

## BUG-03 — Stok bisa jadi minus, tanpa peringatan apa pun

**Prioritas: Tinggi**
**Cara reproduksi**
1. Buka daftar produk. Catat produk id 5 = "Susu Kental Manis", stok 3.
2. Kirim pesanan qty 999 untuk produk itu.
3. Periksa stok setelahnya.

**Bukti mentah**
```
$ curl -X POST /api/pesanan -d '{"produkId":5,"qty":999}'
{"ok":true,"stokSekarang":-996}

$ curl /api/produk?page=0&perPage=50   → produk id 5
[(5, 'Susu Kental Manis', -996)]
```

**Hasil diharapkan:** pesanan ditolak dengan pesan "stok tidak cukup" (status 4xx), stok tetap 3.
**Hasil nyata:** status 201 sukses, stok jadi **-996**, aplikasi tidak menampilkan error apa pun.
**Dampak:** angka stok ke arah minus dan menetap. Semua laporan stok/penjualan setelahnya tidak bisa dipercaya. Pengguna tidak punya cara mengetahui ini terjadi.
**Perbaikan yang disarankan:** cek `stok >= qty` sebelum memproses; kembalikan 409/400 dengan pesan jelas; batasi stok minimal 0 di level API.

---

## BUG-04 — Produk bisa dihapus walau masih dipakai pesanan

**Prioritas: Tinggi**
**Cara reproduksi**
1. Buat pesanan untuk produk id 6.
2. Hapus produk id 6.
3. Lihat daftar pesanan.

**Bukti mentah**
```
$ curl -X DELETE /api/produk/6
DELETE HTTP 200

$ curl /api/pesanan
{"total":1,"data":[{"id":1,"produkId":5,"nama":"Susu Kental Manis","qty":999}]}
```
Setelah produk id 6 dihapus, pesanan yang menunjuk ke id 6 tetap ada di daftar namun produknya sudah tidak ditemukan.

**Hasil diharapkan:** penghapusan ditolak (409) selama produk masih dirujuk pesanan, atau ditawari soft-delete/arsip.
**Hasil nyata:** terhapus 200 OK, pesanan jadi yatim (orphan).
**Dampak:** riwayat transaksi kehilangan acuan produk. Nama produk di pesanan lama tidak bisa diverifikasi lagi.
**Perbaikan yang disarankan:** cek relasi pesanan; pakai kolom `deleted_at` (soft delete) alih-alih hapus permanen.

---

## BUG-07 — Paginasi salah hitung, produk pertama tidak bisa dijangkau

**Prioritas: Tinggi**
**Cara reproduksi**
1. Reset data (12 produk).
2. Buka halaman 1 dan halaman 2 pada daftar dengan 5 item per halaman.

**Bukti mentah**
```
page=1 total: 12 | id tampil: [6, 7, 8, 9, 10]
page=2 id tampil: [11, 12]
```

**Hasil diharapkan:** halaman 1 menampilkan id 1-5, halaman 2 menampilkan id 6-10, halaman 3 menampilkan 11-12.
**Hasil nyata:** halaman 1 langsung mulai dari id 6. Produk id 1-5 **tidak pernah muncul di halaman mana pun**.
**Penyebab:** perhitungan offset memakai `page * perPage`, seharusnya `(page - 1) * perPage`. Halaman di sisi UI dimulai dari 1, sedangkan rumusnya mengasumsikan halaman mulai dari 0.
**Dampak:** pengguna kehilangan akses ke sebagian data tanpa tahu datanya ada. Ini kelas bug yang paling sering lolos dari uji manual cepat, karena yang diuji biasanya "apakah tabel terisi?", bukan "apakah seluruh data bisa dijangkau?".
**Perbaikan yang disarankan:** perbaiki rumus offset; tambahkan test yang memastikan gabungan semua halaman = seluruh dataset.

---

## BUG-08 — Daftar tidak diperbarui setelah menyimpan produk baru

**Prioritas: Tinggi** (bug UX, sering diremehkan tapi dampaknya langsung ke pekerjaan pengguna)
**Cara reproduksi**
1. Isi form Tambah Produk dengan data lengkap, klik Simpan.
2. Perhatikan tabel daftar produk tanpa menekan apa pun.

**Hasil diharapkan:** produk baru langsung muncul di tabel.
**Hasil nyata:** data **berhasil tersimpan di server**, tetapi tabel tidak ikut diperbarui. Pengguna melihat layar yang tidak berubah, menyimpulkan simpan gagal, lalu mengisi ulang form. Akibatnya produk yang sama masuk dua kali.
**Bukti otomasi:** test `BUG-08` di `tests/perilaku-diharapkan.spec.js` gagal — tabel tidak pernah memuat teks "Produk Baru QA" setelah submit tanpa reload manual.
**Perbaikan yang disarankan:** muat ulang daftar setelah submit sukses, dan tampilkan notifikasi "data tersimpan". Sediakan juga proteksi anti input ganda.

---

## BUG-05 — Harga non-angka merusak data secara senyap

**Prioritas: Sedang**
**Bukti mentah**
```
$ curl -X POST /api/produk -d '{"nama":"Produk Teks","sku":"TEKS-1","harga":"abc","stok":1}'
HTTP 201
{"id":15,...,"harga":"abc","stok":1}          ← teks diterima sebagai harga

$ curl -X PUT /api/produk/1 -d '{"harga":"abc"}'   (harga awal 45000)
{"id":1,"nama":"Kopi Arabika 250g","sku":"KOPI-001","harga":null,"stok":12}
                                                  ↑ harga lama hilang, tanpa error
```

**Hasil diharapkan:** input non-angka ditolak dengan pesan validasi.
**Hasil nyata:** saat tambah, teks `"abc"` tersimpan apa adanya. Saat edit, harga berubah menjadi kosong (`null`) dan **harga lama hilang**, tanpa pemberitahuan.
**Dampak:** data harga — data paling sensitif di aplikasi jualan — bisa rusak tanpa jejak. Kasus kedua (kehilangan harga lama) adalah kerusakan permanen.
**Perbaikan yang disarankan:** validasi tipe dan rentang (harga > 0); jangan simpan `null` hasil parse gagal; kembalikan pesan validasi yang menyebut field mana yang salah.

---

## BUG-02 — SKU duplikat diterima

**Prioritas: Sedang**
**Bukti mentah**
```
$ curl -X POST /api/produk -d '{"nama":"Kopi Palsu","sku":"KOPI-001","harga":10000,"stok":1}'
HTTP 201
{"id":14,"nama":"Kopi Palsu","sku":"KOPI-001",...}
```
`KOPI-001` sudah dipakai produk id 1, tetapi tetap diterima.
**Dampak:** dua produk dengan identitas yang sama. Saat integrasi ke sistem lain atau ekspor data, keduanya tidak bisa dibedakan.
**Perbaikan:** batasan unik (unique constraint) di database + pengecekan di API dengan pesan 409 yang jelas.

---

## BUG-01 — Validasi field wajib tidak dijalankan

**Prioritas: Sedang**
**Bukti mentah**
```
$ curl -X POST /api/produk -d '{"nama":"","sku":"X-1","harga":1000,"stok":5}'
HTTP 201
{"id":13,"nama":"","sku":"X-1","harga":1000,"stok":5}   ← nama kosong tersimpan
```
**Dampak:** daftar produk berisi baris tanpa nama. Sulit dicari, sulit dipilih saat membuat pesanan.
**Perbaikan:** validasi wajib untuk nama dan SKU, baik saat tambah maupun saat edit (edit juga tidak divalidasi).

---

## BUG-06 — Pencarian sensitif huruf besar/kecil

**Prioritas: Rendah**
**Bukti mentah**
```
q=kopi → total: 0
q=Kopi → total: 3
```
Pengguna mengetik huruf kecil (kebiasaan umum) dan mendapat hasil kosong, padahal datanya ada. Bisa disimpulkan sebagai "produk tidak ada".
**Perbaikan:** normalisasi huruf pada pencarian.

---

## Cara Kerja Audit Ini

1. **Pemetaan modul** — daftar semua aksi CRUD di aplikasi, plus jalur alternatif (contoh: edit produk, pencarian, paginasi) yang sering terlewat dari uji manual cepat.
2. **Test case sheet** — setiap baris memuat langkah, data uji, hasil diharapkan, hasil nyata, status, bukti. Semua sel terisi, tidak ada yang dikosongkan. Lihat `TEST-CASES.md`.
3. **Eksekusi** — uji manual untuk alur utama, lalu tulis otomasi Playwright untuk mengunci perilaku yang sudah benar (`tests/regresi.spec.js`) dan mendokumentasikan bug sebagai test yang ditandai gagal (`tests/perilaku-diharapkan.spec.js`).
4. **Bukti** — tiap temuan disertai respons mentah, bukan hanya deskripsi. Ini yang menghilangkan debat "kok bisa?" saat laporan dibahas dengan developer.
5. **Laporan prioritas** — diurutkan berdasarkan dampak ke pengguna dan ke percayaan data, bukan berdasarkan urutan penemuan.

Hasil akhir eksekusi: **19 test, seluruhnya berjalan, 0 gagal tak terduga.**
5 test regresi memverifikasi alur sehat; 14 test dokumen temuan menandai perilaku yang seharusnya terjadi.

Cara menjalankan sendiri:
```
npm install && npx playwright install chromium
npx playwright test
```
Screenshot, trace, dan laporan HTML otomatis tersimpan di `laporan-playwright/`.
