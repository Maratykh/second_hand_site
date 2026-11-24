import json
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
import io
import time
import sys

seed_path = r'C:\Users\1209\Desktop\zombie\public\data\seedProducts.json'
out_dir = r'C:\Users\1209\Desktop\zombie\public\assets\products'
os.makedirs(out_dir, exist_ok=True)

with open(seed_path, 'r', encoding='utf-8') as f:
    products = json.load(f)

total = len(products)
print(f'Starting download and conversion for {total} products...')

success_count = 0
failed_count = 0
skipped_count = 0

def process_product(product):
    pid = product['id']
    images = product.get('images', [])
    if not images or not images[0]:
        return pid, False, 'no image'
    
    url = images[0]
    out_file = os.path.join(out_dir, f'{pid}.webp')
    
    # If already downloaded and valid
    if os.path.exists(out_file) and os.path.getsize(out_file) > 1000:
        return pid, True, 'cached'
    
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw_bytes = resp.read()
            
            im = Image.open(io.BytesIO(raw_bytes))
            im.thumbnail((800, 1000), Image.Resampling.LANCZOS)
            if im.mode in ('RGBA', 'P'):
                im = im.convert('RGB')
            
            buf = io.BytesIO()
            im.save(buf, format='WEBP', quality=80)
            webp_data = buf.getvalue()
            
            with open(out_file, 'wb') as fp:
                fp.write(webp_data)
            
            return pid, True, f'saved {len(webp_data)} bytes'
        except Exception as e:
            if attempt == 1:
                return pid, False, str(e)
            time.sleep(0.5)

t0 = time.time()
processed = 0

with ThreadPoolExecutor(max_workers=20) as executor:
    futures = {executor.submit(process_product, p): p for p in products}
    for fut in as_completed(futures):
        processed += 1
        pid, ok, msg = fut.result()
        if ok:
            if msg == 'cached':
                skipped_count += 1
            else:
                success_count += 1
        else:
            failed_count += 1
        
        if processed % 150 == 0 or processed == total:
            elapsed = time.time() - t0
            rate = processed / elapsed if elapsed > 0 else 0
            print(f'Progress: {processed}/{total} ({processed*100//total}%) | Ok: {success_count} | Skip: {skipped_count} | Fail: {failed_count} | {rate:.1f} img/s')

print(f'\nDownload complete in {time.time()-t0:.1f}s!')
print(f'Successfully converted: {success_count}, Cached: {skipped_count}, Failed: {failed_count}')

# Now update public/data/seedProducts.json so that any successfully converted product points to local WebP
updated_products = []
local_converted_count = 0

for p in products:
    pid = p['id']
    local_rel = f'/assets/products/{pid}.webp'
    local_full = os.path.join(out_dir, f'{pid}.webp')
    
    item = dict(p)
    if os.path.exists(local_full) and os.path.getsize(local_full) > 1000:
        item['images'] = [local_rel]
        local_converted_count += 1
    updated_products.append(item)

with open(seed_path, 'w', encoding='utf-8') as f:
    json.dump(updated_products, f, ensure_ascii=False, indent=2)

print(f'Updated seedProducts.json: {local_converted_count} items now reference local WebP assets.')
