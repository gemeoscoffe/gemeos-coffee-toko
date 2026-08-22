/**
 * Isi halaman depan dan halaman Tentang Kami. Bagian kedua dari /admin.
 *
 * Katalog punya bentuk yang tegas -- produk, varian, foto -- dan `admin-katalog.js`
 * mengurusnya. Yang di sini bentuknya justru longgar: sepotong teks, mungkin
 * sebuah foto, mungkin sebuah tombol, diulang beberapa kali. Semuanya satu tabel
 * (`web_seksi`) dan satu halaman ini, karena membuat satu tabel dan satu layar
 * per bagian halaman berarti menambah keduanya tiap kali halaman depan tumbuh
 * satu baris.
 *
 * Yang menentukan bentuk tiap bagian adalah `SEKSI_BENTUK` di bawah: kolom mana
 * yang muncul, apa namanya di layar, dan apakah bagian itu boleh punya lebih
 * dari satu baris. Menambah bagian baru ke halaman depan berarti menambah satu
 * entri di sana dan satu fungsi gambar di `render.js` -- tidak ada tabel baru,
 * tidak ada migrasi.
 *
 * Semua kolom tersimpan sendiri saat kotaknya ditinggalkan, sama seperti tabel
 * varian. Tidak ada tombol Simpan yang bisa terlupa.
 */

let SEKSI = [];

const SEKSI_BUCKET = 'produk';

// Bagian yang belum diisi tetap ada barisnya di sini, tapi `aktif = false`, dan
// etalase tidak menggambar yang tidak aktif. Jadi halaman depan tidak pernah
// menampilkan judul tanpa isi hanya karena barisnya sudah dibuat.
const SEKSI_BENTUK = {
  'home/hero': {
    nama: 'Hero halaman depan',
    catatan: 'Yang pertama dilihat orang yang membuka gemeoscoffee.com. Videonya jadi latar di belakang tulisan &mdash; tanpa suara, berulang sendiri. <b>Gambar pengganti</b> yang tampil selama videonya belum termuat, jadi pilih satu frame dari video yang sama supaya perpindahannya tidak terasa.',
    banyak: false,
    kolom: [
      { k: 'subjudul', label: 'Baris kecil di atas judul', ph: 'Roastery · Gunung Puntang, Jawa Barat' },
      { k: 'judul', label: 'Judul besar', ph: 'Kopi yang baru disangrai, bukan yang lama menunggu' },
      { k: 'teks', label: 'Kalimat pembuka', panjang: true, ph: 'Satu-dua kalimat tentang kopinya.' },
      { k: 'tombol_label', label: 'Teks tombol', ph: 'Lihat katalog', kecil: true },
      { k: 'tombol_url', label: 'Tujuan tombol', ph: '/shop/', kecil: true }
    ],
    video: 'Video latar',
    foto: 'Gambar pengganti video'
  },

  'home/cerita': {
    nama: 'Cerita singkat',
    catatan: 'Perkenalan pendek di halaman depan, dengan tombol ke halaman Tentang Kami. Tulis yang benar-benar terjadi &mdash; ini bagian yang dibaca orang sebelum memutuskan percaya atau tidak.',
    banyak: false,
    kolom: [
      { k: 'subjudul', label: 'Label kecil', ph: 'Tentang kami', kecil: true },
      { k: 'judul', label: 'Judul', ph: 'Mulai dari satu drum sangrai' },
      { k: 'teks', label: 'Isi cerita', panjang: true, ph: 'Pisahkan paragraf dengan satu baris kosong.' },
      { k: 'tombol_label', label: 'Teks tombol', ph: 'Selengkapnya', kecil: true },
      { k: 'tombol_url', label: 'Tujuan tombol', ph: '/tentang/', kecil: true }
    ],
    foto: 'Foto pendamping'
  },

  'home/spanduk': {
    nama: 'Spanduk gambar',
    catatan: 'Gambar lebar di bawah hero &mdash; penghargaan, promo, atau pengumuman. Satu biasanya cukup; ' +
      'dua spanduk bertumpuk mendorong katalog turun jauh dari layar pertama. ' +
      '<b>Keterangan gambar wajib diisi.</b> Semua tulisan di dalam spanduk tidak terbaca Google, tidak ' +
      'terbaca pembaca layar, dan hilang sama sekali kalau gambarnya gagal termuat &mdash; jadi tulis di ' +
      'situ apa yang tertulis di gambarnya. Ukuran yang bagus sekitar 1600 piksel lebar.',
    banyak: true,
    kolom: [
      { k: 'judul', label: 'Keterangan gambar', ph: 'Juara 1 Tokopedia Paling Nyam 2024' },
      { k: 'subjudul', label: 'Ketik "penuh" untuk melebar sampai tepi layar', ph: '', kecil: true },
      { k: 'tombol_url', label: 'Dibuka ke mana kalau diklik (opsional)', ph: '/shop/', kecil: true }
    ],
    foto: 'Gambar spanduk'
  },

  'home/spanduk-geser': {
    nama: 'Spanduk bergulir',
    catatan: 'Beberapa spanduk dalam satu barisan yang bisa digeser, dengan panah kiri-kanan. Letaknya di ' +
      'bawah bagian Eksklusif. Panahnya hanya muncul kalau spanduknya lebih dari yang muat di layar &mdash; ' +
      'satu spanduk saja tidak akan menampilkan panah, dan memang tidak perlu. ' +
      '<b>Keterangan gambar wajib diisi</b>, alasannya sama dengan spanduk di atas.',
    banyak: true,
    kolom: [
      { k: 'judul', label: 'Keterangan gambar', ph: 'Promo gratis ongkir Agustus' },
      { k: 'tombol_url', label: 'Dibuka ke mana kalau diklik (opsional)', ph: '/shop/', kecil: true }
    ],
    foto: 'Gambar spanduk'
  },

  'home/eksklusif': {
    nama: 'Judul bagian Eksklusif',
    catatan: 'Judul besar di sebelah kiri daftar alasan, tepat di bawah Produk terlaris. Isinya di sini ' +
      'hanya judulnya; daftar alasannya diatur di <b>Kenapa beli langsung di sini</b> di bawah. ' +
      'Selama judul ini kosong, daftar alasannya tetap tampil dengan bentuk lamanya.',
    banyak: false,
    kolom: [
      { k: 'subjudul', label: 'Label kecil', ph: 'Hanya di sini', kecil: true },
      { k: 'judul', label: 'Judul besar', ph: 'Eksklusif di toko kami' },
      { k: 'teks', label: 'Satu-dua kalimat (opsional)', panjang: true, ph: '' }
    ]
  },

  'home/alasan': {
    nama: 'Kenapa beli langsung di sini',
    catatan: 'Daftar alasan di bawah <b>Produk terlaris</b>. Kalau <b>Judul bagian Eksklusif</b> di atas ' +
      'sudah diisi, daftar ini tampil di sebelah kanannya sebagai baris bertumpuk. Kalau belum, daftar ini ' +
      'tampil sendirian dengan bentuk lamanya: pita teks kalau tidak ada yang berfoto, kartu bergambar kalau ' +
      'ada. Foto tidak dipakai di bentuk bersebelahan.',
    banyak: true,
    kolom: [
      { k: 'judul', label: 'Judul kartu', ph: 'Harga tanpa potongan marketplace' },
      { k: 'teks', label: 'Satu-dua kalimat', panjang: true, ph: '' },
      { k: 'tombol_label', label: 'Teks tombol (opsional)', ph: '', kecil: true },
      { k: 'tombol_url', label: 'Tujuan tombol', ph: '/shop/', kecil: true }
    ],
    foto: 'Foto kartu'
  },

  'home/testimoni': {
    nama: 'Testimoni pembeli',
    catatan: 'Kutipan pembeli sungguhan &mdash; boleh disalin dari ulasan Shopee, TikTok atau chat WhatsApp. Tanda petiknya dipasang otomatis, tidak perlu diketik.',
    banyak: true,
    kolom: [
      { k: 'teks', label: 'Kutipannya', panjang: true, ph: 'Kopinya wangi, tidak pahit berlebihan...' },
      { k: 'judul', label: 'Nama pembeli', ph: 'Rina' },
      { k: 'subjudul', label: 'Kota atau keterangan', ph: 'Bandung · Shopee', kecil: true }
    ]
  },

  'home/lokasi': {
    nama: 'Lokasi dan kontak',
    catatan: 'Alamat yang boleh dilihat umum. Tautan WhatsApp bentuknya <code>https://wa.me/62812xxxxxxx</code> &mdash; nomornya diawali 62, tanpa tanda plus dan tanpa nol di depan.',
    banyak: true,
    kolom: [
      { k: 'judul', label: 'Nama tempat', ph: 'Roastery Gemeos Coffee' },
      { k: 'teks', label: 'Alamat', panjang: true, ph: '' },
      { k: 'tombol_label', label: 'Tombol 1', ph: 'Google Maps', kecil: true },
      { k: 'tombol_url', label: 'Tautan tombol 1', ph: 'https://maps.app.goo.gl/...', kecil: true },
      { k: 'tombol2_label', label: 'Tombol 2', ph: 'WhatsApp', kecil: true },
      { k: 'tombol2_url', label: 'Tautan tombol 2', ph: 'https://wa.me/62...', kecil: true }
    ]
  },

  'tentang/hero': {
    nama: 'Kepala halaman Tentang Kami',
    catatan: 'Judul dan paragraf pembuka halaman /tentang/. Selama seluruh halaman ini kosong, /tentang/ hanya menampilkan pemberitahuan bahwa halamannya sedang ditulis.',
    banyak: false,
    kolom: [
      { k: 'subjudul', label: 'Label kecil', ph: 'Tentang Kami', kecil: true },
      { k: 'judul', label: 'Judul halaman', ph: '' },
      { k: 'teks', label: 'Paragraf pembuka', panjang: true, ph: '' }
    ],
    foto: 'Foto lebar di bawah judul'
  },

  'tentang/isi': {
    nama: 'Bagian Tentang Kami',
    catatan: 'Bagian bertumpuk di bawah kepala halaman. Foto berselang-seling kiri-kanan dengan sendirinya.',
    banyak: true,
    kolom: [
      { k: 'judul', label: 'Judul bagian', ph: '' },
      { k: 'teks', label: 'Isi', panjang: true, ph: 'Pisahkan paragraf dengan satu baris kosong.' },
      { k: 'tombol_label', label: 'Teks tombol (opsional)', ph: '', kecil: true },
      { k: 'tombol_url', label: 'Tujuan tombol', ph: '', kecil: true }
    ],
    foto: 'Foto bagian'
  }
};

// Urutan tampil di layar sengaja mengikuti urutan bagian itu di halaman aslinya,
// bukan abjad: yang sedang disunting jadi mudah dicocokkan dengan yang dilihat
// di tab sebelah.
const SEKSI_LAYAR = {
  'toko-seksi-depan':   ['home/hero', 'home/spanduk', 'home/eksklusif', 'home/alasan',
                         'home/spanduk-geser', 'home/cerita', 'home/testimoni', 'home/lokasi'],
  'toko-seksi-tentang': ['tentang/hero', 'tentang/isi']
};

function seksiKunci(s) { return s.halaman + '/' + s.blok; }

function seksiBarisDari(kunci) {
  return SEKSI.filter(function(s) { return seksiKunci(s) === kunci; })
              .sort(function(a, b) { return a.urutan - b.urutan; });
}

function seksiUrlFoto(s, lebarDiminta) {
  const lebar = s.foto_lebar || [];
  const dasar = SUPABASE_URL + '/storage/v1/object/public/' + SEKSI_BUCKET + '/' + s.foto_path;
  if (!lebar.length) return dasar;
  const urut = lebar.slice().sort(function(a, b) { return a - b; });
  const pas = urut.find(function(w) { return w >= (lebarDiminta || 0); }) || urut[urut.length - 1];
  return dasar + '-' + pas + '.webp';
}

function seksiBerkasFoto(s) {
  const lebar = s.foto_lebar || [];
  if (!lebar.length) return s.foto_path ? [s.foto_path] : [];
  return lebar.map(function(w) { return s.foto_path + '-' + w + '.webp'; });
}

// Semua berkas milik satu baris, foto dan video sekaligus. Dipakai waktu barisnya
// dihapus: menghapus barisnya saja meninggalkan berkas yang tidak dirujuk siapa
// pun di bucket dan tidak akan pernah ditemukan lagi.
function seksiSemuaBerkas(s) {
  return seksiBerkasFoto(s).concat(s.video_path ? [s.video_path] : []);
}

// ---------------------------------------------------------------------------
// Muat dan gambar
// ---------------------------------------------------------------------------

async function loadSeksiPage() {
  const layar = Object.keys(SEKSI_LAYAR).map(function(id) { return document.getElementById(id); });
  if (layar.some(function(el) { return !el; })) return;

  layar.forEach(function(el) { el.innerHTML = '<p class="muted">Memuat...</p>'; });
  try {
    SEKSI = await sbSelect('web_seksi', 'select=*&order=halaman,blok,urutan');
    renderSeksi();
  } catch (err) {
    layar.forEach(function(el) {
      el.innerHTML = '<p class="muted">Gagal memuat: ' + esc(err.message) + '</p>';
    });
  }
}

function renderSeksiKotak(s, kolom) {
  const nilai = s[kolom.k] === null || s[kolom.k] === undefined ? '' : s[kolom.k];
  const atribut = 'class="seksi-isi" data-id="' + s.id + '" data-kolom="' + kolom.k + '" ' +
    'placeholder="' + esc(kolom.ph || '') + '"';

  return '<div style="' + (kolom.kecil ? 'width:230px' : 'flex:1;min-width:260px') + '">' +
    '<label>' + kolom.label + '</label>' +
    (kolom.panjang
      ? '<textarea ' + atribut + ' rows="4">' + esc(nilai) + '</textarea>'
      : '<input ' + atribut + ' value="' + esc(nilai) + '">') +
  '</div>';
}

function renderSeksiFoto(s, bentuk) {
  if (!bentuk.foto) return '';

  return '<div class="row" style="align-items:flex-end">' +
      '<div><label>' + bentuk.foto + '</label>' +
        '<input type="file" class="seksi-foto-file" data-id="' + s.id + '" accept="image/*"></div>' +
      (s.foto_path
        ? '<div class="seksi-pratinjau">' +
            '<img src="' + esc(seksiUrlFoto(s, 400)) + '" alt="" loading="lazy">' +
            '<button class="btn-secondary seksi-foto-hapus" data-id="' + s.id + '">Hapus Foto</button>' +
          '</div>'
        : '<p class="muted" style="font-size:13px;margin:0 0 6px">Belum ada foto.</p>') +
    '</div>' +
    '<p class="seksi-status" data-id="' + s.id + '" style="margin:6px 0 0;font-size:13px"></p>';
}

// Batas 45 MB, bukan angka bulat yang enak dilihat: Supabase menolak unggahan
// di atas 50 MB, dan menolaknya di sini -- sebelum berkasnya berjalan lewat
// jaringan selama beberapa menit -- lebih baik daripada galat di ujungnya.
//
// Yang lebih menentukan bukan batas itu melainkan ukuran sebenarnya: video latar
// diunduh tiap kali halaman depan dibuka, oleh pembeli yang sebagian besar
// datang dari tautan TikTok dengan kuota sendiri. 3-5 MB masih sopan, 25 MB
// tidak.
const SEKSI_VIDEO_MAKS = 45 * 1024 * 1024;

function renderSeksiVideo(s, bentuk) {
  if (!bentuk.video) return '';

  return '<div class="row" style="align-items:flex-end">' +
      '<div><label>' + bentuk.video + '</label>' +
        '<input type="file" class="seksi-video-file" data-id="' + s.id + '" accept="video/mp4,video/webm"></div>' +
      (s.video_path
        ? '<div class="seksi-pratinjau">' +
            '<video src="' + esc(SUPABASE_URL + '/storage/v1/object/public/' + SEKSI_BUCKET + '/' + s.video_path) +
              '" muted playsinline preload="metadata"></video>' +
            '<button class="btn-secondary seksi-video-hapus" data-id="' + s.id + '">Hapus Video</button>' +
          '</div>'
        : '<p class="muted" style="font-size:13px;margin:0 0 6px">Belum ada video. Tanpa video, hero tampil polos dengan garis konturnya.</p>') +
    '</div>' +
    '<p class="note" style="margin:6px 0 0">Tanpa suara dan berulang sendiri &mdash; audio di dalamnya tidak akan pernah terdengar, ' +
      'jadi lebih baik dibuang sebelum diunggah. Usahakan di bawah 5 MB: berkas ini diunduh tiap kali halaman depan dibuka.</p>' +
    '<p class="seksi-video-status" data-id="' + s.id + '" style="margin:6px 0 0;font-size:13px"></p>';
}

function renderSeksiBaris(s, bentuk, nomor) {
  return '<div class="seksi-baris">' +
    '<div class="seksi-kepala">' +
      '<span class="plat-admin">' + (bentuk.banyak ? '#' + nomor : 'Bagian') + '</span>' +
      '<label class="toko-switch" title="Tampilkan bagian ini di website">' +
        '<input type="checkbox" class="seksi-aktif" data-id="' + s.id + '"' + (s.aktif ? ' checked' : '') + '>' +
      '</label>' +
      '<span class="muted" style="font-size:12px">' + (s.aktif ? 'Tampil' : 'Disembunyikan') + '</span>' +
      (bentuk.banyak
        ? '<div style="margin-left:auto;display:flex;gap:8px;align-items:center">' +
            '<label style="margin:0">Urutan</label>' +
            '<input class="seksi-isi" type="number" data-id="' + s.id + '" data-kolom="urutan" ' +
              'value="' + Number(s.urutan) + '" style="width:74px">' +
            '<button class="btn-secondary seksi-hapus" data-id="' + s.id + '">Hapus</button>' +
          '</div>'
        : '') +
    '</div>' +
    '<div class="row">' + bentuk.kolom.map(function(k) { return renderSeksiKotak(s, k); }).join('') + '</div>' +
    renderSeksiVideo(s, bentuk) +
    renderSeksiFoto(s, bentuk) +
  '</div>';
}

function renderSeksiKartu(kunci) {
  const bentuk = SEKSI_BENTUK[kunci];
  const baris = seksiBarisDari(kunci);

  return '<div class="card">' +
    '<h3>' + bentuk.nama + '</h3>' +
    '<p class="card-note">' + bentuk.catatan + '</p>' +
    (baris.length
      ? baris.map(function(s, i) { return renderSeksiBaris(s, bentuk, i + 1); }).join('')
      : '<p class="muted">Belum ada isinya.</p>') +
    (bentuk.banyak
      ? '<button class="btn-secondary seksi-tambah" data-kunci="' + kunci + '" style="margin-top:10px">' +
          'Tambah ' + bentuk.nama + '</button>'
      : '') +
  '</div>';
}

function renderSeksi() {
  Object.keys(SEKSI_LAYAR).forEach(function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = SEKSI_LAYAR[id].map(renderSeksiKartu).join('');
    wireSeksi(el);
  });
}

function wireSeksi(el) {

  el.querySelectorAll('.seksi-isi').forEach(function(i) {
    i.addEventListener('change', function() {
      setSeksiKolom(Number(i.dataset.id), i.dataset.kolom, i.value);
    });
  });
  el.querySelectorAll('.seksi-aktif').forEach(function(c) {
    c.addEventListener('change', function() { setSeksiAktif(Number(c.dataset.id), c.checked); });
  });
  el.querySelectorAll('.seksi-hapus').forEach(function(b) {
    b.addEventListener('click', function() { hapusSeksi(Number(b.dataset.id)); });
  });
  el.querySelectorAll('.seksi-tambah').forEach(function(b) {
    b.addEventListener('click', function() { tambahSeksi(b.dataset.kunci); });
  });
  el.querySelectorAll('.seksi-foto-file').forEach(function(i) {
    i.addEventListener('change', function() { unggahSeksiFoto(Number(i.dataset.id), i); });
  });
  el.querySelectorAll('.seksi-foto-hapus').forEach(function(b) {
    b.addEventListener('click', function() { hapusSeksiFoto(Number(b.dataset.id)); });
  });
  el.querySelectorAll('.seksi-video-file').forEach(function(i) {
    i.addEventListener('change', function() { unggahSeksiVideo(Number(i.dataset.id), i); });
  });
  el.querySelectorAll('.seksi-video-hapus').forEach(function(b) {
    b.addEventListener('click', function() { hapusSeksiVideo(Number(b.dataset.id)); });
  });
}

// ---------------------------------------------------------------------------
// Simpan
// ---------------------------------------------------------------------------

// Teks kosong disimpan null, bukan string kosong. Etalase memutuskan menggambar
// atau tidak dengan memeriksa apakah kolomnya berisi; string kosong lolos
// pemeriksaan itu dan menghasilkan judul setinggi satu baris tanpa satu huruf
// pun di dalamnya.
async function setSeksiKolom(id, kolom, teks) {
  const s = SEKSI.find(function(x) { return x.id === id; });
  const bersih = String(teks).trim();

  let nilai;
  if (kolom === 'urutan') {
    nilai = Math.max(0, Math.floor(Number(bersih) || 0));
  } else {
    nilai = bersih === '' ? null : bersih;
  }

  const sekarang = s && (s[kolom] === null || s[kolom] === undefined) ? '' : String(s ? s[kolom] : '');
  if (sekarang === String(nilai === null ? '' : nilai)) return;

  const isi = {};
  isi[kolom] = nilai;

  try {
    await sbWrite('PATCH', 'web_seksi', 'id=eq.' + id, isi);
    if (s) s[kolom] = nilai;
    if (kolom === 'urutan') renderSeksi();
  } catch (err) {
    alert('Gagal menyimpan: ' + err.message);
    await loadSeksiPage();
  }
}

async function setSeksiAktif(id, aktif) {
  try {
    await sbWrite('PATCH', 'web_seksi', 'id=eq.' + id, { aktif: aktif });
    const s = SEKSI.find(function(x) { return x.id === id; });
    if (s) s.aktif = aktif;
    renderSeksi();
  } catch (err) {
    alert('Gagal mengubah: ' + err.message);
    await loadSeksiPage();
  }
}

async function tambahSeksi(kunci) {
  const pisah = kunci.split('/');
  const baris = seksiBarisDari(kunci);
  const urutan = baris.length ? Math.max.apply(null, baris.map(function(s) { return s.urutan; })) + 1 : 1;

  try {
    // Baris baru dibuat tersembunyi. Bagian kosong yang langsung tampil berarti
    // website berubah sebelum ada yang mengetik apa pun ke dalamnya.
    await sbWrite('POST', 'web_seksi', '', {
      halaman: pisah[0], blok: pisah[1], urutan: urutan, aktif: false
    });
    await loadSeksiPage();
  } catch (err) {
    alert('Gagal menambah: ' + err.message);
  }
}

async function hapusSeksi(id) {
  const s = SEKSI.find(function(x) { return x.id === id; });
  if (!s) return;
  if (!confirm('Hapus bagian ini' + (s.judul ? ' ("' + s.judul + '")' : '') + '?')) return;

  try {
    for (const berkas of seksiSemuaBerkas(s)) await hapusBerkasFoto(berkas);
    await sbDelete('web_seksi', 'id=eq.' + id);
    await loadSeksiPage();
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

// ---------------------------------------------------------------------------
// Foto
// ---------------------------------------------------------------------------

// Sama seperti foto produk: dikecilkan di browser dulu, tiga ukuran, WebP. Foto
// dari kamera HP bisa 4 MB dan 4000 piksel, dan mengirimnya apa adanya ke
// pengunjung yang membuka lewat data seluler adalah ongkos yang tidak pernah
// mereka minta.
async function unggahSeksiFoto(id, input) {
  const s = SEKSI.find(function(x) { return x.id === id; });
  const file = (input.files || [])[0];
  const status = document.querySelector('.seksi-status[data-id="' + id + '"]');
  if (!s || !file) return;

  if (file.size > 25 * 1024 * 1024) {
    if (status) tokoStatus(status, false, 'Foto di atas 25 MB tidak diunggah.');
    input.value = '';
    return;
  }

  const lama = seksiBerkasFoto(s);
  const dasar = 'seksi/' + id + '/' + Date.now();
  const lebarJadi = [];

  try {
    for (const target of LEBAR_FOTO) {
      if (status) { status.style.color = ''; status.textContent = 'Memproses ' + target + 'px...'; }
      const hasil = await ubahUkuranFoto(file, target);
      // Foto yang aslinya lebih kecil menghasilkan lebar yang sama untuk dua
      // target; yang kedua tidak perlu diunggah lagi.
      if (lebarJadi.indexOf(hasil.lebar) !== -1) continue;
      await unggahBerkasFoto(dasar + '-' + hasil.lebar + '.webp', hasil.blob);
      lebarJadi.push(hasil.lebar);
    }

    await sbWrite('PATCH', 'web_seksi', 'id=eq.' + id, { foto_path: dasar, foto_lebar: lebarJadi });

    // Berkas lama dihapus setelah barisnya menunjuk ke yang baru, bukan sebelum.
    // Urutan sebaliknya meninggalkan halaman yang menunjuk foto yang sudah tidak
    // ada kalau penyimpanannya gagal di tengah jalan.
    for (const berkas of lama) await hapusBerkasFoto(berkas);

    input.value = '';
    await loadSeksiPage();
  } catch (err) {
    if (status) tokoStatus(status, false, err.message);
    input.value = '';
  }
}

// Video diunggah apa adanya. Foto dikecilkan dulu di browser karena `canvas`
// memang bisa menggambar ulang gambar; untuk video tidak ada padanannya yang
// murah, dan menyandikan ulang video di browser berarti menahan tab pemiliknya
// selama beberapa menit. Yang dipilih pemilik itulah yang naik -- karena itu
// catatannya berkata jelas berapa besar yang pantas.
async function unggahSeksiVideo(id, input) {
  const s = SEKSI.find(function(x) { return x.id === id; });
  const file = (input.files || [])[0];
  const status = document.querySelector('.seksi-video-status[data-id="' + id + '"]');
  if (!s || !file) return;

  if (file.size > SEKSI_VIDEO_MAKS) {
    if (status) tokoStatus(status, false, 'Video di atas 45 MB tidak bisa diunggah. Kompres dulu.');
    input.value = '';
    return;
  }

  // Ekstensi diambil dari nama berkasnya karena alamat video ikut apa adanya ke
  // halaman -- tidak ada daftar ukuran seperti foto yang bisa menyusunnya.
  const ekor = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const lama = s.video_path;
  const jalur = 'seksi/' + id + '/video-' + Date.now() + '.' + ekor;

  try {
    if (status) { status.style.color = ''; status.textContent = 'Mengunggah video...'; }
    await unggahBerkasFoto(jalur, file);
    await sbWrite('PATCH', 'web_seksi', 'id=eq.' + id, { video_path: jalur });

    // Berkas lama dihapus setelah barisnya menunjuk ke yang baru. Urutan
    // sebaliknya meninggalkan halaman yang menunjuk video yang sudah tidak ada
    // kalau penyimpanannya gagal di tengah jalan.
    if (lama) await hapusBerkasFoto(lama);

    input.value = '';
    await loadSeksiPage();
  } catch (err) {
    if (status) tokoStatus(status, false, err.message);
    input.value = '';
  }
}

async function hapusSeksiVideo(id) {
  const s = SEKSI.find(function(x) { return x.id === id; });
  if (!s || !s.video_path || !confirm('Hapus video latar hero?')) return;

  try {
    await hapusBerkasFoto(s.video_path);
    await sbWrite('PATCH', 'web_seksi', 'id=eq.' + id, { video_path: null });
    await loadSeksiPage();
  } catch (err) {
    alert('Gagal menghapus video: ' + err.message);
  }
}

async function hapusSeksiFoto(id) {
  const s = SEKSI.find(function(x) { return x.id === id; });
  if (!s || !s.foto_path || !confirm('Hapus foto bagian ini?')) return;

  try {
    for (const berkas of seksiBerkasFoto(s)) await hapusBerkasFoto(berkas);
    await sbWrite('PATCH', 'web_seksi', 'id=eq.' + id, { foto_path: null, foto_lebar: null });
    await loadSeksiPage();
  } catch (err) {
    alert('Gagal menghapus foto: ' + err.message);
  }
}
