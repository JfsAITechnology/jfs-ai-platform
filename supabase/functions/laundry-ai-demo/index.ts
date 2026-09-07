import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
const DEMO_CODE = "JFS-DEMO-LAUNDRY";
const ORIGINS = new Set(["https://jfsaitechnology.github.io", "https://johanelindahp.github.io"]);
const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { autoRefreshToken: false, persistSession: false } });
const memory = new Map<string, { started: number; count: number; last: number }>();

function cors(origin: string) {
  return {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": ORIGINS.has(origin) ? origin : "https://jfsaitechnology.github.io",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "cache-control": "no-store",
  };
}
function json(body: unknown, status = 200, origin = "") { return new Response(JSON.stringify(body), { status, headers: cors(origin) }); }
function limited(key: string) {
  const now = Date.now(); const windowMs = 60_000; const max = 12;
  const b = memory.get(key);
  if (!b || now - b.started >= windowMs) { memory.set(key, { started: now, count: 1, last: now }); return true; }
  if (b.count >= max || now - b.last < 1200) return false;
  b.count += 1; b.last = now; memory.set(key, b); return true;
}
function asksHuman(q: string) { return /(komplain|keluhan|refund|uang kembali|ganti rugi|manager|manajer|admin|manusia|cs manusia)/i.test(q); }

async function getContext() {
  const { data: tenant, error: tenantError } = await db.from("tenants").select("id,business_name,business_type,whatsapp,address,city,province,status,ai_enabled").eq("tenant_code", DEMO_CODE).maybeSingle();
  if (tenantError) throw tenantError;
  if (!tenant) throw new Error("Demo tenant belum tersedia");
  if (tenant.ai_enabled === false) throw new Error("AI demo sedang dinonaktifkan");
  const [{ data: knowledge, error: kErr }, { data: products, error: pErr }] = await Promise.all([
    db.from("jfs_knowledge").select("category,title,content").eq("tenant_id", tenant.id).eq("is_active", true).limit(50),
    db.from("products").select("name,price,description").eq("tenant_id", tenant.id).eq("is_active", true).limit(50),
  ]);
  if (kErr) throw kErr; if (pErr) throw pErr;
  return { tenant, knowledge: knowledge ?? [], products: products ?? [] };
}

async function runAI(question: string, history: Array<{ role: "user" | "assistant"; content: string }>) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY belum dikonfigurasi di Supabase");
  const ctx = await getContext();
  const knowledge = ctx.knowledge.map((x: any) => `[${x.category}] ${x.title}: ${x.content}`).join("\n") || "(tidak ada)";
  const products = ctx.products.map((x: any) => `${x.name} — Rp${Number(x.price || 0).toLocaleString("id-ID")} — ${x.description || ""}`).join("\n") || "(tidak ada)";
  const system = `Anda adalah AI Customer Service untuk ${ctx.tenant.business_name}. Jawab Bahasa Indonesia dengan singkat, ramah, natural. HANYA gunakan DATA BISNIS di bawah ini. Jangan mengarang harga, jam operasional, lokasi, kebijakan, produk, stok, atau layanan. Bila informasi tidak tersedia, katakan informasi belum tersedia dan arahkan pelanggan ke admin. Jangan menyebut ChatGPT atau OpenAI. Jangan membuat janji di luar data. Jika pelanggan meminta manusia atau menyampaikan keluhan, arahkan ke admin.\n\nDATA BISNIS\nKnowledge Base:\n${knowledge}\n\nProduk/Layanan:\n${products}`;
  const messages = [{ role: "system", content: system }, ...history.slice(-8), { role: "user", content: question }];
  const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { authorization: `Bearer ${OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: OPENAI_MODEL, temperature: 0.2, messages }) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`OpenAI ${r.status}`);
  const answer = b?.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("AI tidak menghasilkan jawaban");
  return { answer, tenant: ctx.tenant, knowledgeCount: ctx.knowledge.length, productCount: ctx.products.length };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405, origin);
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown";
  if (!limited(ip)) return json({ error: "Demo sedang dibatasi. Silakan coba lagi sebentar." }, 429, origin);
  try {
    const body = await req.json().catch(() => null);
    const message = String(body?.message ?? "").trim();
    const history = Array.isArray(body?.history) ? body.history.filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string").slice(-8) : [];
    if (!message) return json({ error: "message wajib diisi" }, 400, origin);
    if (message.length > 600) return json({ error: "Pesan terlalu panjang. Maksimal 600 karakter." }, 400, origin);
    if (asksHuman(message)) return json({ answer: "Tentu Kak. Untuk kebutuhan yang perlu penanganan langsung atau keluhan, saya akan menghubungkan Kakak dengan admin laundry.", needs_handoff: true, source: "handoff" }, 200, origin);
    const result = await runAI(message, history);
    const needsHandoff = /informasi belum tersedia|belum tersedia|hubungi admin|arah.*admin/i.test(result.answer);
    return json({ answer: result.answer, needs_handoff: needsHandoff, source: "supabase-openai", business_name: result.tenant.business_name, knowledge_count: result.knowledgeCount, product_count: result.productCount }, 200, origin);
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Gagal memproses permintaan" }, 500, origin);
  }
});
