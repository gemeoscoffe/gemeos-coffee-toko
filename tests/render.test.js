/**
 * Perakit halaman.
 *
 * Yang diuji di sini adalah hal-hal yang salahnya tidak berbunyi: harga yang
 * tidak ikut ke HTML tetap menghasilkan halaman yang terlihat baik-baik saja,
 * dan baru ketahuan waktu tidak ada yang menemukannya di Google. Karena itu
 * beberapa tes memeriksa isi teksnya, bukan hanya bahwa fungsinya tidak
 * melempar galat.
 */

const test = require('node:test');
const assert = require('node:assert');
const RENDER = require('../public/render.js');

const BASIS = 'https://contoh/foto';

function data(ubah) {
  const dasar = {
    basisFoto: BASIS,
    produk: [{
      id: 1, slug: 'arabika-puntang', nama: 'Kopi Arabika Puntang', kategori: 'Arabika',
      origin: 'Gunung Puntang, Jawa Barat', proses: null, roast: null, altitude: null,
      varietas: null, catatan_rasa: null, ringkas: null, deskripsi: null,
      opsi_giling: ['Biji', 'Gilingan Halus']
    }],
    varian: [
      { id: 10, produk_id: 1, sku: '10200', label_ukuran: '200 g', harga: 63100, harga_coret: null, stok: null },
      { id: 11, produk_id: 1, sku: '10500', label_ukuran: '500 g', harga: 111900, harga_coret: null, stok: null }
    ],
    foto: []
  };
  return Object.assign(dasar, ubah || {});
}

test('rupiah dipisah titik dan tanpa desimal', function () {
  assert.strictEqual(RENDER.rp(63100), 'Rp63.100');
  assert.strictEqual(RENDER.rp(1000000), 'Rp1.000.000');
  assert.strictEqual(RENDER.rp(0), 'Rp0');
  assert.strictEqual(RENDER.rp('111900.00'), 'Rp111.900');
});

// Halaman produk adalah satu-satunya hal yang dibaca Google dan pengintip
// tautan WhatsApp. Kalau nama dan harganya tidak ada di HTML, seluruh alasan
// membangun halaman statis ikut hilang.
test('halaman produk memuat nama dan harga di HTML', function () {
  const d = data();
  const html = RENDER.produk(d, d.produk[0]);
  assert.match(html, /Kopi Arabika Puntang/);
  assert.match(html, /Rp63\.100/);
  assert.match(html, /200 g/);
  assert.match(html, /500 g/);
});

test('halaman produk memuat pilihan gilingan sebagai tombol', function () {
  const d = data();
  const html = RENDER.produk(d, d.produk[0]);
  assert.match(html, /Gilingan Halus/);
  assert.match(html, /Pilihan gilingan/);
});

test('harga yang ditampilkan lebih dulu adalah varian pertama yang tidak habis', function () {
  const d = data();
  d.varian[0].stok = 0;               // 200 g habis
  const html = RENDER.produk(d, d.produk[0]);
  // Harga besar mengambil 500 g, dan tombol 200 g dimatikan.
  assert.match(html, /harga-tampil"><b>Rp111\.900/);
  assert.match(html, /data-varian="10"[^>]*disabled/);
});

test('produk yang semua variannya habis kehilangan tombol beli', function () {
  const d = data();
  d.varian.forEach(function (v) { v.stok = 0; });
  const html = RENDER.produk(d, d.produk[0]);
  assert.match(html, /Stok habis/);
  assert.doesNotMatch(html, /Beli di TikTok Shop/);
});

test('stok null berarti tersedia, bukan habis', function () {
  const d = data();
  assert.strictEqual(RENDER.produkHabis(d, d.produk[0]), false);
});

// Kategori jadi alamat tersendiri supaya bisa dibagikan dan diindeks; kalau
// kembali jadi tombol saring, alamat itu hilang tanpa ada yang error.
test('saringan kategori berupa tautan ke alamatnya sendiri', function () {
  const d = data();
  const html = RENDER.beranda(d, null);
  assert.match(html, /href="\/kategori\/arabika\/"/);
  assert.match(html, /href="\/produk\/arabika-puntang\/"/);
});

test('beranda tanpa produk mengarahkan ke marketplace, bukan halaman kosong', function () {
  const html = RENDER.beranda(data({ produk: [], varian: [] }), null);
  assert.match(html, /Etalasenya sedang disiapkan/);
  assert.match(html, /tk\.tokopedia\.com/);
});

// -- Foto ------------------------------------------------------------------

test('foto lama tanpa daftar lebar tetap memakai path apa adanya', function () {
  const f = { path: '3/lama.png' };
  assert.strictEqual(RENDER.urlFoto(BASIS, f), BASIS + '/3/lama.png');
  assert.strictEqual(RENDER.srcsetFoto(BASIS, f), '');
});

test('foto berukuran ganda memilih yang paling kecil tapi cukup', function () {
  const f = { path: '3/baru', lebar_tersedia: [400, 800, 1600] };
  assert.strictEqual(RENDER.urlFoto(BASIS, f, 400), BASIS + '/3/baru-400.webp');
  assert.strictEqual(RENDER.urlFoto(BASIS, f, 500), BASIS + '/3/baru-800.webp');
  // Diminta lebih besar dari yang ada: ambil yang terbesar, jangan mengarang
  // berkas yang tidak pernah diunggah.
  assert.strictEqual(RENDER.urlFoto(BASIS, f, 4000), BASIS + '/3/baru-1600.webp');
});

test('srcset hanya dibuat kalau ukurannya memang lebih dari satu', function () {
  assert.strictEqual(RENDER.srcsetFoto(BASIS, { path: '3/x', lebar_tersedia: [400] }), '');
  const set = RENDER.srcsetFoto(BASIS, { path: '3/x', lebar_tersedia: [400, 800] });
  assert.match(set, /3\/x-400\.webp 400w/);
  assert.match(set, /3\/x-800\.webp 800w/);
});

// -- Ringkasan untuk meta description --------------------------------------

test('ringkasan memakai tulisan pemilik kalau ada', function () {
  const d = data();
  d.produk[0].ringkas = 'Manis, asam bersih, cocok untuk V60.';
  assert.strictEqual(RENDER.ringkasan(d, d.produk[0]), 'Manis, asam bersih, cocok untuk V60.');
});

// Kalau belum ditulis, yang disusun hanya dari fakta yang memang ada di
// database -- origin, ukuran, harga. Tidak ada kalimat pemasaran yang dikarang
// atas nama toko.
test('ringkasan yang disusun sendiri hanya memakai fakta yang ada', function () {
  const d = data();
  const r = RENDER.ringkasan(d, d.produk[0]);
  assert.match(r, /Kopi Arabika Puntang/);
  assert.match(r, /Gunung Puntang/);
  assert.match(r, /200 g, 500 g/);
  assert.match(r, /Rp63\.100/);
});

test('slug kategori aman dipakai di alamat', function () {
  assert.strictEqual(RENDER.slugKategori('House Blend'), 'house-blend');
  assert.strictEqual(RENDER.slugKategori('Arabika FULL 100%'), 'arabika-full-100');
});

test('teks pemilik yang memuat tanda kutip tidak merusak atribut HTML', function () {
  const d = data();
  d.produk[0].nama = 'Kopi "Spesial" <Puntang>';
  const html = RENDER.produk(d, d.produk[0]);
  assert.doesNotMatch(html, /alt="Kopi "Spesial"/);
  assert.match(html, /&quot;Spesial&quot;/);
});
