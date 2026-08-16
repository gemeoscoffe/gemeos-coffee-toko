/**
 * Perakit HTML katalog, dipakai dua tempat sekaligus.
 *
 * `build.js` memanggilnya di Node untuk menuliskan halaman jadi sebelum
 * di-deploy; browser memanggilnya kalau ada bagian yang perlu digambar ulang.
 * Satu berkas untuk keduanya supaya halaman yang dibaca Google tidak mungkin
 * berbeda dari halaman yang dilihat pembeli -- itu jenis selisih yang tidak
 * pernah ketahuan sampai ada yang mengeluh.
 *
 * Isinya fungsi murni: data masuk, teks HTML keluar. Tidak menyentuh DOM, tidak
 * memanggil jaringan, tidak membaca jam.
 */

(function (akar) {
  'use strict';

  const MARKETPLACE = 'https://tk.tokopedia.com/ZSVF3GmUp/';

  function esc(s) {
    return (s === null || s === undefined ? '' : String(s))
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Rp tanpa Intl: hasilnya harus sama persis di Node dan di browser, dan Intl
  // di dua tempat itu bisa memberi spasi yang berbeda.
  function rp(n) {
    const bulat = Math.round(Number(n) || 0);
    return 'Rp' + String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function slugKategori(nama) {
    return String(nama || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  // Warna biji untuk produk yang fotonya belum ada. Diambil dari namanya supaya
  // satu produk selalu mendapat warna yang sama -- bukan acak, yang akan
  // berganti tiap halaman dibuka dan membuat katalog terlihat gelisah.
  const WARNA = ['#8C5A2B', '#A8703A', '#5E3A22', '#7A4E2E', '#4A2E1C', '#6B462C', '#93683F', '#B0873F'];
  function warnaBiji(teks) {
    let n = 0;
    for (let i = 0; i < teks.length; i++) n = (n + teks.charCodeAt(i)) % WARNA.length;
    return WARNA[n];
  }

  // Dua bentuk foto hidup berdampingan. Yang diunggah sejak ada beberapa ukuran
  // menyimpan nama dasar plus daftar lebarnya; yang lama menyimpan satu nama
  // berkas apa adanya. Semua yang menyentuh foto lewat sini supaya bedanya
  // tidak menyebar.
  function lebarFoto(f) {
    const l = f.lebar_tersedia || [];
    return l.slice().sort(function (a, b) { return a - b; });
  }

  function urlFoto(basisFoto, f, lebarDiminta) {
    // Dipanggil juga dengan path mentah dari pemakaian lama.
    if (typeof f === 'string') return basisFoto + '/' + f;
    const l = lebarFoto(f);
    if (!l.length) return basisFoto + '/' + f.path;
    const pas = l.find(function (w) { return w >= (lebarDiminta || 0); }) || l[l.length - 1];
    return basisFoto + '/' + f.path + '-' + pas + '.webp';
  }

  // srcset menyerahkan pilihan ukuran ke browser, yang tahu lebar layar dan
  // kerapatan pikselnya -- hal yang tidak bisa diketahui saat halaman dibangun.
  function srcsetFoto(basisFoto, f) {
    const l = lebarFoto(f);
    if (l.length < 2) return '';
    return l.map(function (w) {
      return basisFoto + '/' + f.path + '-' + w + '.webp ' + w + 'w';
    }).join(', ');
  }

  function varianDari(data, produkId) {
    return data.varian.filter(function (v) { return v.produk_id === produkId; });
  }

  function fotoDari(data, produkId) {
    return data.foto.filter(function (f) { return f.produk_id === produkId; });
  }

  function varianHabis(v) { return v.stok !== null && v.stok !== undefined && v.stok <= 0; }

  function produkHabis(data, p) {
    const v = varianDari(data, p.id);
    return v.length > 0 && v.every(varianHabis);
  }

  function hargaTerendah(data, p) {
    return varianDari(data, p.id).reduce(function (m, v) { return Math.min(m, Number(v.harga)); }, Infinity);
  }

  // `sizes` memberi tahu browser seberapa lebar gambar ini akan tampil, supaya
  // ia memilih berkas yang benar sebelum tata letaknya selesai dihitung.
  function gambar(data, p, lebar, sizes) {
    const f = fotoDari(data, p.id)[0];
    if (!f) return '<div class="biji" style="--tone:' + warnaBiji(p.nama) + '"></div>';

    const set = srcsetFoto(data.basisFoto, f);
    return '<img src="' + esc(urlFoto(data.basisFoto, f, lebar)) + '"' +
           (set ? ' srcset="' + esc(set) + '"' : '') +
           (set && sizes ? ' sizes="' + esc(sizes) + '"' : '') +
           ' alt="' + esc(f.alt || p.nama) + '"' +
           ' width="' + lebar + '" height="' + lebar + '" loading="lazy" decoding="async">';
  }

  // Kalimat ringkas untuk meta description dan kartu berbagi. Dipakai apa adanya
  // kalau pemilik sudah menulisnya; kalau belum, disusun dari yang memang
  // diketahui -- bukan dikarang.
  function ringkasan(data, p) {
    if (p.ringkas) return p.ringkas;
    const bagian = [p.nama];
    if (p.origin) bagian.push('dari ' + p.origin);
    const v = varianDari(data, p.id);
    if (v.length) bagian.push('tersedia ' + v.map(function (x) { return x.label_ukuran; }).join(', '));
    if (v.length) bagian.push('mulai ' + rp(hargaTerendah(data, p)));
    return bagian.join(', ') + '.';
  }

  // -------------------------------------------------------------------------
  // Potongan yang dipakai berulang
  // -------------------------------------------------------------------------

  function kartu(data, p) {
    const varian = varianDari(data, p.id);
    const diskon = varian.some(function (v) { return v.harga_coret; });
    const habis = produkHabis(data, p);
    const asal = [p.origin, p.proses, p.roast].filter(Boolean).join(' · ');

    return '' +
      '<a class="kartu" href="/produk/' + esc(p.slug) + '/">' +
        '<div class="foto">' +
          (habis ? '<span class="tanda habis">Habis</span>'
                 : diskon ? '<span class="tanda sale">Diskon</span>' : '') +
          gambar(data, p, 400, '(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 280px') +
        '</div>' +
        '<div class="isi">' +
          '<h3>' + esc(p.nama) + '</h3>' +
          (asal ? '<p class="asal">' + esc(asal) + '</p>' : '') +
          (varian.length
            ? '<div class="ukuran">' + varian.map(function (v) {
                return '<b>' + esc(v.label_ukuran) + '</b>';
              }).join('') + '</div>'
            : '') +
          '<div class="harga"><b>' + rp(hargaTerendah(data, p)) + '</b><span class="plat">mulai dari</span></div>' +
          '<span class="lanjut">Lihat produk &rarr;</span>' +
        '</div>' +
      '</a>';
  }

  function kategoriDaftar(data) {
    const keluar = [];
    data.produk.forEach(function (p) {
      if (p.kategori && keluar.indexOf(p.kategori) === -1) keluar.push(p.kategori);
    });
    return keluar;
  }

  // Saringan kategori berupa tautan ke halaman tersendiri, bukan tombol yang
  // menyaring di browser: tiap kategori jadi alamat yang bisa dibagikan,
  // diindeks, dan dibuka tanpa JavaScript.
  function saringan(data, aktif) {
    const semua = '<a href="/"' + (aktif ? '' : ' aria-current="page"') + '>Semua</a>';
    return '<nav class="saring">' + semua + kategoriDaftar(data).map(function (k) {
      return '<a href="/kategori/' + esc(slugKategori(k)) + '/"' +
        (aktif === k ? ' aria-current="page"' : '') + '>' + esc(k) + '</a>';
    }).join('') + '</nav>';
  }

  // -------------------------------------------------------------------------
  // Halaman
  // -------------------------------------------------------------------------

  function beranda(data, kategoriAktif) {
    const daftar = data.produk.filter(function (p) {
      return !kategoriAktif || p.kategori === kategoriAktif;
    });

    if (data.produk.length === 0) {
      return '<div class="wrap"><div class="kosong">' +
        '<span class="plat">Katalog</span>' +
        '<h1>Etalasenya sedang disiapkan</h1>' +
        '<p>Belum ada produk yang ditampilkan di sini. Kopinya tetap bisa dibeli lewat toko resmi kami.</p>' +
        '<a class="tombol" href="' + MARKETPLACE + '" target="_blank" rel="noopener">Belanja di TikTok Shop</a>' +
        '</div></div>';
    }

    const sorot = daftar[0] || data.produk[0];
    const judul = kategoriAktif ? 'Kopi ' + kategoriAktif : 'Semua kopi yang kami sangrai';

    return '' +
      '<div class="hero">' +
        '<div class="wrap">' +
          '<div class="hero-teks">' +
            '<span class="plat">Roastery &middot; Gunung Puntang, Jawa Barat</span>' +
            '<h1>Kopi yang baru disangrai, bukan yang lama menunggu</h1>' +
            '<p>Arabika dan Robusta dari petani Jawa Barat, digiling sesuai alat seduhmu, dikirim dari roastery kami.</p>' +
            '<div class="aksi">' +
              '<a class="tombol amber" href="#katalog">Lihat katalog</a>' +
              '<a class="tombol garis" href="' + MARKETPLACE + '" target="_blank" rel="noopener">Toko TikTok Shop</a>' +
            '</div>' +
          '</div>' +
          '<div class="hero-gambar">' + gambar(data, sorot, 800, '(max-width: 900px) 92vw, 45vw') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="pita">' +
        '<div class="wrap">' +
          '<article><h3>Murni 100%</h3><p>Kopi asli tanpa campuran apa pun.</p></article>' +
          '<article><h3>Pilih gilingan</h3><p>Biji utuh sampai halus espresso.</p></article>' +
          '<article><h3>Kirim seluruh Indonesia</h3><p>Lewat ekspedisi pilihanmu.</p></article>' +
        '</div>' +
      '</div>' +
      '<div class="wrap">' +
        '<section id="katalog">' +
          '<div class="kepala-bagian"><div><span class="plat">Katalog</span><h2>' + esc(judul) + '</h2></div></div>' +
          saringan(data, kategoriAktif) +
          '<p class="hitung plat">' + daftar.length + ' produk</p>' +
          '<div class="grid">' +
            (daftar.length ? daftar.map(function (p) { return kartu(data, p); }).join('')
                           : '<p class="plat">Belum ada produk di kategori ini.</p>') +
          '</div>' +
        '</section>' +
      '</div>';
  }

  function keterangan(data, p) {
    const varian = varianDari(data, p.id);
    const baris = [
      ['Origin', p.origin], ['Proses', p.proses], ['Profil roast', p.roast],
      ['Ketinggian', p.altitude], ['Varietas', p.varietas], ['Catatan rasa', p.catatan_rasa],
      ['Ukuran', varian.map(function (v) { return v.label_ukuran; }).join(', ')],
      ['Pilihan gilingan', (p.opsi_giling || []).join(', ')]
    ].filter(function (b) { return b[1]; });

    let keluar = '';
    if (p.deskripsi) {
      keluar += '<section><h2>Tentang kopi ini</h2><div class="tulisan">' +
        p.deskripsi.split(/\n{2,}/).map(function (par) {
          return '<p>' + esc(par.trim()) + '</p>';
        }).join('') + '</div></section>';
    }
    if (baris.length) {
      keluar += '<section><h2>Informasi produk</h2><table><tbody>' +
        baris.map(function (b) {
          return '<tr><th>' + esc(b[0]) + '</th><td>' + esc(b[1]) + '</td></tr>';
        }).join('') + '</tbody></table></section>';
    }
    return keluar;
  }

  function produk(data, p) {
    const varian = varianDari(data, p.id);
    const foto = fotoDari(data, p.id);
    const habis = produkHabis(data, p);
    const pertama = varian.find(function (v) { return !varianHabis(v); }) || varian[0];

    const kecil = foto.length > 1
      ? '<div class="galeri-kecil" id="galeri-kecil">' + foto.map(function (f, i) {
          return '<button type="button" data-foto="' + i + '" aria-pressed="' + (i === 0) + '" ' +
            'aria-label="Foto ' + (i + 1) + '"><img src="' + esc(urlFoto(data.basisFoto, f, 400)) +
            '" data-besar="' + esc(urlFoto(data.basisFoto, f, 800)) +
            '" alt="" width="160" height="160" loading="lazy"></button>';
        }).join('') + '</div>'
      : '';

    const opsiUkuran = varian.map(function (v) {
      return '<button type="button" data-varian="' + v.id + '" data-harga="' + v.harga +
        '" data-coret="' + (v.harga_coret || '') + '" data-habis="' + varianHabis(v) +
        '" aria-pressed="' + (v === pertama) + '"' + (varianHabis(v) ? ' disabled' : '') + '>' +
        esc(v.label_ukuran) + '</button>';
    }).join('');

    const giling = p.opsi_giling || [];
    const opsiGiling = giling.map(function (g, i) {
      return '<button type="button" aria-pressed="' + (i === 0) + '">' + esc(g) + '</button>';
    }).join('');

    const lain = data.produk.filter(function (x) { return x.id !== p.id; }).slice(0, 4);

    return '' +
      '<div class="wrap">' +
        '<nav class="remah plat"><a href="/">Beranda</a> / <a href="/kategori/' +
          esc(slugKategori(p.kategori)) + '/">' + esc(p.kategori) + '</a> / ' + esc(p.nama) + '</nav>' +
        '<div class="produk-atas">' +
          '<div class="galeri">' +
            '<div class="galeri-utama" id="galeri-utama">' +
              (habis ? '<span class="tanda habis">Habis</span>' : '') +
              gambar(data, p, 800, '(max-width: 900px) 92vw, 45vw') +
            '</div>' +
            kecil +
          '</div>' +
          '<div class="beli">' +
            '<div>' +
              '<span class="plat">' + esc(p.kategori) + '</span>' +
              '<h1>' + esc(p.nama) + '</h1>' +
            '</div>' +
            '<p class="harga-besar" id="harga-tampil">' +
              '<b>' + rp(pertama ? pertama.harga : 0) + '</b>' +
              (pertama && pertama.harga_coret ? '<s>' + rp(pertama.harga_coret) + '</s>' : '') +
            '</p>' +
            (p.ringkas ? '<p class="catatan-beli">' + esc(p.ringkas) + '</p>' : '') +
            (varian.length
              ? '<div class="pilihan"><span class="plat">Ukuran</span><div class="opsi" id="opsi-ukuran">' + opsiUkuran + '</div></div>'
              : '') +
            (giling.length
              ? '<div class="pilihan"><span class="plat">Pilihan gilingan</span><div class="opsi" id="opsi-giling">' + opsiGiling + '</div></div>'
              : '') +
            (habis
              ? '<button class="tombol mati" type="button" disabled>Stok habis</button>'
              : '<a class="tombol amber" href="' + MARKETPLACE + '" target="_blank" rel="noopener">Beli di TikTok Shop</a>') +
            '<p class="catatan-beli">Pembayaran dan pengiriman diproses lewat toko resmi kami.</p>' +
            '<dl class="meta">' +
              '<div><dt>Ketersediaan</dt><dd id="stok-tampil">' +
                (habis ? '<span class="habis-teks">Habis</span>' : '<span class="siap-teks">Siap dikirim</span>') +
              '</dd></div>' +
              (p.origin ? '<div><dt>Origin</dt><dd>' + esc(p.origin) + '</dd></div>' : '') +
            '</dl>' +
          '</div>' +
        '</div>' +
        keterangan(data, p) +
        (lain.length
          ? '<section><div class="kepala-bagian"><div><span class="plat">Mungkin cocok juga</span><h2>Produk lain</h2></div></div>' +
            '<div class="grid">' + lain.map(function (x) { return kartu(data, x); }).join('') + '</div></section>'
          : '') +
      '</div>';
  }

  const API = {
    esc: esc, rp: rp, slugKategori: slugKategori, ringkasan: ringkasan,
    urlFoto: urlFoto, srcsetFoto: srcsetFoto, varianDari: varianDari, fotoDari: fotoDari,
    produkHabis: produkHabis, hargaTerendah: hargaTerendah,
    kategoriDaftar: kategoriDaftar,
    beranda: beranda, produk: produk,
    MARKETPLACE: MARKETPLACE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else akar.RENDER = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
