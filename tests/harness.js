/**
 * Memuat berkas yang benar-benar dikirim ke browser ke dalam konteks `vm`,
 * dengan DOM tiruan seadanya.
 *
 * Tesnya menguji kode yang tayang, bukan tiruan dari kode yang tayang. Bentuknya
 * mengikuti harness di repo gemeos-coffee-v2 karena halaman /admin memang
 * diangkut dari sana -- termasuk jebakannya: nilai yang dibuat di luar konteks
 * gagal `instanceof` di dalamnya, dan `deepStrictEqual` menolak array milik
 * realm lain, jadi hasilnya perlu disalin dengan `Array.from` sebelum
 * dibandingkan.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUBLIK = path.join(__dirname, '..', 'public');

// Binding `let`/`const` di dalam vm tidak muncul sebagai properti konteks, jadi
// diambil dengan menjalankan namanya.
function ambil(ctx, nama) { return vm.runInContext(nama, ctx); }

// ...dan tidak bisa diisi dari luar juga, jadi nilainya dititipkan dulu ke
// konteks lalu disalin ke bindingnya oleh satu baris skrip.
function pasang(ctx, nama, nilai) {
  ctx.__nilaiSementara = nilai;
  vm.runInContext(nama + ' = __nilaiSementara;', ctx);
}

function elemenPalsu(id) {
  return {
    id: id,
    innerHTML: '',
    textContent: '',
    value: '',
    className: '',
    checked: false,
    disabled: false,
    style: {},
    dataset: {},
    files: [],
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      contains(c) { return this._set.has(c); },
      toggle(c, on) { if (on === undefined) on = !this._set.has(c); if (on) this._set.add(c); else this._set.delete(c); return on; }
    },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    setAttribute() {},
    removeAttribute() {},
    focus() {},
    click() {}
  };
}

function buatContext(berkas) {
  const elemen = {};

  const document = {
    _elemen: elemen,
    getElementById(id) {
      if (!elemen[id]) elemen[id] = elemenPalsu(id);
      return elemen[id];
    },
    querySelector(sel) {
      if (!elemen[sel]) elemen[sel] = elemenPalsu(sel);
      return elemen[sel];
    },
    querySelectorAll() { return []; },
    createElement() { return elemenPalsu('dibuat'); },
    addEventListener() {},
    body: elemenPalsu('body')
  };

  const ctx = {
    document: document,
    console: console,
    Intl: Intl, Date: Date, Math: Math, JSON: JSON,
    Number: Number, String: String, Boolean: Boolean,
    Object: Object, Array: Array, Set: Set, Promise: Promise,
    isNaN: isNaN, parseFloat: parseFloat, parseInt: parseInt,
    setTimeout: setTimeout,
    alert() {}, confirm() { return true; },
    fetch() { throw new Error('fetch tidak distub: ada tes yang menyentuh jaringan'); },
    SUPABASE_URL: 'https://contoh.supabase.co',
    SUPABASE_KEY: 'kunci-uji',
    // Dipakai admin-katalog.js, aslinya datang dari lib.js.
    esc(s) {
      return (s === null || s === undefined ? '' : String(s))
        .replace(/"/g, '&quot;').replace(/</g, '&lt;');
    },
    fmtRp(n) {
      return 'Rp' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  berkas.forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(PUBLIK, f), 'utf8'), ctx, { filename: f });
  });

  return ctx;
}

function buatContextAdmin() { return buatContext(['admin-katalog.js']); }

// `admin-seksi.js` ikut memuat `admin-katalog.js` karena pembantu fotonya
// (LEBAR_FOTO, ubahUkuranFoto, unggahBerkasFoto) tinggal di sana -- urutannya
// sama dengan urutan <script> di admin.html.
function buatContextSeksi() { return buatContext(['admin-katalog.js', 'admin-seksi.js']); }

module.exports = { buatContext, buatContextAdmin, buatContextSeksi, ambil, pasang, elemenPalsu };
