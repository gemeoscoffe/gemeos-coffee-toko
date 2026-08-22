/**
 * Halaman yang isinya tulisan, bukan katalog: pengiriman, retur, syarat,
 * privasi, kontak.
 *
 * Ditaruh di berkas sendiri supaya mengubah kalimatnya tidak berarti mengubah
 * mesin pembangun halaman. Suatu saat isinya bisa pindah ke database supaya
 * bisa disunting dari /admin, tapi selama halamannya masih lima dan jarang
 * berubah, satu berkas lebih jujur daripada tabel yang menunggu diisi.
 *
 * Angka-angka di sini bukan lagi rancangan. Pemilik menetapkannya pada
 * 2026-08-22, waktu menyiapkan pendaftaran payment gateway:
 *
 *   - Pesanan diserahkan ke kurir 1-3 hari kerja setelah pembayaran diterima.
 *   - Paket yang hilang atau rusak di tangan kurir diganti toko lebih dulu;
 *     urusan klaim ke ekspedisi jadi urusan toko, bukan pembeli.
 *   - Klaim kerusakan wajib disertai video buka paket tanpa potongan, paling
 *     lambat 2 x 24 jam sejak paket diterima menurut catatan ekspedisi.
 *
 * Ketiganya mengikat penjual saat ada sengketa. Angkanya muncul di lebih dari
 * satu halaman, jadi kalau berubah, ubah semuanya sekaligus di berkas ini.
 *
 * Kerangka halaman Syarat & Ketentuan mengikuti template Retail dari Midtrans
 * (14 pasal), dengan empat pasal yang sengaja tidak disalin apa adanya karena
 * templatenya ditulis untuk toko pakaian: pendaftaran akun (toko ini pakai
 * checkout tamu), syarat retur berbasis label harga yang masih menempel,
 * risiko kehilangan yang dilempar ke pembeli, dan berhenti langganan lewat
 * halaman akun yang tidak ada di sini.
 *
 * YANG BELUM ADA DAN TIDAK BOLEH DIKARANG: alamat usaha, nomor P-IRT, dan
 * nomor sertifikat halal. Ketiganya menaikkan kepercayaan pembeli dan
 * mempercepat verifikasi gateway, tapi harus datang dari dokumen.
 */

// Alamat layanan pelanggan. Sengaja berbeda dari email yang dipakai masuk ke
// /admin -- yang itu ada di tabel app_users dan tidak ikut berubah kalau alamat
// layanan pelanggan diganti. build.js mengambilnya dari sini supaya kaki
// halaman, JSON-LD, dan halaman Kontak tidak bisa menyebut alamat yang berbeda.
const EMAIL = 'csdarupa@gmail.com';
const WHATSAPP = 'https://wa.me/628815865698';
const WHATSAPP_TAMPIL = '+62 881-5865-698';
const WHATSAPP_E164 = '+628815865698';
const MARKETPLACE = 'https://tk.tokopedia.com/ZSVF3GmUp/';

const halaman = [
  {
    slug: 'pengiriman',
    judul: 'Pengiriman',
    ringkas: 'Cara pesanan Gemeos Coffee dikemas, dikirim, dan berapa lama sampai.',
    blok: [
      { h: 'Waktu proses' },
      { p: 'Kopi disangrai dan dikemas setelah pembayaran diterima. Pesanan diserahkan ke kurir ' +
           'dalam 1 sampai 3 hari kerja terhitung sejak pembayaran masuk.' },
      { p: 'Rentang itu bukan penundaan. Kopi yang baru disangrai butuh waktu istirahat sebelum ' +
           'dikemas, dan itu yang membedakan kopi yang dikirim dari roastery dengan kopi yang ' +
           'sudah berbulan-bulan menunggu di gudang.' },
      { p: 'Pada Sabtu, Minggu, dan hari libur nasional tidak ada penyerahan ke kurir.' },

      { h: 'Ekspedisi dan jangkauan' },
      { p: 'Kami mengirim ke seluruh Indonesia. Pilihan kurir, tarif, dan perkiraan lama kirim ' +
           'muncul saat checkout, dihitung dari kota tujuan yang kamu isi.' },
      { p: 'Nomor resi dikirim lewat email begitu paket diserahkan ke kurir.' },

      { h: 'Kemasan' },
      { p: 'Kopi dikemas dalam aluminium foil dengan katup satu arah, lalu dibungkus lagi untuk ' +
           'pengiriman. Katup itu membuang gas sisa sangrai tanpa memasukkan udara luar, jadi ' +
           'kopinya tidak perlu diangin-anginkan lebih dulu.' },

      { h: 'Kalau paket tidak sampai' },
      { p: 'Paket yang hilang atau rusak parah di tangan kurir kami ganti lebih dulu. Urusan klaim ' +
           'ke ekspedisi jadi urusan kami, bukan urusan kamu. Syaratnya ada di halaman Retur & ' +
           'Penukaran, dan satu di antaranya harus dipenuhi sejak paket dibuka.' }
    ]
  },

  {
    slug: 'retur',
    judul: 'Retur & Penukaran',
    ringkas: 'Apa yang bisa dikembalikan, batas waktunya, dan cara mengajukannya.',
    blok: [
      { h: 'Yang kami ganti' },
      { ul: [
        'Kemasan bocor, sobek, atau rusak saat diterima',
        'Produk yang dikirim tidak sesuai pesanan - salah jenis, salah ukuran, atau salah gilingan',
        'Jumlah yang diterima kurang dari yang dipesan',
        'Paket yang hilang di tangan kurir'
      ] },
      { p: 'Klaim yang kami terima diganti dengan produk yang sama, atau uangnya dikembalikan penuh ' +
           'kalau stoknya sedang tidak ada. Ongkos kirim penggantinya kami tanggung.' },

      { h: 'Yang tidak bisa dikembalikan' },
      { ul: [
        'Kemasan yang sudah dibuka, kecuali isinya memang bermasalah - kopi adalah produk pangan',
        'Kopi yang tidak cocok dengan selera; rasa kopi bergantung pada alat dan cara seduh, dan itu di luar kendali kami',
        'Pesanan yang keliru dipilih sendiri saat checkout, misalnya salah memilih gilingan'
      ] },

      { h: 'Batas waktu' },
      { p: 'Klaim diajukan paling lambat 2 x 24 jam sejak paket diterima menurut catatan ekspedisi.' },

      { h: 'Cara mengajukan' },
      { p: 'Sertakan video saat membuka paket, tanpa potongan, mulai dari kemasan luar yang masih ' +
           'tertutup dan nomor resinya terbaca. Tanpa video itu ekspedisi hampir selalu menolak ' +
           'klaim kami, dan penggantian jadi tidak bisa kami proses.' },
      { p: 'Kirim videonya beserta nomor pesanan lewat WhatsApp atau email di halaman Kontak. ' +
           'Kami balas pada hari kerja.' }
    ]
  },

  {
    slug: 'syarat',
    judul: 'Syarat & Ketentuan',
    ringkas: 'Aturan yang berlaku saat kamu memakai situs dan memesan dari Gemeos Coffee.',
    blok: [
      { p: 'Berlaku sejak 22 Agustus 2026. Dengan memakai situs ini dan memesan dari kami, kamu ' +
           'terikat pada ketentuan di bawah.' },

      { h: '1. Penggunaan situs' },
      { p: 'Situs Gemeos Coffee ditawarkan kepadamu dengan syarat kamu menerima seluruh ketentuan ' +
           'dan pemberitahuan yang tercantum di dalamnya. Kalau kamu tidak setuju, jangan ' +
           'meneruskan pemakaian situs ini.' },

      { h: '2. Perubahan situs dan ketentuan' },
      { p: 'Kami dapat mengubah harga, isi, dan ketentuan situs sewaktu-waktu tanpa pemberitahuan ' +
           'lebih dulu. Kalau ada harga yang keliru tampil, kami berhak menolak pesanan yang ' +
           'terlanjur masuk dengan harga itu, dan uang yang sudah dibayar dikembalikan penuh.' },

      { h: '3. Memesan tanpa akun' },
      { p: 'Kamu tidak perlu mendaftar untuk memesan. Data yang kamu isi saat checkout - nama, ' +
           'email, nomor telepon, dan alamat - hanya dipakai untuk memproses dan mengirim pesanan itu.' },
      { p: 'Pastikan alamat dan nomor telepon terisi benar. Pesanan yang gagal terkirim karena ' +
           'alamat keliru dan harus dikirim ulang menanggung ongkos kirim baru.' },

      { h: '4. Harga dan pembayaran' },
      { p: 'Harga yang tertera adalah harga akhir per kemasan, belum termasuk ongkos kirim. Ongkos ' +
           'kirim dihitung saat checkout, dan total yang harus dibayar ditampilkan sebelum kamu ' +
           'menyelesaikan pembayaran.' },
      { p: 'Pesanan diproses setelah pembayaran diterima. Pesanan yang tidak dibayar sampai batas ' +
           'waktu pembayaran gugur dengan sendirinya, dan stoknya kembali tersedia untuk pembeli lain.' },

      { h: '5. Pengiriman' },
      { p: 'Pesanan diserahkan ke kurir dalam 1 sampai 3 hari kerja setelah pembayaran diterima. ' +
           'Lama perjalanan setelah itu mengikuti layanan kurir yang kamu pilih dan berada di luar ' +
           'kendali kami. Keterangan lengkapnya ada di halaman Pengiriman.' },

      { h: '6. Risiko kehilangan dan kerusakan' },
      { p: 'Paket yang hilang atau rusak selama pengiriman kami ganti lebih dulu, lalu kami yang ' +
           'mengurus klaim ke ekspedisi. Ketentuan dan batas waktunya ada di halaman Retur & ' +
           'Penukaran.' },

      { h: '7. Retur dan penukaran' },
      { p: 'Kemasan yang sudah dibuka tidak dapat dikembalikan karena kopi adalah produk pangan, ' +
           'kecuali isinya memang bermasalah. Klaim atas kerusakan, kekurangan, atau kesalahan ' +
           'kirim diajukan paling lambat 2 x 24 jam sejak paket diterima, disertai video buka ' +
           'paket tanpa potongan.' },

      { h: '8. Keterangan produk' },
      { p: 'Kami berusaha menampilkan warna dan keterangan produk seakurat mungkin, tapi tampilan ' +
           'di layarmu bisa berbeda dari aslinya. Catatan rasa adalah gambaran, bukan janji: hasil ' +
           'seduhan dipengaruhi alat, air, dan cara seduh yang kamu pakai.' },
      { p: 'Berat bersih yang tertera adalah berat kopi setelah disangrai.' },

      { h: '9. Hak cipta' },
      { p: 'Seluruh foto, tulisan, logo, dan desain kemasan di situs ini milik Gemeos Coffee dan ' +
           'dilindungi hukum yang berlaku di Indonesia. Menyalin, mengunggah ulang, atau memakainya ' +
           'untuk keperluan komersial tanpa izin tertulis kami tidak diperbolehkan.' },

      { h: '10. Komunikasi elektronik' },
      { p: 'Kami mengirim email yang berkaitan dengan pesananmu: konfirmasi pembayaran, nomor resi, ' +
           'dan pemberitahuan bila ada masalah. Email itu bagian dari layanan dan tidak bisa ' +
           'dinonaktifkan selama pesanan berjalan.' },
      { p: 'Kami tidak mengirim email promosi kecuali kamu memintanya, dan setiap email semacam itu ' +
           'memuat tautan berhenti langganan.' },

      { h: '11. Batas tanggung jawab' },
      { p: 'Tanggung jawab kami atas satu pesanan terbatas pada nilai pesanan itu. Kami tidak ' +
           'menanggung kerugian tidak langsung yang timbul dari keterlambatan kurir, kesalahan ' +
           'alamat yang kamu isi, atau pemakaian produk di luar peruntukannya.' },

      { h: '12. Data pribadi' },
      { p: 'Cara kami mengumpulkan dan memakai datamu diatur di halaman Kebijakan Privasi, yang ' +
           'merupakan bagian tak terpisahkan dari ketentuan ini.' },

      { h: '13. Hukum yang berlaku' },
      { p: 'Ketentuan ini tunduk pada hukum Republik Indonesia. Setiap perselisihan diselesaikan ' +
           'secara musyawarah lebih dulu.' },

      { h: '14. Pertanyaan' },
      { p: 'Pertanyaan, masukan, atau keluhan mengenai ketentuan ini dapat dikirim lewat jalur di ' +
           'halaman Kontak.' }
    ]
  },

  {
    slug: 'privasi',
    judul: 'Kebijakan Privasi',
    ringkas: 'Data apa yang Gemeos Coffee kumpulkan, untuk apa dipakai, dan hakmu atas data itu.',
    blok: [
      { p: 'Berlaku sejak 22 Agustus 2026.' },

      { h: 'Data yang kami kumpulkan' },
      { ul: [
        'Nama, email, nomor telepon, dan alamat pengiriman yang kamu isi saat checkout',
        'Rincian pesanan: produk, ukuran, jumlah, dan nilainya',
        'Statistik kunjungan situs yang tidak mengandung identitas'
      ] },
      { p: 'Kami tidak pernah menerima dan tidak pernah menyimpan nomor kartu, PIN, atau data ' +
           'rekeningmu. Pembayaran diproses oleh penyedia pembayaran berizin, dan data itu masuk ' +
           'langsung ke sistem mereka tanpa melewati kami.' },

      { h: 'Untuk apa dipakai' },
      { ul: [
        'Memproses, mengemas, dan mengirim pesanan',
        'Mengabari status pesanan dan mengirim nomor resi',
        'Menjawab pertanyaan dan menangani klaim',
        'Memenuhi kewajiban pembukuan dan perpajakan'
      ] },
      { p: 'Kami tidak menjual, menyewakan, atau menukarkan datamu kepada siapa pun.' },

      { h: 'Siapa saja yang menerima datamu' },
      { p: 'Hanya pihak yang memang dibutuhkan agar pesananmu sampai: perusahaan ekspedisi menerima ' +
           'nama, alamat, dan nomor teleponmu; penyedia pembayaran menerima data yang diperlukan ' +
           'untuk memproses transaksi. Tidak lebih dari itu.' },

      { h: 'Berapa lama disimpan' },
      { p: 'Data pesanan disimpan selama masih dibutuhkan untuk pembukuan dan kewajiban pajak. ' +
           'Setelah itu data dihapus atau dijadikan anonim.' },

      { h: 'Hakmu' },
      { p: 'Kamu berhak meminta salinan data yang kami simpan tentangmu, meminta perbaikannya bila ' +
           'keliru, atau meminta penghapusannya sepanjang tidak bertentangan dengan kewajiban ' +
           'pembukuan kami. Kirim permintaannya lewat jalur di halaman Kontak.' },

      { h: 'Cookie dan statistik kunjungan' },
      { p: 'Situs ini memakai Cloudflare Web Analytics, yang menghitung kunjungan tanpa cookie dan ' +
           'tanpa membentuk profil pengunjung. Keranjang belanjamu disimpan di peramban sendiri, ' +
           'bukan di server kami, dan hilang saat kamu membersihkan data peramban.' }
    ]
  },

  {
    slug: 'kontak',
    judul: 'Kontak',
    ringkas: 'Cara menghubungi Gemeos Coffee untuk pesanan, grosir, dan keluhan.',
    blok: [
      { h: 'WhatsApp' },
      { p: WHATSAPP_TAMPIL + ' - jalur paling cepat, dibalas pada hari kerja.' },
      { tombol: { teks: 'Chat lewat WhatsApp', ke: WHATSAPP } },

      { h: 'Email' },
      { p: EMAIL + ' - untuk hal yang perlu lampiran atau catatan tertulis.' },

      { h: 'Marketplace' },
      { p: 'Produk yang sama juga tersedia di toko resmi kami di TikTok Shop.' },
      { tombol: { teks: 'Buka toko TikTok Shop', ke: MARKETPLACE } },

      { h: 'Grosir, kafe, dan kantor' },
      { p: 'Untuk pemesanan rutin dalam jumlah besar, kirim jenis kopi, ukuran, perkiraan jumlah ' +
           'per bulan, dan kota tujuan. Kami balas dengan penawaran harga dan jadwal kirim.' },

      { h: 'Keluhan pesanan' },
      { p: 'Sertakan nomor pesanan supaya kami bisa langsung memeriksanya. Untuk kerusakan kemasan, ' +
           'baca dulu halaman Retur & Penukaran - ada satu syarat yang harus dipenuhi sejak paket ' +
           'dibuka, dan tanpa itu klaim sulit kami proses.' }
    ]
  }
];

module.exports = {
  halaman: halaman,
  kontak: {
    email: EMAIL,
    whatsapp: WHATSAPP,
    whatsappTampil: WHATSAPP_TAMPIL,
    whatsappE164: WHATSAPP_E164,
    marketplace: MARKETPLACE
  }
};
