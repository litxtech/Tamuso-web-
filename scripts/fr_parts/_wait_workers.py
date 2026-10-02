import time, pathlib, sys
parts = pathlib.Path('scripts/fr_parts')
while True:
    logs = list(parts.glob('_bing_w*.log'))
    finished = sum(1 for p in logs if 'FINISHED' in p.read_text(encoding='utf-8', errors='ignore'))
    shards = sum(len(__import__('json').loads(p.read_text(encoding='utf-8'))) for p in parts.glob('_mt_shard_*.json'))
    print(f'finished={finished}/8 shards={shards}', flush=True)
    if finished >= 8:
        break
    time.sleep(20)
print('ALL_DONE', flush=True)
