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

function seksi(ubah) {
  return Object.assign({
    id: 1, halaman: 'home', blok: 'hero', urutan: 0,
    judul: null, subjudul: null, teks: null,
    tombol_label: null, tombol_url: null, tombol2_label: null, tombol2_url: null,
    foto_path: null, foto_lebar: null, aktif: true
  }, ubah || {});
}

function data(ubah) {
  const dasar = {
    basisFoto: BASIS,
    seksi: [],
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
  const html = RENDER.shop(d, null);
  assert.match(html, /href="\/kategori\/arabika\/"/);
  assert.match(html, /href="\/produk\/arabika-puntang\/"/);
});

test('katalog tanpa produk mengarahkan ke marketplace, bukan halaman kosong', function () {
  const html = RENDER.shop(data({ produk: [], varian: [] }), null);
  assert.match(html, /Etalasenya sedang disiapkan/);
  assert.match(html, /tk\.tokopedia\.com/);
});

// -- Halaman depan dan Tentang Kami ----------------------------------------
//
// Bagian yang belum diisi pemilik tidak boleh digambar. Judul tanpa isi
// terlihat seperti halaman yang rusak; halaman yang lebih pendek hanya terlihat
// ringkas, dan itu keadaan yang jujur selama isinya memang belum ditulis.

test('bagian halaman depan yang kosong tidak digambar sama sekali', function () {
  const html = RENDER.beranda(data({
    seksi: [
      seksi({ id: 1, blok: 'cerita' }),
      seksi({ id: 2, blok: 'testimoni', urutan: 1 }),
      seksi({ id: 3, blok: 'lokasi', urutan: 1 })
    ]
  }));
  assert.doesNotMatch(html, /class="cerita"/);
  assert.doesNotMatch(html, /class="testimoni"/);
  assert.doesNotMatch(html, /class="lokasi"/);
});

test('bagian yang sudah diisi muncul beserta tombolnya', function () {
  const html = RENDER.beranda(data({
    seksi: [
      seksi({ id: 1, blok: 'cerita', judul: 'Mulai dari satu drum',
              teks: 'Paragraf satu.\n\nParagraf dua.',
              tombol_label: 'Selengkapnya', tombol_url: '/tentang/' })
    ]
  }));
  assert.match(html, /class="cerita"/);
  assert.match(html, /Mulai dari satu drum/);
  assert.match(html, /<p>Paragraf satu\.<\/p><p>Paragraf dua\.<\/p>/);
  assert.match(html, /href="\/tentang\/"[^>]*>Selengkapnya/);
});

// Tautan keluar harus membuka tab baru; tautan ke halaman sendiri tidak boleh.
// Yang kedua membuat pembeli menumpuk tab tanpa pernah memintanya.
test('hanya tautan keluar yang membuka tab baru', function () {
  const html = RENDER.beranda(data({
    seksi: [
      seksi({ id: 1, blok: 'lokasi', urutan: 1, judul: 'Roastery', teks: 'Jalan Contoh 1',
              tombol_label: 'Google Maps', tombol_url: 'https://maps.example/x',
              tombol2_label: 'WhatsApp', tombol2_url: 'https://wa.me/620000' })
    ]
  }));
  assert.match(html, /href="https:\/\/maps\.example\/x" target="_blank" rel="noopener"/);
  assert.match(html, /href="https:\/\/wa\.me\/620000" target="_blank" rel="noopener"/);
});

test('hero memakai tulisan pemilik kalau ada, dan tetap berdiri kalau belum', function () {
  const sendiri = RENDER.beranda(data({
    seksi: [seksi({ judul: 'Judul dari pemilik', subjudul: 'Label kecil' })]
  }));
  assert.match(sendiri, /Judul dari pemilik/);
  assert.match(sendiri, /Label kecil/);

  const bawaan = RENDER.beranda(data());
  assert.match(bawaan, /class="hero"/);
  assert.match(bawaan, /href="\/shop\/"/);
});

test('kartu alasan tanpa foto tampil sebagai pita, bukan kartu setengah kosong', function () {
  const polos = RENDER.beranda(data({
    seksi: [
      seksi({ id: 1, blok: 'alasan', urutan: 1, judul: 'Murni 100%', teks: 'Tanpa campuran.' }),
      seksi({ id: 2, blok: 'alasan', urutan: 2, judul: 'Pilih gilingan', teks: 'Biji sampai halus.' })
    ]
  }));
  assert.match(polos, /class="pita"/);
  assert.doesNotMatch(polos, /class="alasan"/);

  const berfoto = RENDER.beranda(data({
    seksi: [
      seksi({ id: 1, blok: 'alasan', urutan: 1, judul: 'Murni 100%', teks: 'Tanpa campuran.',
              foto_path: 'seksi/1/abc', foto_lebar: [400, 800] }),
      seksi({ id: 2, blok: 'alasan', urutan: 2, judul: 'Pilih gilingan', teks: 'Biji sampai halus.' })
    ]
  }));
  assert.match(berfoto, /class="alasan"/);
  assert.match(berfoto, /seksi\/1\/abc-400\.webp/);
});

test('halaman tentang yang belum ditulis mengatakannya, bukan tampil kosong', function () {
  const html = RENDER.tentang(data());
  assert.match(html, /Halamannya sedang ditulis/);
  assert.match(html, /href="\/shop\/"/);
});

test('halaman tentang menggambar kepala dan bagian-bagiannya', function () {
  const html = RENDER.tentang(data({
    seksi: [
      seksi({ id: 1, halaman: 'tentang', blok: 'hero', judul: 'Gemeos Coffee', teks: 'Pembuka.' }),
      seksi({ id: 2, halaman: 'tentang', blok: 'isi', urutan: 1, judul: 'Cara kami menyangrai',
              teks: 'Isi bagian.' })
    ]
  }));
  assert.match(html, /<h1>Gemeos Coffee<\/h1>/);
  assert.match(html, /Cara kami menyangrai/);
  assert.doesNotMatch(html, /Halamannya sedang ditulis/);
});

// Teks pemilik masuk ke atribut `alt` dan ke isi halaman; tanda kutip di
// dalamnya akan menutup atributnya lebih awal kalau tidak dilewatkan `esc`.
test('teks seksi yang memuat tanda kutip dan tag tidak bocor jadi HTML', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ judul: 'Kopi "asli" <script>', teks: 'Aman & baik' })]
  }));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Kopi &quot;asli&quot; &lt;script&gt;/);
  assert.match(html, /Aman &amp; baik/);
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
