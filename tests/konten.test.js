/**
 * Halaman kebijakan.
 *
 * Yang diuji di sini bukan kalimatnya -- itu urusan pemilik -- melainkan hal
 * yang diam-diam bisa salah: satu janji yang ditulis di dua halaman lalu diubah
 * di salah satunya saja. Tenggat klaim, lama proses, alamat email, dan nomor
 * WhatsApp semuanya muncul lebih dari sekali. Pembeli yang menemukan dua angka
 * berbeda akan memilih yang menguntungkannya, dan dia benar.
 */

const test = require('node:test');
const assert = require('node:assert');
const KONTEN = require('../konten.js');

function halamanDengan(slug) {
  const h = KONTEN.halaman.find(function (x) { return x.slug === slug; });
  assert.ok(h, 'halaman /' + slug + '/ tidak ada');
  return h;
}

// Seluruh teks satu halaman, digabung, supaya bisa dicari apa adanya.
function teks(slug) {
  return halamanDengan(slug).blok.map(function (b) {
    if (b.h) return b.h;
    if (b.p) return b.p;
    if (b.ul) return b.ul.join(' ');
    if (b.tombol) return b.tombol.teks + ' ' + b.tombol.ke;
    return '';
  }).join('\n');
}

test('tiap halaman punya slug, judul, ringkasan, dan isi', function () {
  for (const h of KONTEN.halaman) {
    assert.match(h.slug, /^[a-z-]+$/, 'slug tidak aman dipakai di alamat: ' + h.slug);
    assert.ok(h.judul && h.judul.length > 0, h.slug + ' tanpa judul');
    assert.ok(h.ringkas && h.ringkas.length > 0, h.slug + ' tanpa ringkasan');
    assert.ok(Array.isArray(h.blok) && h.blok.length > 0, h.slug + ' tanpa isi');
  }
});

test('slug tidak ada yang kembar', function () {
  const s = KONTEN.halaman.map(function (h) { return h.slug; });
  assert.strictEqual(new Set(s).size, s.length);
});

test('tiap blok berupa bentuk yang bisa dirakit build.js', function () {
  const dikenal = ['h', 'p', 'ul', 'tombol'];
  for (const h of KONTEN.halaman) {
    for (const b of h.blok) {
      const kunci = Object.keys(b);
      assert.strictEqual(kunci.length, 1, h.slug + ': satu blok memuat lebih dari satu bentuk');
      assert.ok(dikenal.indexOf(kunci[0]) !== -1,
        h.slug + ': bentuk blok "' + kunci[0] + '" tidak dikenal build.js dan akan hilang diam-diam');
    }
  }
});

// -- Janji yang ditulis di lebih dari satu tempat ----------------------------

test('lama proses sama di halaman Pengiriman dan Syarat', function () {
  assert.match(teks('pengiriman'), /1 sampai 3 hari kerja/);
  assert.match(teks('syarat'), /1 sampai 3 hari kerja/);
});

test('tenggat klaim sama di halaman Retur dan Syarat', function () {
  assert.match(teks('retur'), /2 x 24 jam/);
  assert.match(teks('syarat'), /2 x 24 jam/);
});

test('paket hilang ditanggung toko, bukan dilempar ke pembeli', function () {
  assert.match(teks('pengiriman'), /kami ganti lebih dulu/);
  assert.match(teks('syarat'), /kami ganti lebih dulu/);
  assert.match(teks('retur'), /hilang di tangan kurir/);
});

test('video buka paket disebut sebagai syarat klaim', function () {
  assert.match(teks('retur'), /video/i);
  assert.match(teks('syarat'), /video/i);
});

// -- Jalur kontak ------------------------------------------------------------

test('halaman Kontak memakai email dan WhatsApp yang sama dengan yang dipakai build.js', function () {
  const t = teks('kontak');
  assert.ok(t.indexOf(KONTEN.kontak.email) !== -1, 'email di halaman Kontak berbeda dari KONTEN.kontak');
  assert.ok(t.indexOf(KONTEN.kontak.whatsapp) !== -1, 'tautan WhatsApp tidak ada di halaman Kontak');
  assert.ok(t.indexOf(KONTEN.kontak.whatsappTampil) !== -1, 'nomor WhatsApp tidak tertulis di halaman Kontak');
});

test('nomor WhatsApp yang ditampilkan sama dengan yang ada di tautannya', function () {
  const angkaTautan = KONTEN.kontak.whatsapp.replace(/\D/g, '');
  const angkaTampil = KONTEN.kontak.whatsappTampil.replace(/\D/g, '');
  const angkaE164 = KONTEN.kontak.whatsappE164.replace(/\D/g, '');
  assert.strictEqual(angkaTampil, angkaTautan);
  assert.strictEqual(angkaE164, angkaTautan);
});

// Alamat login /admin ada di tabel app_users dan tidak boleh bocor ke halaman
// publik sebagai alamat layanan pelanggan -- keduanya sengaja dipisah.
test('email login pengelola tidak dipakai sebagai alamat layanan pelanggan', function () {
  assert.notStrictEqual(KONTEN.kontak.email, 'gemeoscoffe@gmail.com');
  for (const h of KONTEN.halaman) {
    assert.ok(teks(h.slug).indexOf('gemeoscoffe@gmail.com') === -1,
      h.slug + ' menyebut email login pengelola');
  }
});
