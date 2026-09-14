# TEST CASE SHEET — Warung App (CRUD)

Format tabular supaya bisa langsung dipindahkan ke Google Sheets / Excel.
Kolom status memakai hasil eksekusi nyata, bukan asumsi.
Ringkasan: 19 skenario — 5 lolos, 14 gagal (seluruh kegagalan sudah terkonfirmasi sebagai bug).

| TC-ID | Modul | Skenario | Data Uji | Langkah | Hasil Diharapkan | Hasil Nyata | Status | Prioritas | Bukti |
|---|---|---|---|---|---|---|---|---|---|
| TC-001 | Tambah | Tambah produk data lengkap | nama=Kopi Liberika, sku=KOPI-900, harga=52000, stok=10 | Isi form → kirim | Data tersimpan, muncul di daftar | Tersimpan, status 201, data benar | Lolos | - | `tests/regresi.spec.js` baris 14 |
| TC-002 | Edit | Ubah nama, harga, stok | id=1, nama=Kopi Arabika 500g, harga=88000, stok=20 | Panggil update | Nilai berubah sesuai input | Berubah sesuai input | Lolos | - | `tests/regresi.spec.js` baris 28 |
| TC-003 | Hapus | Hapus produk tanpa relasi | id=3 | Panggil delete | Produk hilang dari daftar | Status 200, produk hilang | Lolos | - | `tests/regresi.spec.js` baris 39 |
| TC-004 | Pesanan | Pesan dalam batas stok | id=1, qty=2 | Buat pesanan | Stok berkurang tepat 2 | Stok berkurang tepat 2 | Lolos | - | `tests/regresi.spec.js` baris 47 |
| TC-005 | Daftar | Tabel & total tampil benar | - | Buka halaman utama | Tabel terisi, total 12 produk | Tabel terisi, total 12 | Lolos | - | `tests/regresi.spec.js` baris 56 |
| TC-006 | Tambah | Nama produk kosong | nama="" , sku=X-1, harga=1000, stok=5 | Kirim tanpa nama | Ditolak, pesan validasi | **Status 201, nama kosong tersimpan** | Gagal | Sedang | BUG-01 |
| TC-007 | Edit | Kosongkan nama produk | id=2, nama="" | Kirim nama kosong | Ditolak | Diterima, nama jadi kosong | Gagal | Sedang | BUG-01 |
| TC-008 | Tambah | SKU duplikat | sku=KOPI-001 (sudah ada) | Kirim SKU sama | Ditolak, SKU harus unik | **Status 201, duplikat tersimpan** | Gagal | Sedang | BUG-02 |
| TC-009 | Pesanan | Pesan melebihi stok | id=5, stok=3, qty=999 | Buat pesanan | Ditolak, stok tidak cukup | **Status 201, stok jadi -996** | Gagal | **Tinggi** | BUG-03 |
| TC-010 | Pesanan | Stok tidak boleh negatif | id=5 setelah qty berlebih | Periksa stok | Stok >= 0 | Stok = -996 | Gagal | **Tinggi** | BUG-03 |
| TC-011 | Hapus | Hapus produk yang sudah dipesan | id=6 (ada pesanan) | Panggil delete | Ditolak, data masih terpakai | Terhapus 200, pesanan yatim | Gagal | **Tinggi** | BUG-04 |
| TC-012 | Pesanan | Tidak ada pesanan yatim | - | Bandingkan daftar pesanan vs produk | Semua pesanan punya produk valid | Ada pesanan tanpa produk | Gagal | Tinggi | BUG-04 |
| TC-013 | Tambah | Harga negatif | harga=-5000 | Kirim harga minus | Ditolak | Diterima | Gagal | Sedang | BUG-05 |
| TC-014 | Tambah | Harga berupa teks | harga="abc" | Kirim teks | Ditolak, harga harus angka | **Status 201, harga="abc" tersimpan** | Gagal | Sedang | BUG-05 |
| TC-015 | Edit | Harga non-angka saat edit | id=1 harga awal 45000, input "abc" | Panggil update | Ditolak, harga lama tetap | **Harga jadi null, data lama hilang** | Gagal | Sedang | BUG-05 |
| TC-016 | Daftar | Cari dengan huruf kecil | q="kopi" | Cari produk | Menemukan produk berawalan Kopi | **Total 0, tidak ditemukan** | Gagal | Rendah | BUG-06 |
| TC-017 | Daftar | Halaman 1 memuat produk awal | page=1, perPage=5 | Buka halaman pertama | Mulai dari produk id 1 | **Mulai dari id 6** | Gagal | **Tinggi** | BUG-07 |
| TC-018 | Daftar | Semua produk terjangkau lewat paginasi | page 1-3 | Kumpulkan id dari semua halaman | 12 id unik seluruhnya | Id 1-5 tidak pernah muncul | Gagal | **Tinggi** | BUG-07 |
| TC-019 | Tambah | Daftar ter-refresh setelah simpan | nama=Produk Baru QA | Submit lalu lihat tabel | Produk baru langsung tampil | **Tabel tidak berubah** | Gagal | **Tinggi** | BUG-08 |

## Catatan Pengujian

- Seluruh 19 test dieksekusi otomatis; tidak ada sel status yang dikosongkan.
- Status Gagal = perilaku aplikasi menyimpang dari hasil yang diharapkan, bukan error pada test.
- Bukti mentah (perintah + respons) tercatat di `LAPORAN-AUDIT.md` per temuan.
- Hasil eksekusi ulang: `19 passed` — 5 test regresi lolos, 14 test temuan bertanda `test.fail()` dan tetap terverifikasi gagal.
