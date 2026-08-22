/**
 * Perpindahan halaman di /admin.
 *
 * Bentuknya sengaja sama dengan dashboard di gemeos-coffee-v2 -- sidebar
 * berkelompok, satu `div.content` per halaman, judul dan satu kalimat
 * keterangan di topbar. Dua situs ini dikelola orang yang sama dari mesin yang
 * sama; menu yang berbeda cara kerjanya di dua tempat berarti dua hal yang
 * harus diingat, bukan satu.
 *
 * Semua halaman sudah ada di HTML sejak awal dan hanya disembunyikan. Tidak ada
 * yang dimuat ulang saat berpindah: seluruh isi /admin cuma empat tabel kecil
 * yang sudah diambil sekali waktu masuk, dan memuat ulang tiap pindah menu
 * hanya menambah jeda tanpa menambah kebenaran.
 */

const HALAMAN_ADMIN = {
  produk:  { judul: 'Produk & Varian',  sub: 'Yang dijual, ukurannya, harganya, stoknya, fotonya' },
  ongkir:  { judul: 'Ongkos Kirim',     sub: 'Tarif per zona dan ambang gratis ongkir' },
  depan:   { judul: 'Halaman Depan',    sub: 'Hero, cerita, kartu alasan, testimoni dan lokasi di gemeoscoffee.com' },
  tentang: { judul: 'Tentang Kami',     sub: 'Isi halaman /tentang/' }
};

function showHalamanAdmin(nama) {
  Object.keys(HALAMAN_ADMIN).forEach(function(p) {
    document.getElementById('page-' + p).classList.toggle('hidden', p !== nama);
    document.getElementById('nav-' + p).classList.toggle('active', p === nama);
  });
  document.getElementById('page-title-text').textContent = HALAMAN_ADMIN[nama].judul;
  document.getElementById('page-subtitle').textContent = HALAMAN_ADMIN[nama].sub;
}

// Di bawah 900px sidebarnya jadi laci. Harus tertutup tiap kali berpindah;
// kalau tidak, menyentuh menu di HP mengganti halaman di belakang panel yang
// masih menutupinya.
function setSidebarAdmin(buka) {
  document.querySelector('.sidebar').classList.toggle('open', buka);
  document.getElementById('sidebar-overlay').classList.toggle('hidden', !buka);
}

document.addEventListener('DOMContentLoaded', function() {
  Object.keys(HALAMAN_ADMIN).forEach(function(p) {
    document.getElementById('nav-' + p).addEventListener('click', function(e) {
      e.preventDefault();
      showHalamanAdmin(p);
      setSidebarAdmin(false);
    });
  });

  document.getElementById('nav-toggle').addEventListener('click', function() {
    setSidebarAdmin(!document.querySelector('.sidebar').classList.contains('open'));
  });
  document.getElementById('sidebar-overlay').addEventListener('click', function() { setSidebarAdmin(false); });
});
