/* Mas Firman tenant authentication / authorization layer. */

const SUPABASE_URL = 'https://evtkeyfjgqwarsmlzrkh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7lGio_RVVgkVASYYyBHQIg_GvL-8ELD';
const TENANT_ID = 'f0098e1c-da0c-4411-8720-9c99a3cfb115';

let _client;

async function getSupabase() {
  if (_client) return _client;
  const mod = await import('https://esm.sh/@supabase/supabase-js@2');
  _client = mod.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  return _client;
}

async function getTenantAccess() {
  const supabase = await getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return { authenticated: false, authorized: false, user: null, membership: null, error: userError };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('tenant_users')
    .select('tenant_id, role, is_active')
    .eq('tenant_id', TENANT_ID)
    .eq('user_id', userData.user.id)
    .eq('is_active', true)
    .maybeSingle();

  return { authenticated: true, authorized: !membershipError && !!membership, user: userData.user, membership: membership || null, error: membershipError || null };
}

async function signOutTenant() {
  const supabase = await getSupabase();
  await supabase.auth.signOut({ scope: 'local' });
  window.location.replace('../pages/login.html');
}

async function requireTenantAccess() {
  const access = await getTenantAccess();
  if (!access.authenticated) {
    const next = encodeURIComponent(window.location.href);
    window.location.replace(`../pages/login.html?next=${next}`);
    return null;
  }
  if (!access.authorized) {
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;background:#07101f;color:#fff;font-family:Arial,sans-serif;padding:24px">
        <section style="max-width:560px;background:#101b2f;border:1px solid #263754;border-radius:18px;padding:32px;text-align:center">
          <div style="font-size:42px">🔒</div>
          <h1>Akses Tenant Ditolak</h1>
          <p style="color:#aebbd0">Akun Anda berhasil login, tetapi belum memiliki membership aktif untuk tenant Mas Firman Pratama.</p>
          <button onclick="location.href='../pages/login.html'" style="padding:12px 18px;border:0;border-radius:10px;cursor:pointer">Kembali ke Login</button>
        </section>
      </main>`;
    return null;
  }

  // Small tenant-session badge and sign-out action. Authorization remains enforced by RLS.
  const badge = document.createElement('div');
  badge.style.cssText='position:fixed;right:16px;bottom:16px;z-index:9999;display:flex;align-items:center;gap:8px;background:#101b2f;border:1px solid #29415f;color:#dce8f8;padding:8px 10px;border-radius:12px;font:12px Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)';
  badge.innerHTML='<span>● Tenant Secure</span><button id="jfsTenantLogout" style="border:0;border-radius:8px;padding:6px 9px;cursor:pointer">Keluar</button>';
  document.body.appendChild(badge);
  document.getElementById('jfsTenantLogout').addEventListener('click', signOutTenant);
  return access;
}

window.JFSTenantAuth = { getSupabase, getTenantAccess, requireTenantAccess, signOutTenant, tenantId: TENANT_ID };
