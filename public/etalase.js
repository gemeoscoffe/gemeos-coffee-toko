/**
 * Yang tersisa untuk browser: memilih ukuran dan mengganti foto.
 *
 * Seluruh isi halaman sudah jadi sebelum dikirim (lihat build.js), jadi berkas
 * ini tidak mengambil data, tidak merakit halaman, dan tidak mengatur alamat.
 * Kalau gagal dimuat sekali pun, katalog tetap terbaca dan produk tetap bisa
 * dibeli -- yang hilang cuma kenyamanan mengganti ukuran tanpa memuat ulang.
 */

(function () {
  'use strict';

  function rp(n) {
    return 'Rp' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  // Menandai satu tombol terpilih dalam satu kelompok. Dipakai ukuran, gilingan
  // dan galeri, karena ketiganya perilakunya sama persis.
  function pilihSatu(kotak, tombol) {
    kotak.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b === tombol));
    });
  }

  const opsiUkuran = document.getElementById('opsi-ukuran');
  if (opsiUkuran) {
    const hargaTampil = document.getElementById('harga-tampil');
    const stokTampil = document.getElementById('stok-tampil');

    opsiUkuran.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-varian]');
      if (!b || b.disabled) return;
      pilihSatu(this, b);

      // Harga dan status dibawa di atribut tombolnya sendiri, jadi tidak perlu
      // bertanya ke server hanya untuk mengganti ukuran.
      const coret = b.dataset.coret;
      hargaTampil.innerHTML = '<b>' + rp(b.dataset.harga) + '</b>' +
        (coret ? '<s>' + rp(coret) + '</s>' : '');

      if (stokTampil) {
        stokTampil.innerHTML = b.dataset.habis === 'true'
          ? '<span class="habis-teks">Habis</span>'
          : '<span class="siap-teks">Siap dikirim</span>';
      }
    });
  }

  const opsiGiling = document.getElementById('opsi-giling');
  if (opsiGiling) {
    opsiGiling.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (b) pilihSatu(this, b);
    });
  }

  const galeriKecil = document.getElementById('galeri-kecil');
  if (galeriKecil) {
    const utama = document.getElementById('galeri-utama');
    galeriKecil.addEventListener('click', function (e) {
      const b = e.target.closest('button[data-foto]');
      if (!b) return;
      pilihSatu(this, b);
      const kecil = b.querySelector('img');
      const besar = utama.querySelector('img');
      // Kalau produknya belum berfoto, yang ada di kotak utama bukan gambar
      // melainkan biji gambaran -- tidak ada yang perlu ditukar.
      if (!kecil || !besar) return;
      // Jempolnya memuat berkas kecil; kotak utama harus mendapat yang besar,
      // alamatnya dibawa di data-besar. srcset dikosongkan supaya browser tidak
      // kembali memilih dari daftar foto sebelumnya.
      besar.removeAttribute('srcset');
      besar.src = kecil.dataset.besar || kecil.src;
      besar.alt = kecil.alt;
    });
  }
  // Tombol "kembali ke atas". Muncul setelah satu layar penuh tergulir -- di
  // halaman yang lebih pendek dari itu, tombolnya tidak menolong siapa pun dan
  // cuma menutupi isi.
  //
  // Kalau berkas ini gagal dimuat, tombolnya tidak pernah tampil sama sekali,
  // dan itu memang yang diinginkan: tombol mati lebih buruk daripada tombol
  // yang tidak ada. Tombol WhatsApp di sebelahnya tautan biasa dan tidak
  // bergantung pada JavaScript.
  const tombolAtas = document.querySelector('.apung-atas');
  if (tombolAtas) {
    let tampil = false;

    // Ambangnya menyesuaikan panjang halaman, bukan angka mati. Dengan 400 px
    // tetap, tombolnya tidak pernah muncul di /shop/ -- halaman itu hanya bisa
    // digulir sekitar 380 px di layar laptop, jadi ambangnya tidak pernah
    // terlampaui dan tombolnya terlihat rusak padahal cuma tidak kebagian
    // ruang. Setengah jarak gulir selalu bisa dicapai, berapa pun panjangnya,
    // dan di halaman depan yang panjang 400 px tetap yang berlaku.
    //
    // Halaman yang tidak bisa digulir sama sekali menghasilkan ambang 0, dan
    // scrollY tidak pernah lebih besar dari 0 -- jadi tombolnya diam.
    function ambang() {
      const sisa = document.documentElement.scrollHeight - window.innerHeight;
      return Math.min(400, sisa * 0.5);
    }

    // Gulir memicu puluhan kejadian per detik, jadi yang dijaga bukan seberapa
    // sering fungsinya dipanggil melainkan seberapa sering DOM disentuh: baca
    // scrollY itu murah, mengubah kelas tidak. Pembanding `tampil` membuat
    // classList dipanggil dua kali sepanjang halaman, bukan dua ratus kali.
    function periksa() {
      const perlu = window.scrollY > ambang();
      if (perlu === tampil) return;
      tampil = perlu;
      tombolAtas.classList.toggle('tampil', perlu);
    }

    window.addEventListener('scroll', periksa, { passive: true });
    window.addEventListener('resize', periksa, { passive: true });

    // Halaman yang dibuka lewat tautan berjangkar, atau dimuat ulang di tengah
    // gulungan, sudah tergulir sebelum kejadian scroll pertama muncul.
    periksa();

    tombolAtas.addEventListener('click', function () {
      const pelan = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: pelan ? 'auto' : 'smooth' });
    });
  }
  // Pengalih tema. Yang memasang tema saat halaman dibuka bukan berkas ini
  // melainkan skrip pendek di <head> (lihat build.js) -- kalau ditunda sampai
  // sini, layar sempat berkedip putih dulu. Yang dikerjakan di sini hanya
  // menanggapi klik.
  const tombolTema = document.querySelector('.tema');
  if (tombolTema) {
    const akar = document.documentElement;

    // Tema yang sedang terlihat, bukan yang tersimpan: selama pengunjung belum
    // pernah memilih, yang berlaku adalah setelan perangkatnya, dan tombolnya
    // harus membalik dari sana -- bukan dari 'terang' yang diasumsikan.
    function temaSekarang() {
      if (akar.dataset.tema) return akar.dataset.tema;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang';
    }

    tombolTema.addEventListener('click', function () {
      const baru = temaSekarang() === 'gelap' ? 'terang' : 'gelap';
      akar.dataset.tema = baru;
      // Peramban yang melarang penyimpanan tidak boleh membatalkan pergantian
      // temanya; yang hilang cuma ingatannya di kunjungan berikutnya.
      try { localStorage.setItem('tema', baru); } catch (e) {}
    });

    // Tidak ada pemantau prefers-color-scheme di sini dengan sengaja: selama
    // data-tema belum ada, CSS yang mengikuti setelan perangkat, dan ia sudah
    // berubah sendiri saat ponsel berpindah ke mode gelap di malam hari.
  }
  // Pencarian katalog. Terjadi seluruhnya di peramban atas kartu yang memang
  // sudah ada di halaman -- tidak ada indeks, tidak ada permintaan ke server,
  // dan hasilnya berubah selagi diketik. Katalog toko ini berisi belasan
  // produk; membangun indeks untuk itu lebih mahal daripada memindainya.
  //
  // Kalau berkas ini gagal dimuat, kotak carinya tetap tersembunyi dan katalog
  // tampil utuh. Kotak cari yang tidak bisa mencari lebih buruk daripada tidak
  // ada kotak sama sekali.
  const kotakCari = document.getElementById('cari-produk');
  const gridKatalog = document.getElementById('grid-katalog');
  if (kotakCari && gridKatalog) {
    const kartu = Array.prototype.slice.call(gridKatalog.querySelectorAll('.kartu'));
    const hitung = document.getElementById('cari-hitung');
    const kosong = document.getElementById('cari-kosong');
    kotakCari.closest('.cari').hidden = false;

    function saring() {
      // Dipecah per spasi supaya "puntang 1 kg" tetap ketemu walau kedua kata
      // itu tidak pernah bersebelahan di teks kartunya.
      const kata = kotakCari.value.toLowerCase().split(/\s+/).filter(Boolean);
      let tampil = 0;

      kartu.forEach(function (k) {
        const teks = k.dataset.cari || '';
        const cocok = kata.every(function (x) { return teks.indexOf(x) !== -1; });
        k.hidden = !cocok;
        if (cocok) tampil++;
      });

      if (hitung) hitung.textContent = tampil + ' produk';
      if (kosong) kosong.hidden = tampil > 0;
    }

    kotakCari.addEventListener('input', saring);

    // Pencarian ikut ke alamat supaya hasilnya bisa dibagikan dan tidak hilang
    // waktu halaman dimuat ulang. replaceState, bukan pushState: tiap huruf
    // yang diketik tidak pantas jadi satu langkah di tombol Kembali.
    kotakCari.addEventListener('input', function () {
      const url = new URL(window.location.href);
      if (kotakCari.value) url.searchParams.set('q', kotakCari.value);
      else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    });

    const awal = new URL(window.location.href).searchParams.get('q');
    if (awal) { kotakCari.value = awal; saring(); }
  }
  // Panah barisan produk di halaman depan.
  //
  // Barisannya sudah bisa digulir tanpa berkas ini -- dengan jari, roda, atau
  // papan ketik. Yang ditambahkan di sini cuma dua tombol, dan tombolnya baru
  // muncul kalau barisannya memang lebih lebar dari layar. Panah yang tidak
  // menggeser apa pun membuat orang mengira halamannya rusak.
  const rel = document.getElementById('sorot-rel');
  if (rel) {
    const kiri = rel.parentElement.querySelector('.geser-panah.kiri');
    const kanan = rel.parentElement.querySelector('.geser-panah.kanan');

    // Satu langkah = satu kartu, diukur dari kartu yang benar-benar ada supaya
    // tidak perlu menebak lebarnya di tiap ukuran layar.
    function langkah() {
      const k = rel.querySelector('.kartu');
      if (!k) return rel.clientWidth;
      const jarak = parseFloat(getComputedStyle(rel).columnGap) || 0;
      return k.getBoundingClientRect().width + jarak;
    }

    // Sisa geser yang lebih kecil dari ini dianggap tidak ada. Barisan yang
    // hampir muat masih bisa digeser beberapa piksel, dan panah yang cuma
    // menggeser sejumput itu terasa rusak, bukan terasa berfungsi.
    const AMBANG_GESER = 48;

    function perbarui() {
      const bisaGeser = rel.scrollWidth - rel.clientWidth > AMBANG_GESER;
      kiri.hidden = kanan.hidden = !bisaGeser;
      if (!bisaGeser) return;
      // Satu piksel toleransi: lebar hasil hitungan peramban jarang bulat, dan
      // tanpa itu panah kanan tidak pernah mati di ujung.
      kiri.disabled = rel.scrollLeft <= 1;
      kanan.disabled = rel.scrollLeft >= rel.scrollWidth - rel.clientWidth - 1;
    }

    kiri.addEventListener('click', function () { rel.scrollLeft -= langkah(); });
    kanan.addEventListener('click', function () { rel.scrollLeft += langkah(); });
    rel.addEventListener('scroll', perbarui, { passive: true });
    window.addEventListener('resize', perbarui, { passive: true });

    // Foto kartu dimuat malas, jadi scrollWidth masih bisa bertambah setelah
    // halaman selesai dibaca; tanpa pemeriksaan ulang ini panahnya kadang
    // tidak pernah muncul di sambungan yang lambat.
    window.addEventListener('load', perbarui);
    perbarui();
  }
})();
