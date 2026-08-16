/**
 * Halaman yang isinya tulisan, bukan katalog: pengiriman, retur, kontak.
 *
 * Ditaruh di berkas sendiri supaya mengubah kalimatnya tidak berarti mengubah
 * mesin pembangun halaman. Suatu saat isinya bisa pindah ke database supaya
 * bisa disunting dari /admin, tapi selama halamannya masih tiga dan jarang
 * berubah, satu berkas lebih jujur daripada tabel yang menunggu diisi.
 *
 * PERINGATAN: isi di bawah ini adalah rancangan yang disusun dari kebiasaan
 * umum toko kopi di Indonesia, BUKAN kebijakan yang pernah dinyatakan pemilik.
 * Setiap angka -- tenggat klaim, jam potong, lama proses -- harus dikonfirmasi
 * sebelum toko benar-benar menerima uang, karena halaman seperti ini mengikat
 * penjual saat ada sengketa.
 */

const EMAIL = 'gemeoscoffe@gmail.com';
const MARKETPLACE = 'https://tk.tokopedia.com/ZSVF3GmUp/';

module.exports = [
  {
    slug: 'pengiriman',
    judul: 'Pengiriman',
    ringkas: 'Cara pesanan Gemeos Coffee dikemas, dikirim, dan berapa lama sampai.',
    blok: [
      { h: 'Cara memesan' },
      { p: 'Untuk sementara, pesanan diproses lewat toko resmi kami di TikTok Shop. ' +
           'Pilih kopinya di katalog ini, lalu tombol beli akan membawamu ke halaman produknya di sana. ' +
           'Pembayaran, pengiriman, dan pelacakan mengikuti aturan marketplace tersebut.' },
      { p: 'Pemesanan langsung dari halaman ini sedang disiapkan.' },

      { h: 'Waktu proses' },
      { p: 'Kopi disangrai dan dikemas setelah pembayaran diterima. ' +
           'Pesanan yang masuk sebelum pukul 14.00 WIB pada hari kerja diusahakan dikirim hari itu juga; ' +
           'selebihnya dikirim pada hari kerja berikutnya.' },
      { p: 'Pada hari libur nasional tidak ada pengiriman.' },

      { h: 'Ekspedisi dan jangkauan' },
      { p: 'Kami mengirim ke seluruh Indonesia lewat ekspedisi yang tersedia di marketplace tempat kamu memesan. ' +
           'Pilihan kurir, tarif, dan perkiraan lama kirim muncul saat checkout di sana.' },

      { h: 'Kemasan' },
      { p: 'Kopi dikemas dalam aluminium foil dengan katup satu arah, lalu dibungkus lagi untuk pengiriman. ' +
           'Kalau paketmu tiba dalam keadaan rusak atau bocor, lihat halaman Retur & Penukaran.' }
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
        'Produk yang dikirim tidak sesuai pesanan — salah jenis, salah ukuran, atau salah gilingan',
        'Jumlah yang diterima kurang dari yang dipesan'
      ] },

      { h: 'Yang tidak bisa dikembalikan' },
      { ul: [
        'Kemasan yang sudah dibuka, kecuali isinya memang bermasalah',
        'Kopi yang tidak cocok dengan selera — rasa kopi bergantung pada alat dan cara seduh, dan itu di luar kendali kami',
        'Pesanan yang keliru dipilih sendiri saat checkout, misalnya salah memilih gilingan'
      ] },

      { h: 'Batas waktu' },
      { p: 'Klaim diajukan paling lambat 2 × 24 jam sejak paket diterima menurut catatan ekspedisi.' },

      { h: 'Cara mengajukan' },
      { p: 'Sertakan video saat membuka paket, tanpa potongan, mulai dari kemasan luar yang masih tertutup. ' +
           'Tanpa video itu, klaim kerusakan sulit kami proses ke pihak ekspedisi.' },
      { p: 'Kirim videonya beserta nomor pesanan ke ' + EMAIL + ', atau lewat chat di marketplace tempat kamu memesan.' },
      { p: 'Kalau klaimnya kami terima, produk diganti dan ongkos kirim penggantinya kami tanggung.' }
    ]
  },

  {
    slug: 'kontak',
    judul: 'Kontak',
    ringkas: 'Cara menghubungi Gemeos Coffee untuk pesanan, grosir, dan keluhan.',
    blok: [
      { h: 'Email' },
      { p: EMAIL + ' — dibalas pada hari kerja.' },

      { h: 'Toko resmi' },
      { p: 'Pesanan dan chat paling cepat ditanggapi lewat toko kami di TikTok Shop.' },
      { tombol: { teks: 'Buka toko TikTok Shop', ke: MARKETPLACE } },

      { h: 'Grosir, kafe, dan kantor' },
      { p: 'Untuk pemesanan rutin dalam jumlah besar, kirim email berisi jenis kopi, ukuran, ' +
           'perkiraan jumlah per bulan, dan kota tujuan. Kami balas dengan penawaran harga dan jadwal kirim.' },

      { h: 'Keluhan pesanan' },
      { p: 'Sertakan nomor pesanan supaya kami bisa langsung memeriksanya. ' +
           'Untuk kerusakan kemasan, lihat dulu halaman Retur & Penukaran — ada satu syarat yang harus ' +
           'dipenuhi sejak paket dibuka.' }
    ]
  }
];
