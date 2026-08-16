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

function tokoUrlFoto(path) {
  return SUPABASE_URL + '/storage/v1/object/public/' + TOKO_BUCKET + '/' + path;
}

// ---------------------------------------------------------------------------
// Muat
// ---------------------------------------------------------------------------

async function loadTokoPage() {
  const el = document.getElementById('toko-produk-table');
  el.innerHTML = '<p class="muted">Memuat...</p>';
  try {
    const [produk, varian, foto] = await Promise.all([
      sbSelect('web_produk', 'select=*&order=urutan,nama'),
      sbSelect('web_varian', 'select=*&order=produk_id,urutan,label_ukuran'),
      sbSelect('web_foto', 'select=*&order=produk_id,urutan')
    ]);
    TOKO_PRODUK = produk;
    TOKO_VARIAN = varian;
    TOKO_FOTO = foto;
    renderTokoProduk();
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
// Daftar produk
// ---------------------------------------------------------------------------

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
        '<td>' + esc(p.kategori) + '</td>' +
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
  const kategori = document.getElementById('toko-new-kategori').value.trim();

  if (!nama) { tokoStatus(status, false, 'Nama produk wajib diisi.'); return; }
  if (!kategori) { tokoStatus(status, false, 'Kategori wajib diisi -- dipakai untuk filter di toko.'); return; }

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
      kategori: kategori,
      ringkas: document.getElementById('toko-new-ringkas').value.trim() || null,
      urutan: TOKO_PRODUK.length,
      aktif: false   // produk baru belum punya varian dan foto -- jangan langsung tampil
    });
    document.getElementById('toko-new-nama').value = '';
    document.getElementById('toko-new-ringkas').value = '';
    tokoStatus(status, true, '"' + nama + '" ditambahkan. Isi varian dan fotonya, baru tampilkan di toko.');
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
    for (const f of tokoFotoDari(id)) await hapusBerkasFoto(f.path);
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
        'dibatasi, isi 0 kalau habis.</p>' +
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
      isi('toko-e-kategori', 'Kategori', p.kategori, 'width:160px') +
      '<div style="width:110px"><label>Urutan</label><input id="toko-e-urutan" type="number" value="' + (p.urutan || 0) + '"></div>' +
    '</div>' +
    '<div class="row">' +
      '<div style="flex:1;min-width:260px"><label>Ringkas (satu kalimat di kartu katalog)</label>' +
        '<input id="toko-e-ringkas" value="' + esc(p.ringkas || '') + '"></div>' +
    '</div>' +
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

function renderTokoVarianTable(p) {
  const rows = tokoVarianDari(p.id);
  if (rows.length === 0) return '<p class="muted">Belum ada varian. Produk tanpa varian tidak bisa ditampilkan di toko.</p>';

  return '<div class="table-scroll"><table><thead><tr>' +
    '<th>SKU</th><th>Ukuran</th><th class="num">Berat</th><th class="num">Berat Kirim</th>' +
    '<th class="num">Harga</th><th class="num">Coret</th><th class="num">Stok</th><th>Aktif</th><th class="num">Aksi</th>' +
    '</tr></thead><tbody>' +
    rows.map(function(v) {
      return '<tr><td><code>' + esc(v.sku) + '</code></td>' +
        '<td>' + esc(v.label_ukuran) + (v.label_giling ? ' &middot; ' + esc(v.label_giling) : '') + '</td>' +
        '<td class="num">' + Number(v.berat_g) + ' g</td>' +
        '<td class="num">' + Number(v.berat_kirim_g) + ' g</td>' +
        '<td class="num">' + fmtRp(v.harga) + '</td>' +
        '<td class="num">' + (v.harga_coret ? fmtRp(v.harga_coret) : '<span class="muted">&ndash;</span>') + '</td>' +
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
      '<img src="' + esc(tokoUrlFoto(f.path)) + '" alt="' + esc(f.alt || '') + '" loading="lazy">' +
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
  const kategori = nilai('kategori');

  if (!nama) { tokoStatus(status, false, 'Nama produk wajib diisi.'); return; }
  if (!slug) { tokoStatus(status, false, 'Alamat (slug) wajib diisi.'); return; }
  if (!kategori) { tokoStatus(status, false, 'Kategori wajib diisi.'); return; }
  if (TOKO_PRODUK.some(function(p) { return p.slug === slug && p.id !== id; })) {
    tokoStatus(status, false, 'Alamat /' + slug + ' sudah dipakai produk lain.');
    return;
  }

  try {
    await sbWrite('PATCH', 'web_produk', 'id=eq.' + id, {
      nama: nama,
      slug: slug,
      kategori: kategori,
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

async function unggahTokoFoto(produkId, input) {
  const status = document.getElementById('toko-foto-status');
  const files = Array.from(input.files || []);
  if (files.length === 0) return;

  const terlaluBesar = files.filter(function(f) { return f.size > 5 * 1024 * 1024; });
  if (terlaluBesar.length) {
    tokoStatus(status, false, 'Foto di atas 5 MB tidak diunggah: ' +
      terlaluBesar.map(function(f) { return f.name; }).join(', '));
    input.value = '';
    return;
  }

  status.textContent = 'Mengunggah ' + files.length + ' foto...';
  status.style.color = '';

  let urutan = tokoFotoDari(produkId).length;
  try {
    for (const file of files) {
      // Nama file dibuat sendiri: nama asli dari HP sering memuat spasi dan
      // karakter yang tidak aman di URL, dan dua foto bisa bernama sama.
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = produkId + '/' + Date.now() + '-' + urutan + '.' + ext;
      await unggahBerkasFoto(path, file);
      await sbWrite('POST', 'web_foto', '', { produk_id: produkId, path: path, urutan: urutan });
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
    await hapusBerkasFoto(f.path);
    await sbDelete('web_foto', 'id=eq.' + id);
    await loadTokoPage();
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('toko-add-btn').addEventListener('click', tambahTokoProduk);
});
