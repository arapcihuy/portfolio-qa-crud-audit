// @ts-check
/**
 * REGRESI — perilaku yang SUDAH BENAR.
 * Semua test di file ini harus PASS. Fungsinya menjaga fitur yang sehat
 * supaya tidak rusak saat developer memperbaiki bug lain.
 */
const { test, expect } = require('@playwright/test');

test.describe('Regresi CRUD — alur sehat', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/reset');
  });

  test('tambah produk dengan data lengkap berhasil tersimpan', async ({ request }) => {
    const res = await request.post('/api/produk', {
      data: { nama: 'Kopi Liberika 200g', sku: 'KOPI-900', harga: 52000, stok: 10 },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.nama).toBe('Kopi Liberika 200g');
    expect(body.harga).toBe(52000);
    expect(body.stok).toBe(10);

    const list = await (await request.get('/api/produk?page=0&perPage=50')).json();
    expect(list.data.map((x) => x.sku)).toContain('KOPI-900');
  });

  test('update produk mengubah data yang benar', async ({ request }) => {
    const res = await request.put('/api/produk/1', {
      data: { nama: 'Kopi Arabika 500g', harga: 88000, stok: 20 },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.nama).toBe('Kopi Arabika 500g');
    expect(body.harga).toBe(88000);
    expect(body.stok).toBe(20);
  });

  test('hapus produk menghilangkan data dari daftar', async ({ request }) => {
    const del = await request.delete('/api/produk/3');
    expect(del.status()).toBe(200);

    const list = await (await request.get('/api/produk?page=0&perPage=50')).json();
    expect(list.data.find((x) => x.id === 3)).toBeUndefined();
  });

  test('pesanan dalam batas stok mengurangi stok dengan benar', async ({ request }) => {
    const before = await (await request.get('/api/produk?page=0&perPage=50')).json();
    const stokAwal = before.data.find((x) => x.id === 1).stok;

    const res = await request.post('/api/pesanan', { data: { produkId: 1, qty: 2 } });
    expect(res.status()).toBe(201);
    expect((await res.json()).stokSekarang).toBe(stokAwal - 2);
  });

  test('halaman menampilkan tabel produk dan total yang benar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#tabel tbody tr')).not.toHaveCount(0);
    await expect(page.locator('#info-halaman')).toContainText('total 12 produk');
  });
});
