/**
 * Halaman /admin: slug, pilihan gilingan, tampilan stok, tabel varian, foto.
 *
 * Yang diuji di sini adalah bagian yang menentukan apa yang pembeli lihat, dan
 * yang salahnya tidak berbunyi: slug yang berubah diam-diam memindahkan alamat
 * produk, dan stok "belum ada resep" yang tertulis "habis" menyembunyikan
 * produk yang sebenarnya siap dijual.
 */

const test = require('node:test');
const assert = require('node:assert');
const { buatContextAdmin, ambil, pasang } = require('./harness');

const ctx = buatContextAdmin();
const tokoSlug = ambil(ctx, 'tokoSlug');
const tokoStokSel = ambil(ctx, 'tokoStokSel');
const tokoStokTerendah = ambil(ctx, 'tokoStokTerendah');
const renderTokoVarianTable = ambil(ctx, 'renderTokoVarianTable');
const tokoDaftarGiling = ambil(ctx, 'tokoDaftarGiling');
const renderTokoFotoList = ambil(ctx, 'renderTokoFotoList');

function varian(isi) {
  return Object.assign({
    id: 1, produk_id: 1, sku: '30200', label_ukuran: '200 g', label_giling: null,
    berat_g: 200, berat_kirim_g: 240, harga: 65000, harga_coret: null, stok: null, aktif: true
  }, isi);
}

test('slug hanya huruf kecil, angka dan tanda hubung', function() {
  assert.strictEqual(tokoSlug('Arabika Semiwash'), 'arabika-semiwash');
  assert.strictEqual(tokoSlug('House Blend 200g (Original)'), 'house-blend-200g-original');
  assert.strictEqual(tokoSlug('  Kopi   Drip  Bag  '), 'kopi-drip-bag');
  assert.strictEqual(tokoSlug('Kopi & Susu / Gula Aren'), 'kopi-susu-gula-aren');
});

test('slug tidak pernah diawali atau diakhiri tanda hubung', function() {
  assert.strictEqual(tokoSlug('---Arabika---'), 'arabika');
  assert.strictEqual(tokoSlug('!!!'), '');
  assert.strictEqual(tokoSlug(null), '');
});

test('slug dipotong 60 karakter tanpa menyisakan tanda hubung di ujung', function() {
  assert.strictEqual(tokoSlug('a'.repeat(80)).length, 60);

  // Potongannya jatuh tepat di tanda hubung: 'aaaa...a bbb' dengan spasi di
  // karakter ke-61 menghasilkan slug yang berakhir dengan '-' kalau tidak
  // dirapikan lagi setelah dipotong.
  const jatuhDiTandaHubung = tokoSlug('a'.repeat(60) + ' bbb');
  assert.ok(!jatuhDiTandaHubung.endsWith('-'), 'slug tidak boleh berakhir dengan tanda hubung');
});

// null berarti "tidak dibatasi", bukan nol. Kalau keduanya tertulis sama,
// varian yang sebenarnya selalu bisa dipesan akan terlihat habis.
test('stok tak dibatasi dibedakan dari stok nol', function() {
  assert.match(tokoStokSel(null), /tidak dibatasi/);
  assert.match(tokoStokSel(undefined), /tidak dibatasi/);
  assert.match(tokoStokSel(0), /habis/);
  assert.match(tokoStokSel(12), /12 unit/);
});

// Stok negatif tidak seharusnya ada, tapi kalau sampai muncul harus terbaca
// habis, bukan "-3 unit".
test('stok negatif terbaca habis', function() {
  assert.match(tokoStokSel(-3), /habis/);
});

test('stok terendah mengabaikan varian yang tidak dibatasi', function() {
  pasang(ctx, 'TOKO_VARIAN', [
    varian({ id: 1, stok: 8 }), varian({ id: 2, stok: null }), varian({ id: 3, stok: 3 })
  ]);
  assert.strictEqual(tokoStokTerendah(1), 3);
});

test('stok terendah null kalau tidak satu pun varian dibatasi', function() {
  pasang(ctx, 'TOKO_VARIAN', [varian({ id: 1, stok: null }), varian({ id: 2, stok: null })]);
  assert.strictEqual(tokoStokTerendah(1), null);
});

test('nol tetap terbaca sebagai stok terendah, bukan dianggap kosong', function() {
  pasang(ctx, 'TOKO_VARIAN', [varian({ id: 1, stok: 0 }), varian({ id: 2, stok: 5 })]);
  assert.strictEqual(tokoStokTerendah(1), 0);
});

test('produk tanpa varian memberi tahu kenapa belum bisa ditampilkan', function() {
  pasang(ctx, 'TOKO_VARIAN', []);
  const html = renderTokoVarianTable({ id: 1 });
  assert.match(html, /Belum ada varian/);
  assert.match(html, /tidak bisa ditampilkan di toko/);
});

// Gilingan bukan sumbu varian: SKU, harga dan stoknya sama untuk semua
// gilingan, jadi pilihannya milik produk dan tidak boleh melipatgandakan baris
// varian.
test('daftar gilingan dirapikan dan duplikatnya dibuang', function() {
  assert.deepStrictEqual(
    Array.from(tokoDaftarGiling('Biji, Gilingan Kasar , Gilingan Sedang,Gilingan Halus')),
    ['Biji', 'Gilingan Kasar', 'Gilingan Sedang', 'Gilingan Halus']
  );
  assert.deepStrictEqual(Array.from(tokoDaftarGiling('Biji, biji, Biji')), ['Biji', 'biji']);
  assert.deepStrictEqual(Array.from(tokoDaftarGiling('  ,  , ')), []);
  assert.deepStrictEqual(Array.from(tokoDaftarGiling(null)), []);
});

test('urutan gilingan ikut urutan ketik, karena yang pertama jadi pilihan awal', function() {
  assert.deepStrictEqual(Array.from(tokoDaftarGiling('Gilingan Halus, Biji')), ['Gilingan Halus', 'Biji']);
});

// Semua kolom varian disunting langsung di tabelnya, jadi yang diuji adalah isi
// kotaknya. `harga_coret` kosong harus benar-benar kosong: nol di sana berarti
// harga sebelum diskon nol rupiah, dan toko akan mencoret harga aslinya dengan
// itu.
test('kotak harga coret kosong kalau varian tidak sedang diskon', function() {
  pasang(ctx, 'TOKO_VARIAN', [varian({ id: 1, harga: 38000, harga_coret: 42000 })]);
  assert.match(renderTokoVarianTable({ id: 1 }), /data-kolom="harga_coret" value="42000"/);

  pasang(ctx, 'TOKO_VARIAN', [varian({ id: 1, harga: 38000, harga_coret: null })]);
  assert.match(renderTokoVarianTable({ id: 1 }), /data-kolom="harga_coret" value=""/);
});

// Sebelum ini hanya stok dan aktif yang bisa diubah dari tabel; sisanya berarti
// hapus lalu tambah ulang, yang membuang stok dan urutan varian itu.
test('tiap kolom varian punya kotak isian yang menyebut kolomnya', function() {
  pasang(ctx, 'TOKO_VARIAN', [varian({ id: 7, sku: '11250', label_ukuran: '250 g Premium', urutan: 6 })]);
  const html = renderTokoVarianTable({ id: 1 });

  ['urutan', 'sku', 'label_ukuran', 'berat_g', 'berat_kirim_g', 'harga', 'harga_coret'].forEach(function(kolom) {
    assert.match(html, new RegExp('data-id="7" data-kolom="' + kolom + '"'),
      'kolom ' + kolom + ' harus bisa disunting');
  });
  assert.match(html, /data-kolom="sku" value="11250"/);
  assert.match(html, /data-kolom="label_ukuran" value="250 g Premium"/);
});

// Label ukuran diketik pemilik, dan tanda kutip di dalamnya akan menutup
// atribut `value` lebih awal -- barisnya rusak dan sisanya bocor jadi HTML.
test('teks varian yang memuat tanda kutip tidak merusak kotak isiannya', function() {
  pasang(ctx, 'TOKO_VARIAN', [varian({ id: 1, label_ukuran: '200 g "spesial"' })]);
  const html = renderTokoVarianTable({ id: 1 });
  assert.match(html, /value="200 g &quot;spesial&quot;"/);
  assert.doesNotMatch(html, /value="200 g "spesial""/);
});

// Stok diketik langsung di tabel, jadi yang harus benar adalah isi kotaknya:
// angka kalau dibatasi, kosong kalau tidak -- bukan "0" yang berarti habis.
test('kotak stok kosong untuk varian yang tidak dibatasi', function() {
  pasang(ctx, 'TOKO_VARIAN', [varian({ id: 1, stok: null })]);
  assert.match(renderTokoVarianTable({ id: 1 }), /class="toko-v-stok"[^>]*value=""/);
});

test('kotak stok berisi angkanya untuk varian yang dibatasi', function() {
  pasang(ctx, 'TOKO_VARIAN', [varian({ id: 1, stok: 0 }), varian({ id: 2, stok: 7 })]);
  const html = renderTokoVarianTable({ id: 1 });
  assert.match(html, /value="0"/);
  assert.match(html, /value="7"/);
});

// Foto pertama yang jadi gambar utama adalah aturan yang dipakai toko juga,
// jadi labelnya di sini harus menunjuk foto yang sama.
test('foto pertama ditandai sebagai gambar utama', function() {
  pasang(ctx, 'TOKO_FOTO', [
    { id: 1, produk_id: 1, path: '1/a.jpg', urutan: 0 },
    { id: 2, produk_id: 1, path: '1/b.jpg', urutan: 1 }
  ]);
  const html = renderTokoFotoList({ id: 1 });
  assert.match(html, /Gambar utama/);
  assert.match(html, /Foto 2/);
  assert.strictEqual((html.match(/Gambar utama/g) || []).length, 1);
});

test('produk tanpa foto tidak menampilkan grid kosong', function() {
  pasang(ctx, 'TOKO_FOTO', []);
  assert.match(renderTokoFotoList({ id: 1 }), /Belum ada foto/);
});
