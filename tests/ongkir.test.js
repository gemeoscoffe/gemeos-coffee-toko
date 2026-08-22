/**
 * Ongkos kirim.
 *
 * Bagian ini dihitung ulang di server sebelum pesanan dibuat, tapi yang dilihat
 * pembeli sebelum dia menekan bayar adalah hasil hitungan di sini. Kalau
 * keduanya berbeda, yang salah bukan angkanya melainkan kepercayaannya -- jadi
 * aturannya ditulis sekali, di fungsi murni, dan diuji di sini.
 *
 * Yang paling perlu dijaga bukan perkaliannya, melainkan tiga keadaan yang
 * salahnya berupa uang: berat yang dibulatkan ke bawah, provinsi yang tidak
 * ketemu lalu dianggap gratis, dan ambang gratis ongkir yang dibandingkan
 * dengan total yang sudah termasuk ongkir.
 */

const test = require('node:test');
const assert = require('node:assert');
const RENDER = require('../public/render.js');

const ZONA = [
  { id: 1, nama: 'Jawa', tarif_per_kg: 20000, urutan: 1, aktif: true,
    provinsi: ['Jawa Barat', 'Jawa Tengah', 'DKI Jakarta'] },
  { id: 2, nama: 'Luar Jawa', tarif_per_kg: 35000, urutan: 2, aktif: true,
    provinsi: ['Sumatera Utara', 'Bali'] },
  { id: 3, nama: 'Indonesia Timur', tarif_per_kg: 60000, urutan: 3, aktif: false,
    provinsi: ['Papua'] }
];

const KATALOG = {
  produk: [{ id: 1, nama: 'Kopi Satu', slug: 'satu', foto: null }],
  varian: [
    { id: 10, produk_id: 1, label_ukuran: '200 g', harga: 63100, stok: null, berat_kirim_g: 240 },
    { id: 11, produk_id: 1, label_ukuran: '1 kg', harga: 250000, stok: null, berat_kirim_g: 1100 }
  ]
};

// -- Menemukan zona dari provinsi --------------------------------------------

test('provinsi ketemu di zonanya, tanpa peduli huruf besar kecil dan spasi', function () {
  assert.strictEqual(RENDER.zonaUntuk(ZONA, 'Jawa Barat').nama, 'Jawa');
  assert.strictEqual(RENDER.zonaUntuk(ZONA, '  jawa barat  ').nama, 'Jawa');
  assert.strictEqual(RENDER.zonaUntuk(ZONA, 'BALI').nama, 'Luar Jawa');
});

// Zona yang dimatikan pemilik berarti daerah itu sedang tidak dilayani. Kalau
// tetap ketemu, pembeli di sana bisa menyelesaikan pesanan yang tidak akan
// pernah dikirim.
test('zona yang dimatikan tidak dipakai', function () {
  assert.strictEqual(RENDER.zonaUntuk(ZONA, 'Papua'), null);
});

// Kontrak dengan build.js: zona yang dikirim ke peramban harus tetap membawa
// aktif: true. Pernah tidak -- build menyaring zona mati lalu membuang
// kolomnya, dan di peramban tidak ada satu pun provinsi yang bisa ditemukan
// karena semuanya terbaca tidak aktif. Tes unit tidak menangkapnya: yang cacat
// bukan aturannya melainkan bentuk data yang sampai ke sana.
test('zona tanpa kolom aktif tidak dianggap hidup', function () {
  const tanpaKolom = [{ nama: 'Jawa', tarif_per_kg: 20000, provinsi: ['Jawa Barat'] }];
  assert.strictEqual(RENDER.zonaUntuk(tanpaKolom, 'Jawa Barat'), null);
});

test('provinsi yang tidak terdaftar tidak dipaksakan ke zona mana pun', function () {
  assert.strictEqual(RENDER.zonaUntuk(ZONA, 'Maluku Utara'), null);
  assert.strictEqual(RENDER.zonaUntuk(ZONA, ''), null);
  assert.strictEqual(RENDER.zonaUntuk(ZONA, null), null);
});

// -- Berat kirim -------------------------------------------------------------

test('berat keranjang memakai berat kirim, bukan berat kopinya', function () {
  assert.strictEqual(RENDER.beratKeranjang(KATALOG, [{ v: 10, q: 2 }]), 480);
  assert.strictEqual(RENDER.beratKeranjang(KATALOG, [{ v: 10, q: 1 }, { v: 11, q: 1 }]), 1340);
});

test('varian yang hilang dari katalog tidak menambah berat', function () {
  assert.strictEqual(RENDER.beratKeranjang(KATALOG, [{ v: 999, q: 3 }]), 0);
});

// -- Hitungan ongkir ---------------------------------------------------------

// Ekspedisi menagih per kilogram dan membulatkan ke atas. Membulatkan ke bawah
// berarti toko menombok selisihnya di setiap pesanan, diam-diam.
test('berat dibulatkan ke atas per kilogram', function () {
  const jawa = ZONA[0];
  assert.strictEqual(RENDER.hitungOngkir({ zona: jawa, beratGram: 240 }).kg, 1);
  assert.strictEqual(RENDER.hitungOngkir({ zona: jawa, beratGram: 1000 }).kg, 1);
  assert.strictEqual(RENDER.hitungOngkir({ zona: jawa, beratGram: 1001 }).kg, 2);
  assert.strictEqual(RENDER.hitungOngkir({ zona: jawa, beratGram: 2400 }).kg, 3);
});

test('ongkir adalah tarif per kilo dikali kilonya', function () {
  assert.strictEqual(RENDER.hitungOngkir({ zona: ZONA[0], beratGram: 1200 }).ongkir, 40000);
  assert.strictEqual(RENDER.hitungOngkir({ zona: ZONA[1], beratGram: 240 }).ongkir, 35000);
});

// null, bukan nol. Nol berarti gratis ongkir, dan itu keterangan yang salah
// untuk keadaan "kami belum tahu ongkirnya ke sana".
test('tanpa zona hasilnya null, bukan nol', function () {
  assert.strictEqual(RENDER.hitungOngkir({ zona: null, beratGram: 500 }), null);
});

test('keranjang tanpa berat tidak menghasilkan ongkir', function () {
  assert.strictEqual(RENDER.hitungOngkir({ zona: ZONA[0], beratGram: 0 }), null);
});

// -- Gratis ongkir -----------------------------------------------------------

test('subtotal mencapai ambang membuat ongkir nol dan ditandai gratis', function () {
  const h = RENDER.hitungOngkir({ zona: ZONA[0], beratGram: 1200, subtotal: 300000, gratisDari: 300000 });
  assert.strictEqual(h.ongkir, 0);
  assert.strictEqual(h.gratis, true);
  // Yang ditanggung toko tetap dicatat: itu biaya pemasaran, bukan angka nol.
  assert.strictEqual(h.ditanggungToko, 40000);
});

test('subtotal di bawah ambang membayar penuh', function () {
  const h = RENDER.hitungOngkir({ zona: ZONA[0], beratGram: 1200, subtotal: 299999, gratisDari: 300000 });
  assert.strictEqual(h.ongkir, 40000);
  assert.strictEqual(h.gratis, false);
  assert.strictEqual(h.ditanggungToko, 0);
});

// Ambang dibandingkan dengan harga barang saja. Kalau ongkirnya ikut dihitung,
// pesanan bisa lolos ambang justru karena ongkirnya mahal.
test('ambang dibandingkan dengan harga barang, bukan total setelah ongkir', function () {
  const h = RENDER.hitungOngkir({ zona: ZONA[1], beratGram: 240, subtotal: 280000, gratisDari: 300000 });
  assert.strictEqual(h.gratis, false);
  assert.strictEqual(h.ongkir, 35000);
});

test('tanpa ambang gratis ongkir, tidak ada yang gratis', function () {
  const h = RENDER.hitungOngkir({ zona: ZONA[0], beratGram: 1200, subtotal: 9000000 });
  assert.strictEqual(h.gratis, false);
  assert.strictEqual(h.ongkir, 40000);
});

test('hasilnya menyebutkan zona yang dipakai supaya bisa ditulis di pesanan', function () {
  const h = RENDER.hitungOngkir({ zona: ZONA[0], beratGram: 500 });
  assert.strictEqual(h.zona, 'Jawa');
  assert.strictEqual(h.tarifPerKg, 20000);
});
