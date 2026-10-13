import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY") ?? "";
const production = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true";
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (!serverKey) return reply({ error: "MIDTRANS_SERVER_KEY not configured" }, 503);

  try {
    const incoming = await req.json();
    const orderId = String(incoming.order_id ?? "");
    if (!/^JFS-[A-Z0-9]{24}$/.test(orderId)) return reply({ error: "Invalid order_id" }, 400);

    // Verify directly with Midtrans; do not trust notification payload fields alone.
    const base = production ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
    const verified = await fetch(base + "/v2/" + encodeURIComponent(orderId) + "/status", {
      headers: { authorization: "Basic " + btoa(serverKey + ":"), accept: "application/json" },
    });
    const status = await verified.json().catch(() => ({}));
    if (!verified.ok) return reply({ error: "Midtrans status verification failed" }, 502);
    if (String(status.order_id ?? "") !== orderId || String(status.currency ?? "IDR") !== "IDR") {
      return reply({ error: "Midtrans order or currency mismatch" }, 400);
    }

    const { data: order, error: orderError } = await db
      .from("jfs_midtrans_payment_orders").select("*").eq("order_id", orderId).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return reply({ error: "Order not found" }, 404);
    if (Math.round(Number(status.gross_amount)) !== Math.round(Number(order.amount))) {
      return reply({ error: "Amount mismatch" }, 400);
    }

    // Duplicate callbacks must not roll a newer subscription back to an older paid order.
    if (order.status === "PAID") return reply({ ok: true, paid: true, duplicate: true });

    const txStatus = String(status.transaction_status ?? "");
    const fraud = String(status.fraud_status ?? "").toLowerCase();
    const paid = ["settlement", "capture"].includes(txStatus) && (!fraud || fraud === "accept");
    if (!paid) {
      const mapped = txStatus === "expire" ? "EXPIRED" :
        ["deny", "cancel"].includes(txStatus) ? "FAILED" : "PENDING";
      const { error } = await db.from("jfs_midtrans_payment_orders").update({
        status: mapped,
        midtrans_transaction_id: status.transaction_id ?? null,
        midtrans_transaction_status: txStatus,
        updated_at: new Date().toISOString(),
      }).eq("order_id", orderId).neq("status", "PAID");
      if (error) throw error;
      return reply({ ok: true, paid: false, status: txStatus });
    }

    const { data: plan, error: planError } = await db
      .from("jfs_app_subscription_plans").select("id,app_code,duration_days,is_active,is_trial,price")
      .eq("id", order.plan_id).maybeSingle();
    if (planError) throw planError;
    if (!plan || !plan.is_active || plan.is_trial ||
        !(plan.app_code === order.app_code || plan.app_code === "ALL") ||
        Number(plan.price) !== Number(order.amount) || Number(plan.duration_days) < 1) {
      return reply({ error: "Plan validation failed" }, 409);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + Number(plan.duration_days) * 86400000);

    // The table stores one current subscription per user/app; use its actual unique key.
    const { error: upsertError } = await db.from("jfs_app_subscriptions").upsert({
      user_id: order.user_id,
      app_code: order.app_code,
      plan_id: order.plan_id,
      status: "ACTIVE",
      trial_start: null,
      trial_end: null,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      amount: order.amount,
      plan_name: order.plan_name,
      midtrans_order_id: orderId,
      updated_at: now.toISOString(),
    }, { onConflict: "user_id,app_code" });
    if (upsertError) throw upsertError;

    const { data: sub, error: subError } = await db.from("jfs_app_subscriptions")
      .select("id,midtrans_order_id").eq("user_id", order.user_id)
      .eq("app_code", order.app_code).single();
    if (subError) throw subError;
    if (sub.midtrans_order_id !== orderId) {
      return reply({ error: "Subscription changed during payment processing; retry notification" }, 409);
    }

    const { error: updateError } = await db.from("jfs_midtrans_payment_orders").update({
      status: "PAID",
      midtrans_transaction_id: status.transaction_id ?? null,
      midtrans_transaction_status: txStatus,
      paid_at: now.toISOString(),
      subscription_id: sub.id,
      updated_at: now.toISOString(),
    }).eq("order_id", orderId).neq("status", "PAID");
    if (updateError) throw updateError;
    return reply({ ok: true, paid: true });
  } catch (e) {
    console.error(e);
    return reply({ error: e instanceof Error ? e.message : "Notification processing failed" }, 500);
  }
});