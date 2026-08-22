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
const KONTEN = require('./konten.js');

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
// alamat layanan pelanggan diganti. Definisinya tinggal di konten.js, satu
// tempat dengan halaman Kontak yang menyebutkannya.
const EMAIL_TOKO = KONTEN.kontak.email;
const WA_TOKO = KONTEN.kontak.whatsapp;

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
  const [produk, varian, foto, seksi, kategori, produkKategori] = await Promise.all([
    ambil('web_produk', 'select=*&order=urutan,nama'),
    ambil('web_varian', 'select=*&order=produk_id,urutan,label_ukuran'),
    ambil('web_foto', 'select=*&order=produk_id,urutan'),
    ambil('web_seksi', 'select=*&order=halaman,blok,urutan'),
    ambil('web_kategori', 'select=*&order=urutan,nama'),
    ambil('web_produk_kategori', 'select=*')
  ]);
  // Kunci publishable hanya melihat baris aktif -- itu kebijakan RLS, bukan
  // penyaringan di sini. Yang disembunyikan pemilik tidak pernah sampai.
  return { produk, varian, foto, seksi, kategori, produkKategori, basisFoto: BASIS_FOTO };
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
            '<span class="plat">Bantuan</span>' +
            '<a href="/pengiriman/">Pengiriman</a>' +
            '<a href="/retur/">Retur &amp; penukaran</a>' +
            '<a href="/syarat/">Syarat &amp; ketentuan</a>' +
            '<a href="/privasi/">Kebijakan privasi</a>' +
          '</section>' +
          '<section>' +
            '<span class="plat">Hubungi</span>' +
            '<a href="' + WA_TOKO + '" target="_blank" rel="noopener">WhatsApp ' +
              KONTEN.kontak.whatsappTampil + '</a>' +
            '<a href="mailto:' + EMAIL_TOKO + '">' + EMAIL_TOKO + '</a>' +
            '<a href="/kontak/">Semua cara menghubungi</a>' +
          '</section>' +
        '</div>' +
        '<div class="kaki-bawah">' +
          '<span class="plat">&copy; ' + new Date().getFullYear() + ' Gemeos Coffee</span>' +
          '<span class="plat">Pembayaran diproses lewat toko resmi kami</span>' +
        '</div>' +
      '</div>' +
    '</footer>';
}

// Dua tombol yang ikut ke mana pun halaman digulir: WhatsApp dan kembali ke
// atas. WhatsApp melayang karena di toko sekecil ini chat adalah jalur
// penjualan -- pertanyaan "masih ada stok?" yang tidak terjawab adalah
// pesanan yang tidak jadi. Tombol naik disembunyikan sampai halaman benar-
// benar tergulir; di halaman pendek ia cuma menutupi isi tanpa ada gunanya.
//
// Ditaruh sesudah footer supaya urutan Tab tidak terganggu: pengguna papan
// ketik menemukannya di akhir halaman, bukan menabraknya sebelum menu.
// Pilihan tema dipasang sebelum halaman digambar, bukan sesudah. Kalau ini
// ditunda ke etalase.js yang defer, pengunjung bermode gelap melihat kilatan
// putih seukuran layar penuh setiap kali pindah halaman -- dan di situs yang
// halamannya dibangun satu per satu, itu terjadi di setiap klik.
//
// Sengaja tanpa atribut defer atau async: yang dibutuhkan justru sifatnya yang
// memblokir. Dibungkus try supaya peramban yang melarang localStorage (mode
// penyamaran ketat) tidak menggagalkan seluruh halaman -- di sana temanya
// kembali mengikuti setelan perangkat, yang memang jawaban yang benar.
const TEMA_AWAL = '<script>try{var t=localStorage.getItem("tema");' +
  'if(t==="gelap"||t==="terang")document.documentElement.dataset.tema=t;}catch(e){}</' + 'script>\n';

// Tombol tema. Ikonnya tidak ditentukan di sini: kedua-duanya ikut terkirim,
// dan CSS yang memilih mana yang tampil -- karena tema yang berlaku baru
// diketahui di peramban, sedangkan halaman ini dibangun berjam-jam sebelumnya.
function tombolTema() {
  const MATAHARI = '<svg class="ikon-terang" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2' +
    'M5.6 5.6 7.2 7.2M16.8 16.8l1.6 1.6M18.4 5.6 16.8 7.2M7.2 16.8l-1.6 1.6"/></svg>';

  const BULAN = '<svg class="ikon-gelap" viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true"><path d="M20.5 14.2A8.6 8.6 0 1 1 9.8 3.5a6.9 6.9 0 0 0 10.7 10.7Z"/></svg>';

  return '<button class="tema" type="button" aria-label="Ganti mode terang atau gelap">' +
    MATAHARI + BULAN + '</button>';
}

function apung() {
  const WA_GLIF = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15' +
    '-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475' +
    '-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52' +
    '.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207' +
    '-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297' +
    '-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487' +
    '.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413' +
    '.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 ' +
    '01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 ' +
    '4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 ' +
    '5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 ' +
    '11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005' +
    'c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';

  const PANAH = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M6 14.5 12 8.5l6 6" fill="none" stroke="currentColor" stroke-width="2.2" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  return '' +
    '<div class="apung">' +
      '<a class="apung-wa" href="' + WA_TOKO + '" target="_blank" rel="noopener" ' +
        'aria-label="Chat penjual lewat WhatsApp">' + WA_GLIF + '</a>' +
      '<button class="apung-atas" type="button" aria-label="Kembali ke atas halaman">' +
        PANAH + '</button>' +
    '</div>';
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
    '<meta name="color-scheme" content="light dark">\n' +
    TEMA_AWAL +
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
        // Jumlah barang diisi JavaScript dari keranjang di peramban ini. Dibangun
        // kosong karena berkas HTML yang sama dikirim ke semua orang -- angka
        // apa pun yang dicetak di sini akan salah bagi hampir semuanya.
        '<a class="tautan-keranjang" href="/keranjang/"' +
          (opsi.alamat === '/keranjang/' ? ' aria-current="page"' : '') + '>' +
          'Keranjang<span class="jumlah-keranjang" id="jumlah-keranjang" hidden></span></a>' +
        tombolTema() +
      '</nav>' +
    '</div></header>\n' +
    '<main>' + opsi.isi + '</main>\n' +
    kaki() + '\n' +
    apung() + '\n' +
    (opsi.render ? '<script src="/render.js" defer></script>\n' : '') +
    '<script src="/etalase.js" defer></script>\n' +
    '<script defer src="https://static.cloudflareinsights.com/beacon.min.js" ' +
      'data-cf-beacon=\'{"token":"' + ANALYTICS_TOKEN + '"}\'></script>\n' +
    '</body>\n</html>\n';
}

// Halaman tulisan dirakit dari blok sederhana, bukan dari HTML mentah di
// konten.js -- supaya yang menyunting kalimatnya tidak perlu tahu satu tag pun,
// dan tidak mungkin merusak tata letak halaman dengan kurung yang lupa ditutup.
function halamanTulisan(hal) {
  const isi = hal.blok.map(function (b) {
    if (b.h) return '<h2>' + RENDER.esc(b.h) + '</h2>';
    if (b.p) return '<p>' + RENDER.esc(b.p) + '</p>';
    if (b.ul) return '<ul>' + b.ul.map(function (x) { return '<li>' + RENDER.esc(x) + '</li>'; }).join('') + '</ul>';
    if (b.tombol) return '<p><a class="tombol amber" href="' + RENDER.esc(b.tombol.ke) +
      '" target="_blank" rel="noopener">' + RENDER.esc(b.tombol.teks) + '</a></p>';
    return '';
  }).join('');

  return '<div class="wrap"><article class="tulisan-halaman">' +
    '<span class="plat">Gemeos Coffee</span>' +
    '<h1>' + RENDER.esc(hal.judul) + '</h1>' +
    isi +
    '</article></div>';
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
    category: RENDER.kategoriProduk(data, p.id).map(function (k) { return k.nama; }).join(', ') || undefined
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
    telephone: KONTEN.kontak.whatsappE164,
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

  // Kategori. Slugnya diambil dari barisnya, bukan dihitung ulang dari namanya:
  // mengganti nama kategori tidak boleh diam-diam memindahkan alamatnya dan
  // membuang peringkat yang sudah menempel di sana.
  for (const k of RENDER.kategoriDaftar(data)) {
    const isi = RENDER.produkKategori(data, k.id);
    tulis('/kategori/' + k.slug + '/', halaman({
      alamat: '/kategori/' + k.slug + '/',
      judul: 'Kopi ' + k.nama + ' — Gemeos Coffee',
      deskripsi: 'Pilihan kopi ' + k.nama + ' dari Gemeos Coffee: ' +
                 isi.map(function (p) { return p.nama; }).join(', ') + '.',
      isi: RENDER.shop(data, k),
      gambar: isi.length ? fotoPertama(isi[0]) : null
    }));
    alamat.push({ url: '/kategori/' + k.slug + '/', prioritas: '0.6' });
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

  // Keranjang. Halamannya dibangun kosong dan diisi di peramban -- isinya milik
  // satu pengunjung dan tidak boleh ikut ke berkas yang sama untuk semua orang.
  tulis('/keranjang/', halaman({
    alamat: '/keranjang/',
    judul: 'Keranjang — Gemeos Coffee',
    deskripsi: 'Pesanan yang sudah kamu pilih di Gemeos Coffee.',
    isi: RENDER.keranjang(WA_TOKO),
    // Satu-satunya halaman yang butuh perakit halaman di peramban. Halaman lain
    // sudah jadi sebelum dikirim; keranjang tidak bisa, isinya milik satu orang.
    render: true
  }));

  // Katalog ringkas untuk halaman keranjang. Yang disimpan di peramban hanya id
  // varian dan jumlahnya; nama dan harganya dibaca dari berkas ini setiap kali
  // keranjang dibuka, jadi harga yang berubah tidak pernah tertinggal di
  // keranjang yang mengendap seminggu.
  //
  // Tidak masuk sitemap dan tidak perlu: ini data, bukan halaman.
  fs.writeFileSync(path.join(KELUAR, 'katalog.json'), JSON.stringify({
    produk: data.produk.map(function (p) {
      return { id: p.id, nama: p.nama, slug: p.slug, foto: fotoPertama(p) };
    }),
    varian: data.varian.map(function (v) {
      return { id: v.id, produk_id: v.produk_id, label_ukuran: v.label_ukuran,
               harga: Number(v.harga), stok: v.stok };
    })
  }), 'utf8');

  // Halaman tulisan: pengiriman, retur, syarat, privasi, kontak.
  for (const hal of KONTEN.halaman) {
    tulis('/' + hal.slug + '/', halaman({
      alamat: '/' + hal.slug + '/',
      judul: hal.judul + ' — Gemeos Coffee',
      deskripsi: hal.ringkas,
      isi: halamanTulisan(hal)
    }));
    alamat.push({ url: '/' + hal.slug + '/', prioritas: '0.4' });
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
