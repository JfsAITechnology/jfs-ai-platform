# JFS AI WhatsApp Integration

## Arsitektur

Customer → WhatsApp Business / Meta → `whatsapp-webhook` (Supabase Edge Function) → Supabase → JFS AI Core → AI Response → Meta WhatsApp.

Webhook endpoint:
`https://evtkeyfjgqwarsmlzrkh.supabase.co/functions/v1/whatsapp-webhook`

## Environment secrets yang diperlukan di Supabase

- `WHATSAPP_VERIFY_TOKEN` — token bebas yang sama dengan token saat verifikasi webhook Meta.
- `WHATSAPP_ACCESS_TOKEN` — access token WhatsApp Cloud API.
- `WHATSAPP_GRAPH_VERSION` — opsional, default `v23.0`.
- `OPENAI_API_KEY` — diperlukan agar AI Response otomatis menghasilkan jawaban.
- `OPENAI_MODEL` — opsional, default `gpt-4o-mini`.

Supabase menyediakan `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` untuk Edge Function.

## Per tenant

Pada `jfs_channel_connections` buat koneksi dengan:

- `channel = whatsapp`
- `tenant_id = UUID tenant`
- `phone = nomor WhatsApp bisnis`
- `status = connected` setelah kredensial resmi aktif
- `ai_enabled = true/false`
- `metadata.phone_number_id = Phone Number ID dari Meta`

`phone_number_id` penting untuk mencocokkan webhook Meta ke tenant yang benar.

## Status saat ini

Webhook sudah dibuat dan aktif. Tanpa kredensial Meta dan OpenAI, fungsi belum dapat menerima pesan nyata dari WhatsApp atau mengirim balasan AI. Setelah secrets dan konfigurasi Meta diisi, pesan masuk akan disimpan ke `jfs_messages`, `jfs_conversations`, `jfs_contacts`, dan `jfs_analytics_events`.
