from pathlib import Path
import re

text = Path('scripts/_iso_countries_seed.sql').read_text(encoding='utf-8')
# Extract value tuples
m = re.search(r'values\s*(.*?)\s*on conflict', text, re.S | re.I)
if not m:
    raise SystemExit('no values')
raw = m.group(1).strip().rstrip(',')
# Split by ),( carefully
parts = []
buf = ''
depth = 0
for ch in raw:
    if ch == '(':
        depth += 1
    elif ch == ')':
        depth -= 1
    buf += ch
    if depth == 0 and buf.strip().endswith(')'):
        parts.append(buf.strip().rstrip(',').strip())
        buf = ''
print('tuples', len(parts))
outdir = Path('scripts/_cl_parts/iso_batches')
outdir.mkdir(parents=True, exist_ok=True)
batch = 50
for i in range(0, len(parts), batch):
    chunk = parts[i:i+batch]
    sql = (
        "insert into public.geo_countries (code, name, is_active, profile_enabled, sort_order, league_enabled)\n"
        "values\n" + ',\n'.join(chunk) +
        "\non conflict (code) do update set\n"
        "  is_active = true,\n"
        "  league_enabled = true,\n"
        "  sort_order = coalesce(public.geo_countries.sort_order, excluded.sort_order);\n"
    )
    (outdir / f'batch_{i//batch:02d}.sql').write_text(sql, encoding='utf-8')
    print('wrote', i//batch, len(sql))
