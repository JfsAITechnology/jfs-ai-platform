INSERT INTO public.jfs_app_subscription_plans
  (id, app_code, name, duration_days, price, description, is_active, sort_order, is_trial)
VALUES
  ('WA-CS-TRIAL-30D', 'WHATSAPP-CS', 'Gratis 1 Bulan', 30, 0, 'Trial gratis 30 hari untuk JFS AI WhatsApp CS.', true, 0, true),
  ('WA-CS-1M', 'WHATSAPP-CS', '1 Bulan', 30, 0, 'Harga belum ditetapkan. Paket tetap nonaktif sampai harga ditentukan.', false, 10, false),
  ('WA-CS-3M', 'WHATSAPP-CS', '3 Bulan', 90, 0, 'Harga belum ditetapkan. Paket tetap nonaktif sampai harga ditentukan.', false, 20, false),
  ('WA-CS-6M', 'WHATSAPP-CS', '6 Bulan', 180, 0, 'Harga belum ditetapkan. Paket tetap nonaktif sampai harga ditentukan.', false, 30, false),
  ('WA-CS-9M', 'WHATSAPP-CS', '9 Bulan', 270, 0, 'Harga belum ditetapkan. Paket tetap nonaktif sampai harga ditentukan.', false, 40, false),
  ('WA-CS-1Y', 'WHATSAPP-CS', '1 Tahun', 365, 0, 'Harga belum ditetapkan. Paket tetap nonaktif sampai harga ditentukan.', false, 50, false),
  ('WA-CS-CUSTOM', 'WHATSAPP-CS', 'Custom', 0, 0, 'Paket custom belum diaktifkan; konfigurasi dan alur permintaan perlu diselesaikan.', false, 60, false)
ON CONFLICT (id) DO NOTHING;
