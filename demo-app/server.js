/**
 * DEMO APP — "Warung App" (sengaja punya bug)
 *
 * Aplikasi ini SAYA BIKIN SENDIRI khusus untuk portofolio.
 * Bug di dalamnya sengaja ditanam (ditandai BUG-01 s/d BUG-08) supaya
 * bisa dipakai memperagakan cara kerja audit fungsional CRUD.
 *
 * Ini BUKAN aplikasi orang lain, jadi aman dibagikan & dijalankan siapa saja.
 * Jalankan: node demo-app/server.js  →  http://127.0.0.1:4173
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4173;
const PUBLIC = path.join(__dirname, 'public');

let produk = [];
let pesanan = [];
let seq = 1;

function seed() {
  produk = [];
  pesanan = [];
  seq = 1;
  const data = [
    ['Kopi Arabika 250g', 'KOPI-001', 45000, 12],
    ['Kopi Robusta 250g', 'KOPI-002', 35000, 8],
    ['Teh Hijau Premium', 'TEH-001', 28000, 20],
    ['Gula Batu 500g', 'GULA-001', 15000, 4],
    ['Susu Kental Manis', 'SKM-001', 12000, 3],
    ['Cangkir Keramik', 'CANG-001', 65000, 6],
    ['Filter V60', 'FILT-001', 55000, 9],
    ['Timbangan Digital', 'TIMB-001', 185000, 2],
    ['Termos 1L', 'TERM-001', 210000, 5],
    ['Lampu Meja', 'LAMP-001', 130000, 7],
    ['Kotak Penyimpanan', 'KOTA-001', 40000, 15],
    ['Serbet Mikrofiber', 'SERB-001', 25000, 30],
  ];
  for (const [nama, sku, harga, stok] of data) {
    produk.push({ id: seq++, nama, sku, harga, stok });
  }
}

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

function perPage() { return 5; }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const p = u.pathname;
  const method = req.method;

  // ---------- FRONTEND ----------
  if (p === '/' && method === 'GET') {
    const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // ---------- RESET (khusus testing) ----------
  if (p === '/api/reset' && method === 'POST') {
    seed();
    return sendJson(res, 200, { ok: true });
  }

  // ---------- LIST PRODUK ----------
  if (p === '/api/produk' && method === 'GET') {
    let items = produk;

    const q = u.searchParams.get('q') || '';
    if (q) {
      // BUG-06: pencarian case-sensitive. "kopi" tidak menemukan "Kopi Arabika".
      items = items.filter((it) => it.nama.includes(q));
    }

    const page = parseInt(u.searchParams.get('page') || '1', 10);
    const size = parseInt(u.searchParams.get('perPage') || String(perPage()), 10);
    // BUG-07: offset salah — seharusnya (page-1)*size.
    // Akibatnya halaman 1 dan 2 menampilkan item yang sama.
    const offset = page * size;

    return sendJson(res, 200, {
      total: items.length,
      page,
      perPage: size,
      data: items.slice(offset, offset + size),
    });
  }

  // ---------- CREATE PRODUK ----------
  if (p === '/api/produk' && method === 'POST') {
    const b = await readBody(req);
    // BUG-01: tidak ada validasi field wajib. nama kosong tetap tersimpan.
    // BUG-02: SKU duplikat diterima tanpa peringatan.
    // BUG-05: harga negatif & non-angka diterima apa adanya.
    const item = {
      id: seq++,
      nama: b.nama === undefined ? '' : b.nama,
      sku: b.sku === undefined ? '' : b.sku,
      harga: b.harga === undefined ? null : b.harga,
      stok: b.stok === undefined ? null : b.stok,
    };
    produk.push(item);
    return sendJson(res, 201, item);
  }

  // ---------- UPDATE PRODUK ----------
  const mPut = p.match(/^\/api\/produk\/(\d+)$/);
  if (mPut && method === 'PUT') {
    const id = parseInt(mPut[1], 10);
    const item = produk.find((x) => x.id === id);
    if (!item) return sendJson(res, 404, { error: 'Produk tidak ditemukan' });
    const b = await readBody(req);
    // BUG-01 (lanjutan): update juga tidak memvalidasi — nama bisa dikosongkan.
    // BUG-08: harga di-parse tanpa cek NaN → tersimpan null tanpa error ke user.
    if (b.nama !== undefined) item.nama = b.nama;
    if (b.sku !== undefined) item.sku = b.sku;
    if (b.harga !== undefined) item.harga = parseFloat(b.harga) || null;
    if (b.stok !== undefined) item.stok = parseInt(b.stok, 10);
    return sendJson(res, 200, item);
  }

  // ---------- DELETE PRODUK ----------
  if (mPut && method === 'DELETE') {
    const id = parseInt(mPut[1], 10);
    const idx = produk.findIndex((x) => x.id === id);
    if (idx === -1) return sendJson(res, 404, { error: 'Produk tidak ditemukan' });
    // BUG-04: produk dihapus walau masih dipakai pesanan → data pesanan jadi yatim (orphan).
    produk.splice(idx, 1);
    return sendJson(res, 200, { ok: true });
  }

  // ---------- BUAT PESANAN ----------
  if (p === '/api/pesanan' && method === 'POST') {
    const b = await readBody(req);
    const item = produk.find((x) => x.id === Number(b.produkId));
    if (!item) return sendJson(res, 404, { error: 'Produk tidak ditemukan' });
    // BUG-03: tidak ada cek stok. Qty melebihi stok tetap diproses,
    // stok jadi MINUS, dan user tidak dapat pesan error apa pun.
    item.stok = item.stok - Number(b.qty);
    pesanan.push({ id: pesanan.length + 1, produkId: item.id, nama: item.nama, qty: Number(b.qty) });
    return sendJson(res, 201, { ok: true, stokSekarang: item.stok });
  }

  if (p === '/api/pesanan' && method === 'GET') {
    return sendJson(res, 200, { total: pesanan.length, data: pesanan });
  }

  return sendJson(res, 404, { error: 'Not found' });
});

seed();
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Warung App (demo, ada bug) jalan di http://127.0.0.1:${PORT}`);
});
