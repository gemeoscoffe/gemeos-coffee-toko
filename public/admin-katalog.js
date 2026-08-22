/**
 * Katalog Toko -- produk, varian, stok dan foto. Isi halaman /admin.
 *
 * Halaman ini satu-satunya cara mengisi `web_produk`, `web_varian` dan
 * `web_foto`. Etalasenya hanya membaca: pengunjung anonim tidak punya kebijakan
 * tulis di ketiga tabel itu, dan setiap penulisan di sini menuntut
 * `is_app_user()` -- daftar orang yang boleh ada di tabel `app_users`.
 *
 * Produk punya anak -- varian dan foto -- jadi bentuknya daftar produk di atas,
 * dan satu produk yang sedang dikelola di bawahnya. Membuka semua varian dari
 * semua produk sekaligus membuat halaman ini tidak terbaca begitu katalognya
 * lewat sepuluh produk.
 *
 * Rancangan lengkapnya ada di TOKO.md, di repo gemeos-coffee-v2 -- bersama
 * migrasi databasenya, karena databasenya memang satu.
 */

let TOKO_PRODUK = [], TOKO_VARIAN = [], TOKO_FOTO = [];
let TOKO_KATEGORI = [], TOKO_PK = [];
let TOKO_PILIH = null;   // id produk yang sedang dikelola, null = tidak ada

const TOKO_BUCKET = 'produk';

// Slug dipakai di URL toko, jadi hanya huruf kecil, angka dan tanda hubung.
// Dibuat otomatis dari nama supaya tidak ada yang perlu memikirkannya, tapi
// tetap bisa diubah tangan: mengganti nama produk yang sudah pernah dibagikan
// linknya tidak boleh diam-diam memindahkan halamannya.
function tokoSlug(teks) {
  return String(teks || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    // Potongan 60 karakter bisa jatuh tepat di tanda hubung, dan slug yang
    // berakhir dengan tanda hubung terlihat seperti alamat yang terpotong.
    .replace(/-+$/, '');
}

// Gilingan diketik sebagai satu baris dipisah koma karena itu cara tercepat
// mengisinya, dan urutannya ikut urutan ketik -- yang pertama jadi pilihan awal
// di toko. Duplikat dibuang supaya tidak muncul dua tombol yang sama.
function tokoDaftarGiling(teks) {
  const keluar = [];
  String(teks || '').split(',').forEach(function(bagian) {
    const bersih = bagian.trim();
    if (bersih && keluar.indexOf(bersih) === -1) keluar.push(bersih);
  });
  return keluar;
}

// Dua bentuk foto hidup berdampingan: yang diunggah sejak ada beberapa ukuran
// menyimpan nama dasar dan daftar lebarnya, yang lama menyimpan satu nama
// berkas apa adanya. Semua yang membaca foto lewat sini supaya bedanya tidak
// menyebar ke mana-mana.
function tokoBerkasFoto(f) {
  const lebar = f.lebar_tersedia || [];
  if (!lebar.length) return [f.path];
  return lebar.map(function(w) { return f.path + '-' + w + '.webp'; });
}

function tokoUrlFoto(f, lebarDiminta) {
  const lebar = f.lebar_tersedia || [];
  if (!lebar.length) return SUPABASE_URL + '/storage/v1/object/public/' + TOKO_BUCKET + '/' + f.path;
  // Ambil yang paling kecil tapi masih cukup; kalau semuanya kurang, ambil yang
  // terbesar.
  const urut = lebar.slice().sort(function(a, b) { return a - b; });
  const pas = urut.find(function(w) { return w >= (lebarDiminta || 0); }) || urut[urut.length - 1];
  return SUPABASE_URL + '/storage/v1/object/public/' + TOKO_BUCKET + '/' + f.path + '-' + pas + '.webp';
}

// ---------------------------------------------------------------------------
// Muat
// ---------------------------------------------------------------------------

async function loadTokoPage() {
  const el = document.getElementById('toko-produk-table');
  el.innerHTML = '<p class="muted">Memuat...</p>';
  try {
    const [produk, varian, foto, kategori, pk] = await Promise.all([
      sbSelect('web_produk', 'select=*&order=urutan,nama'),
      sbSelect('web_varian', 'select=*&order=produk_id,urutan,label_ukuran'),
      sbSelect('web_foto', 'select=*&order=produk_id,urutan'),
      sbSelect('web_kategori', 'select=*&order=urutan,nama'),
      sbSelect('web_produk_kategori', 'select=*')
    ]);
    TOKO_PRODUK = produk;
    TOKO_VARIAN = varian;
    TOKO_FOTO = foto;
    TOKO_KATEGORI = kategori;
    TOKO_PK = pk;
    renderTokoProduk();
    renderTokoKategori();
    renderTokoKelola();
  } catch (err) {
    el.innerHTML = '<p class="muted" style="color:var(--red)">Gagal memuat: ' + esc(err.message) + '</p>';
  }
}

function tokoVarianDari(produkId) {
  return TOKO_VARIAN.filter(function(v) { return v.produk_id === produkId; });
}

function tokoFotoDari(produkId) {
  return TOKO_FOTO.filter(function(f) { return f.produk_id === produkId; });
}

// Stok toko diisi tangan. null berarti tidak dibatasi -- varian itu selalu bisa
// dipesan -- bukan nol. Yang paling perlu terlihat di daftar produk adalah
// varian yang akan tampil habis di toko, jadi yang diambil angka terkecil di
// antara varian yang memang dibatasi.
function tokoStokTerendah(produkId) {
  const angka = tokoVarianDari(produkId)
    .map(function(v) { return v.stok; })
    .filter(function(n) { return n !== null && n !== undefined; });
  return angka.length ? Math.min.apply(null, angka) : null;
}

function tokoStokSel(nilai) {
  if (nilai === null || nilai === undefined) return '<span class="muted">tidak dibatasi</span>';
  if (nilai <= 0) return '<span style="color:var(--red);font-weight:600">habis</span>';
  return esc(String(nilai)) + ' unit';
}

// ---------------------------------------------------------------------------
// Kategori
// ---------------------------------------------------------------------------
//
// Satu produk boleh berada di beberapa kategori, jadi hubungannya disimpan di
// tabel penghubung web_produk_kategori, bukan sebagai teks di produk. Kolom
// lama web_produk.kategori tidak lagi ditulis dari sini; ia masih ada di
// database sampai migrasi berikutnya membuangnya.

function tokoKategoriDari(produkId) {
  const punya = TOKO_PK.filter(function(x) { return x.produk_id === produkId; })
    .map(function(x) { return x.kategori_id; });
  return TOKO_KATEGORI.filter(function(k) { return punya.indexOf(k.id) !== -1; });
}

function tokoProdukDiKategori(kategoriId) {
  return TOKO_PK.filter(function(x) { return x.kategori_id === kategoriId; }).length;
}

function renderTokoKategori() {
  const el = document.getElementById('toko-kat-table');
  if (!el) return;

  if (TOKO_KATEGORI.length === 0) {
    el.innerHTML = '<p class="muted">Belum ada kategori. Tambahkan yang pertama di atas.</p>';
    return;
  }

  el.innerHTML = '<div class="table-scroll"><table><thead><tr>' +
    '<th>Nama</th><th>Alamat</th><th class="num">Urutan</th><th class="num">Produk</th>' +
    '<th>Tampil di Toko</th><th class="num">Aksi</th></tr></thead><tbody>' +
    TOKO_KATEGORI.map(function(k) {
      const jumlah = tokoProdukDiKategori(k.id);
      return '<tr>' +
        '<td><input class="kat-nama" data-id="' + k.id + '" value="' + esc(k.nama) + '" style="width:200px"></td>' +
        '<td><code>/kategori/' + esc(k.slug) + '/</code></td>' +
        '<td class="num"><input class="kat-urutan" data-id="' + k.id + '" type="number" value="' +
          (k.urutan || 0) + '" style="width:74px"></td>' +
        '<td class="num">' + jumlah + (jumlah === 0 ? ' <span class="muted">(tidak digambar)</span>' : '') + '</td>' +
        '<td><label class="toko-switch"><input type="checkbox" class="kat-aktif" data-id="' + k.id + '"' +
          (k.aktif ? ' checked' : '') + '> ' + (k.aktif ? 'Tampil' : 'Disembunyikan') + '</label></td>' +
        '<td class="num"><button class="btn-secondary kat-hapus" data-id="' + k.id + '">Hapus</button></td></tr>';
    }).join('') + '</tbody></table></div>';

  wireTokoKategori();
}

function wireTokoKategori() {
  const status = document.getElementById('toko-kat-status');

  document.querySelectorAll('.kat-nama').forEach(function(inp) {
    inp.addEventListener('change', function() {
      simpanKolomKategori(Number(this.dataset.id), 'nama', this.value.trim(), status);
    });
  });

  document.querySelectorAll('.kat-urutan').forEach(function(inp) {
    inp.addEventListener('change', function() {
      simpanKolomKategori(Number(this.dataset.id), 'urutan', Number(this.value) || 0, status);
    });
  });

  document.querySelectorAll('.kat-aktif').forEach(function(box) {
    box.addEventListener('change', function() {
      simpanKolomKategori(Number(this.dataset.id), 'aktif', this.checked, status);
    });
  });

  document.querySelectorAll('.kat-hapus').forEach(function(btn) {
    btn.addEventListener('click', function() { hapusTokoKategori(Number(this.dataset.id)); });
  });
}

async function simpanKolomKategori(id, kolom, nilai, status) {
  if (kolom === 'nama' && !nilai) {
    tokoStatus(status, false, 'Nama kategori tidak boleh kosong.');
    await loadTokoPage();
    return;
  }
  const badan = {};
  badan[kolom] = nilai;
  try {
    // Slug sengaja tidak ikut diperbarui saat nama berganti. Alamat yang
    // berubah memutus tautan yang sudah dibagikan dan membuang peringkat yang
    // menempel padanya -- dan nama kategori jauh lebih sering dirapikan
    // daripada alamatnya benar-benar perlu pindah.
    await sbWrite('PATCH', 'web_kategori', 'id=eq.' + id, badan);
    tokoStatus(status, true, 'Tersimpan.');
    await loadTokoPage();
  } catch (err) {
    tokoStatus(status, false, err.message);
    await loadTokoPage();
  }
}

async function tambahTokoKategori() {
  const status = document.getElementById('toko-kat-status');
  const nama = document.getElementById('toko-kat-nama').value.trim();
  if (!nama) { tokoStatus(status, false, 'Nama kategori wajib diisi.'); return; }

  const slug = tokoSlug(nama);
  if (!slug) { tokoStatus(status, false, 'Nama kategori harus memuat huruf atau angka.'); return; }
  if (TOKO_KATEGORI.some(function(k) { return k.slug === slug; })) {
    tokoStatus(status, false, 'Sudah ada kategori dengan alamat /kategori/' + slug + '/.');
    return;
  }

  try {
    await sbWrite('POST', 'web_kategori', '', {
      nama: nama,
      slug: slug,
      urutan: Number(document.getElementById('toko-kat-urutan').value) || 0,
      aktif: true
    });
    document.getElementById('toko-kat-nama').value = '';
    tokoStatus(status, true, nama + ' ditambahkan. Pilih produknya lewat tombol Kelola.');
    await loadTokoPage();
  } catch (err) {
    tokoStatus(status, false, err.message);
  }
}

async function hapusTokoKategori(id) {
  const k = TOKO_KATEGORI.find(function(x) { return x.id === id; });
  if (!k) return;
  const jumlah = tokoProdukDiKategori(id);
  const pesan = jumlah
    ? 'Hapus kategori ' + k.nama + '? ' + jumlah + ' produk akan kehilangan kategori ini. Produknya sendiri tidak ikut terhapus.'
    : 'Hapus kategori ' + k.nama + '?';
  if (!confirm(pesan)) return;

  const status = document.getElementById('toko-kat-status');
  try {
    // Baris penghubungnya ikut terhapus lewat on delete cascade, jadi tidak
    // perlu dibersihkan sendiri di sini.
    await sbDelete('web_kategori', 'id=eq.' + id);
    tokoStatus(status, true, 'Kategori ' + k.nama + ' dihapus.');
    await loadTokoPage();
  } catch (err) {
    tokoStatus(status, false, err.message);
  }
}

async function setKategoriProduk(produkId, kategoriId, masuk) {
  const status = document.getElementById('toko-detail-status');
  try {
    if (masuk) {
      await sbWrite('POST', 'web_produk_kategori', '', { produk_id: produkId, kategori_id: kategoriId });
    } else {
      await sbDelete('web_produk_kategori',
        'produk_id=eq.' + produkId + '&kategori_id=eq.' + kategoriId);
    }
    if (status) tokoStatus(status, true, 'Kategori diperbarui.');
    await loadTokoPage();
  } catch (err) {
    if (status) tokoStatus(status, false, err.message);
    await loadTokoPage();
  }
}

// ---------------------------------------------------------------------------
// Daftar produk
// ---------------------------------------------------------------------------

// Kategori sebuah produk bisa lebih dari satu, dan bisa juga belum ada. Yang
// belum berkategori ditandai jelas: produk itu tidak muncul di satu pun tombol
// filter, dan itu tidak terlihat dari mana pun kecuali dari sini.
function tokoKategoriSel(produkId) {
  const punya = tokoKategoriDari(produkId);
  if (punya.length === 0) return '<span class="muted">belum ada</span>';
  return punya.map(function(k) { return esc(k.nama); }).join(', ');
}

function renderTokoProduk() {
  const el = document.getElementById('toko-produk-table');

  if (TOKO_PRODUK.length === 0) {
    el.innerHTML = '<p class="muted">Belum ada produk di katalog toko. Tambahkan yang pertama di atas.</p>';
    return;
  }

  el.innerHTML = '<div class="table-scroll"><table><thead><tr>' +
    '<th>Produk</th><th>Kategori</th><th class="num">Varian</th><th class="num">Stok Terendah</th>' +
    '<th>Tampil di Toko</th><th class="num">Aksi</th></tr></thead><tbody>' +
    TOKO_PRODUK.map(function(p) {
      const varian = tokoVarianDari(p.id);
      return '<tr' + (p.id === TOKO_PILIH ? ' class="baris-aktif"' : '') + '>' +
        '<td><b>' + esc(p.nama) + '</b><div class="muted" style="font-size:12px">/' + esc(p.slug) + '</div></td>' +
        '<td>' + tokoKategoriSel(p.id) + '</td>' +
        '<td class="num">' + varian.length + '</td>' +
        '<td class="num">' + (varian.length ? tokoStokSel(tokoStokTerendah(p.id)) : '<span class="muted">&ndash;</span>') + '</td>' +
        '<td><label class="toko-switch"><input type="checkbox" class="toko-aktif" data-id="' + p.id + '"' +
          (p.aktif ? ' checked' : '') + '> ' + (p.aktif ? 'Tampil' : 'Disembunyikan') + '</label></td>' +
        '<td class="num"><button class="btn-secondary toko-kelola" data-id="' + p.id + '">Kelola</button> ' +
        '<button class="btn-secondary toko-hapus" data-id="' + p.id + '">Hapus</button></td></tr>';
    }).join('') + '</tbody></table></div>';

  el.querySelectorAll('.toko-kelola').forEach(function(b) {
    b.addEventListener('click', function() {
      TOKO_PILIH = TOKO_PILIH === Number(b.dataset.id) ? null : Number(b.dataset.id);
      renderTokoProduk();
      renderTokoKelola();
    });
  });
  el.querySelectorAll('.toko-hapus').forEach(function(b) {
    b.addEventListener('click', function() { hapusTokoProduk(Number(b.dataset.id)); });
  });
  el.querySelectorAll('.toko-aktif').forEach(function(c) {
    c.addEventListener('change', function() { setTokoAktif(Number(c.dataset.id), c.checked); });
  });
}

async function tambahTokoProduk() {
  const status = document.getElementById('toko-add-status');
  const nama = document.getElementById('toko-new-nama').value.trim();

  if (!nama) { tokoStatus(status, false, 'Nama produk wajib diisi.'); return; }

  const slug = tokoSlug(nama);
  if (!slug) { tokoStatus(status, false, 'Nama produk harus memuat huruf atau angka.'); return; }
  if (TOKO_PRODUK.some(function(p) { return p.slug === slug; })) {
    tokoStatus(status, false, 'Sudah ada produk dengan alamat /' + slug + '. Pakai nama yang berbeda.');
    return;
  }

  try {
    const baru = await sbWrite('POST', 'web_produk', '', {
      slug: slug,
      nama: nama,
      ringkas: document.getElementById('toko-new-ringkas').value.trim() || null,
      urutan: TOKO_PRODUK.length,
      aktif: false   // produk baru belum punya varian dan foto -- jangan langsung tampil
    });
    document.getElementById('toko-new-nama').value = '';
    document.getElementById('toko-new-ringkas').value = '';
    tokoStatus(status, true, nama + ' ditambahkan. Isi varian, foto, dan kategorinya, baru tampilkan di toko.');
    TOKO_PILIH = baru[0] ? baru[0].id : null;
    await loadTokoPage();
  } catch (err) {
    tokoStatus(status, false, err.message);
  }
}

function tokoStatus(el, ok, pesan) {
  el.textContent = (ok ? '✅ ' : '❌ ') + pesan;
  el.style.color = ok ? 'var(--green)' : 'var(--red)';
}

async function setTokoAktif(id, aktif) {
  const p = TOKO_PRODUK.find(function(x) { return x.id === id; });

  // Produk tanpa varian tidak punya harga dan tidak bisa dibeli -- kalau
  // ditampilkan, pengunjung menemukan halaman kosong.
  if (aktif && tokoVarianDari(id).length === 0) {
    alert('"' + (p ? p.nama : id) + '" belum punya varian, jadi belum bisa ditampilkan di toko.');
    renderTokoProduk();
    return;
  }

  try {
    await sbWrite('PATCH', 'web_produk', 'id=eq.' + id, { aktif: aktif });
    if (p) p.aktif = aktif;
    renderTokoProduk();
    // Etalase mengambil katalog sekali saja, saat halaman dimuat. Tab toko yang
    // sudah terbuka tidak ikut berubah, dan tanpa kalimat ini sakelarnya
    // terlihat seperti tidak bekerja.
    tokoStatus(document.getElementById('toko-produk-status'), true,
      '"' + (p ? p.nama : 'Produk') + '" sekarang ' + (aktif ? 'tampil' : 'disembunyikan') +
      '. Muat ulang tab toko (F5) untuk melihat perubahannya.');
  } catch (err) {
    alert('Gagal mengubah: ' + err.message);
    renderTokoProduk();
  }
}

async function hapusTokoProduk(id) {
  const p = TOKO_PRODUK.find(function(x) { return x.id === id; });
  const varian = tokoVarianDari(id).length;
  const foto = tokoFotoDari(id).length;
  if (!confirm('Hapus "' + (p ? p.nama : id) + '" beserta ' + varian + ' varian dan ' +
      foto + ' fotonya dari katalog toko?\n\nPesanan lama tidak terpengaruh -- nama dan harganya sudah tersimpan di pesanan.')) return;

  try {
    // File di Storage tidak ikut terhapus oleh cascade database, jadi dihapus
    // lebih dulu -- kalau tidak, bucketnya menumpuk file yang tidak lagi
    // dirujuk siapa pun.
    for (const f of tokoFotoDari(id)) {
      for (const berkas of tokoBerkasFoto(f)) await hapusBerkasFoto(berkas);
    }
    await sbDelete('web_produk', 'id=eq.' + id);
    if (TOKO_PILIH === id) TOKO_PILIH = null;
    await loadTokoPage();
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

// ---------------------------------------------------------------------------
// Kelola satu produk: detail, varian, foto
// ---------------------------------------------------------------------------

function renderTokoKelola() {
  const el = document.getElementById('toko-kelola');
  const p = TOKO_PRODUK.find(function(x) { return x.id === TOKO_PILIH; });

  if (!p) {
    el.innerHTML = '';
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');

  el.innerHTML =
    '<div class="card">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">' +
        '<h3>' + esc(p.nama) + '</h3>' +
        '<button class="btn-secondary" id="toko-tutup">Tutup</button>' +
      '</div>' +
      '<p class="card-note">Alamat di toko: <code>/produk/' + esc(p.slug) + '</code></p>' +
      renderTokoDetailForm(p) +
    '</div>' +
    '<div class="card">' +
      '<h3>Varian</h3>' +
      '<p class="card-note">Satu baris satu ukuran. Gilingan tidak di sini &mdash; SKU, harga dan stoknya sama ' +
        'untuk semua gilingan, jadi pilihannya diatur sekali di <b>Detail</b> di atas. ' +
        '<b>SKU</b> harus sama dengan SKU resep &mdash; bukan untuk stok, tapi supaya HPP dan laba pesanan ' +
        'bisa dihitung waktu masuk ke pembukuan. <b>Berat</b> adalah berat kopinya; <b>berat kirim</b> sudah ' +
        'termasuk kemasan dan dipakai menghitung ongkir. <b>Stok</b> diisi tangan: kosongkan kalau tidak ingin ' +
        'dibatasi, isi 0 kalau habis. <b>Harga coret</b> adalah harga sebelum diskon dan harus lebih ' +
        'tinggi dari harga jual &mdash; kosongkan kalau tidak sedang diskon. Semua kolom disunting ' +
        'langsung di barisnya dan tersimpan begitu kotaknya ditinggalkan.</p>' +
      renderTokoVarianForm(p) +
      '<div id="toko-varian-table" style="margin-top:12px">' + renderTokoVarianTable(p) + '</div>' +
    '</div>' +
    '<div class="card">' +
      '<h3>Foto</h3>' +
      '<p class="card-note">Foto pertama dipakai sebagai gambar utama di katalog. Pakai gambar persegi ' +
        'supaya tidak terpotong.</p>' +
      '<div class="row">' +
        '<div><label>Tambah Foto</label><input type="file" id="toko-foto-file" accept="image/*" multiple></div>' +
      '</div>' +
      '<p id="toko-foto-status" style="margin-top:8px;font-size:13px"></p>' +
      '<div id="toko-foto-list" style="margin-top:12px">' + renderTokoFotoList(p) + '</div>' +
    '</div>';

  wireTokoKelola(p);
}

function renderTokoDetailForm(p) {
  const isi = function(id, label, nilai, lebar) {
    return '<div style="' + (lebar || 'flex:1;min-width:180px') + '"><label>' + label + '</label>' +
      '<input id="' + id + '" value="' + esc(nilai || '') + '"></div>';
  };
  return '<div class="row">' +
      isi('toko-e-nama', 'Nama Produk', p.nama) +
      isi('toko-e-slug', 'Alamat (slug)', p.slug, 'width:200px') +
      '<div style="width:110px"><label>Urutan</label><input id="toko-e-urutan" type="number" value="' + (p.urutan || 0) + '"></div>' +
    '</div>' +
    '<div class="row">' +
      '<div style="flex:1;min-width:260px"><label>Ringkas (satu kalimat di kartu katalog)</label>' +
        '<input id="toko-e-ringkas" value="' + esc(p.ringkas || '') + '"></div>' +
    '</div>' +
    renderTokoKategoriPilih(p) +
    '<div class="row">' +
      '<div style="flex:1;min-width:260px"><label>Pilihan Gilingan (pisahkan dengan koma)</label>' +
        '<input id="toko-e-giling" value="' + esc((p.opsi_giling || []).join(', ')) +
        '" placeholder="Biji, Gilingan Kasar, Gilingan Sedang, Gilingan Halus"></div>' +
    '</div>' +
    '<div class="row">' +
      isi('toko-e-origin', 'Origin', p.origin) +
      isi('toko-e-proses', 'Proses', p.proses) +
      isi('toko-e-roast', 'Profil Roast', p.roast) +
      isi('toko-e-altitude', 'Ketinggian', p.altitude) +
    '</div>' +
    '<div class="row">' +
      isi('toko-e-varietas', 'Varietas', p.varietas) +
      isi('toko-e-rasa', 'Catatan Rasa', p.catatan_rasa) +
    '</div>' +
    '<div class="row">' +
      '<div style="flex:1;min-width:260px"><label>Deskripsi Lengkap</label>' +
        '<textarea id="toko-e-deskripsi" rows="5">' + esc(p.deskripsi || '') + '</textarea></div>' +
    '</div>' +
    '<button class="btn-primary" id="toko-e-simpan">Simpan Detail</button>' +
    '<p id="toko-e-status" style="margin-top:8px;font-size:13px"></p>';
}

// Kategori disimpan begitu kotaknya dicentang, tidak menunggu tombol Simpan
// Detail. Kotak centang yang tampak sudah tercentang tapi belum tersimpan
// adalah kebohongan kecil yang baru ketahuan setelah Terbitkan.
function renderTokoKategoriPilih(p) {
  if (TOKO_KATEGORI.length === 0) {
    return '<div class="row"><p class="muted">Belum ada kategori. Buat dulu di kartu ' +
      '<b>Kategori</b> di atas.</p></div>';
  }
  const punya = tokoKategoriDari(p.id).map(function(k) { return k.id; });
  return '<div class="row"><div style="flex:1"><label>Kategori</label>' +
    '<div class="kat-pilih">' +
      TOKO_KATEGORI.map(function(k) {
        return '<label class="kat-kotak"><input type="checkbox" class="kat-produk" data-kat="' + k.id + '"' +
          (punya.indexOf(k.id) !== -1 ? ' checked' : '') + '> ' + esc(k.nama) +
          (k.aktif ? '' : ' <span class="muted">(disembunyikan)</span>') + '</label>';
      }).join('') +
    '</div>' +
    '<p class="note" style="margin-top:6px">Boleh lebih dari satu. Tersimpan begitu dicentang.</p>' +
    '</div></div>';
}

function renderTokoVarianForm() {
  return '<div class="row">' +
    '<div style="width:130px"><label>SKU</label><input id="toko-v-sku" placeholder="mis. 30200"></div>' +
    '<div style="width:120px"><label>Ukuran</label><input id="toko-v-ukuran" placeholder="mis. 200 g"></div>' +
    '<div style="width:110px"><label>Berat (g)</label><input id="toko-v-berat" type="number"></div>' +
    '<div style="width:130px"><label>Berat Kirim (g)</label><input id="toko-v-beratkirim" type="number"></div>' +
    '<div style="width:130px"><label>Harga (Rp)</label><input id="toko-v-harga" type="number"></div>' +
    '<div style="width:130px"><label>Harga Coret (Rp)</label><input id="toko-v-coret" type="number"></div>' +
    '<div style="width:110px"><label>Stok</label><input id="toko-v-stok" type="number" min="0" placeholder="&infin;"></div>' +
    '<button class="btn-primary" id="toko-v-add" style="margin-top:20px">Tambah Varian</button>' +
  '</div>' +
  '<p id="toko-v-status" style="margin-top:8px;font-size:13px"></p>';
}

// Satu kotak isian untuk satu kolom varian. Semua kolom memakai bentuk yang
// sama supaya penyimpanannya juga satu jalan -- `setTokoVarianKolom` di bawah
// yang mengurus semuanya, dan aturan per kolom tinggal di satu tempat.
function inputVarian(v, kolom, tipe, lebar, tambahan) {
  const isi = v[kolom];
  return '<input class="toko-v-edit" type="' + tipe + '" data-id="' + v.id + '" data-kolom="' + kolom + '" ' +
    'value="' + esc(isi === null || isi === undefined ? '' : (tipe === 'number' ? Number(isi) : isi)) + '" ' +
    'style="width:' + lebar + 'px"' + (tambahan || '') + '>';
}

function renderTokoVarianTable(p) {
  const rows = tokoVarianDari(p.id);
  if (rows.length === 0) return '<p class="muted">Belum ada varian. Produk tanpa varian tidak bisa ditampilkan di toko.</p>';

  // Dulu hanya Stok dan Aktif yang bisa diubah di sini; membetulkan label yang
  // salah ketik atau harga yang berubah berarti menghapus varian lalu
  // menambahkannya lagi -- dan yang ikut hilang adalah stok, urutan, dan
  // hubungan barisnya dengan pesanan yang sudah pernah menyebut id itu.
  // Sekarang tiap kolom adalah kotak isian yang menyimpan dirinya sendiri saat
  // ditinggalkan, sama seperti kolom stok sejak awal.
  return '<div class="table-scroll"><table><thead><tr>' +
    '<th class="num">Urutan</th><th>SKU</th><th>Ukuran</th><th class="num">Berat</th><th class="num">Berat Kirim</th>' +
    '<th class="num">Harga</th><th class="num">Coret</th><th class="num">Stok</th><th>Aktif</th><th class="num">Aksi</th>' +
    '</tr></thead><tbody>' +
    rows.map(function(v) {
      return '<tr><td class="num">' + inputVarian(v, 'urutan', 'number', 64) + '</td>' +
        '<td>' + inputVarian(v, 'sku', 'text', 90, ' title="Penghubung ke HPP dan resep -- harus sama dengan SKU di hpp_master"') + '</td>' +
        '<td>' + inputVarian(v, 'label_ukuran', 'text', 150) +
          (v.label_giling ? ' <span class="muted">&middot; ' + esc(v.label_giling) + '</span>' : '') + '</td>' +
        '<td class="num">' + inputVarian(v, 'berat_g', 'number', 80) + '</td>' +
        '<td class="num">' + inputVarian(v, 'berat_kirim_g', 'number', 90) + '</td>' +
        '<td class="num">' + inputVarian(v, 'harga', 'number', 110) + '</td>' +
        '<td class="num">' + inputVarian(v, 'harga_coret', 'number', 110,
          ' placeholder="&ndash;" title="Harga sebelum diskon, dicoret di toko. Kosongkan kalau tidak sedang diskon."') + '</td>' +
        '<td class="num"><input class="toko-v-stok" type="number" min="0" data-id="' + v.id + '" ' +
          'value="' + (v.stok === null || v.stok === undefined ? '' : v.stok) + '" ' +
          'placeholder="&infin;" title="Kosongkan kalau tidak ingin dibatasi" style="width:80px"></td>' +
        '<td><label class="toko-switch"><input type="checkbox" class="toko-v-aktif" data-id="' + v.id + '"' +
          (v.aktif ? ' checked' : '') + '></label></td>' +
        '<td class="num"><button class="btn-secondary toko-v-del" data-id="' + v.id + '">Hapus</button></td></tr>';
    }).join('') + '</tbody></table></div>';
}

function renderTokoFotoList(p) {
  const rows = tokoFotoDari(p.id);
  if (rows.length === 0) return '<p class="muted">Belum ada foto.</p>';

  return '<div class="toko-foto-grid">' + rows.map(function(f, i) {
    return '<figure class="toko-foto">' +
      '<img src="' + esc(tokoUrlFoto(f, 400)) + '" alt="' + esc(f.alt || '') + '" loading="lazy">' +
      '<figcaption>' + (i === 0 ? '<b>Gambar utama</b>' : 'Foto ' + (i + 1)) + '</figcaption>' +
      '<button class="btn-secondary toko-f-del" data-id="' + f.id + '">Hapus</button>' +
    '</figure>';
  }).join('') + '</div>';
}

function wireTokoKelola(p) {
  document.getElementById('toko-tutup').addEventListener('click', function() {
    TOKO_PILIH = null;
    renderTokoProduk();
    renderTokoKelola();
  });

  document.getElementById('toko-e-simpan').addEventListener('click', function() { simpanTokoDetail(p.id); });

  document.querySelectorAll('.kat-produk').forEach(function(box) {
    box.addEventListener('change', function() {
      setKategoriProduk(p.id, Number(this.dataset.kat), this.checked);
    });
  });
  document.getElementById('toko-v-add').addEventListener('click', function() { tambahTokoVarian(p.id); });
  document.getElementById('toko-foto-file').addEventListener('change', function() { unggahTokoFoto(p.id, this); });

  // Berat kirim biasanya berat kopi ditambah kemasan, jadi diisikan dulu
  // sebagai perkiraan supaya tidak perlu diketik dua kali. Tetap bisa diubah.
  const berat = document.getElementById('toko-v-berat');
  const beratKirim = document.getElementById('toko-v-beratkirim');
  berat.addEventListener('input', function() {
    if (!beratKirim.dataset.diubah && berat.value) beratKirim.value = Number(berat.value) + 40;
  });
  beratKirim.addEventListener('input', function() { beratKirim.dataset.diubah = '1'; });

  wireTokoVarianTable();
  wireTokoFotoList();
}

function wireTokoVarianTable() {
  const el = document.getElementById('toko-varian-table');
  el.querySelectorAll('.toko-v-del').forEach(function(b) {
    b.addEventListener('click', function() { hapusTokoVarian(Number(b.dataset.id)); });
  });
  el.querySelectorAll('.toko-v-aktif').forEach(function(c) {
    c.addEventListener('change', function() { setTokoVarianAktif(Number(c.dataset.id), c.checked); });
  });
  // Disimpan saat kolomnya ditinggalkan, bukan tiap ketikan: mengetik "12"
  // melewati "1" dulu, dan menyimpan angka antara itu sempat membuat varian
  // terlihat hampir habis.
  el.querySelectorAll('.toko-v-stok').forEach(function(i) {
    i.addEventListener('change', function() { setTokoVarianStok(Number(i.dataset.id), i.value); });
  });
  el.querySelectorAll('.toko-v-edit').forEach(function(i) {
    i.addEventListener('change', function() {
      setTokoVarianKolom(Number(i.dataset.id), i.dataset.kolom, i.value);
    });
  });
}

function wireTokoFotoList() {
  document.getElementById('toko-foto-list').querySelectorAll('.toko-f-del').forEach(function(b) {
    b.addEventListener('click', function() { hapusTokoFoto(Number(b.dataset.id)); });
  });
}

async function simpanTokoDetail(id) {
  const status = document.getElementById('toko-e-status');
  const nilai = function(sufiks) { return document.getElementById('toko-e-' + sufiks).value.trim(); };

  const nama = nilai('nama');
  const slug = tokoSlug(nilai('slug'));

  if (!nama) { tokoStatus(status, false, 'Nama produk wajib diisi.'); return; }
  if (!slug) { tokoStatus(status, false, 'Alamat (slug) wajib diisi.'); return; }
  if (TOKO_PRODUK.some(function(p) { return p.slug === slug && p.id !== id; })) {
    tokoStatus(status, false, 'Alamat /' + slug + ' sudah dipakai produk lain.');
    return;
  }

  try {
    await sbWrite('PATCH', 'web_produk', 'id=eq.' + id, {
      nama: nama,
      slug: slug,
      urutan: Number(document.getElementById('toko-e-urutan').value) || 0,
      ringkas: nilai('ringkas') || null,
      origin: nilai('origin') || null,
      proses: nilai('proses') || null,
      roast: nilai('roast') || null,
      altitude: nilai('altitude') || null,
      varietas: nilai('varietas') || null,
      catatan_rasa: nilai('rasa') || null,
      opsi_giling: tokoDaftarGiling(nilai('giling')),
      deskripsi: document.getElementById('toko-e-deskripsi').value.trim() || null
    });
    tokoStatus(status, true, 'Detail disimpan.');
    await loadTokoPage();
  } catch (err) {
    tokoStatus(status, false, err.message);
  }
}

async function tambahTokoVarian(produkId) {
  const status = document.getElementById('toko-v-status');
  const nilai = function(sufiks) { return document.getElementById('toko-v-' + sufiks).value.trim(); };
  const angka = function(sufiks) {
    const v = nilai(sufiks);
    return v === '' ? null : Number(v);
  };

  const sku = nilai('sku');
  const ukuran = nilai('ukuran');
  const berat = angka('berat');
  const beratKirim = angka('beratkirim');
  const harga = angka('harga');

  if (!sku) { tokoStatus(status, false, 'SKU wajib diisi -- tanpa itu HPP dan stoknya tidak bisa dihitung.'); return; }
  if (!ukuran) { tokoStatus(status, false, 'Ukuran wajib diisi.'); return; }
  if (!berat || berat <= 0) { tokoStatus(status, false, 'Berat harus lebih dari 0.'); return; }
  if (!beratKirim || beratKirim <= 0) { tokoStatus(status, false, 'Berat kirim harus lebih dari 0.'); return; }
  if (!harga || harga <= 0) { tokoStatus(status, false, 'Harga harus lebih dari 0.'); return; }

  try {
    await sbWrite('POST', 'web_varian', '', {
      produk_id: produkId,
      sku: sku,
      label_ukuran: ukuran,
      berat_g: berat,
      berat_kirim_g: beratKirim,
      harga: harga,
      harga_coret: angka('coret'),
      stok: angka('stok'),
      urutan: tokoVarianDari(produkId).length
    });
    ['sku', 'ukuran', 'berat', 'beratkirim', 'harga', 'coret', 'stok'].forEach(function(s) {
      document.getElementById('toko-v-' + s).value = '';
    });
    document.getElementById('toko-v-beratkirim').dataset.diubah = '';
    tokoStatus(status, true, 'Varian ditambahkan.');
    await loadTokoPage();
  } catch (err) {
    // Index unik menolak kombinasi ukuran + gilingan yang sudah ada; pesan
    // aslinya menyebut nama index, yang tidak berarti apa-apa di sini.
    const pesan = /idx_web_varian_unik/.test(err.message)
      ? 'Kombinasi ukuran dan gilingan itu sudah ada di produk ini.'
      : err.message;
    tokoStatus(status, false, pesan);
  }
}

async function setTokoVarianAktif(id, aktif) {
  try {
    await sbWrite('PATCH', 'web_varian', 'id=eq.' + id, { aktif: aktif });
    const v = TOKO_VARIAN.find(function(x) { return x.id === id; });
    if (v) v.aktif = aktif;
  } catch (err) {
    alert('Gagal mengubah: ' + err.message);
    await loadTokoPage();
  }
}

// Kosong disimpan sebagai null, bukan 0. Keduanya berarti hal yang berlawanan:
// null "jangan dibatasi", 0 "habis, jangan bisa dipesan".
async function setTokoVarianStok(id, teks) {
  const bersih = String(teks).trim();
  const nilai = bersih === '' ? null : Math.max(0, Math.floor(Number(bersih)));
  if (bersih !== '' && !Number.isFinite(nilai)) { alert('Stok harus berupa angka.'); await loadTokoPage(); return; }

  try {
    await sbWrite('PATCH', 'web_varian', 'id=eq.' + id, { stok: nilai });
    const v = TOKO_VARIAN.find(function(x) { return x.id === id; });
    if (v) v.stok = nilai;
    // Kolom "Stok Terendah" di daftar produk ikut berubah, jadi digambar ulang.
    renderTokoProduk();
  } catch (err) {
    alert('Gagal menyimpan stok: ' + err.message);
    await loadTokoPage();
  }
}

// Aturan tiap kolom varian, di satu tempat.
//
// Yang dijaga bukan bentuk datanya -- database sudah menolak yang salah tipe --
// melainkan nilai yang sah menurut database tapi salah menurut toko: harga nol,
// berat nol, SKU kosong yang memutus hubungan ke HPP, dan `harga_coret` di
// bawah `harga`, yang membuat toko menampilkan harga asli dicoret oleh angka
// yang lebih kecil lengkap dengan tanda "Diskon" -- terbaca seperti harga naik.
// Itu persis yang terjadi pada tiga varian premium 21 Agustus 2026, waktu yang
// terisi di sana adalah harga offline.
const KOLOM_VARIAN = {
  urutan:       { angka: true, kosong: false, min: 0,  nama: 'Urutan' },
  sku:          { angka: false, kosong: false,          nama: 'SKU' },
  label_ukuran: { angka: false, kosong: false,          nama: 'Ukuran' },
  berat_g:      { angka: true, kosong: false, lebihDari: 0, nama: 'Berat' },
  berat_kirim_g:{ angka: true, kosong: false, lebihDari: 0, nama: 'Berat kirim' },
  harga:        { angka: true, kosong: false, lebihDari: 0, nama: 'Harga' },
  harga_coret:  { angka: true, kosong: true,  lebihDari: 0, nama: 'Harga coret' }
};

async function setTokoVarianKolom(id, kolom, teks) {
  const aturan = KOLOM_VARIAN[kolom];
  if (!aturan) return;

  const v = TOKO_VARIAN.find(function(x) { return x.id === id; });
  const bersih = String(teks).trim();

  const gagal = function(pesan) { alert(pesan); loadTokoPage(); };

  if (bersih === '' && !aturan.kosong) return gagal(aturan.nama + ' tidak boleh kosong.');

  let nilai;
  if (bersih === '') {
    nilai = null;
  } else if (aturan.angka) {
    nilai = Number(bersih);
    if (!Number.isFinite(nilai)) return gagal(aturan.nama + ' harus berupa angka.');
    if (aturan.lebihDari !== undefined && nilai <= aturan.lebihDari) {
      return gagal(aturan.nama + ' harus lebih dari ' + aturan.lebihDari + '.');
    }
    if (aturan.min !== undefined && nilai < aturan.min) {
      return gagal(aturan.nama + ' tidak boleh kurang dari ' + aturan.min + '.');
    }
    if (kolom === 'urutan') nilai = Math.floor(nilai);
  } else {
    nilai = bersih;
  }

  // Harga coret adalah harga sebelum diskon, jadi harus di atas harga yang
  // dibayar. Diperiksa dari dua arah karena keduanya bisa yang baru diketik.
  if (v) {
    const harga = kolom === 'harga' ? nilai : Number(v.harga);
    const coret = kolom === 'harga_coret' ? nilai : (v.harga_coret === null ? null : Number(v.harga_coret));
    if (coret !== null && coret !== undefined && harga !== null && coret <= harga) {
      return gagal('Harga coret harus lebih tinggi dari harga jual -- itu harga sebelum diskon. ' +
                   'Kosongkan kalau varian ini tidak sedang diskon.');
    }
  }

  if (v && String(v[kolom] === null || v[kolom] === undefined ? '' : v[kolom]) === String(nilai === null ? '' : nilai)) return;

  const isi = {};
  isi[kolom] = nilai;

  try {
    await sbWrite('PATCH', 'web_varian', 'id=eq.' + id, isi);
    if (v) v[kolom] = nilai;
    // Urutan mengubah susunan barisnya sendiri, jadi tabelnya digambar ulang.
    // Kolom lain tidak, dan menggambar ulang di tengah pengisian akan merebut
    // kursor dari kotak berikutnya yang sedang dituju.
    if (kolom === 'urutan') await loadTokoPage();
    else renderTokoProduk();
  } catch (err) {
    const pesan = /idx_web_varian_unik/.test(err.message)
      ? 'Kombinasi ukuran dan gilingan itu sudah dipakai varian lain di produk ini.'
      : err.message;
    gagal('Gagal menyimpan ' + aturan.nama.toLowerCase() + ': ' + pesan);
  }
}

async function hapusTokoVarian(id) {
  const v = TOKO_VARIAN.find(function(x) { return x.id === id; });
  if (!confirm('Hapus varian ' + (v ? v.label_ukuran : id) + '?')) return;
  try {
    await sbDelete('web_varian', 'id=eq.' + id);
    await loadTokoPage();
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

// ---------------------------------------------------------------------------
// Foto
//
// Disimpan di bucket Storage `produk`, bukan sebagai data URI di kolom seperti
// logo invoice: foto katalog jumlahnya banyak dan besar, dan menaruhnya di baris
// tabel membuat setiap pembacaan katalog ikut menyeret seluruh gambarnya.
// ---------------------------------------------------------------------------

async function unggahBerkasFoto(path, file) {
  const res = await fetch(SUPABASE_URL + '/storage/v1/object/' + TOKO_BUCKET + '/' + path, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': file.type || 'application/octet-stream' }),
    body: file
  });
  if (!res.ok) throw await sbError(res, 'unggah foto gagal');
}

async function hapusBerkasFoto(path) {
  const res = await fetch(SUPABASE_URL + '/storage/v1/object/' + TOKO_BUCKET + '/' + path, {
    method: 'DELETE', headers: sbHeaders()
  });
  // 404 berarti filenya memang sudah tidak ada -- barisnya tetap boleh dihapus.
  if (!res.ok && res.status !== 404) throw await sbError(res, 'hapus foto gagal');
}

// Tiga ukuran cukup: kartu katalog, halaman produk, dan layar rapat. Lebih
// banyak berarti lebih banyak unggahan tanpa ada yang benar-benar melihat
// bedanya.
const LEBAR_FOTO = [400, 800, 1600];

// Diubah ukurannya di browser sebelum diunggah, bukan di server dan bukan lewat
// layanan pengubah gambar. Foto dari HP bisa 4000 piksel dan beberapa megabyte;
// mengunggahnya utuh lalu mengecilkannya saat disajikan berarti membayar
// ongkosnya dua kali. Foto yang aslinya lebih kecil dari ukuran target tidak
// diperbesar -- itu hanya menambah berkas tanpa menambah detail.
async function ubahUkuranFoto(file, lebar) {
  const bitmap = await createImageBitmap(file);
  const skala = Math.min(1, lebar / bitmap.width);
  const w = Math.round(bitmap.width * skala);
  const h = Math.round(bitmap.height * skala);

  const kanvas = document.createElement('canvas');
  kanvas.width = w;
  kanvas.height = h;
  const konteks = kanvas.getContext('2d');
  konteks.imageSmoothingQuality = 'high';
  konteks.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise(function (selesai) {
    kanvas.toBlob(selesai, 'image/webp', 0.82);
  });
  if (!blob) throw new Error('Browser ini tidak bisa membuat WebP.');
  return { blob: blob, lebar: w };
}

async function unggahTokoFoto(produkId, input) {
  const status = document.getElementById('toko-foto-status');
  const files = Array.from(input.files || []);
  if (files.length === 0) return;

  // Batasnya 25 MB, bukan 5 MB seperti dulu: yang diunggah bukan lagi berkas
  // aslinya, melainkan hasil kecilnya, jadi foto besar dari kamera HP tidak
  // perlu ditolak.
  const terlaluBesar = files.filter(function(f) { return f.size > 25 * 1024 * 1024; });
  if (terlaluBesar.length) {
    tokoStatus(status, false, 'Foto di atas 25 MB tidak diunggah: ' +
      terlaluBesar.map(function(f) { return f.name; }).join(', '));
    input.value = '';
    return;
  }

  let urutan = tokoFotoDari(produkId).length;
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      status.style.color = '';
      status.textContent = 'Memproses foto ' + (i + 1) + ' dari ' + files.length + '...';

      // Nama dibuat sendiri: nama asli dari HP sering memuat spasi dan karakter
      // yang tidak aman di URL, dan dua foto bisa bernama sama. Nama dasar ini
      // tanpa ukuran dan tanpa ekstensi -- ketiga berkasnya menempel di
      // belakangnya.
      const dasar = produkId + '/' + Date.now() + '-' + urutan;
      const lebarJadi = [];

      for (const target of LEBAR_FOTO) {
        const hasil = await ubahUkuranFoto(file, target);
        // Foto yang aslinya lebih kecil menghasilkan lebar yang sama untuk dua
        // target; yang kedua tidak perlu diunggah lagi.
        if (lebarJadi.indexOf(hasil.lebar) !== -1) continue;
        await unggahBerkasFoto(dasar + '-' + hasil.lebar + '.webp', hasil.blob);
        lebarJadi.push(hasil.lebar);
      }

      await sbWrite('POST', 'web_foto', '', {
        produk_id: produkId,
        path: dasar,
        urutan: urutan,
        lebar_tersedia: lebarJadi
      });
      urutan++;
    }
    tokoStatus(status, true, files.length + ' foto diunggah.');
    input.value = '';
    await loadTokoPage();
  } catch (err) {
    tokoStatus(status, false, err.message);
    input.value = '';
    await loadTokoPage();
  }
}

async function hapusTokoFoto(id) {
  const f = TOKO_FOTO.find(function(x) { return x.id === id; });
  if (!f || !confirm('Hapus foto ini?')) return;
  try {
    // Satu baris foto bisa punya tiga berkas; menghapus barisnya saja
    // meninggalkan berkas yang tidak dirujuk siapa pun di bucket.
    for (const berkas of tokoBerkasFoto(f)) await hapusBerkasFoto(berkas);
    await sbDelete('web_foto', 'id=eq.' + id);
    await loadTokoPage();
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

// ---------------------------------------------------------------------------
// Terbitkan
// ---------------------------------------------------------------------------

// Etalase toko bukan halaman yang merakit dirinya di browser: `build.js`
// menariknya dari Supabase saat deploy lalu menulis satu berkas HTML per
// produk, supaya perayap WhatsApp dan Instagram -- yang tidak menjalankan
// JavaScript -- tetap melihat judul, foto dan harganya. Konsekuensinya, katalog
// yang disunting di sini tidak ikut berubah sampai buildnya dijalankan lagi.
//
// Yang memicu build adalah Deploy Hook Cloudflare, dan URL-nya tidak ada di
// halaman ini dengan sengaja: hook itu tidak menanyakan siapa pemanggilnya,
// jadi menempelkannya di sini sama saja dengan menyerahkannya ke setiap
// pengunjung. Fungsi `bangun-ulang` di Supabase yang memegangnya, dan fungsi
// itu memeriksa dulu apakah email pemanggil ada di `app_users`.
// Kabarnya tampil sebagai pil di sebelah tombolnya, dan judul lengkapnya
// disimpan di `title`: pilnya dipotong kalau kalimatnya panjang, dan pesan
// galat yang terpotong tanpa cara membacanya utuh sama saja dengan tidak ada.
function terbitStatus(el, jenis, pesan) {
  el.textContent = pesan;
  el.title = pesan;
  el.className = 'terbit-status' + (jenis ? ' ' + jenis : '');
}

// "Kenapa perubahan saya tidak muncul di website?" -- pertanyaan yang muncul
// karena halaman kelola tidak pernah mengatakan bahwa ia dan website adalah dua
// hal yang terpisah oleh satu build. Sekarang ia mengatakannya, dan mengatakannya
// tepat waktu: begitu ada yang tersimpan, bukan lewat catatan yang dibaca sekali
// waktu halaman pertama kali dibuka lalu dilupakan.
//
// Dipanggil dari `lib.js` tiap penulisan berhasil, apa pun tabelnya.
function tandaiPerubahan() {
  const btn = document.getElementById('toko-bangun-btn');
  const status = document.getElementById('toko-bangun-status');
  if (!btn || !status) return;

  btn.classList.add('perlu');
  // Kalau build sedang berjalan, kabar itu yang lebih berguna daripada
  // pengingat ini -- tombolnya toh sedang tidak bisa ditekan.
  if (!btn.disabled) terbitStatus(status, 'perlu', 'Ada perubahan yang belum diterbitkan.');
}

async function bangunUlangToko() {
  const btn = document.getElementById('toko-bangun-btn');
  const status = document.getElementById('toko-bangun-status');

  btn.disabled = true;
  terbitStatus(status, '', 'Meminta build...');

  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/bangun-ulang', {
      method: 'POST',
      headers: sbHeaders()
    });
    const data = await res.json().catch(function() { return {}; });
    if (!res.ok) throw new Error(data.pesan || 'Gagal memicu build: ' + res.status);
    btn.classList.remove('perlu');
    terbitStatus(status, 'ok', data.pesan || 'Build dimulai.');
  } catch (err) {
    terbitStatus(status, 'err', err.message);
  } finally {
    // Tombolnya dinyalakan lagi setelah jeda yang sama dengan jeda di fungsinya,
    // supaya orang tidak menekan berkali-kali menunggu halaman berubah -- satu
    // build memakan satu jatah kuota bulanan Cloudflare.
    setTimeout(function() { btn.disabled = false; }, 60000);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('toko-add-btn').addEventListener('click', tambahTokoProduk);
  document.getElementById('toko-kat-add').addEventListener('click', tambahTokoKategori);
  document.getElementById('toko-bangun-btn').addEventListener('click', bangunUlangToko);
});
