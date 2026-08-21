/**
 * Penyunting isi halaman depan dan Tentang Kami.
 *
 * Yang diuji di sini adalah hal yang salahnya tidak berbunyi. Kotak isian yang
 * kehilangan `data-kolom` tetap tergambar rapi dan tetap bisa diketik -- yang
 * hilang cuma penyimpanannya, dan itu baru ketahuan waktu tulisan yang sudah
 * diketik ternyata tidak ada lagi. Begitu juga bagian yang terdaftar di layar
 * tapi bentuknya tidak pernah ditulis: yang muncul `undefined`, bukan galat.
 */

const test = require('node:test');
const assert = require('node:assert');
const { buatContextSeksi, ambil, pasang } = require('./harness');

const ctx = buatContextSeksi();
const SEKSI_BENTUK = ambil(ctx, 'SEKSI_BENTUK');
const SEKSI_LAYAR = ambil(ctx, 'SEKSI_LAYAR');
const renderSeksiKartu = ambil(ctx, 'renderSeksiKartu');
const seksiBarisDari = ambil(ctx, 'seksiBarisDari');
const seksiBerkasFoto = ambil(ctx, 'seksiBerkasFoto');

function seksi(isi) {
  return Object.assign({
    id: 1, halaman: 'home', blok: 'hero', urutan: 0,
    judul: null, subjudul: null, teks: null,
    tombol_label: null, tombol_url: null, tombol2_label: null, tombol2_url: null,
    foto_path: null, foto_lebar: null, aktif: true
  }, isi || {});
}

// Salah ketik satu huruf di daftar layar menghasilkan kartu berjudul
// `undefined` yang tidak melempar galat apa pun.
test('tiap bagian yang terdaftar di layar punya bentuknya', function () {
  Object.keys(SEKSI_LAYAR).forEach(function (layar) {
    SEKSI_LAYAR[layar].forEach(function (kunci) {
      assert.ok(SEKSI_BENTUK[kunci], kunci + ' terdaftar di ' + layar + ' tapi bentuknya tidak ada');
    });
  });
});

test('semua bentuk yang ditulis benar-benar ditampilkan di salah satu layar', function () {
  const tampil = Object.keys(SEKSI_LAYAR).reduce(function (kumpul, layar) {
    return kumpul.concat(SEKSI_LAYAR[layar]);
  }, []);
  Object.keys(SEKSI_BENTUK).forEach(function (kunci) {
    assert.ok(tampil.indexOf(kunci) !== -1, kunci + ' punya bentuk tapi tidak muncul di layar mana pun');
  });
});

test('tiap kolom digambar sebagai kotak yang menyebut kolomnya', function () {
  pasang(ctx, 'SEKSI', [seksi({ id: 7, judul: 'Judulnya', teks: 'Isinya' })]);
  const html = renderSeksiKartu('home/hero');

  SEKSI_BENTUK['home/hero'].kolom.forEach(function (k) {
    assert.match(html, new RegExp('data-id="7" data-kolom="' + k.k + '"'),
      'kolom ' + k.k + ' harus punya kotak isian');
  });
  assert.match(html, /data-kolom="judul"[^>]*value="Judulnya"/);
  assert.match(html, /data-kolom="teks"[^>]*>Isinya<\/textarea>/);
});

// Kolom kosong di database bernilai null. Kalau nilainya dipakai apa adanya,
// yang muncul di kotak adalah tulisan "null" -- dan menyimpannya kembali akan
// benar-benar menuliskan kata itu ke halaman depan.
test('kolom kosong menghasilkan kotak kosong, bukan tulisan null', function () {
  pasang(ctx, 'SEKSI', [seksi({ id: 1 })]);
  const html = renderSeksiKartu('home/hero');
  assert.doesNotMatch(html, /null/);
  assert.match(html, /data-kolom="judul"[^>]*value=""/);
});

test('teks pemilik yang memuat tanda kutip dan tag tidak merusak kotaknya', function () {
  pasang(ctx, 'SEKSI', [seksi({ id: 1, judul: 'Kopi "asli"', teks: '<script>x</script>' })]);
  const html = renderSeksiKartu('home/hero');
  assert.match(html, /value="Kopi &quot;asli&quot;"/);
  assert.doesNotMatch(html, /<script>/);
});

// Bagian yang boleh berulang perlu tombol Tambah dan kolom Urutan; yang cuma
// sebaris tidak, karena tidak ada yang bisa diurutkan terhadap apa pun.
test('hanya bagian yang boleh berulang punya tombol Tambah dan kolom Urutan', function () {
  pasang(ctx, 'SEKSI', [
    seksi({ id: 1, blok: 'hero' }),
    seksi({ id: 2, blok: 'testimoni', urutan: 1, teks: 'Enak' })
  ]);

  const tunggal = renderSeksiKartu('home/hero');
  assert.doesNotMatch(tunggal, /seksi-tambah/);
  assert.doesNotMatch(tunggal, /data-kolom="urutan"/);

  const berulang = renderSeksiKartu('home/testimoni');
  assert.match(berulang, /seksi-tambah" data-kunci="home\/testimoni"/);
  assert.match(berulang, /data-kolom="urutan"/);
});

test('bagian yang belum ada barisnya mengatakannya, bukan tampil kosong', function () {
  pasang(ctx, 'SEKSI', []);
  assert.match(renderSeksiKartu('home/lokasi'), /Belum ada isinya/);
});

test('baris diurutkan menurut urutan, bukan urutan datangnya dari database', function () {
  pasang(ctx, 'SEKSI', [
    seksi({ id: 3, blok: 'alasan', urutan: 3, judul: 'Ketiga' }),
    seksi({ id: 1, blok: 'alasan', urutan: 1, judul: 'Pertama' }),
    seksi({ id: 2, blok: 'alasan', urutan: 2, judul: 'Kedua' })
  ]);
  const urut = seksiBarisDari('home/alasan').map(function (s) { return s.judul; });
  assert.deepStrictEqual(Array.from(urut), ['Pertama', 'Kedua', 'Ketiga']);
});

// Satu foto berarti beberapa berkas di bucket. Menghapus barisnya saja
// meninggalkan berkas yang tidak dirujuk siapa pun dan tidak pernah ditemukan
// lagi.
test('satu foto menunjuk semua berkas ukurannya', function () {
  assert.deepStrictEqual(
    Array.from(seksiBerkasFoto(seksi({ foto_path: 'seksi/4/17', foto_lebar: [400, 800, 1600] }))),
    ['seksi/4/17-400.webp', 'seksi/4/17-800.webp', 'seksi/4/17-1600.webp']
  );
  assert.deepStrictEqual(Array.from(seksiBerkasFoto(seksi({ foto_path: null }))), []);
});
