# Gemeos Coffee — toko

Toko pelanggan di `gemeoscoffee.com`, beserta halaman pengelolanya di
`/admin`. Statis, tanpa build step, di-deploy Cloudflare Pages dari `public/`.

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
