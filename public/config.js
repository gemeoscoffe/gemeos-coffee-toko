// Bukan rahasia: kunci publishable memang dibuat untuk dipakai di browser.
// Yang menjaga data adalah kebijakan RLS di database, bukan kunci ini. Dengan
// kunci ini saja yang terbuka hanya katalog yang memang untuk umum, dan setiap
// penulisan tetap menuntut `is_app_user()`.
//
// Sama persis dengan config.js di gemeos-coffee-v2: dua situs, satu proyek
// Supabase.
const SUPABASE_URL = 'https://mclqymgegppqhtqjemgm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZR1oXwo0ESAafoFA2ka8Pw_hBQeT6LI';
