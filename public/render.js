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
  function gambarProduk(data, p, lebar, sizes) {
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

  // Semua kata yang boleh mencocokkan sebuah kartu saat dicari, disatukan ke
  // satu atribut dan sudah dikecilkan hurufnya. Pencocokannya terjadi di
  // peramban dan katalognya kecil, jadi tidak ada indeks, tidak ada permintaan
  // ke server, dan hasilnya muncul selagi diketik.
  //
  // Ukuran ikut dimasukkan meski tidak tertulis di kartu: "1 kg" adalah salah
  // satu hal yang paling sering diketik orang, dan kartunya harus tetap ketemu.
  function kataCari(data, p) {
    const bagian = [p.nama, p.origin, p.proses, p.roast, p.varietas, p.catatan_rasa, p.ringkas];
    kategoriProduk(data, p.id).forEach(function (k) { bagian.push(k.nama); });
    varianDari(data, p.id).forEach(function (v) { bagian.push(v.label_ukuran); });
    return bagian.filter(Boolean).join(' ').toLowerCase();
  }

  // Kartu tidak menyebut ukuran. Daftar berat cuma berguna waktu orang sudah
  // memilih kopinya, dan itu terjadi di halaman produk; di grid ia memanjang
  // sampai delapan potong sehingga kartunya jadi tidak sama tinggi.
  function kartu(data, p) {
    const varian = varianDari(data, p.id);
    const diskon = varian.some(function (v) { return v.harga_coret; });
    const habis = produkHabis(data, p);
    const asal = [p.origin, p.proses, p.roast].filter(Boolean).join(' · ');

    return '' +
      '<a class="kartu" href="/produk/' + esc(p.slug) + '/" data-cari="' +
        esc(kataCari(data, p)) + '">' +
        '<div class="foto">' +
          (habis ? '<span class="tanda habis">Habis</span>'
                 : diskon ? '<span class="tanda sale">Diskon</span>' : '') +
          gambarProduk(data, p, 400, '(max-width: 640px) 92vw, (max-width: 1100px) 46vw, 280px') +
        '</div>' +
        '<div class="isi">' +
          '<h3>' + esc(p.nama) + '</h3>' +
          (asal ? '<p class="asal">' + esc(asal) + '</p>' : '') +
          '<div class="harga"><b>' + rp(hargaTerendah(data, p)) + '</b><span class="plat">mulai dari</span></div>' +
          '<span class="lanjut">Lihat produk &rarr;</span>' +
        '</div>' +
      '</a>';
  }

  // Kategori datang dari tabelnya sendiri, bukan disimpulkan dari produk. Itu
  // yang membuat urutannya bisa ditentukan pemilik -- chip paling kiri paling
  // sering diklik -- dan membuat satu produk bisa berada di beberapa kategori.
  //
  // Kategori tanpa produk tidak digambar. Bukan karena salah, tapi karena chip
  // yang mengantar ke halaman kosong terasa seperti toko yang kehabisan barang.
  function kategoriDaftar(data) {
    return (data.kategori || []).filter(function (k) {
      return produkKategori(data, k.id).length > 0;
    });
  }

  // Produk di satu kategori, urutannya mengikuti urutan produk -- bukan urutan
  // baris penghubung, yang tidak berarti apa-apa bagi pembeli.
  function produkKategori(data, kategoriId) {
    const pasangan = (data.produkKategori || []).filter(function (x) {
      return x.kategori_id === kategoriId;
    }).map(function (x) { return x.produk_id; });
    return data.produk.filter(function (p) { return pasangan.indexOf(p.id) !== -1; });
  }

  // Kategori yang memuat satu produk. Yang pertama dipakai sebagai remah dan
  // label di halaman produk: harus ada satu yang mewakili, dan urutan yang
  // ditentukan pemilik adalah satu-satunya urutan yang bermakna di sini.
  function kategoriProduk(data, produkId) {
    const punya = (data.produkKategori || []).filter(function (x) {
      return x.produk_id === produkId;
    }).map(function (x) { return x.kategori_id; });
    return (data.kategori || []).filter(function (k) { return punya.indexOf(k.id) !== -1; });
  }

  // Saringan kategori berupa tautan ke halaman tersendiri, bukan tombol yang
  // menyaring di browser: tiap kategori jadi alamat yang bisa dibagikan,
  // diindeks, dan dibuka tanpa JavaScript.
  function saringan(data, aktif) {
    const semua = '<a href="/shop/"' + (aktif ? '' : ' aria-current="page"') + '>Semua</a>';
    return '<nav class="saring">' + semua + kategoriDaftar(data).map(function (k) {
      return '<a href="/kategori/' + esc(k.slug) + '/"' +
        (aktif && aktif.id === k.id ? ' aria-current="page"' : '') + '>' + esc(k.nama) + '</a>';
    }).join('') + '</nav>';
  }

  // -------------------------------------------------------------------------
  // Halaman
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Isi yang ditulis pemilik
  // -------------------------------------------------------------------------
  //
  // Halaman depan dan halaman "Tentang Kami" isinya fakta tentang usahanya --
  // ceritanya, alamatnya, kata pembelinya -- bukan tentang programnya. Semuanya
  // datang dari `web_seksi`, dan bagian yang belum diisi tidak digambar sama
  // sekali. Kotak berisi judul tanpa isi lebih buruk daripada halaman yang lebih
  // pendek: yang pertama terlihat rusak, yang kedua hanya terlihat ringkas.

  function seksiDari(data, halaman, blok) {
    return (data.seksi || [])
      .filter(function (s) { return s.halaman === halaman && s.blok === blok; })
      .sort(function (a, b) { return a.urutan - b.urutan; });
  }

  function seksiSatu(data, halaman, blok) {
    return seksiDari(data, halaman, blok)[0] || null;
  }

  // `web_seksi` menyimpan fotonya di kolomnya sendiri, `web_foto` di barisnya
  // sendiri. Dijadikan bentuk yang sama di sini supaya `urlFoto` dan
  // `srcsetFoto` tidak perlu tahu bedanya.
  function fotoSeksi(s) {
    return s && s.foto_path ? { path: s.foto_path, lebar_tersedia: s.foto_lebar || [] } : null;
  }

  // Video latar disimpan apa adanya, lengkap dengan ekstensinya -- tidak ada
  // varian ukuran seperti foto, karena browser tidak bisa mengecilkan video
  // sebelum mengunggahnya dan mengecilkannya di server berarti memasang
  // pekerjaan yang seluruh situs ini justru dibuat untuk tidak punya.
  function urlVideo(basisFoto, s) {
    return s && s.video_path ? basisFoto + '/' + s.video_path : '';
  }

  function tipeVideo(jalur) {
    const ekor = String(jalur || '').toLowerCase().split('.').pop();
    return ekor === 'webm' ? 'video/webm' : ekor === 'ogv' ? 'video/ogg' : 'video/mp4';
  }

  function gambarSeksi(data, s, lebar, sizes, alt) {
    const f = fotoSeksi(s);
    if (!f) return '';
    const set = srcsetFoto(data.basisFoto, f);
    return '<img src="' + esc(urlFoto(data.basisFoto, f, lebar)) + '"' +
      (set ? ' srcset="' + esc(set) + '"' : '') +
      (set && sizes ? ' sizes="' + esc(sizes) + '"' : '') +
      ' alt="' + esc(alt || '') + '" loading="lazy" decoding="async">';
  }

  // Sebuah blok dianggap kosong kalau tidak ada satu pun kolom yang akan
  // terlihat. Tombol tidak dihitung: tombol tanpa teks di sekitarnya bukan
  // bagian halaman, cuma tombol yang menggantung.
  function seksiTerisi(s) {
    return !!(s && (s.judul || s.subjudul || s.teks || s.foto_path));
  }

  function tautanSeksi(url, label, kelas) {
    if (!url || !label) return '';
    return '<a class="tombol ' + (kelas || '') + '" href="' + esc(url) + '"' +
      (/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '') +
      '>' + esc(label) + '</a>';
  }

  function tombolSeksi(s, kelas) {
    return s ? tautanSeksi(s.tombol_url, s.tombol_label, kelas) : '';
  }

  function tombolSeksi2(s, kelas) {
    return s ? tautanSeksi(s.tombol2_url, s.tombol2_label, kelas) : '';
  }

  // Paragraf dipisah baris kosong, sama seperti deskripsi produk. Satu Enter
  // dipakai orang untuk merapikan tulisannya sendiri, bukan untuk memulai
  // paragraf baru.
  function paragraf(teks) {
    return String(teks || '').split(/\n{2,}/).map(function (par) {
      const bersih = par.trim();
      return bersih ? '<p>' + esc(bersih) + '</p>' : '';
    }).join('');
  }

  // -------------------------------------------------------------------------
  // Halaman
  // -------------------------------------------------------------------------

  function kosongTotal() {
    return '<div class="wrap"><div class="kosong">' +
      '<span class="plat">Katalog</span>' +
      '<h1>Etalasenya sedang disiapkan</h1>' +
      '<p>Belum ada produk yang ditampilkan di sini. Kopinya tetap bisa dibeli lewat toko resmi kami.</p>' +
      '<a class="tombol" href="' + MARKETPLACE + '" target="_blank" rel="noopener">Belanja di TikTok Shop</a>' +
      '</div></div>';
  }

  // Katalog lengkap. Dulu ini isi halaman depan; sekarang halaman depan punya
  // tugas lain -- memperkenalkan -- dan katalognya pindah ke /shop/ supaya
  // keduanya tidak saling memendekkan.
  function shop(data, kategoriAktif) {
    if (data.produk.length === 0) return kosongTotal();

    const daftar = kategoriAktif ? produkKategori(data, kategoriAktif.id) : data.produk;
    const judul = kategoriAktif ? 'Kopi ' + kategoriAktif.nama : 'Semua kopi yang kami sangrai';

    return '<div class="wrap">' +
      '<section id="katalog">' +
        '<div class="kepala-bagian"><div><span class="plat">Katalog</span><h2>' + esc(judul) + '</h2></div></div>' +
        saringan(data, kategoriAktif) +
        // hidden sampai JavaScript menyalakannya: kotak cari yang tidak bisa
        // mencari lebih buruk daripada kotak yang tidak ada.
        '<div class="cari" hidden>' +
          '<input type="search" id="cari-produk" placeholder="Cari kopi, ukuran, atau catatan rasa" ' +
            'aria-label="Cari produk" autocomplete="off">' +
        '</div>' +
        '<p class="hitung plat" id="cari-hitung">' + daftar.length + ' produk</p>' +
        '<p class="plat cari-kosong" id="cari-kosong" hidden>Tidak ada kopi yang cocok.</p>' +
        '<div class="grid" id="grid-katalog">' +
          (daftar.length ? daftar.map(function (p) { return kartu(data, p); }).join('')
                         : '<p class="plat">Belum ada produk di kategori ini.</p>') +
        '</div>' +
      '</section>' +
    '</div>';
  }

  // Hero berlatar video.
  //
  // Videonya dipasang di belakang tulisan, bukan sebagai hiasan di sebelahnya:
  // itu satu-satunya susunan yang tidak berubah bentuk waktu layarnya berubah
  // dari monitor jadi HP tegak. `object-fit: cover` yang mengurus sisanya.
  //
  // Semua atributnya perlu, tidak satu pun hiasan:
  //   muted + playsinline  browser HP menolak memutar sendiri tanpa keduanya,
  //                        dan iOS akan membuka videonya jadi layar penuh
  //   preload="metadata"   yang diunduh lebih dulu cuma keterangannya; berkasnya
  //                        menyusul, dan sampai itu poster yang tampil
  //   poster               frame pertama sebagai gambar diam -- yang dilihat
  //                        pengunjung selama videonya belum termuat, dan yang
  //                        tetap tampil kalau videonya gagal atau ditolak
  //
  // Tanpa video, hero kembali jadi cokelat dengan garis kontur seperti semula.
  // Tidak ada animasi di sana: sebuah gerakan yang cuma "supaya bergerak" adalah
  // hal yang pertama membuat orang ingin menutup tab.
  function heroBeranda(data) {
    const s = seksiSatu(data, 'home', 'hero');
    const judul = (s && s.judul) || 'Kopi yang baru disangrai, bukan yang lama menunggu';
    const plat = (s && s.subjudul) || 'Roastery \u00b7 Gunung Puntang, Jawa Barat';
    const teks = s && s.teks;

    const video = urlVideo(data.basisFoto, s);
    const poster = s && s.foto_path
      ? urlFoto(data.basisFoto, { path: s.foto_path, lebar_tersedia: s.foto_lebar || [] }, 1600)
      : '';

    // Gambar diamnya digambar sebagai elemen sendiri, bukan cuma atribut
    // `poster`. Atribut itu hilang begitu videonya jalan, sementara elemen ini
    // tetap ada -- dan itulah yang tampil untuk orang yang perangkatnya minta
    // gerakan dikurangi, karena CSS bisa menyembunyikan videonya tapi tidak bisa
    // menghentikannya. Alamatnya sama persis dengan `poster`, jadi browser
    // mengunduhnya sekali.
    let latar = '';
    if (poster) latar += '<img class="hero-media hero-diam" src="' + esc(poster) + '" alt="" decoding="async">';
    if (video) {
      latar += '<video class="hero-media" autoplay muted loop playsinline preload="metadata"' +
        (poster ? ' poster="' + esc(poster) + '"' : '') + '>' +
        '<source src="' + esc(video) + '" type="' + tipeVideo(s.video_path) + '">' +
        '</video>';
    }

    return '<div class="hero' + (latar ? ' hero-bervideo' : '') + '">' +
        (latar ? '<div class="hero-latar" aria-hidden="true">' + latar + '</div>' : '') +
        '<div class="wrap">' +
          '<div class="hero-teks">' +
            '<span class="plat">' + esc(plat) + '</span>' +
            '<h1>' + esc(judul) + '</h1>' +
            (teks ? '<p>' + esc(teks) + '</p>' : '') +
            '<div class="aksi">' +
              (tombolSeksi(s, 'amber') || '<a class="tombol amber" href="/shop/">Lihat katalog</a>') +
              '<a class="tombol garis" href="' + MARKETPLACE + '" target="_blank" rel="noopener">Toko TikTok Shop</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function alasanBeranda(data) {
    const rows = seksiDari(data, 'home', 'alasan').filter(seksiTerisi);
    if (!rows.length) return '';

    // Yang berfoto dan yang tidak sengaja dibedakan bentuknya. Satu kartu
    // berfoto di antara dua kartu polos terlihat seperti gambar yang gagal
    // dimuat; seluruh barisnya mengikuti apakah fotonya sudah ada atau belum.
    const berfoto = rows.some(function (s) { return s.foto_path; });
    if (!berfoto) {
      return '<div class="pita"><div class="wrap">' + rows.map(function (s) {
        return '<article><h3>' + esc(s.judul || '') + '</h3>' +
          (s.teks ? '<p>' + esc(s.teks) + '</p>' : '') + '</article>';
      }).join('') + '</div></div>';
    }

    return '<div class="wrap"><section class="alasan">' +
      rows.map(function (s) {
        return '<article>' +
          '<div class="alasan-foto">' +
            (gambarSeksi(data, s, 400, '(max-width: 700px) 92vw, 280px', s.judul || '') ||
             '<div class="biji" style="--tone:' + warnaBiji(s.judul || 'gemeos') + '"></div>') +
          '</div>' +
          '<h3>' + esc(s.judul || '') + '</h3>' +
          (s.teks ? '<p>' + esc(s.teks) + '</p>' : '') +
          tombolSeksi(s, 'garis') +
        '</article>';
      }).join('') +
    '</section></div>';
  }

  function ceritaBeranda(data) {
    const s = seksiSatu(data, 'home', 'cerita');
    if (!seksiTerisi(s)) return '';

    const gambar = gambarSeksi(data, s, 800, '(max-width: 900px) 92vw, 45vw', s.judul || '');
    return '<div class="wrap"><section class="cerita">' +
        (gambar ? '<div class="cerita-foto">' + gambar + '</div>' : '') +
        '<div class="cerita-teks">' +
          (s.subjudul ? '<span class="plat">' + esc(s.subjudul) + '</span>' : '') +
          (s.judul ? '<h2>' + esc(s.judul) + '</h2>' : '') +
          '<div class="tulisan">' + paragraf(s.teks) + '</div>' +
          tombolSeksi(s, 'garis') +
        '</div>' +
      '</section></div>';
  }

  function testimoniBeranda(data) {
    const rows = seksiDari(data, 'home', 'testimoni').filter(function (s) { return s.teks; });
    if (!rows.length) return '';

    return '<div class="wrap"><section>' +
      '<div class="kepala-bagian"><div><span class="plat">Kata pembeli</span>' +
        '<h2>Yang mereka bilang setelah menyeduhnya</h2></div></div>' +
      '<div class="testimoni">' + rows.map(function (s) {
        return '<figure>' +
          '<blockquote>' + esc(s.teks) + '</blockquote>' +
          (s.judul ? '<figcaption>' + esc(s.judul) +
            (s.subjudul ? ' <span class="plat">' + esc(s.subjudul) + '</span>' : '') +
            '</figcaption>' : '') +
        '</figure>';
      }).join('') + '</div>' +
    '</section></div>';
  }

  function lokasiBeranda(data) {
    const rows = seksiDari(data, 'home', 'lokasi').filter(seksiTerisi);
    if (!rows.length) return '';

    return '<div class="wrap"><section>' +
      '<div class="kepala-bagian"><div><span class="plat">Kunjungi</span><h2>Tempat kami</h2></div></div>' +
      '<div class="lokasi">' + rows.map(function (s) {
        return '<article>' +
          (s.judul ? '<h3>' + esc(s.judul) + '</h3>' : '') +
          (s.teks ? '<p>' + esc(s.teks) + '</p>' : '') +
          '<div class="aksi">' + tombolSeksi(s, 'garis') + tombolSeksi2(s, 'garis') + '</div>' +
        '</article>';
      }).join('') + '</div>' +
    '</section></div>';
  }

  // Halaman depan: memperkenalkan, lalu menunjukkan barangnya, lalu bercerita.
  // Urutannya bukan selera -- pengunjung dari tautan TikTok belum tentu tahu ini
  // siapa, dan yang mereka cari lebih dulu adalah kopinya, bukan riwayatnya.
  function beranda(data) {
    if (data.produk.length === 0 && !seksiTerisi(seksiSatu(data, 'home', 'hero'))) return kosongTotal();

    const sorot = data.produk.slice(0, 8);

    return heroBeranda(data) +
      (data.produk.length
        ? '<div class="wrap"><section id="katalog">' +
            '<div class="kepala-bagian"><div><span class="plat">Katalog</span>' +
              '<h2>Kopi yang kami sangrai</h2></div>' +
              '<a class="lanjut-bagian" href="/shop/">Semua produk &rarr;</a></div>' +
            '<div class="grid">' + sorot.map(function (p) { return kartu(data, p); }).join('') + '</div>' +
          '</section></div>'
        : '') +
      ceritaBeranda(data) +
      alasanBeranda(data) +
      testimoniBeranda(data) +
      lokasiBeranda(data);
  }

  // Halaman "Tentang Kami". Kosong sampai pemiliknya menulis: yang pantas ada di
  // sini -- sejak kapan, oleh siapa, kenapa -- tidak ada di data mana pun, dan
  // mengarangnya berarti menaruh klaim palsu justru di halaman yang dibuka orang
  // untuk memutuskan apakah toko ini bisa dipercaya.
  function tentang(data) {
    const kepala = seksiSatu(data, 'tentang', 'hero');
    const isi = seksiDari(data, 'tentang', 'isi').filter(seksiTerisi);

    if (!seksiTerisi(kepala) && !isi.length) {
      return '<div class="wrap"><div class="kosong">' +
        '<span class="plat">Tentang Kami</span>' +
        '<h1>Halamannya sedang ditulis</h1>' +
        '<p>Sementara ini, kopinya bisa dilihat di katalog.</p>' +
        '<a class="tombol" href="/shop/">Lihat katalog</a>' +
      '</div></div>';
    }

    return '<div class="wrap">' +
      '<section class="tentang-kepala">' +
        '<span class="plat">' + esc((kepala && kepala.subjudul) || 'Tentang Kami') + '</span>' +
        '<h1>' + esc((kepala && kepala.judul) || 'Gemeos Coffee') + '</h1>' +
        (kepala && kepala.teks ? '<div class="tulisan">' + paragraf(kepala.teks) + '</div>' : '') +
        (kepala && kepala.foto_path
          ? '<div class="tentang-foto">' +
              gambarSeksi(data, kepala, 1600, '(max-width: 1200px) 92vw, 1152px', kepala.judul || '') +
            '</div>'
          : '') +
      '</section>' +
      isi.map(function (s) {
        const gambar = gambarSeksi(data, s, 800, '(max-width: 900px) 92vw, 45vw', s.judul || '');
        return '<section class="cerita">' +
          (gambar ? '<div class="cerita-foto">' + gambar + '</div>' : '') +
          '<div class="cerita-teks">' +
            (s.judul ? '<h2>' + esc(s.judul) + '</h2>' : '') +
            '<div class="tulisan">' + paragraf(s.teks) + '</div>' +
            tombolSeksi(s, 'garis') +
          '</div>' +
        '</section>';
      }).join('') +
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
    // Satu produk bisa berada di beberapa kategori; remah dan label hanya muat
    // satu, jadi yang dipakai yang pertama menurut urutan pilihan pemilik.
    const utama = kategoriProduk(data, p.id)[0] || null;
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
        '<nav class="remah plat"><a href="/">Beranda</a> / ' +
          (utama ? '<a href="/kategori/' + esc(utama.slug) + '/">' + esc(utama.nama) + '</a> / ' : '') +
          esc(p.nama) + '</nav>' +
        '<div class="produk-atas">' +
          '<div class="galeri">' +
            '<div class="galeri-utama" id="galeri-utama">' +
              (habis ? '<span class="tanda habis">Habis</span>' : '') +
              gambarProduk(data, p, 800, '(max-width: 900px) 92vw, 45vw') +
            '</div>' +
            kecil +
          '</div>' +
          '<div class="beli">' +
            '<div>' +
              (utama ? '<span class="plat">' + esc(utama.nama) + '</span>' : '') +
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
    urlFoto: urlFoto, srcsetFoto: srcsetFoto, urlVideo: urlVideo, tipeVideo: tipeVideo,
    varianDari: varianDari, fotoDari: fotoDari,
    produkHabis: produkHabis, hargaTerendah: hargaTerendah,
    kategoriDaftar: kategoriDaftar, produkKategori: produkKategori,
    kataCari: kataCari,
    kategoriProduk: kategoriProduk,
    seksiDari: seksiDari, seksiSatu: seksiSatu, seksiTerisi: seksiTerisi,
    beranda: beranda, shop: shop, tentang: tentang, produk: produk,
    MARKETPLACE: MARKETPLACE
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else akar.RENDER = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
