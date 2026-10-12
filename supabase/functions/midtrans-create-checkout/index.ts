import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY") ?? "";
const production = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true";
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const origin = "https://jfsaitechnology.github.io";

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json", "cache-control": "no-store",
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  }});
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  }});
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (!serverKey) return reply({ error: "MIDTRANS_SERVER_KEY belum diatur pada Supabase Edge Function secrets." }, 503);

  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\\s+/i, "");
    if (!token) return reply({ error: "Login diperlukan sebelum checkout." }, 401);
    const { data: authData, error: authError } = await db.auth.getUser(token);
    if (authError || !authData.user) return reply({ error: "Sesi login tidak valid." }, 401);

    const body = await req.json();
    const appCode = String(body.app_code ?? "").toUpperCase();
    const planId = String(body.plan_id ?? "");
    if (!["LAUNDRY", "KEUANGAN-PINTAR", "REKAP-MUATAN"].includes(appCode) || !planId) {
      return reply({ error: "Produk atau paket tidak valid." }, 400);
    }
    const { data: plan, error: planError } = await db.from("jfs_app_subscription_plans")
      .select("id,app_code,name,duration_days,price,is_active,is_trial")
      .eq("id", planId).eq("is_active", true).maybeSingle();
    if (planError) throw planError;
    if (!plan || plan.is_trial || Number(plan.price) <= 0 || Number(plan.duration_days) <= 0 ||
        !(plan.app_code === appCode || plan.app_code === "ALL")) {
      return reply({ error: "Paket berbayar tidak tersedia atau tidak cocok dengan produk." }, 400);
    }

    const orderId = "JFS-" + crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase();
    const amount = Math.round(Number(plan.price));
    const { error: insertError } = await db.from("jfs_midtrans_payment_orders").insert({
      order_id: orderId, user_id: authData.user.id, app_code: appCode,
      plan_id: plan.id, plan_name: plan.name, amount, currency: "IDR", status: "PENDING",
    });
    if (insertError) throw insertError;

    const base = production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
    const resp = await fetch(base + "/snap/v1/transactions", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json",
        authorization: "Basic " + btoa(serverKey + ":") },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: amount },
        item_details: [{ id: plan.id, price: amount, quantity: 1,
          name: ("JFS AI " + appCode + " - " + plan.name).slice(0, 50) }],
        customer_details: {
          first_name: authData.user.user_metadata?.full_name || authData.user.email?.split("@")[0] || "Pelanggan",
          email: authData.user.email,
        },
        // QRIS-only checkout; merchant must enable/approve this payment channel in Midtrans.
        enabled_payments: ["other_qris"],
        callbacks: { finish: "https://jfsaitechnology.github.io/jfs-ai-platform/payment-result.html?order_id=" + encodeURIComponent(orderId) },
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.token || !data.redirect_url) {
      await db.from("jfs_midtrans_payment_orders").update({ status: "FAILED" }).eq("order_id", orderId);
      return reply({ error: data.error_messages?.join("; ") || "Midtrans gagal membuat transaksi. Pastikan QRIS aktif pada merchant." }, 502);
    }
    const { error: updateError } = await db.from("jfs_midtrans_payment_orders")
      .update({ snap_token: data.token, redirect_url: data.redirect_url }).eq("order_id", orderId);
    if (updateError) throw updateError;
    return reply({ order_id: orderId, token: data.token, redirect_url: data.redirect_url,
      amount, plan_name: plan.name, mode: production ? "production" : "sandbox" });
  } catch (e) {
    console.error(e);
    return reply({ error: e instanceof Error ? e.message : "Checkout gagal." }, 500);
  }
});