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
})();
