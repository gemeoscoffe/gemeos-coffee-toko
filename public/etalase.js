/**
 * Etalase -- beranda, katalog dan halaman produk.
 *
 * Dibaca anonim. Tidak ada login di sini, dan kebijakan RLS yang memutuskan apa
 * yang terlihat: hanya baris `aktif` di `web_produk`, `web_varian` dan
 * `web_foto`. Produk yang disembunyikan lewat /admin tidak sampai ke browser
 * sama sekali, bukan disaring belakangan.
 *
 * Belum ada keranjang. Sampai checkout dan pembayaran jadi (T4-T5), tombol
 * belinya mengarah ke toko marketplace -- katalog yang bisa dilihat lebih
 * berguna daripada halaman "segera hadir", dan alamatnya sudah bisa dibagikan.
 *
 * Perutean lewat hash, bukan path, supaya hosting statis tidak perlu aturan
 * rewrite: satu index.html melayani semua halaman.
 */

const TOKO_MARKETPLACE = 'https://tk.tokopedia.com/ZSVF3GmUp/';

let PRODUK = [], VARIAN = [], FOTO = [];
let MUAT_GAGAL = null;

// Warna biji untuk produk yang belum punya foto. Diambil dari nama supaya satu
// produk selalu mendapat warna yang sama, dan dua produk bersebelahan jarang
// kembar -- bukan acak, yang akan berubah tiap kali halaman dibuka.
const WARNA_BIJI = ['#8C5A2B', '#A8703A', '#5E3A22', '#7A4E2E', '#4A2E1C', '#6B462C', '#93683F', '#B0873F'];

function warnaBiji(teks) {
  let n = 0;
  for (let i = 0; i < teks.length; i++) n = (n + teks.charCodeAt(i)) % WARNA_BIJI.length;
  return WARNA_BIJI[n];
}

function urlFoto(path) {
  return SUPABASE_URL + '/storage/v1/object/public/produk/' + path;
}

function varianDari(produkId) {
  return VARIAN.filter(function(v) { return v.produk_id === produkId; });
}

function fotoDari(produkId) {
  return FOTO.filter(function(f) { return f.produk_id === produkId; });
}

function produkDariSlug(slug) {
  return PRODUK.find(function(p) { return p.slug === slug; }) || null;
}

// Stok null berarti tidak dibatasi -- selalu bisa dipesan. Hanya angka 0 atau
// kurang yang berarti habis.
function varianHabis(v) {
  return v.stok !== null && v.stok !== undefined && v.stok <= 0;
}

function produkHabis(p) {
  const v = varianDari(p.id);
  return v.length > 0 && v.every(varianHabis);
}

function hargaTerendah(p) {
  return varianDari(p.id).reduce(function (m, v) { return Math.min(m, Number(v.harga)); }, Infinity);
}

function gambarUtama(p, kelasBiji) {
  const foto = fotoDari(p.id)[0];
  if (foto) return '<img src="' + esc(urlFoto(foto.path)) + '" alt="' + esc(foto.alt || p.nama) + '" loading="lazy">';
  return '<div class="' + (kelasBiji || 'biji') + '" style="--tone:' + warnaBiji(p.nama) + '"></div>';
}

// ---------------------------------------------------------------------------
// Muat
// ---------------------------------------------------------------------------

async function muatKatalog() {
  try {
    const [produk, varian, foto] = await Promise.all([
      sbSelect('web_produk', 'select=*&order=urutan,nama'),
      sbSelect('web_varian', 'select=*&order=produk_id,urutan,label_ukuran'),
      sbSelect('web_foto', 'select=*&order=produk_id,urutan')
    ]);
    PRODUK = produk;
    VARIAN = varian;
    FOTO = foto;
    MUAT_GAGAL = null;
  } catch (err) {
    MUAT_GAGAL = err.message;
  }
}

// ---------------------------------------------------------------------------
// Bagian yang dipakai berulang
// ---------------------------------------------------------------------------

function kartuHTML(p) {
  const varian = varianDari(p.id);
  const min = hargaTerendah(p);
  const diskon = varian.some(function(v) { return v.harga_coret; });
  const habis = produkHabis(p);

  return '' +
    '<a class="kartu" href="#/produk/' + esc(p.slug) + '">' +
      '<div class="foto">' +
        (habis ? '<span class="tanda habis">Habis</span>'
               : diskon ? '<span class="tanda sale">Diskon</span>' : '') +
        gambarUtama(p) +
      '</div>' +
      '<div class="isi">' +
        '<h3>' + esc(p.nama) + '</h3>' +
        // Baris di bawah nama memakai apa pun yang sudah diisi: origin dulu,
        // karena itu yang membedakan satu kopi dari yang lain. Produk yang
        // keterangannya masih kosong tidak menyisakan baris kosong.
        (function() {
          const asal = [p.origin, p.proses, p.roast].filter(Boolean).join(' · ');
          return asal ? '<p class="asal">' + esc(asal) + '</p>' : '';
        })() +
        (varian.length
          ? '<div class="ukuran">' + varian.map(function(v) {
              return '<b>' + esc(v.label_ukuran) + '</b>';
            }).join('') + '</div>'
          : '') +
        '<div class="harga"><b>' + fmtRp(min) + '</b><span class="plat">mulai dari</span></div>' +
        '<span class="lanjut">Lihat produk &rarr;</span>' +
      '</div>' +
    '</a>';
}

function kategoriDaftar() {
  const keluar = [];
  PRODUK.forEach(function(p) {
    if (p.kategori && keluar.indexOf(p.kategori) === -1) keluar.push(p.kategori);
  });
  return keluar;
}

// ---------------------------------------------------------------------------
// Beranda + katalog
// ---------------------------------------------------------------------------

function halamanBeranda(param) {
  if (MUAT_GAGAL) {
    return '<div class="wrap"><div class="kosong">' +
      '<h1>Katalog belum bisa dimuat</h1>' +
      '<p>Coba muat ulang halaman ini. Sementara itu kopinya tetap bisa dibeli lewat toko resmi kami.</p>' +
      '<a class="tombol" href="' + TOKO_MARKETPLACE + '" target="_blank" rel="noopener">Belanja di TikTok Shop</a>' +
      '</div></div>';
  }

  if (PRODUK.length === 0) {
    return '<div class="wrap"><div class="kosong">' +
      '<span class="plat">Katalog</span>' +
      '<h1>Etalasenya sedang disiapkan</h1>' +
      '<p>Belum ada produk yang ditampilkan di sini. Kopinya tetap bisa dibeli lewat toko resmi kami.</p>' +
      '<a class="tombol" href="' + TOKO_MARKETPLACE + '" target="_blank" rel="noopener">Belanja di TikTok Shop</a>' +
      '</div></div>';
  }

  const aktif = param.k || 'semua';
  const daftar = PRODUK.filter(function(p) { return aktif === 'semua' || p.kategori === aktif; });

  const chip = [{ id: 'semua', nama: 'Semua' }]
    .concat(kategoriDaftar().map(function(k) { return { id: k, nama: k }; }))
    .map(function(k) {
      return '<button type="button" data-kategori="' + esc(k.id) + '" aria-pressed="' +
        (k.id === aktif) + '">' + esc(k.nama) + '</button>';
    }).join('');

  const sorot = PRODUK[0];

  return '' +
    '<div class="hero">' +
      '<div class="wrap">' +
        '<div class="hero-teks">' +
          '<span class="plat">Roastery &middot; Gunung Puntang, Jawa Barat</span>' +
          '<h1>Kopi yang baru disangrai, bukan yang lama menunggu</h1>' +
          '<p>Arabika dan Robusta dari petani Jawa Barat, digiling sesuai alat seduhmu, dikirim dari roastery kami.</p>' +
          '<div class="aksi">' +
            '<a class="tombol amber" href="#katalog">Lihat katalog</a>' +
            '<a class="tombol garis" href="' + TOKO_MARKETPLACE + '" target="_blank" rel="noopener">Toko TikTok Shop</a>' +
          '</div>' +
        '</div>' +
        '<div class="hero-gambar">' + gambarUtama(sorot) + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="pita">' +
      '<div class="wrap">' +
        '<article><h3>Sangrai per pesanan</h3><p>Bukan stok lama yang menunggu di rak.</p></article>' +
        '<article><h3>Pilih gilingan</h3><p>Biji utuh sampai halus espresso.</p></article>' +
        '<article><h3>Kirim seluruh Indonesia</h3><p>Lewat ekspedisi pilihanmu.</p></article>' +
      '</div>' +
    '</div>' +
    '<div class="wrap">' +
      '<section id="katalog">' +
        '<div class="kepala-bagian"><div><span class="plat">Katalog</span><h2>Semua kopi yang kami sangrai</h2></div></div>' +
        '<div class="saring" id="saring">' + chip + '</div>' +
        '<div class="hitung plat">' + daftar.length + ' produk</div>' +
        '<div class="grid">' +
          (daftar.length ? daftar.map(kartuHTML).join('')
                         : '<p class="plat">Belum ada produk di kategori ini.</p>') +
        '</div>' +
      '</section>' +
    '</div>';
}

// ---------------------------------------------------------------------------
// Halaman produk
// ---------------------------------------------------------------------------

function halamanProduk(slug) {
  const p = produkDariSlug(slug);
  if (!p) {
    return '<div class="wrap"><div class="kosong">' +
      '<h1>Produk tidak ditemukan</h1>' +
      '<p>Mungkin produknya sedang tidak dijual. Lihat yang lain di katalog.</p>' +
      '<a class="tombol" href="#/">Kembali ke katalog</a>' +
      '</div></div>';
  }

  const varian = varianDari(p.id);
  const foto = fotoDari(p.id);
  const habis = produkHabis(p);

  const kecil = foto.length > 1
    ? '<div class="galeri-kecil" id="galeri-kecil">' + foto.map(function(f, i) {
        return '<button type="button" data-foto="' + i + '" aria-pressed="' + (i === 0) + '" ' +
          'aria-label="Foto ' + (i + 1) + '"><img src="' + esc(urlFoto(f.path)) +
          '" alt="" loading="lazy"></button>';
      }).join('') + '</div>'
    : '';

  const opsiUkuran = varian.map(function(v, i) {
    return '<button type="button" data-varian="' + v.id + '" aria-pressed="' + (i === 0) + '"' +
      (varianHabis(v) ? ' disabled' : '') + '>' + esc(v.label_ukuran) + '</button>';
  }).join('');

  const giling = p.opsi_giling || [];
  const opsiGiling = giling.map(function(g, i) {
    return '<button type="button" data-giling="' + esc(g) + '" aria-pressed="' + (i === 0) + '">' + esc(g) + '</button>';
  }).join('');

  const lain = PRODUK.filter(function(x) { return x.id !== p.id; }).slice(0, 4);

  return '' +
    '<div class="wrap">' +
      '<div class="remah label"><a href="#/">Beranda</a> / <a href="#/?k=' + esc(p.kategori) + '">' +
        esc(p.kategori) + '</a> / ' + esc(p.nama) + '</div>' +
      '<div class="produk-atas">' +
        '<div class="galeri">' +
          '<div class="galeri-utama" id="galeri-utama">' +
            (habis ? '<span class="tanda habis">Habis</span>' : '') +
            gambarUtama(p) +
          '</div>' +
          kecil +
        '</div>' +
        '<div class="beli">' +
          '<div>' +
            '<span class="plat">' + esc(p.kategori) + '</span>' +
            '<h1 style="margin-top:8px">' + esc(p.nama) + '</h1>' +
          '</div>' +
          '<div class="harga-besar" id="harga-tampil"></div>' +
          (p.ringkas ? '<p style="color:var(--ink-soft);max-width:46ch;margin:0">' + esc(p.ringkas) + '</p>' : '') +
          (varian.length
            ? '<div class="pilihan"><span class="plat">Ukuran</span><div class="opsi" id="opsi-ukuran">' + opsiUkuran + '</div></div>'
            : '') +
          (giling.length
            ? '<div class="pilihan"><span class="plat">Pilihan gilingan</span><div class="opsi" id="opsi-giling">' + opsiGiling + '</div></div>'
            : '') +
          (habis
            ? '<button class="tombol mati" type="button" disabled>Stok habis</button>'
            : '<a class="tombol" id="tombol-beli" href="' + TOKO_MARKETPLACE + '" target="_blank" rel="noopener">Beli di TikTok Shop</a>') +
          '<p class="catatan-beli">Pembayaran dan pengiriman diproses lewat toko resmi kami.</p>' +
          '<dl class="meta">' +
            '<div><dt>Ketersediaan</dt><dd id="stok-tampil"></dd></div>' +
            (p.origin ? '<div><dt>Origin</dt><dd>' + esc(p.origin) + '</dd></div>' : '') +
          '</dl>' +
        '</div>' +
      '</div>' +
      keteranganHTML(p, varian) +
      (lain.length
        ? '<section><div class="kepala-bagian"><div><span class="plat">Mungkin cocok juga</span><h2>Produk lain</h2></div></div>' +
          '<div class="grid">' + lain.map(kartuHTML).join('') + '</div></section>'
        : '') +
    '</div>';
}

// Tab hanya dipasang untuk yang benar-benar ada isinya. Tab "Deskripsi" yang
// kosong lebih buruk daripada tidak ada tab sama sekali -- pembeli mengkliknya,
// lalu tidak menemukan apa-apa.
function keteranganHTML(p, varian) {
  const tab = [];
  if (p.deskripsi) tab.push({ id: 'cerita', judul: 'Deskripsi' });
  if (p.proses || p.roast || p.altitude || p.varietas || p.catatan_rasa || varian.length) {
    tab.push({ id: 'spek', judul: 'Informasi Produk' });
  }
  if (tab.length === 0) return '';

  return '<div class="tab-kepala" id="tab-kepala">' +
      tab.map(function(t, i) {
        return '<button type="button" data-tab="' + t.id + '" aria-selected="' + (i === 0) + '">' + t.judul + '</button>';
      }).join('') +
    '</div><div class="tab-isi" id="tab-isi">' + isiTab(p, varian, tab[0].id) + '</div>';
}

function isiTab(p, varian, tab) {
  if (tab === 'cerita') return '<p>' + esc(p.deskripsi || '') + '</p>';

  const baris = [
    ['Origin', p.origin], ['Proses', p.proses], ['Profil roast', p.roast],
    ['Ketinggian', p.altitude], ['Varietas', p.varietas], ['Catatan rasa', p.catatan_rasa],
    ['Ukuran', varian.map(function(v) { return v.label_ukuran; }).join(', ')],
    ['Pilihan gilingan', (p.opsi_giling || []).join(', ')]
  ].filter(function(b) { return b[1]; });

  return '<table><tbody>' + baris.map(function(b) {
    return '<tr><th>' + b[0] + '</th><td>' + esc(b[1]) + '</td></tr>';
  }).join('') + '</tbody></table>';
}

// ---------------------------------------------------------------------------
// Perutean
// ---------------------------------------------------------------------------

function uraikan() {
  const mentah = window.location.hash.replace(/^#/, '') || '/';
  const potong = mentah.split('?');
  const jalur = potong[0].replace(/^\/+|\/+$/g, '').split('/');
  const param = {};
  if (potong[1]) {
    potong[1].split('&').forEach(function(pasang) {
      const kv = pasang.split('=');
      param[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
  }
  return { jalur: jalur, param: param };
}

function gambar() {
  const r = uraikan();
  const panggung = document.getElementById('panggung');

  if (r.jalur[0] === 'produk') {
    panggung.innerHTML = halamanProduk(r.jalur[1]);
    pasangProduk(r.jalur[1]);
    document.title = (produkDariSlug(r.jalur[1]) || { nama: 'Produk' }).nama + ' · Gemeos Coffee';
  } else {
    panggung.innerHTML = halamanBeranda(r.param);
    pasangBeranda();
    document.title = 'Gemeos Coffee · Kopi yang baru disangrai';
  }

  window.scrollTo(0, 0);
}

function pasangBeranda() {
  const saring = document.getElementById('saring');
  if (!saring) return;
  saring.addEventListener('click', function(e) {
    const b = e.target.closest('button[data-kategori]');
    if (!b) return;
    window.location.hash = b.dataset.kategori === 'semua' ? '#/' : '#/?k=' + encodeURIComponent(b.dataset.kategori);
    // Hash berubah tapi halamannya sama, jadi jangan lompat ke atas -- pembeli
    // sedang berdiri di deretan produk, bukan di hero.
    setTimeout(function() {
      const k = document.getElementById('katalog');
      if (k) k.scrollIntoView({ block: 'start' });
    }, 0);
  });
}

function pasangProduk(slug) {
  const p = produkDariSlug(slug);
  if (!p) return;

  const varian = varianDari(p.id);
  const foto = fotoDari(p.id);
  let pilihId = (varian.find(function(v) { return !varianHabis(v); }) || varian[0] || {}).id;

  function segarkan() {
    const v = varian.find(function(x) { return x.id === pilihId; });
    if (!v) return;
    document.getElementById('harga-tampil').innerHTML =
      '<b>' + fmtRp(v.harga) + '</b>' + (v.harga_coret ? '<s>' + fmtRp(v.harga_coret) + '</s>' : '');
    document.getElementById('stok-tampil').innerHTML = varianHabis(v)
      ? '<span style="color:var(--hot)">Habis</span>'
      : '<span style="color:var(--ok)">Siap dikirim</span>';
  }

  const kotakUkuran = document.getElementById('opsi-ukuran');
  if (kotakUkuran) {
    kotakUkuran.addEventListener('click', function(e) {
      const b = e.target.closest('button[data-varian]');
      if (!b || b.disabled) return;
      pilihId = Number(b.dataset.varian);
      this.querySelectorAll('button').forEach(function(x) { x.setAttribute('aria-pressed', String(x === b)); });
      segarkan();
    });
  }

  const kotakGiling = document.getElementById('opsi-giling');
  if (kotakGiling) {
    kotakGiling.addEventListener('click', function(e) {
      const b = e.target.closest('button[data-giling]');
      if (!b) return;
      this.querySelectorAll('button').forEach(function(x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  }

  const kecil = document.getElementById('galeri-kecil');
  if (kecil) {
    kecil.addEventListener('click', function(e) {
      const b = e.target.closest('button[data-foto]');
      if (!b) return;
      const f = foto[Number(b.dataset.foto)];
      document.getElementById('galeri-utama').innerHTML =
        '<img src="' + esc(urlFoto(f.path)) + '" alt="' + esc(f.alt || p.nama) + '">';
      this.querySelectorAll('button').forEach(function(x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  }

  const kepalaTab = document.getElementById('tab-kepala');
  if (kepalaTab) {
    kepalaTab.addEventListener('click', function(e) {
      const b = e.target.closest('button[data-tab]');
      if (!b) return;
      this.querySelectorAll('button').forEach(function(x) { x.setAttribute('aria-selected', String(x === b)); });
      document.getElementById('tab-isi').innerHTML = isiTab(p, varian, b.dataset.tab);
    });
  }

  segarkan();
}

window.addEventListener('hashchange', gambar);

document.addEventListener('DOMContentLoaded', async function() {
  await muatKatalog();
  gambar();
});
