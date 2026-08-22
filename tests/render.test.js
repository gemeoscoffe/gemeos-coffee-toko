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
    foto_path: null, foto_lebar: null, video_path: null, aktif: true
  }, ubah || {});
}

function data(ubah) {
  const dasar = {
    basisFoto: BASIS,
    seksi: [],
    produk: [{
      id: 1, slug: 'arabika-puntang', nama: 'Kopi Arabika Puntang',
      origin: 'Gunung Puntang, Jawa Barat', proses: null, roast: null, altitude: null,
      varietas: null, catatan_rasa: null, ringkas: null, deskripsi: null,
      opsi_giling: ['Biji', 'Gilingan Halus']
    }],
    varian: [
      { id: 10, produk_id: 1, sku: '10200', label_ukuran: '200 g', harga: 63100, harga_coret: null, stok: null },
      { id: 11, produk_id: 1, sku: '10500', label_ukuran: '500 g', harga: 111900, harga_coret: null, stok: null }
    ],
    foto: [],
    kategori: [
      { id: 1, nama: 'Arabika', slug: 'arabika', urutan: 10, aktif: true },
      { id: 2, nama: 'Commodity Blend', slug: 'commodity-blend', urutan: 20, aktif: true }
    ],
    produkKategori: [{ produk_id: 1, kategori_id: 1 }]
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

// Slug diambil dari barisnya, bukan dihitung dari namanya. Kalau suatu saat
// dihitung lagi, mengganti nama kategori diam-diam memindahkan alamatnya dan
// membuang peringkat yang sudah menempel di sana.
test('alamat kategori memakai slug tersimpan, bukan namanya', function () {
  const d = data({
    kategori: [{ id: 1, nama: 'Nama Baru Yang Panjang', slug: 'arabika', urutan: 10, aktif: true }],
    produkKategori: [{ produk_id: 1, kategori_id: 1 }]
  });
  const html = RENDER.shop(d, null);
  assert.match(html, /href="\/kategori\/arabika\/"/);
  assert.match(html, /Nama Baru Yang Panjang/);
  assert.doesNotMatch(html, /nama-baru-yang-panjang/);
});

// Chip yang mengantar ke halaman kosong terasa seperti toko kehabisan barang.
test('kategori tanpa produk tidak digambar sebagai chip', function () {
  const html = RENDER.shop(data(), null);
  assert.doesNotMatch(html, /Commodity Blend/);
});

test('satu produk boleh berada di lebih dari satu kategori', function () {
  const d = data({
    produkKategori: [{ produk_id: 1, kategori_id: 1 }, { produk_id: 1, kategori_id: 2 }]
  });
  assert.deepStrictEqual(
    Array.from(RENDER.kategoriProduk(d, 1)).map(function (k) { return k.nama; }),
    ['Arabika', 'Commodity Blend']);
  assert.strictEqual(RENDER.produkKategori(d, 2).length, 1);
  const html = RENDER.shop(d, null);
  assert.match(html, /href="\/kategori\/commodity-blend\/"/);
});

test('halaman kategori hanya memuat produk kategori itu', function () {
  const d = data({
    produk: [
      { id: 1, slug: 'satu', nama: 'Kopi Satu', origin: null, proses: null, roast: null,
        altitude: null, varietas: null, catatan_rasa: null, ringkas: null, deskripsi: null,
        opsi_giling: [] },
      { id: 2, slug: 'dua', nama: 'Kopi Dua', origin: null, proses: null, roast: null,
        altitude: null, varietas: null, catatan_rasa: null, ringkas: null, deskripsi: null,
        opsi_giling: [] }
    ],
    varian: [
      { id: 10, produk_id: 1, sku: 'a', label_ukuran: '200 g', harga: 1000, harga_coret: null, stok: null },
      { id: 11, produk_id: 2, sku: 'b', label_ukuran: '200 g', harga: 2000, harga_coret: null, stok: null }
    ],
    produkKategori: [{ produk_id: 1, kategori_id: 1 }, { produk_id: 2, kategori_id: 2 }]
  });
  const html = RENDER.shop(d, d.kategori[0]);
  assert.match(html, /Kopi Satu/);
  assert.doesNotMatch(html, /Kopi Dua/);
  assert.match(html, /1 produk/);
});

// Produk yang belum dimasukkan ke kategori mana pun tetap harus punya halaman
// yang utuh -- remahnya saja yang lebih pendek.
test('produk tanpa kategori tetap menghasilkan halaman yang benar', function () {
  const d = data({ produkKategori: [] });
  const html = RENDER.produk(d, d.produk[0]);
  assert.match(html, /Kopi Arabika Puntang/);
  assert.doesNotMatch(html, /href="\/kategori\//);
});

test('katalog tanpa produk mengarahkan ke marketplace, bukan halaman kosong', function () {
  const html = RENDER.shop(data({ produk: [], varian: [] }), null);
  assert.match(html, /Etalasenya sedang disiapkan/);
  assert.match(html, /tk\.tokopedia\.com/);
});

// Ukuran hanya disebut di halaman produk, tempat orang benar-benar memilihnya.
// Di kartu, delapan potong berat membuat tinggi kartu berbeda-beda dan menutupi
// yang justru membedakan produknya: asalnya.
test('kartu beranda dan shop tidak menampilkan daftar ukuran', function () {
  const d = data();
  const depan = RENDER.beranda(d);
  const shop = RENDER.shop(d, null);
  assert.doesNotMatch(depan, /class="ukuran"/);
  assert.doesNotMatch(shop, /class="ukuran"/);
  assert.match(depan, /Gunung Puntang, Jawa Barat/);
  assert.match(shop, /Gunung Puntang, Jawa Barat/);
  assert.match(RENDER.produk(d, d.produk[0]), /200 g/);
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

// Latar hero berupa video, dan tiap atributnya perlu. Tanpa `muted` dan
// `playsinline`, browser HP menolak memutarnya sendiri -- yang tampil bukan
// video melainkan kotak hitam dengan tombol putar di tengahnya, tepat di bagian
// halaman yang pertama dilihat orang.
test('video hero membawa atribut yang membuatnya boleh berjalan sendiri', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ judul: 'Judulnya', video_path: 'seksi/1/video-9.mp4',
                    foto_path: 'seksi/1/p', foto_lebar: [400, 1600] })]
  }));
  assert.match(html, /<video class="hero-media" autoplay muted loop playsinline preload="metadata"/);
  assert.match(html, /<source src="[^"]*seksi\/1\/video-9\.mp4" type="video\/mp4">/);
  assert.match(html, /class="hero hero-bervideo"/);
});

// Gambar diamnya elemen sendiri, bukan cuma atribut `poster`: atribut itu hilang
// begitu videonya jalan, sementara elemen ini yang tetap tampil untuk orang yang
// perangkatnya minta gerakan dikurangi -- CSS bisa menyembunyikan video, tapi
// tidak bisa menghentikannya.
test('gambar pengganti digambar sebagai elemen sendiri, bukan cuma atribut poster', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ video_path: 'seksi/1/v.mp4', foto_path: 'seksi/1/p', foto_lebar: [400, 1600] })]
  }));
  assert.match(html, /<img class="hero-media hero-diam" src="[^"]*seksi\/1\/p-1600\.webp"/);
  assert.match(html, /poster="[^"]*seksi\/1\/p-1600\.webp"/);
});

test('tanpa video, gambar pengganti saja sudah cukup jadi latar', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ foto_path: 'seksi/1/p', foto_lebar: [400, 800] })]
  }));
  assert.match(html, /<img class="hero-media hero-diam"/);
  assert.doesNotMatch(html, /<video/);
});

// Tanpa keduanya hero kembali polos. Yang tidak boleh terjadi adalah elemen
// media kosong: `<video>` tanpa sumber menggambar kotak hitam.
test('hero tanpa video dan tanpa gambar tidak menyisakan elemen media kosong', function () {
  const hero = RENDER.beranda(data()).split('class="wrap"')[0];
  assert.doesNotMatch(hero, /<video/);
  assert.doesNotMatch(hero, /<img/);
  assert.doesNotMatch(hero, /hero-latar/);
  assert.doesNotMatch(hero, /hero-bervideo/);
});

test('tipe video mengikuti ekstensi berkasnya', function () {
  assert.strictEqual(RENDER.tipeVideo('a/b/hero.mp4'), 'video/mp4');
  assert.strictEqual(RENDER.tipeVideo('a/b/hero.webm'), 'video/webm');
  assert.strictEqual(RENDER.tipeVideo('a/b/hero.MP4'), 'video/mp4');
  assert.strictEqual(RENDER.tipeVideo(''), 'video/mp4');
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

// Pencarian mencocokkan atribut ini, bukan teks yang terlihat di kartu. Ukuran
// tidak pernah tertulis di kartu sejak daftar beratnya dibuang, padahal "1 kg"
// termasuk yang paling sering diketik orang -- kalau ukurannya tidak ikut ke
// sini, kartunya tidak akan pernah ketemu.
test('kata pencarian memuat nama, asal, kategori, dan ukuran', function () {
  const d = data();
  const kata = RENDER.kataCari(d, d.produk[0]);
  assert.match(kata, /kopi arabika puntang/);
  assert.match(kata, /gunung puntang/);
  assert.match(kata, /arabika/);
  assert.match(kata, /500 g/);
  assert.strictEqual(kata, kata.toLowerCase());
});

test('produk tanpa keterangan tetap bisa dicari lewat namanya', function () {
  const d = data({
    produk: [{ id: 1, slug: 'polos', nama: 'Kopi Polos', origin: null, proses: null, roast: null,
               altitude: null, varietas: null, catatan_rasa: null, ringkas: null, deskripsi: null,
               opsi_giling: [] }],
    varian: [], produkKategori: []
  });
  assert.strictEqual(RENDER.kataCari(d, d.produk[0]), 'kopi polos');
});

// Barisan produk di halaman depan. Yang penting bukan penyorotannya, tapi
// perilaku waktu belum ada yang disorot: bagian yang mendadak kosong setelah
// migrasi berjalan terlihat seperti kerusakan, padahal cuma belum diisi.
test('halaman depan menampilkan delapan produk pertama selama belum ada yang disorot', function () {
  const banyak = [];
  for (let i = 1; i <= 12; i++) {
    banyak.push({ id: i, slug: 'k' + i, nama: 'Kopi ' + i, origin: null, proses: null, roast: null,
                  altitude: null, varietas: null, catatan_rasa: null, ringkas: null, deskripsi: null,
                  opsi_giling: [], sorot: false });
  }
  const d = data({ produk: banyak, varian: [], produkKategori: [] });
  assert.strictEqual(RENDER.produkSorot(d).length, 8);
  assert.strictEqual(RENDER.produkSorot(d)[0].nama, 'Kopi 1');
});

test('kalau ada yang disorot, hanya yang disorot yang tampil', function () {
  const d = data({
    produk: [
      { id: 1, slug: 'a', nama: 'Kopi A', origin: null, proses: null, roast: null, altitude: null,
        varietas: null, catatan_rasa: null, ringkas: null, deskripsi: null, opsi_giling: [], sorot: false },
      { id: 2, slug: 'b', nama: 'Kopi B', origin: null, proses: null, roast: null, altitude: null,
        varietas: null, catatan_rasa: null, ringkas: null, deskripsi: null, opsi_giling: [], sorot: true }
    ],
    varian: [], produkKategori: []
  });
  assert.deepStrictEqual(Array.from(RENDER.produkSorot(d)).map(function (p) { return p.nama; }), ['Kopi B']);
  const html = RENDER.beranda(d);
  assert.match(html, /Kopi B/);
  assert.doesNotMatch(html, /Kopi A/);
});

test('barisan halaman depan digambar sebagai rel geser, bukan grid', function () {
  const html = RENDER.beranda(data());
  assert.match(html, /class="geser-rel"/);
  assert.match(html, /id="sorot-rel"/);
  // Panahnya harus terkirim dalam keadaan hidden: kalau tidak, halaman tanpa
  // JavaScript memasang dua tombol yang tidak menggeser apa pun.
  assert.match(html, /class="geser-panah kiri" type="button" aria-label="[^"]*" hidden/);
});

// -- Keranjang ---------------------------------------------------------------
//
// Keranjang menyimpan id dan jumlah saja; nama dan harganya dibaca ulang dari
// katalog tiap kali dibuka. Yang diuji di sini akibat dari pilihan itu: harga
// yang berubah harus ikut berubah di keranjang, dan varian yang hilang tidak
// boleh lenyap diam-diam.

function katalog(ubah) {
  return Object.assign({
    produk: [
      { id: 1, nama: 'Kopi Satu', slug: 'satu', foto: 'https://contoh/1.webp' },
      { id: 2, nama: 'Kopi Dua', slug: 'dua', foto: null }
    ],
    varian: [
      { id: 10, produk_id: 1, label_ukuran: '200 g', harga: 63100, stok: null },
      { id: 11, produk_id: 1, label_ukuran: '1 kg', harga: 250000, stok: 2 },
      { id: 20, produk_id: 2, label_ukuran: '250 g', harga: 45800, stok: 0 }
    ]
  }, ubah || {});
}

test('keranjang menjumlahkan harga dari katalog, bukan dari yang tersimpan', function () {
  const r = RENDER.ringkasKeranjang(katalog(), [{ v: 10, q: 2 }, { v: 20, q: 1 }]);
  assert.strictEqual(r.total, 63100 * 2 + 45800);
  assert.strictEqual(r.jumlah, 3);
  assert.strictEqual(r.baris[0].nama, 'Kopi Satu');
  assert.strictEqual(r.baris[0].subtotal, 126200);
});

test('varian yang sudah tidak ada di katalog dilaporkan, bukan dibuang diam-diam', function () {
  const r = RENDER.ringkasKeranjang(katalog(), [{ v: 10, q: 1 }, { v: 999, q: 1 }]);
  assert.strictEqual(r.baris.length, 1);
  assert.strictEqual(r.hilang.length, 1);
  assert.strictEqual(r.total, 63100);
});

test('jumlah melebihi stok ditandai, stok kosong berarti tidak dibatasi', function () {
  const r = RENDER.ringkasKeranjang(katalog(), [{ v: 11, q: 5 }, { v: 10, q: 99 }]);
  assert.strictEqual(r.baris[0].lebihStok, true);
  assert.strictEqual(r.baris[0].stok, 2);
  assert.strictEqual(r.baris[1].lebihStok, false);
  assert.strictEqual(r.baris[1].stok, null);
});

test('jumlah yang tidak masuk akal dibulatkan ke satu, bukan dipakai apa adanya', function () {
  const r = RENDER.ringkasKeranjang(katalog(), [{ v: 10, q: 0 }, { v: 20, q: -3 }]);
  assert.strictEqual(r.baris[0].qty, 1);
  assert.strictEqual(r.baris[1].qty, 1);
  assert.strictEqual(r.total, 63100 + 45800);
});

// Selama pembayaran di website belum ada, pesan inilah yang menutup penjualan.
// Kalau ukuran atau gilingannya tidak ikut, pemilik harus bertanya balik.
test('pesan WhatsApp memuat ukuran, gilingan, jumlah, dan total', function () {
  const r = RENDER.ringkasKeranjang(katalog(), [{ v: 10, q: 2, g: 'Gilingan Halus' }]);
  const pesan = RENDER.pesanWhatsapp(r);
  assert.match(pesan, /Kopi Satu 200 g \(Gilingan Halus\) x2 = Rp126\.200/);
  assert.match(pesan, /Total: Rp126\.200/);
  assert.match(pesan, /belum termasuk ongkir/);
});

test('produk tanpa pilihan gilingan tidak menulis tanda kurung kosong', function () {
  const r = RENDER.ringkasKeranjang(katalog(), [{ v: 20, q: 1 }]);
  assert.doesNotMatch(RENDER.pesanWhatsapp(r), /\(\)/);
});

test('halaman keranjang dibangun kosong dan membawa alamat WhatsApp', function () {
  const html = RENDER.keranjang('https://wa.me/628815865698');
  assert.match(html, /id="keranjang-isi"/);
  assert.match(html, /data-wa="https:\/\/wa\.me\/628815865698"/);
  assert.match(html, /<noscript>/);
});

// -- Spanduk halaman depan ---------------------------------------------------

test('spanduk tanpa foto tidak digambar sama sekali', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk', judul: 'Juara 1 Tokopedia' })]
  }));
  assert.doesNotMatch(html, /class="spanduk"/);
});

test('spanduk berfoto digambar dengan keterangannya sebagai alt', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk', judul: 'Juara 1 Tokopedia Paling Nyam 2024',
                    foto_path: 'seksi/9/spanduk.webp', foto_lebar: [400, 800, 1600] })]
  }));
  assert.match(html, /class="spanduk"/);
  assert.match(html, /alt="Juara 1 Tokopedia Paling Nyam 2024"/);
  assert.match(html, /seksi\/9\/spanduk/);
});

// Tulisan di dalam gambar tidak terbaca mesin mana pun. Kalau alt ikut kosong,
// klaim yang paling ingin dibaca orang justru satu-satunya yang tidak ada.
test('spanduk tanpa keterangan tetap tampil, altnya kosong bukan sampah', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk', judul: null,
                    foto_path: 'seksi/9/spanduk.webp', foto_lebar: [800] })]
  }));
  assert.match(html, /class="spanduk"/);
  assert.match(html, /alt=""/);
});

test('spanduk bertautan dibungkus tautan, yang tidak tetap gambar biasa', function () {
  const berTautan = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk', judul: 'Promo', tombol_url: '/shop/',
                    foto_path: 'seksi/9/a.webp', foto_lebar: [800] })]
  }));
  assert.match(berTautan, /<a class="spanduk-bingkai" href="\/shop\/">/);

  const polos = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk', judul: 'Promo',
                    foto_path: 'seksi/9/a.webp', foto_lebar: [800] })]
  }));
  assert.match(polos, /<div class="spanduk-bingkai">/);
});

test('spanduk muncul di antara hero dan produk, bukan di bawah katalog', function () {
  const html = RENDER.beranda(data({
    seksi: [
      seksi({ id: 1, blok: 'hero', judul: 'GEMEOS' }),
      seksi({ id: 9, blok: 'spanduk', judul: 'Promo', foto_path: 'seksi/9/a.webp', foto_lebar: [800] })
    ]
  }));
  assert.ok(html.indexOf('class="spanduk"') < html.indexOf('id="sorot-rel"'));
});

test('spanduk melebar sampai tepi hanya kalau diminta', function () {
  const contained = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk', judul: 'Promo', foto_path: 'a.webp', foto_lebar: [800] })]
  }));
  assert.doesNotMatch(contained, /class="spanduk penuh"/);
  assert.match(contained, /class="wrap"><section class="spanduk"/);

  const penuh = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk', judul: 'Promo', subjudul: 'penuh',
                    foto_path: 'a.webp', foto_lebar: [800] })]
  }));
  assert.match(penuh, /<section class="spanduk penuh">/);
});

// -- Bagian Eksklusif dan spanduk bergulir -----------------------------------

test('judul Eksklusif tanpa daftar alasan tidak digambar', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'eksklusif', judul: 'Eksklusif di toko kami' })]
  }));
  assert.doesNotMatch(html, /class="eksklusif"/);
});

// Judul kosong tidak boleh menghilangkan alasan yang sudah terisi -- itu isi
// yang sudah tayang sebelum bagian ini ada.
test('tanpa judul Eksklusif, daftar alasan tetap tampil dengan bentuk lamanya', function () {
  const html = RENDER.beranda(data({
    seksi: [seksi({ id: 2, blok: 'alasan', urutan: 1, judul: 'Murni 100%', teks: 'Tanpa campuran.' })]
  }));
  assert.doesNotMatch(html, /class="eksklusif"/);
  assert.match(html, /class="pita"/);
  assert.match(html, /Murni 100%/);
});

test('judul dan alasan bersama digambar sebagai dua kolom', function () {
  const html = RENDER.beranda(data({
    seksi: [
      seksi({ id: 9, blok: 'eksklusif', subjudul: 'Hanya di sini', judul: 'Eksklusif di toko kami' }),
      seksi({ id: 2, blok: 'alasan', urutan: 1, judul: 'Murni 100%', teks: 'Tanpa campuran.' })
    ]
  }));
  assert.match(html, /class="eksklusif"/);
  assert.match(html, /Eksklusif di toko kami/);
  assert.match(html, /Murni 100%/);
  assert.doesNotMatch(html, /class="pita"/);
});

test('spanduk bergulir hanya digambar kalau ada yang berfoto', function () {
  const kosong = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk-geser', judul: 'Promo' })]
  }));
  assert.doesNotMatch(kosong, /class="spanduk-geser"/);

  const isi = RENDER.beranda(data({
    seksi: [seksi({ id: 9, blok: 'spanduk-geser', judul: 'Promo', foto_path: 'a.webp', foto_lebar: [800] })]
  }));
  assert.match(isi, /class="spanduk-geser"/);
  assert.match(isi, /class="geser-rel spanduk-rel"/);
  assert.match(isi, /aria-label="Spanduk berikutnya" hidden/);
});

test('spanduk bergulir muncul di bawah bagian Eksklusif', function () {
  const html = RENDER.beranda(data({
    seksi: [
      seksi({ id: 9, blok: 'eksklusif', judul: 'Eksklusif di toko kami' }),
      seksi({ id: 2, blok: 'alasan', urutan: 1, judul: 'Murni 100%', teks: 'x' }),
      seksi({ id: 10, blok: 'spanduk-geser', judul: 'Promo', foto_path: 'a.webp', foto_lebar: [800] })
    ]
  }));
  assert.ok(html.indexOf('class="eksklusif"') < html.indexOf('class="spanduk-geser"'));
});
