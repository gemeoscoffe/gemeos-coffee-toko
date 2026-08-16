/**
 * Pembantu bersama: akses PostgREST/Storage dan pemformatan.
 *
 * Bentuknya sengaja sama dengan `common.js` di gemeos-coffee-v2, karena kedua
 * situs bicara ke database yang sama dan halaman admin di sini diangkut dari
 * sana. Yang tidak ikut adalah bagian yang khusus dashboard -- navigasi antar
 * halaman, pager tabel panjang, dan deteksi jawaban terpotong.
 */

// Permintaan diotorisasi oleh token pengguna yang masuk (auth.js). Kunci
// publishable tetap ikut sebagai `apikey` karena itulah cara proyeknya
// dikenali; kunci itu sendiri tidak membuka apa-apa, kebijakan RLS yang
// membaca tokennya.
function sbHeaders(extra) {
  return Object.assign({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + (typeof AUTH_TOKEN !== 'undefined' && AUTH_TOKEN ? AUTH_TOKEN : SUPABASE_KEY)
  }, extra || {});
}

async function sbError(res, pesan) {
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch (e) { data = { message: text }; } }
  if (res.status === 401 || res.status === 403) {
    return new Error('Sesi berakhir atau akses ditolak. Muat ulang halaman dan masuk lagi.');
  }
  return new Error((data && data.message) || pesan + ': ' + res.status);
}

async function sbSelect(table, query) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + (query || ''), { headers: sbHeaders() });
  if (!res.ok) throw await sbError(res, table + ' select gagal');
  return res.json();
}

async function sbWrite(method, table, query, body) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : ''), {
    method: method,
    headers: sbHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw await sbError(res, table + ' ' + method + ' gagal');
  return res.json();
}

async function sbDelete(table, query) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + query, {
    method: 'DELETE', headers: sbHeaders()
  });
  if (!res.ok) throw await sbError(res, table + ' delete gagal');
}

async function sbRpc(fn, params) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params || {})
  });
  // Fungsi `returns void` menjawab 204 tanpa isi, dan error bisa datang sebagai
  // teks biasa -- mengurai tanpa syarat mengubah keduanya jadi "Unexpected end
  // of JSON input" yang terlihat seperti penulisan gagal padahal berhasil.
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch (e) { data = { message: text }; } }
  if (!res.ok) throw new Error((data && data.message) || (fn + ' gagal: ' + res.status));
  return data;
}

function fmtRp(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(n || 0);
}

function esc(s) {
  return (s === null || s === undefined ? '' : String(s))
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}
