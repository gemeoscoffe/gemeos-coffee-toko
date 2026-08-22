/**
 * Tarif ongkos kirim per zona.
 *
 * Tarifnya angka yang diketik pemilik, bukan tarif asli kurir. Konsekuensinya
 * ditanggung toko: kalau tarif asli lebih mahal dari yang diketik di sini,
 * selisihnya keluar dari margin, dan tidak ada yang akan memberitahu. Karena
 * itu halaman ini menampilkan tarifnya sebagai rupiah utuh, bukan angka polos
 * -- salah satu nol lebih atau kurang adalah kesalahan yang paling mahal dan
 * paling mudah dilakukan di sini.
 *
 * Zona yang mati berarti daerah itu tidak dilayani: checkout akan mengatakan
 * ongkirnya belum bisa dihitung ke sana, bukan diam-diam menagih nol.
 */

let ONGKIR_ZONA = [];
let ONGKIR_SETELAN = {};

async function loadOngkirPage() {
  const el = document.getElementById('ongkir-table');
  if (!el) return;
  el.innerHTML = '<p class="muted">Memuat...</p>';

  try {
    const [zona, setelan] = await Promise.all([
      sbSelect('web_ongkir_zona', 'select=*&order=urutan,nama'),
      sbSelect('web_setelan', 'select=*')
    ]);
    ONGKIR_ZONA = zona;
    ONGKIR_SETELAN = {};
    setelan.forEach(function(s) { ONGKIR_SETELAN[s.kunci] = s.nilai; });
    renderOngkir();
  } catch (err) {
    el.innerHTML = '<p class="muted" style="color:var(--red)">Gagal memuat: ' + esc(err.message) + '</p>';
  }
}

function renderOngkir() {
  const el = document.getElementById('ongkir-table');
  if (!el) return;

  const belum = ONGKIR_ZONA.filter(function(z) { return z.aktif && Number(z.tarif_per_kg) <= 0; });

  el.innerHTML =
    // Zona hidup bertarif nol adalah gratis ongkir yang tidak disengaja. Kalau
    // memang ingin gratis, ambang di bawah yang dipakai -- bukan tarif nol,
    // yang tidak terlihat sebagai keputusan dari mana pun.
    (belum.length
      ? '<p style="color:var(--red);font-size:13px;margin:0 0 10px">' + belum.length +
        ' zona sudah tampil tapi tarifnya masih nol &mdash; pembeli di sana akan dikirimi gratis.</p>'
      : '') +
    '<div class="table-scroll"><table><thead><tr>' +
      '<th>Zona</th><th class="num">Tarif per kg</th><th class="num">Urutan</th>' +
      '<th>Provinsi</th><th>Dipakai</th></tr></thead><tbody>' +
    ONGKIR_ZONA.map(function(z) {
      return '<tr>' +
        '<td><b>' + esc(z.nama) + '</b></td>' +
        '<td class="num"><input class="ongkir-tarif" data-id="' + z.id + '" type="number" min="0" ' +
          'step="500" value="' + Number(z.tarif_per_kg) + '" style="width:110px">' +
          '<div class="muted" style="font-size:12px">' + fmtRp(Number(z.tarif_per_kg)) + '</div></td>' +
        '<td class="num"><input class="ongkir-urutan" data-id="' + z.id + '" type="number" ' +
          'value="' + Number(z.urutan) + '" style="width:70px"></td>' +
        '<td class="muted" style="font-size:12px;max-width:320px">' +
          esc((z.provinsi || []).join(', ')) + '</td>' +
        '<td><label class="toko-switch"><input type="checkbox" class="ongkir-aktif" data-id="' + z.id + '"' +
          (z.aktif ? ' checked' : '') + '> ' + (z.aktif ? 'Dipakai' : 'Tidak dilayani') + '</label></td>' +
      '</tr>';
    }).join('') + '</tbody></table></div>';

  const ambang = ONGKIR_SETELAN.gratis_ongkir_dari;
  document.getElementById('ongkir-gratis').value =
    (ambang === null || ambang === undefined) ? '' : String(ambang);

  wireOngkir();
}

function wireOngkir() {
  const status = document.getElementById('ongkir-status');

  document.querySelectorAll('.ongkir-tarif').forEach(function(i) {
    i.addEventListener('change', function() {
      simpanZona(Number(this.dataset.id), { tarif_per_kg: Number(this.value) || 0 }, status);
    });
  });

  document.querySelectorAll('.ongkir-urutan').forEach(function(i) {
    i.addEventListener('change', function() {
      simpanZona(Number(this.dataset.id), { urutan: Number(this.value) || 0 }, status);
    });
  });

  document.querySelectorAll('.ongkir-aktif').forEach(function(b) {
    b.addEventListener('change', function() {
      simpanZona(Number(this.dataset.id), { aktif: this.checked }, status);
    });
  });
}

async function simpanZona(id, badan, status) {
  try {
    await sbWrite('PATCH', 'web_ongkir_zona', 'id=eq.' + id, badan);
    tokoStatus(status, true, 'Tersimpan.');
    await loadOngkirPage();
  } catch (err) {
    tokoStatus(status, false, err.message);
    await loadOngkirPage();
  }
}

async function simpanGratisOngkir() {
  const status = document.getElementById('ongkir-status');
  const teks = document.getElementById('ongkir-gratis').value.trim();

  // Kosong berarti tidak ada gratis ongkir sama sekali, bukan gratis mulai nol.
  const nilai = teks === '' ? null : Number(teks);
  if (nilai !== null && (!isFinite(nilai) || nilai <= 0)) {
    tokoStatus(status, false, 'Isi angka rupiah, atau kosongkan kalau tidak ada gratis ongkir.');
    return;
  }

  try {
    await sbWrite('PATCH', 'web_setelan', 'kunci=eq.gratis_ongkir_dari', { nilai: nilai });
    tokoStatus(status, true, nilai === null
      ? 'Gratis ongkir dimatikan.'
      : 'Gratis ongkir mulai belanja ' + fmtRp(nilai) + '.');
    await loadOngkirPage();
  } catch (err) {
    tokoStatus(status, false, err.message);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const tombol = document.getElementById('ongkir-gratis-simpan');
  if (tombol) tombol.addEventListener('click', simpanGratisOngkir);
});
