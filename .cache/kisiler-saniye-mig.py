from pathlib import Path

src = Path("supabase/migrations/20260926000100_kisiler_arama_ucretsiz_hak_ve_coin_metering.sql").read_text(encoding="utf-8").splitlines()
oniz = "\n".join(src[355:497])
hb = "\n".join(src[868:1000])
old_est = """  v_est := v_free + case
    when v_price > 0 then floor((coalesce(v_balance, 0)::numeric * 60) / v_price)::int
    else 0
  end;"""
new_est = """  -- Buyuk coin bakiyesi (balance*60/fiyat) int4 sinirini asar.
  v_est := least(
    2000000000::bigint,
    coalesce(v_free, 0)::bigint + case
      when coalesce(v_price, 0) > 0 then
        floor((greatest(coalesce(v_balance, 0), 0)::numeric * 60) / v_price)::bigint
      else 0::bigint
    end
  )::int;"""
old_aff = "    v_coin_afford_sec := floor((coalesce(v_balance, 0)::numeric * 60) / v_price)::int;"
new_aff = """    v_coin_afford_sec := least(
      2000000000::bigint,
      floor((greatest(coalesce(v_balance, 0), 0)::numeric * 60) / v_price)::bigint
    )::int;"""
old_rem = "  v_remaining_sec := v_free_remaining + greatest(0, v_coin_afford_sec - v_paid_seconds);"
new_rem = """  v_remaining_sec := least(
    2000000000::bigint,
    coalesce(v_free_remaining, 0)::bigint
      + greatest(0, coalesce(v_coin_afford_sec, 0)::bigint - coalesce(v_paid_seconds, 0))
  )::int;"""
if old_est not in oniz:
    raise SystemExit("est missing")
if old_aff not in hb:
    raise SystemExit("aff missing")
if old_rem not in hb:
    raise SystemExit("rem missing")
oniz = oniz.replace(old_est, new_est)
hb = hb.replace(old_aff, new_aff).replace(old_rem, new_rem)
header = (
    "-- Kisi arama onizlemesi: dev coin bakiyesi * 60 / fiyat int4 sinirini asinca\n"
    "-- integer out of range (22003) firlatiyordu. Tahmini sureyi sinirla.\n\n"
)
footer = (
    "\n\ngrant execute on function public.kisiler_arama_onizleme(uuid, text) to authenticated;\n"
    "grant execute on function public.kisiler_gorusme_billing_heartbeat(uuid) to authenticated;\n"
)
out = header + oniz + "\n\n" + hb + footer
dest = Path("supabase/migrations/20261007204500_kisiler_arama_saniye_tasma.sql")
dest.write_text(out, encoding="utf-8")
print("wrote", dest, "bytes", len(out.encode()))
