# Gemeos Coffee — toko

Toko pelanggan, beserta halaman pengelolanya di `/admin`. Di-deploy Cloudflare
Pages: build command `node build.js`, output directory `dist`.

`build.js` menarik katalog dari Supabase dan menuliskan satu berkas HTML utuh
per produk dan per kategori — bukan halaman kosong yang diisi JavaScript.
Perayap WhatsApp, Instagram, dan TikTok tidak menjalankan JavaScript, dan di
Indonesia lewat situlah tautan produk paling sering menyebar.

## Indeks pencarian mati sampai domainnya ada

Selama variabel lingkungan `SITE_URL` belum diisi di Pages, seluruh situs
dibangun dengan `noindex` dan `robots.txt` yang menolak semua perayap. Peringkat
pencarian menempel ke alamat; membiarkan `pages.dev` terindeks berarti
membuangnya begitu domain sungguhan dipasang.

Begitu domain siap, isi `SITE_URL` dengan alamat lengkapnya
(`https://gemeoscoffee.com`) di **Settings → Variables and secrets**, lalu
jalankan ulang build. Itu satu-satunya yang menyalakan indeks.

## Katalog berubah, halaman belum

Halaman dibangun saat deploy, jadi mengubah katalog lewat `/admin` tidak
langsung mengubah halaman yang tayang. Tombol **Terbitkan ke Toko** di `/admin`
yang menjalankan buildnya; halaman toko berubah satu sampai dua menit kemudian.

Jalurnya `/admin` → Edge Function `bangun-ulang` → Deploy Hook Cloudflare.
Hook-nya sengaja tidak ada di halaman ini: hook tidak menanyakan siapa
pemanggilnya, jadi URL yang ikut terkirim ke browser sama saja dengan
menyerahkan kuota build ke siapa pun yang membuka `/admin`. Fungsinya yang
memegang URL itu — sebagai secret `PAGES_DEPLOY_HOOK` — dan ia menolak pemanggil
yang emailnya tidak ada di `app_users`, syarat yang sama dengan `is_app_user()`
di database. Kodenya di `supabase/functions/bangun-ulang/` di repo v2, satu
tempat dengan migrasi.

Kalau hari itu jatuh lima hari tanpa build seperti 21 Agustus 2026, gejalanya
menyesatkan: katalog di `/admin` benar, database benar, tapi toko menampilkan
produk lama dan foto yang gagal dimuat — karena foto yang dirujuk halaman lama
sudah dihapus waktu foto barunya diunggah.

Repo ini terpisah dari [`gemeos-coffee-v2`](https://github.com/gemeoscoffe/gemeos-coffee-v2)
— dashboard pembukuan — supaya deploy toko tidak bisa menyentuh dashboard dan
sebaliknya. **Databasenya satu**, dan itu disengaja: toko membaca katalog dari
Supabase yang sama, dan pesanan yang dibayar akan ditulis ke pembukuan di sana.

Rancangan lengkap, skema, dan urutan kerjanya ada di `TOKO.md` di repo v2.
Migrasi database juga tinggal di sana, mengikuti urutan nomor yang sudah ada.

## Isi

| Berkas | Isi |
|---|---|
| `public/index.html` | Etalase. Sementara masih halaman "segera hadir". |
| `public/admin.html` | Halaman kelola: produk, varian, stok, foto. |
| `public/admin-katalog.js` | Isi halaman kelola. |
| `public/auth.js` | Masuk dengan kode lewat email. |
| `public/lib.js` | Pembantu PostgREST dan pemformatan. |
| `public/config.js` | URL dan kunci publishable Supabase. |
| `public/styles.css` | Seluruh gaya kedua halaman. |

## Siapa yang boleh mengelola

Bukan halaman `/admin` yang menjaganya, melainkan kebijakan RLS di database:
setiap penulisan ke `web_produk`, `web_varian`, `web_foto`, dan bucket `produk`
menuntut `is_app_user()`. Daftar orangnya tabel `app_users`, bukan alamat yang
dipatok di kode. Menambah orang cukup satu baris:

```sql
insert into app_users (email, nama) values ('orang@contoh.com', 'Nama');
```

Siapa pun boleh membuat akun dengan memverifikasi kode lewat email, dan itu saja
tidak menjangkau apa-apa. Pengunjung toko tidak pernah masuk akun.

## Kunci di `config.js` bukan kebocoran

Itu kunci *publishable*, memang dibuat untuk browser. Dengan kunci itu saja yang
terbuka hanya katalog yang ditandai aktif — tabel pesanan tidak punya kebijakan
anonim sama sekali.

## Menjalankan di lokal

Tidak ada build step. Sajikan `public/` lewat server statis apa saja:

```bash
npx serve public
```

Membuka berkasnya langsung lewat `file://` tidak bisa: login Supabase butuh
origin yang sebenarnya.
