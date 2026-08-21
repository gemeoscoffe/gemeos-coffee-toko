/**
 * Masuk ke halaman admin toko.
 *
 * Diangkut dari auth.js di gemeos-coffee-v2 dan dipangkas: di sana ada sidebar
 * dan banyak halaman, di sini cuma satu.
 *
 * Masuknya lewat kode yang dikirim ke email, bukan kata sandi -- tidak ada
 * rahasia yang diketik di halaman ini, tidak ada yang bisa bocor, dan tidak ada
 * kata sandi yang harus diurus siapa pun. Siapa saja boleh meminta kode, tapi
 * akunnya baru menjangkau data kalau emailnya terdaftar di `app_users`.
 * Pemeriksaan itu ada di kebijakan database, bukan di sini, jadi tidak bisa
 * dilewati dengan bicara langsung ke API.
 *
 * Pengunjung toko tidak pernah menyentuh berkas ini: halaman katalog dan produk
 * dibaca anonim.
 */

let SB = null;          // klien supabase-js, khusus auth
let AUTH_TOKEN = null;  // token yang ikut di setiap panggilan PostgREST
let AUTH_EMAIL = null;

function authShowGate(show) {
  document.getElementById('login-gate').classList.toggle('hidden', !show);
  document.getElementById('admin-shell').classList.toggle('hidden', show);
}

function authSetStatus(pesan, warna) {
  const el = document.getElementById('login-status');
  el.textContent = pesan || '';
  el.style.color = warna || 'var(--text-muted)';
}

function authStep(step) {
  document.getElementById('login-step-email').classList.toggle('hidden', step !== 'email');
  document.getElementById('login-step-code').classList.toggle('hidden', step !== 'code');
}

async function authSendCode() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) { authSetStatus('Isi alamat email yang benar.', 'var(--red)'); return; }

  const btn = document.getElementById('login-send-btn');
  btn.disabled = true;
  authSetStatus('Mengirim kode...');
  try {
    // Email dari Supabase memuat dua jalan masuk: kode 6 angka dan tautan.
    // Tanpa emailRedirectTo, tautannya memakai Site URL proyek -- yang menunjuk
    // ke dashboard v2 -- jadi siapa pun yang mengklik tautan itu mendarat di
    // aplikasi yang salah. Ini mengarahkannya kembali ke halaman ini.
    //
    // Alamat yang dikirim di sini juga harus terdaftar di Redirect URLs pada
    // pengaturan Auth proyek; kalau tidak, Supabase mengabaikannya dan kembali
    // memakai Site URL tanpa memberi tahu.
    const { error } = await SB.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + '/admin' }
    });
    if (error) throw error;
    document.getElementById('login-code-for').textContent = email;
    authStep('code');
    authSetStatus('Email dikirim ke ' + email + '. Buka emailnya, klik "Sign in". Cek juga folder spam.', 'var(--green)');
  } catch (err) {
    authSetStatus('Gagal mengirim: ' + err.message, 'var(--red)');
  }
  btn.disabled = false;
}

async function authVerifyCode() {
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const token = document.getElementById('login-code').value.trim();
  if (!token) { authSetStatus('Masukkan kode dari email.', 'var(--red)'); return; }

  const btn = document.getElementById('login-verify-btn');
  btn.disabled = true;
  authSetStatus('Memeriksa kode...');
  try {
    // Kode untuk alamat yang belum pernah masuk diterbitkan lewat alur signup,
    // bukan sign-in, dan keduanya diverifikasi dengan nama tipe yang berbeda.
    // Mencoba dua-duanya membuat login pertama sama saja dengan login
    // berikutnya.
    let { data, error } = await SB.auth.verifyOtp({ email: email, token: token, type: 'email' });
    if (error) {
      const kedua = await SB.auth.verifyOtp({ email: email, token: token, type: 'signup' });
      if (kedua.error) throw error;
      data = kedua.data;
    }
    await authOnSignedIn(data.session);
  } catch (err) {
    authSetStatus('Kode salah atau sudah kedaluwarsa: ' + err.message, 'var(--red)');
    btn.disabled = false;
  }
}

// Akunnya ada begitu kode terverifikasi, tapi itu belum berarti boleh mengubah
// apa pun. Katalog bisa dibaca siapa saja, jadi membaca satu baris tidak
// membuktikan apa-apa -- yang diuji adalah izin menulis, dan cara paling jujur
// menanyakannya adalah bertanya langsung ke database.
async function authBolehMengelola() {
  try {
    return (await sbRpc('is_app_user', {})) === true;
  } catch (err) {
    return false;
  }
}

async function authOnSignedIn(session) {
  AUTH_TOKEN = session.access_token;
  AUTH_EMAIL = session.user.email;

  if (!(await authBolehMengelola())) {
    await SB.auth.signOut();
    AUTH_TOKEN = null;
    AUTH_EMAIL = null;
    authStep('email');
    authSetStatus('Email ' + session.user.email + ' belum diizinkan mengelola toko Gemeos Coffee.', 'var(--red)');
    document.getElementById('login-verify-btn').disabled = false;
    return;
  }

  document.getElementById('login-code').value = '';
  document.getElementById('login-verify-btn').disabled = false;
  document.getElementById('user-email').textContent = AUTH_EMAIL;
  document.getElementById('user-email').title = AUTH_EMAIL;
  authShowGate(false);
  loadTokoPage();
  loadSeksiPage();
}

async function authSignOut() {
  await SB.auth.signOut();
  AUTH_TOKEN = null;
  AUTH_EMAIL = null;
  location.reload();
}

// Dipanggil sekali saat mulai: sesi yang masih hidup melewati layar masuk, dan
// supabase-js yang menjaga tokennya tetap segar sesudah itu.
async function authBoot() {
  SB = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  SB.auth.onAuthStateChange(function(event, session) {
    AUTH_TOKEN = session ? session.access_token : null;
  });

  const { data } = await SB.auth.getSession();
  if (data.session) {
    await authOnSignedIn(data.session);
  } else {
    authShowGate(true);
    authStep('email');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('login-send-btn').addEventListener('click', authSendCode);
  document.getElementById('login-verify-btn').addEventListener('click', authVerifyCode);
  document.getElementById('login-back-btn').addEventListener('click', function() {
    authStep('email');
    authSetStatus('');
  });
  document.getElementById('login-email').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') authSendCode();
  });
  document.getElementById('login-code').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') authVerifyCode();
  });
  document.getElementById('signout-btn').addEventListener('click', authSignOut);

  authBoot();
});
