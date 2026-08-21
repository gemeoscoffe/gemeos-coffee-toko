/**
 * Membangun etalase jadi halaman HTML utuh sebelum di-deploy.
 *
 * Sebelumnya halaman dikirim kosong lalu diisi JavaScript di browser. Google
 * bisa menjalankan JavaScript, tapi antrean render-nya lambat dan tidak
 * dijamin -- dan perayap WhatsApp, Instagram, serta TikTok tidak menjalankannya
 * sama sekali. Di Indonesia tautan produk paling sering menyebar lewat
 * WhatsApp, jadi halaman yang isinya baru muncul setelah JS berjalan sama saja
 * dengan tautan tanpa judul, tanpa foto, tanpa harga.
 *
 * Sekarang tiap produk dan tiap kategori punya berkas HTML sendiri, lengkap
 * dengan judul, deskripsi, kartu berbagi, dan data terstruktur. JavaScript
 * tinggal mengurus pilihan ukuran dan galeri -- kalau tidak jalan sekali pun,
 * halamannya tetap terbaca dan tetap bisa dibeli.
 *
 * Dijalankan Cloudflare Pages tiap build: `node build.js`, keluarannya `dist`.
 */

const fs = require('fs');
const path = require('path');
const RENDER = require('./public/render.js');

const PUBLIK = path.join(__dirname, 'public');
const KELUAR = path.join(__dirname, 'dist');

const SUPABASE_URL = 'https://mclqymgegppqhtqjemgm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZR1oXwo0ESAafoFA2ka8Pw_hBQeT6LI';
const BASIS_FOTO = SUPABASE_URL + '/storage/v1/object/public/produk';

// Alamat kanonis. Selama domain sungguhan belum dipasang, ini kosong -- dan itu
// yang membuat seluruh situs ditandai noindex di bawah. Peringkat pencarian
// menempel ke alamat: kalau alamat sementara ini terlanjur diindeks lalu toko
// pindah ke domain sendiri, hitungannya mulai dari nol. Lebih baik belum
// terindeks sama sekali daripada terindeks di alamat yang akan ditinggalkan.
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const BOLEH_INDEKS = SITE_URL !== '';
const BASIS = SITE_URL || (process.env.CF_PAGES_URL || 'https://gemeos-coffee-toko.pages.dev').replace(/\/+$/, '');

const NAMA_TOKO = 'Gemeos Coffee';

// Alamat yang dilihat pembeli. Sengaja berbeda dari email yang dipakai masuk ke
// /admin -- yang itu ada di tabel app_users dan tidak boleh ikut berubah kalau
// alamat layanan pelanggan diganti.
const EMAIL_TOKO = 'csdarupa@gmail.com';

// Token Cloudflare Web Analytics. Memang ikut terkirim di HTML tiap halaman --
// itu cara kerjanya, dan tidak membuka apa pun kalau dipakai orang lain.
//
// Dipilih karena tidak memakai cookie dan tidak melacak orang per orang, jadi
// tidak butuh spanduk persetujuan yang menghalangi pembeli sebelum mereka
// sempat melihat kopinya.
//
// Waktu domain sungguhan dipasang, hostname-nya harus ditambahkan di
// Cloudflare → Web Analytics → Manage site; kalau tidak, kunjungan di domain
// baru tidak terhitung.
const ANALYTICS_TOKEN = '1ce0cd62d48c44f8b5955deee4e03d77';

// ---------------------------------------------------------------------------
// Ambil katalog
// ---------------------------------------------------------------------------

async function ambil(tabel, kueri) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + tabel + '?' + kueri, {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
  });
  if (!res.ok) throw new Error(tabel + ' gagal dibaca: ' + res.status + ' ' + (await res.text()).slice(0, 200));
  return res.json();
}

async function ambilKatalog() {
  const [produk, varian, foto, seksi] = await Promise.all([
    ambil('web_produk', 'select=*&order=urutan,nama'),
    ambil('web_varian', 'select=*&order=produk_id,urutan,label_ukuran'),
    ambil('web_foto', 'select=*&order=produk_id,urutan'),
    ambil('web_seksi', 'select=*&order=halaman,blok,urutan')
  ]);
  // Kunci publishable hanya melihat baris aktif -- itu kebijakan RLS, bukan
  // penyaringan di sini. Yang disembunyikan pemilik tidak pernah sampai.
  return { produk, varian, foto, seksi, basisFoto: BASIS_FOTO };
}

// ---------------------------------------------------------------------------
// Rangka halaman
// ---------------------------------------------------------------------------

function salinFolder(dari, ke) {
  fs.mkdirSync(ke, { recursive: true });
  for (const isi of fs.readdirSync(dari, { withFileTypes: true })) {
    const a = path.join(dari, isi.name);
    const b = path.join(ke, isi.name);
    if (isi.isDirectory()) salinFolder(a, b);
    else fs.copyFileSync(a, b);
  }
}

function tulis(alamatRelatif, isi) {
  const tujuan = alamatRelatif === '/'
    ? path.join(KELUAR, 'index.html')
    : path.join(KELUAR, alamatRelatif.replace(/^\/|\/$/g, ''), 'index.html');
  fs.mkdirSync(path.dirname(tujuan), { recursive: true });
  fs.writeFileSync(tujuan, isi, 'utf8');
}

function kaki() {
  return '' +
    '<footer>' +
      '<div class="wrap">' +
        '<div class="kaki-grid">' +
          '<section>' +
            '<strong class="merek">Gemeos Coffee</strong>' +
            '<p>Roastery kecil yang menyangrai per pesanan. Biji dari lereng Gunung Puntang, Jawa Barat, dikirim ke seluruh Indonesia.</p>' +
          '</section>' +
          '<section>' +
            '<span class="plat">Belanja</span>' +
            '<a href="/shop/">Semua produk</a>' +
            '<a href="/tentang/">Tentang kami</a>' +
            '<a href="' + RENDER.MARKETPLACE + '" target="_blank" rel="noopener">TikTok Shop</a>' +
          '</section>' +
          '<section>' +
            '<span class="plat">Hubungi</span>' +
            '<a href="mailto:' + EMAIL_TOKO + '">' + EMAIL_TOKO + '</a>' +
          '</section>' +
        '</div>' +
        '<div class="kaki-bawah">' +
          '<span class="plat">&copy; ' + new Date().getFullYear() + ' Gemeos Coffee</span>' +
          '<span class="plat">Pembayaran diproses lewat toko resmi kami</span>' +
        '</div>' +
      '</div>' +
    '</footer>';
}

// Halaman kategori tetap menandai "Shop": pengunjung yang sedang menyaring
// kategori masih berada di katalog, dan menu yang tidak menyorot apa pun membuat
// halaman itu terasa seperti tersesat dari situsnya.
function tautanNav(alamat, label, sekarang) {
  const aktif = alamat === '/'
    ? sekarang === '/'
    : sekarang.indexOf(alamat) === 0 ||
      (alamat === '/shop/' && (sekarang.indexOf('/kategori/') === 0 || sekarang.indexOf('/produk/') === 0));
  return '<a href="' + alamat + '"' + (aktif ? ' aria-current="page"' : '') + '>' + label + '</a>';
}

function halaman(opsi) {
  const kanonis = BASIS + opsi.alamat;
  const gambar = opsi.gambar || (BASIS + '/og.png');

  return '<!DOCTYPE html>\n' +
    '<html lang="id">\n<head>\n' +
    '<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '<title>' + RENDER.esc(opsi.judul) + '</title>\n' +
    '<meta name="description" content="' + RENDER.esc(opsi.deskripsi) + '">\n' +
    '<link rel="canonical" href="' + RENDER.esc(kanonis) + '">\n' +
    (BOLEH_INDEKS ? '' : '<meta name="robots" content="noindex, nofollow">\n') +
    '<meta property="og:type" content="' + (opsi.tipe || 'website') + '">\n' +
    '<meta property="og:site_name" content="' + NAMA_TOKO + '">\n' +
    '<meta property="og:locale" content="id_ID">\n' +
    '<meta property="og:title" content="' + RENDER.esc(opsi.judul) + '">\n' +
    '<meta property="og:description" content="' + RENDER.esc(opsi.deskripsi) + '">\n' +
    '<meta property="og:url" content="' + RENDER.esc(kanonis) + '">\n' +
    '<meta property="og:image" content="' + RENDER.esc(gambar) + '">\n' +
    '<meta name="twitter:card" content="summary_large_image">\n' +
    '<link rel="stylesheet" href="/etalase.css">\n' +
    (opsi.jsonld ? '<script type="application/ld+json">' + JSON.stringify(opsi.jsonld) + '</script>\n' : '') +
    '</head>\n<body>\n' +
    '<div class="siar">Bubuk murni 100% &middot; Kirim seluruh Indonesia</div>\n' +
    '<header class="bar"><div class="wrap">' +
      '<a class="merek" href="/">Gemeos Coffee</a>' +
      '<nav>' +
        tautanNav('/', 'Home', opsi.alamat) +
        tautanNav('/shop/', 'Shop', opsi.alamat) +
        tautanNav('/tentang/', 'About Us', opsi.alamat) +
        '<a href="' + RENDER.MARKETPLACE + '" target="_blank" rel="noopener">TikTok Shop</a>' +
      '</nav>' +
    '</div></header>\n' +
    '<main>' + opsi.isi + '</main>\n' +
    kaki() + '\n' +
    '<script src="/etalase.js" defer></script>\n' +
    '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" ' +
      'data-cf-beacon=\'{"token":"' + ANALYTICS_TOKEN + '"}\'></script>\n' +
    '</body>\n</html>\n';
}

// ---------------------------------------------------------------------------
// Data terstruktur
// ---------------------------------------------------------------------------

function jsonldProduk(data, p) {
  const varian = RENDER.varianDari(data, p.id);
  const foto = RENDER.fotoDari(data, p.id);
  const habis = RENDER.produkHabis(data, p);

  const j = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nama,
    description: RENDER.ringkasan(data, p),
    url: BASIS + '/produk/' + p.slug + '/',
    brand: { '@type': 'Brand', name: NAMA_TOKO },
    category: p.kategori
  };
  // Google mengambil gambar ini untuk hasil pencarian, jadi yang diberikan
  // ukuran terbesar yang ada, bukan yang dipakai kartu katalog.
  if (foto.length) j.image = foto.map(function (f) { return RENDER.urlFoto(data.basisFoto, f, 1600); });

  // Satu penawaran per ukuran, karena harganya memang berbeda per ukuran.
  // Menggabungkannya jadi satu rentang membuat harga yang tampil di hasil
  // pencarian tidak pernah cocok dengan yang dilihat pembeli.
  if (varian.length) {
    j.offers = varian.map(function (v) {
      return {
        '@type': 'Offer',
        name: p.nama + ' ' + v.label_ukuran,
        sku: v.sku,
        price: String(Math.round(Number(v.harga))),
        priceCurrency: 'IDR',
        availability: (v.stok !== null && v.stok !== undefined && v.stok <= 0)
          ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        url: BASIS + '/produk/' + p.slug + '/'
      };
    });
  }
  if (habis) j.offers = j.offers || [];
  return j;
}

function jsonldToko(data) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: NAMA_TOKO,
    description: 'Roastery kopi Arabika dan Robusta dari Gunung Puntang, Jawa Barat.',
    url: BASIS + '/',
    email: EMAIL_TOKO,
    currenciesAccepted: 'IDR',
    areaServed: { '@type': 'Country', name: 'Indonesia' },
    makesOffer: data.produk.slice(0, 12).map(function (p) {
      return { '@type': 'Offer', itemOffered: { '@type': 'Product', name: p.nama },
               price: String(Math.round(RENDER.hargaTerendah(data, p))), priceCurrency: 'IDR' };
    })
  };
}

// ---------------------------------------------------------------------------
// Bangun
// ---------------------------------------------------------------------------

async function bangun() {
  const data = await ambilKatalog();
  console.log('Katalog: ' + data.produk.length + ' produk, ' + data.varian.length +
              ' varian, ' + data.foto.length + ' foto, ' + (data.seksi || []).length + ' seksi');

  fs.rmSync(KELUAR, { recursive: true, force: true });
  salinFolder(PUBLIK, KELUAR);

  const alamat = [];
  const fotoPertama = function (p) {
    const f = RENDER.fotoDari(data, p.id)[0];
    // Kartu berbagi WhatsApp dan Facebook memakai gambar ini; 800 piksel sudah
    // tajam di sana dan tidak membuat pratinjaunya lambat muncul.
    return f ? RENDER.urlFoto(data.basisFoto, f, 800) : null;
  };

  // Kartu berbagi WhatsApp tidak bisa memutar video, jadi yang dikirim adalah
  // gambar pengganti hero kalau pemiliknya sudah memasangnya -- itu frame dari
  // video yang sama. Kalau belum, foto produk pertama: pilihan yang jujur,
  // karena itu memang kopi yang dijual halaman ini.
  const hero = RENDER.seksiSatu(data, 'home', 'hero');
  const fotoHero = hero && hero.foto_path
    ? RENDER.urlFoto(data.basisFoto, { path: hero.foto_path, lebar_tersedia: hero.foto_lebar || [] }, 800)
    : (data.produk.length ? fotoPertama(data.produk[0]) : null);

  // Beranda
  tulis('/', halaman({
    alamat: '/',
    judul: 'Gemeos Coffee — Kopi Arabika & Robusta Gunung Puntang',
    deskripsi: 'Roastery kopi Arabika dan Robusta dari Gunung Puntang, Jawa Barat. ' +
               'Bubuk murni 100%, pilih gilingan sesuai alat seduhmu, kirim ke seluruh Indonesia.',
    isi: RENDER.beranda(data),
    gambar: fotoHero,
    jsonld: jsonldToko(data)
  }));
  alamat.push({ url: '/', prioritas: '1.0' });

  // Katalog. Sejak halaman depan berubah jadi halaman perkenalan, katalog
  // lengkapnya punya alamat sendiri -- alamat yang bisa dikirim ke pembeli yang
  // memang sudah mau melihat barangnya, bukan ceritanya.
  tulis('/shop/', halaman({
    alamat: '/shop/',
    judul: 'Semua Kopi — Gemeos Coffee',
    deskripsi: 'Seluruh kopi yang kami sangrai: ' +
               data.produk.map(function (p) { return p.nama; }).join(', ') + '.',
    isi: RENDER.shop(data, null),
    gambar: data.produk.length ? fotoPertama(data.produk[0]) : null
  }));
  alamat.push({ url: '/shop/', prioritas: '0.9' });

  // Tentang Kami
  const tentangKepala = RENDER.seksiSatu(data, 'tentang', 'hero');
  tulis('/tentang/', halaman({
    alamat: '/tentang/',
    judul: ((tentangKepala && tentangKepala.judul) || 'Tentang Kami') + ' — Gemeos Coffee',
    deskripsi: (tentangKepala && tentangKepala.teks)
      ? String(tentangKepala.teks).replace(/\s+/g, ' ').slice(0, 155)
      : 'Roastery kecil yang menyangrai per pesanan, dari lereng Gunung Puntang, Jawa Barat.',
    isi: RENDER.tentang(data),
    gambar: tentangKepala && tentangKepala.foto_path
      ? RENDER.urlFoto(data.basisFoto,
          { path: tentangKepala.foto_path, lebar_tersedia: tentangKepala.foto_lebar || [] }, 800)
      : fotoHero
  }));
  alamat.push({ url: '/tentang/', prioritas: '0.5' });

  // Kategori
  for (const k of RENDER.kategoriDaftar(data)) {
    const s = RENDER.slugKategori(k);
    const isi = data.produk.filter(function (p) { return p.kategori === k; });
    tulis('/kategori/' + s + '/', halaman({
      alamat: '/kategori/' + s + '/',
      judul: 'Kopi ' + k + ' — Gemeos Coffee',
      deskripsi: 'Pilihan kopi ' + k + ' dari Gemeos Coffee: ' +
                 isi.map(function (p) { return p.nama; }).join(', ') + '.',
      isi: RENDER.shop(data, k),
      gambar: isi.length ? fotoPertama(isi[0]) : null
    }));
    alamat.push({ url: '/kategori/' + s + '/', prioritas: '0.6' });
  }

  // Produk
  for (const p of data.produk) {
    tulis('/produk/' + p.slug + '/', halaman({
      alamat: '/produk/' + p.slug + '/',
      judul: p.nama + ' — ' + RENDER.rp(RENDER.hargaTerendah(data, p)) + ' — Gemeos Coffee',
      deskripsi: RENDER.ringkasan(data, p),
      isi: RENDER.produk(data, p),
      gambar: fotoPertama(p),
      tipe: 'product',
      jsonld: jsonldProduk(data, p)
    }));
    alamat.push({ url: '/produk/' + p.slug + '/', prioritas: '0.9' });
  }

  const hariIni = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(KELUAR, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    alamat.map(function (a) {
      return '  <url><loc>' + BASIS + a.url + '</loc><lastmod>' + hariIni +
             '</lastmod><priority>' + a.prioritas + '</priority></url>';
    }).join('\n') + '\n</urlset>\n', 'utf8');

  // Halaman kelola tidak pernah pantas masuk hasil pencarian, dan selama
  // alamatnya masih sementara, tidak ada satu pun halaman yang pantas.
  fs.writeFileSync(path.join(KELUAR, 'robots.txt'),
    BOLEH_INDEKS
      ? 'User-agent: *\nDisallow: /admin\n\nSitemap: ' + BASIS + '/sitemap.xml\n'
      : 'User-agent: *\nDisallow: /\n', 'utf8');

  console.log('Dibangun ' + alamat.length + ' halaman ke dist/');
  console.log(BOLEH_INDEKS
    ? 'Boleh diindeks, alamat kanonis ' + BASIS
    : 'NOINDEX: SITE_URL belum diisi, jadi seluruh situs ditutup dari mesin pencari.');
}

bangun().catch(function (err) {
  console.error('Build gagal:', err.message);
  process.exit(1);
});
