// @ts-check
/**
 * PERILAKU DIHARAPKAN — daftar BUG hasil audit.
 *
 * File ini adalah "living documentation" dari temuan audit.
 * Setiap test di sini menuliskan perilaku yang SEHARUSNYA terjadi.
 * Karena aplikasi demo sengaja masih bug, semuanya ditandai test.fail():
 *   - PASS  = bug masih ada, sesuai dugaan  ✅ (audit valid)
 *   - GAGAL = perilaku sudah benar, artinya bug sudah diperbaiki di aplikasi
 *
 * Kalau suatu hari test ini "unexpectedly passed", itu artinya bug-nya hilang
 * dan test-nya tinggal dihapus dari daftar temuan.
 */
const { test, expect } = require('@playwright/test');

test.describe('BUG-01 — validasi field wajib tidak dijalankan', () => {
  test.fail();
  test('nama produk kosong seharusnya ditolak (minimal 400)', async ({ request }) => {
    const res = await request.post('/api/produk', {
      data: { nama: '', sku: 'X-1', harga: 1000, stok: 5 },
    });
    expect(res.status(), 'nama kosong tidak boleh diterima').toBeGreaterThanOrEqual(400);
  });

  test.fail();
  test('mengosongkan nama produk saat update seharusnya ditolak', async ({ request }) => {
    const res = await request.put('/api/produk/2', { data: { nama: '' } });
    expect(res.status(), 'nama tidak boleh dikosongkan').toBeGreaterThanOrEqual(400);
  });
});

test.describe('BUG-02 — SKU duplikat diterima', () => {
  test.fail();
  test('SKU yang sama seharusnya ditolak', async ({ request }) => {
    const res = await request.post('/api/produk', {
      data: { nama: 'Kopi Palsu', sku: 'KOPI-001', harga: 10000, stok: 1 },
    });
    expect(res.status(), 'SKU harus unik').toBeGreaterThanOrEqual(400);
  });
});

test.describe('BUG-03 — stok bisa jadi minus', () => {
  test.fail();
  test('pesan melebihi stok seharusnya ditolak', async ({ request }) => {
    const res = await request.post('/api/pesanan', { data: { produkId: 5, qty: 999 } });
    expect(res.status(), 'stok tidak cukup harus ditolak').toBeGreaterThanOrEqual(400);
  });

  test.fail();
  test('stok tidak boleh bernilai negatif setelah pesanan', async ({ request }) => {
    await request.post('/api/pesanan', { data: { produkId: 5, qty: 999 } });
    const list = await (await request.get('/api/produk?page=0&perPage=50')).json();
    const stok = list.data.find((x) => x.id === 5).stok;
    expect(stok, `stok jadi ${stok}`).toBeGreaterThanOrEqual(0);
  });
});

test.describe('BUG-04 — produk terhapus walau masih dipakai pesanan', () => {
  test.fail();
  test('menghapus produk yang punya pesanan seharusnya ditolak', async ({ request }) => {
    await request.post('/api/pesanan', { data: { produkId: 6, qty: 1 } });
    const res = await request.delete('/api/produk/6');
    expect(res.status(), 'produk terpakai pesanan tidak boleh dihapus').toBeGreaterThanOrEqual(400);
  });

  test.fail();
  test('tidak boleh ada pesanan yatim setelah produk dihapus', async ({ request }) => {
    await request.post('/api/pesanan', { data: { produkId: 6, qty: 1 } });
    await request.delete('/api/produk/6');
    const list = await (await request.get('/api/produk?page=0&perPage=50')).json();
    const pesanan = await (await request.get('/api/pesanan')).json();
    const yatim = pesanan.data.filter((o) => !list.data.find((x) => x.id === o.produkId));
    expect(yatim.length, `ada ${yatim.length} pesanan yatim`).toBe(0);
  });
});

test.describe('BUG-05 — harga negatif dan non-angka lolos', () => {
  test.fail();
  test('harga negatif seharusnya ditolak', async ({ request }) => {
    const res = await request.post('/api/produk', {
      data: { nama: 'Produk Minus', sku: 'MIN-1', harga: -5000, stok: 1 },
    });
    expect(res.status(), 'harga negatif tidak wajar').toBeGreaterThanOrEqual(400);
  });

  test.fail();
  test('harga berupa teks seharusnya ditolak, bukan tersimpan sebagai teks', async ({ request }) => {
    const res = await request.post('/api/produk', {
      data: { nama: 'Produk Teks', sku: 'TEKS-1', harga: 'abc', stok: 1 },
    });
    expect(res.status(), 'harga non-angka harus ditolak').toBeGreaterThanOrEqual(400);
  });

  test.fail();
  test('update dengan harga non-angka tidak boleh menghapus harga lama (data hilang senyap)', async ({ request }) => {
    const before = await (await request.get('/api/produk?page=0&perPage=50')).json();
    const hargaLama = before.data.find((x) => x.id === 1).harga;

    const res = await request.put('/api/produk/1', { data: { harga: 'abc' } });
    const body = await res.json();
    expect(body.harga, `harga lama ${hargaLama} berubah jadi ${body.harga} tanpa error`).toBe(hargaLama);
  });
});

test.describe('BUG-06 — pencarian sensitif huruf besar/kecil', () => {
  test.fail();
  test('cari "kopi" seharusnya menemukan "Kopi Arabika"', async ({ request }) => {
    const res = await request.get('/api/produk?q=kopi&page=0&perPage=50');
    const body = await res.json();
    expect(body.total, 'pencarian harus tidak sensitif huruf').toBeGreaterThan(0);
  });
});

test.describe('BUG-07 — paginasi salah hitung (offset)', () => {
  test.fail();
  test('halaman pertama harus memuat produk paling awal', async ({ request }) => {
    const semua = await (await request.get('/api/produk?page=0&perPage=100')).json();
    const produkPertama = semua.data[0].id;

    const hal1 = await (await request.get('/api/produk?page=1&perPage=5')).json();
    expect(hal1.data[0].id, `halaman 1 justru mulai dari id ${hal1.data[0].id}, bukan ${produkPertama}`)
      .toBe(produkPertama);
  });

  test.fail();
  test('5 produk pertama bisa dijangkau lewat paginasi', async ({ request }) => {
    const semua = await (await request.get('/api/produk?page=0&perPage=100')).json();
    const lima = semua.data.slice(0, 5).map((x) => x.id);

    const terlihat = new Set();
    for (const page of [1, 2, 3]) {
      const r = await (await request.get(`/api/produk?page=${page}&perPage=5`)).json();
      r.data.forEach((x) => terlihat.add(x.id));
    }
    const hilang = lima.filter((id) => !terlihat.has(id));
    expect(hilang, `produk yang tidak pernah muncul di halaman 1-3: ${hilang.join(',')}`).toHaveLength(0);
  });
});

test.describe('BUG-08 — daftar tidak diperbarui setelah simpan', () => {
  test.fail();
  test('produk baru langsung muncul di tabel tanpa klik "Muat ulang"', async ({ page }) => {
    // Dibuat 2x berturut-turut supaya halaman pindah ke posisi yang bisa dilihat.
    await page.goto('/');
    await page.fill('#in-nama', 'Produk Baru QA');
    await page.fill('#in-sku', 'BARU-001');
    await page.fill('#in-harga', '99000');
    await page.fill('#in-stok', '3');
    await page.click('#form-tambah button[type=submit]');

    // Perilaku yang diharapkan: tabel ikut ter-refresh otomatis.
    await expect(page.locator('#tabel tbody')).toContainText('Produk Baru QA', { timeout: 3000 });
  });
});
