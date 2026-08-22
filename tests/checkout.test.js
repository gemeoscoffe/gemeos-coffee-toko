/**
 * Checkout: pemeriksaan isian alamat dan penjumlahan pesanan.
 *
 * Yang diuji di sini bukan tampilan formulirnya melainkan aturan yang menolak
 * dan menerima. Alamat yang lolos padahal salah tidak berbunyi di mana pun:
 * pembeli membayar, toko mengemas, kurir gagal mengantar, dan ongkos kirim
 * kedua keluar dari margin. Nomor telepon yang salah lebih buruk lagi -- itu
 * satu-satunya cara kurir menghubungi orangnya.
 */

const test = require('node:test');
const assert = require('node:assert');
const RENDER = require('../public/render.js');

const ZONA = [
  { id: 1, nama: 'Jawa', tarif_per_kg: 20000, urutan: 1, aktif: true,
    provinsi: ['Jawa Barat', 'DKI Jakarta'] },
  { id: 2, nama: 'Papua', tarif_per_kg: 60000, urutan: 2, aktif: false,
    provinsi: ['Papua'] }
];

const KATALOG = {
  produk: [{ id: 1, nama: 'Kopi Satu', slug: 'satu', foto: null }],
  varian: [
    { id: 10, produk_id: 1, label_ukuran: '200 g', harga: 60000, stok: null, berat_kirim_g: 240 },
    { id: 11, produk_id: 1, label_ukuran: '1 kg', harga: 250000, stok: 1, berat_kirim_g: 1100 }
  ]
};

function alamat(ubah) {
  return Object.assign({
    nama: 'Rina Wijaya',
    email: 'rina@contoh.com',
    telepon: '081234567890',
    alamat: 'Jalan Merdeka nomor 12, RT 03 RW 05',
    kota: 'Bandung',
    provinsi: 'Jawa Barat',
    kode_pos: '40115'
  }, ubah || {});
}

// -- Nomor telepon -----------------------------------------------------------

test('nomor Indonesia diseragamkan ke bentuk 62', function () {
  assert.strictEqual(RENDER.normalTelepon('081234567890'), '6281234567890');
  assert.strictEqual(RENDER.normalTelepon('+62 812-3456-7890'), '6281234567890');
  assert.strictEqual(RENDER.normalTelepon('6281234567890'), '6281234567890');
  assert.strictEqual(RENDER.normalTelepon('81234567890'), '6281234567890');
  assert.strictEqual(RENDER.normalTelepon(' 0812 3456 7890 '), '6281234567890');
});

// Kurir menghubungi penerima lewat nomor ini, dan yang dipakai selalu ponsel.
// Nomor rumah yang lolos berarti paket nyasar tanpa ada yang bisa dihubungi.
test('nomor yang bukan ponsel ditolak', function () {
  assert.strictEqual(RENDER.normalTelepon('0221234567'), null);
  assert.strictEqual(RENDER.normalTelepon('021 555 1234'), null);
});

test('nomor terlalu pendek atau terlalu panjang ditolak', function () {
  assert.strictEqual(RENDER.normalTelepon('0812345'), null);
  assert.strictEqual(RENDER.normalTelepon('081234567890123456'), null);
});

test('bukan angka sama sekali ditolak', function () {
  assert.strictEqual(RENDER.normalTelepon('nanti saya kabari'), null);
  assert.strictEqual(RENDER.normalTelepon(''), null);
  assert.strictEqual(RENDER.normalTelepon(null), null);
});

// -- Pemeriksaan alamat ------------------------------------------------------

test('alamat yang lengkap diterima', function () {
  const h = RENDER.periksaAlamat(alamat(), ZONA);
  assert.strictEqual(h.ok, true);
  assert.deepStrictEqual(h.galat, {});
  // Nomornya dikembalikan sudah seragam supaya yang tersimpan cuma satu bentuk.
  assert.strictEqual(h.bersih.telepon, '6281234567890');
  assert.strictEqual(h.bersih.email, 'rina@contoh.com');
});

test('setiap kolom wajib yang kosong disebut satu per satu', function () {
  const h = RENDER.periksaAlamat({}, ZONA);
  assert.strictEqual(h.ok, false);
  ['nama', 'email', 'telepon', 'alamat', 'kota', 'provinsi', 'kode_pos'].forEach(function (k) {
    assert.ok(h.galat[k], 'kolom ' + k + ' seharusnya ditandai');
  });
});

test('email tanpa bentuk yang masuk akal ditolak', function () {
  assert.ok(RENDER.periksaAlamat(alamat({ email: 'rina' }), ZONA).galat.email);
  assert.ok(RENDER.periksaAlamat(alamat({ email: 'rina@' }), ZONA).galat.email);
  assert.ok(RENDER.periksaAlamat(alamat({ email: 'rina@contoh' }), ZONA).galat.email);
});

// Kode pos Indonesia selalu lima angka. Kurir memakainya untuk menyortir, dan
// yang salah membuat paket berputar lebih lama sebelum ketahuan.
test('kode pos harus lima angka', function () {
  assert.ok(RENDER.periksaAlamat(alamat({ kode_pos: '4011' }), ZONA).galat.kode_pos);
  assert.ok(RENDER.periksaAlamat(alamat({ kode_pos: '401156' }), ZONA).galat.kode_pos);
  assert.ok(RENDER.periksaAlamat(alamat({ kode_pos: 'AB123' }), ZONA).galat.kode_pos);
  assert.strictEqual(RENDER.periksaAlamat(alamat({ kode_pos: ' 40115 ' }), ZONA).ok, true);
});

// Alamat sebaris seperti "Bandung" tidak cukup untuk diantar ke pintu.
test('alamat yang terlalu pendek ditolak', function () {
  assert.ok(RENDER.periksaAlamat(alamat({ alamat: 'Bandung' }), ZONA).galat.alamat);
});

test('provinsi yang tidak dilayani ditolak dengan alasannya sendiri', function () {
  const h = RENDER.periksaAlamat(alamat({ provinsi: 'Papua' }), ZONA);
  assert.strictEqual(h.ok, false);
  assert.match(h.galat.provinsi, /belum/i);
});

// -- Ringkasan pesanan -------------------------------------------------------

test('total adalah barang ditambah ongkir', function () {
  const r = RENDER.ringkasPesanan(KATALOG, [{ v: 10, q: 2 }], alamat(), ZONA, null);
  assert.strictEqual(r.subtotal, 120000);
  assert.strictEqual(r.ongkir.kg, 1);
  assert.strictEqual(r.ongkir.ongkir, 20000);
  assert.strictEqual(r.total, 140000);
});

test('provinsi belum diisi berarti ongkir belum diketahui, bukan nol', function () {
  const r = RENDER.ringkasPesanan(KATALOG, [{ v: 10, q: 1 }], alamat({ provinsi: '' }), ZONA, null);
  assert.strictEqual(r.ongkir, null);
  assert.strictEqual(r.total, null);
  assert.strictEqual(r.subtotal, 60000);
});

test('ambang gratis ongkir dipakai kalau belanjanya cukup', function () {
  const r = RENDER.ringkasPesanan(KATALOG, [{ v: 11, q: 2 }], alamat(), ZONA, 300000);
  assert.strictEqual(r.subtotal, 500000);
  assert.strictEqual(r.ongkir.gratis, true);
  assert.strictEqual(r.total, 500000);
});

// Stok toko diketik tangan dan bisa berubah setelah barang masuk keranjang.
// Yang menolaknya nanti Edge Function, tapi pembeli berhak tahu sebelum dia
// mengisi alamat -- bukan sesudah menekan bayar.
test('pesanan yang melebihi stok ditandai sebelum bayar', function () {
  const r = RENDER.ringkasPesanan(KATALOG, [{ v: 11, q: 3 }], alamat(), ZONA, null);
  assert.strictEqual(r.bolehLanjut, false);
  assert.strictEqual(r.baris[0].lebihStok, true);
});

test('keranjang kosong tidak bisa dilanjutkan', function () {
  const r = RENDER.ringkasPesanan(KATALOG, [], alamat(), ZONA, null);
  assert.strictEqual(r.bolehLanjut, false);
  assert.strictEqual(r.subtotal, 0);
});

test('pesanan lengkap dan cukup stok boleh dilanjutkan', function () {
  const r = RENDER.ringkasPesanan(KATALOG, [{ v: 10, q: 2 }], alamat(), ZONA, null);
  assert.strictEqual(r.bolehLanjut, true);
});

// -- Pesan pesanan lengkap ---------------------------------------------------
//
// Sampai pembayaran di website ada, pesan inilah pesanannya. Yang kurang di
// sini berubah jadi pertanyaan balik lewat chat, dan tiap pertanyaan balik
// adalah kesempatan pembeli berubah pikiran.

test('pesan memuat barang, alamat lengkap, ongkir, dan total', function () {
  const r = RENDER.ringkasPesanan(KATALOG, [{ v: 10, q: 2 }], alamat(), ZONA, null);
  const pesan = RENDER.pesanCheckout(r, RENDER.periksaAlamat(alamat(), ZONA).bersih);

  assert.match(pesan, /Kopi Satu 200 g x2/);
  assert.match(pesan, /Rina Wijaya/);
  assert.match(pesan, /6281234567890/);
  assert.match(pesan, /Jalan Merdeka nomor 12/);
  assert.match(pesan, /Bandung/);
  assert.match(pesan, /Jawa Barat/);
  assert.match(pesan, /40115/);
  assert.match(pesan, /Ongkir Jawa 1 kg: Rp20\.000/);
  assert.match(pesan, /Total: Rp140\.000/);
});

test('gratis ongkir disebut sebagai gratis, bukan disembunyikan', function () {
  const r = RENDER.ringkasPesanan(KATALOG, [{ v: 11, q: 2 }], alamat(), ZONA, 300000);
  const pesan = RENDER.pesanCheckout(r, RENDER.periksaAlamat(alamat(), ZONA).bersih);
  assert.match(pesan, /gratis/i);
  assert.match(pesan, /Total: Rp500\.000/);
});

test('catatan pembeli ikut kalau diisi, dan tidak menyisakan baris kosong kalau tidak', function () {
  const bersihDengan = RENDER.periksaAlamat(alamat({ catatan: 'Tolong dobel bubble wrap' }), ZONA).bersih;
  const r = RENDER.ringkasPesanan(KATALOG, [{ v: 10, q: 1 }], alamat(), ZONA, null);
  assert.match(RENDER.pesanCheckout(r, bersihDengan), /dobel bubble wrap/);

  const bersihTanpa = RENDER.periksaAlamat(alamat(), ZONA).bersih;
  assert.doesNotMatch(RENDER.pesanCheckout(r, bersihTanpa), /Catatan:/);
});
