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

## Halaman yang dibangun

| Alamat | Isi |
|---|---|
| `/` | Halaman depan: hero, katalog ringkas, cerita, alasan, testimoni, lokasi. |
| `/shop/` | Katalog lengkap dengan saringan kategori. |
| `/tentang/` | Tentang Kami. |
| `/kategori/<slug>/` | Katalog yang disaring satu kategori. |
| `/produk/<slug>/` | Satu produk: foto, ukuran, harga, keterangan. |
| `/admin` | Halaman kelola. Tidak dibangun dari data, dan `noindex`. |

Menunya Home, Shop, About Us. Halaman kategori dan halaman produk ikut menyala
di **Shop** — pengunjung yang sedang menyaring kategori masih berada di katalog,
dan menu yang tidak menyorot apa pun membuat halaman terasa tersesat.

## Yang bisa diubah tanpa menyentuh kode

Katalog ada di `web_produk`, `web_varian`, `web_foto`. Tulisan dan foto halaman
depan serta halaman Tentang Kami ada di `web_seksi`, satu baris per bagian:

| `halaman/blok` | Bagian |
|---|---|
| `home/hero` | Judul besar, kalimat pembuka, foto besar, satu tombol. |
| `home/cerita` | Perkenalan pendek dengan foto dan tombol ke `/tentang/`. |
| `home/alasan` | Kartu-kartu alasan. Tanpa foto tampil sebagai pita teks. |
| `home/testimoni` | Kutipan pembeli, nama, kota. |
| `home/lokasi` | Alamat, tautan Google Maps dan WhatsApp. |
| `tentang/hero` | Kepala halaman Tentang Kami. |
| `tentang/isi` | Bagian bertumpuk, fotonya berselang-seling kiri-kanan. |

Semuanya disunting di `/admin`, menu **Halaman Depan** dan **Tentang Kami**.
Sidebarnya berkelompok dan bentuknya sengaja sama dengan dashboard v2 — dua
situs ini dikelola orang yang sama, dan menu yang berbeda cara kerjanya di dua
tempat berarti dua hal yang harus diingat. Tombol **Terbitkan ke Toko** duduk di
topbar, bukan di salah satu halaman: satu build menerbitkan semuanya sekaligus. Bagian yang belum
diisi disimpan `aktif = false` dan tidak digambar sama sekali: judul tanpa isi
terlihat seperti halaman yang rusak, sedangkan halaman yang lebih pendek hanya
terlihat ringkas — dan itu keadaan yang jujur selama isinya memang belum ditulis.

Yang tidak diisi otomatis juga disengaja. Cerita, testimoni, alamat, dan tahun
berdiri adalah fakta tentang usahanya; menebaknya berarti menaruh klaim palsu
justru di halaman yang dibuka orang untuk memutuskan apakah toko ini bisa
dipercaya.

## Isi

| Berkas | Isi |
|---|---|
| `build.js` | Menarik katalog dari Supabase dan menulis seluruh halaman ke `dist/`. |
| `public/render.js` | Perakit HTML. Dipakai `build.js` di Node dan browser sekaligus. |
| `public/etalase.js` | Pilihan ukuran dan galeri foto di halaman produk. |
| `public/etalase.css` | Gaya etalase. |
| `public/admin.html` | Halaman kelola. |
| `public/admin-nav.js` | Perpindahan halaman di sidebar `/admin`. |
| `public/admin-katalog.js` | Produk, varian, stok, foto. |
| `public/admin-seksi.js` | Isi halaman depan dan Tentang Kami. |
| `public/auth.js` | Masuk lewat tautan email. |
| `public/lib.js` | Pembantu PostgREST dan pemformatan. |
| `public/config.js` | URL dan kunci publishable Supabase. |
| `public/styles.css` | Gaya halaman kelola. |

## Siapa yang boleh mengelola

Bukan halaman `/admin` yang menjaganya, melainkan kebijakan RLS di database:
setiap penulisan ke `web_produk`, `web_varian`, `web_foto`, `web_seksi`, dan
bucket `produk` menuntut `is_app_user()`. Daftar orangnya tabel `app_users`, bukan alamat yang
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

Etalasenya dibangun dulu, baru disajikan — `public/` saja tidak cukup, karena
halaman produk dan halaman kategori baru ada setelah `build.js` menulisnya:

```bash
node build.js && npx serve dist
```

Halaman `/admin` tidak dibangun dari data, jadi untuk menyuntingnya saja
`npx serve public` sudah cukup. Membuka berkasnya langsung lewat `file://`
tidak bisa: login Supabase butuh origin yang sebenarnya.

Tesnya tidak butuh jaringan maupun database:

```bash
node --test tests/*.test.js
```
