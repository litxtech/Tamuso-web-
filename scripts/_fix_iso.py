from pathlib import Path
import re

text = Path('scripts/_iso_countries_seed.sql').read_text(encoding='utf-8')
tuples = re.findall(r"\('[A-Z]{2}',[^)]+\)", text)
print('found', len(tuples))
outdir = Path('scripts/_cl_parts/iso_ok')
outdir.mkdir(parents=True, exist_ok=True)
batch = 50
for i in range(0, len(tuples), batch):
    chunk = tuples[i:i + batch]
    sql = (
        "insert into public.geo_countries (code, name, is_active, profile_enabled, sort_order, league_enabled)\n"
        "values\n" + ',\n'.join(chunk) +
        "\non conflict (code) do update set\n"
        "  is_active = true,\n"
        "  league_enabled = true,\n"
        "  sort_order = coalesce(public.geo_countries.sort_order, excluded.sort_order);\n"
    )
    (outdir / f'b{i // batch:02d}.sql').write_text(sql, encoding='utf-8', newline='\n')
print('batches', (len(tuples) + batch - 1) // batch)
