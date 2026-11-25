import json
import os
import re
import urllib.request
import io
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

PROJECT_ROOT = r'C:\Users\1209\Desktop\zombie'
RAW_PATH = os.path.join(PROJECT_ROOT, 'neeeeewclothes.txt')
SEED_PATH = os.path.join(PROJECT_ROOT, 'public', 'data', 'seedProducts.json')
HD_PATH = os.path.join(PROJECT_ROOT, 'public', 'data', 'productHdImages.json')
OUT_IMG_DIR = os.path.join(PROJECT_ROOT, 'public', 'assets', 'products')

os.makedirs(OUT_IMG_DIR, exist_ok=True)

with open(RAW_PATH, 'r', encoding='utf-8') as f:
    raw_items = json.load(f)

with open(SEED_PATH, 'r', encoding='utf-8') as f:
    seed_products = json.load(f)

with open(HD_PATH, 'r', encoding='utf-8') as f:
    hd_images = json.load(f)

def get_sig(url):
    if not url:
        return ''
    m = re.search(r'/ig2/([^?]+)', url) or re.search(r'/([^/?]+)\.jpg', url)
    return m.group(1) if m else url

known_sigs = set(get_sig(u) for u in hd_images.values())
for p in seed_products:
    for img in p.get('images', []):
        known_sigs.add(get_sig(img))

fresh_items = []
seen_sigs = set()

for item in raw_items:
    images = item.get('images', [])
    if not images or not images[0]:
        continue
    img_url = images[0]
    sig = get_sig(img_url)
    if sig and sig not in known_sigs and sig not in seen_sigs:
        seen_sigs.add(sig)
        fresh_items.append(item)

print(f"Total raw items: {len(raw_items)}")
print(f"Fresh new unique items to import: {len(fresh_items)}")

# Find max vk id
max_vk = 0
for p in seed_products:
    m = re.match(r'^vk-(\d+)$', p.get('id', ''))
    if m:
        max_vk = max(max_vk, int(m.group(1)))

print(f"Current max vk ID: vk-{max_vk}")

def clean_html(s):
    if not s:
        return ''
    s = re.sub(r'<br\s*/?>', '\n', s, flags=re.IGNORECASE)
    s = s.replace('&#128073;&#127995;', '').replace('&#128204;', '📌 ')
    s = re.sub(r'&#\d+;', '', s)
    s = s.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&nbsp;', ' ').replace('&#39;', "'").replace('&#33;', '!')
    s = s.replace('\r', '')
    return s.strip()

def parse_fresh_product(item, new_id):
    clean_desc = clean_html(item.get('description', '') or item.get('title', ''))
    lines = [l.strip() for l in clean_desc.split('\n') if l.strip()]

    # Title extraction
    title = ''
    for line in lines:
        if (
            not title
            and not line.startswith('👉')
            and not line.startswith('📌')
            and not line.startswith('http')
            and 'подпишись' not in line.lower()
            and 'замеры' not in line.lower()
            and not re.match(r'^(цена|размер|price|size|полуобхват|длина|рукав)', line, re.IGNORECASE)
        ):
            t = re.sub(r'^[•*\-\s]+', '', line).strip()
            t = re.sub(r'<[^>]+>', '', t).strip()
            if len(t) >= 2 and not re.match(r'^фотография$', t, re.IGNORECASE):
                title = t
                break

    # Price parsing
    price = 0
    for line in lines:
        m_byn = re.search(r'(?:цена|price)?[:\s]*(\d+)\s*(?:byn|р\b|бел)', line, re.IGNORECASE)
        if m_byn:
            price = int(m_byn.group(1))
            break
        m_slash = re.search(r'(\d+)\s*(?:byn|р\b)', line, re.IGNORECASE)
        if m_slash:
            price = int(m_slash.group(1))
            break
        m_rub = re.search(r'(\d+)\s*(?:rub|руб)', line, re.IGNORECASE)
        if m_rub and price == 0:
            price = round(int(m_rub.group(1)) / 30)

    # Size parsing
    size = 'ONE SIZE'
    for line in lines:
        m_s = re.search(r'(?:размер|size)[:\s]*([a-zA-Z0-9\s/–—\-]+)', line, re.IGNORECASE)
        if m_s:
            raw_s = m_s.group(1).strip().upper()
            if any(x in raw_s for x in ['OS', 'ONE', 'ЕДИН']):
                size = 'ONE SIZE'
            elif 'XXL' in raw_s: size = 'XXL'
            elif 'XL' in raw_s: size = 'XL'
            elif 'L' in raw_s: size = 'L'
            elif 'M' in raw_s: size = 'M'
            elif 'S' in raw_s: size = 'S'
            elif 'XS' in raw_s: size = 'XS'
            elif 'W' in raw_s:
                mw = re.search(r'W\s*(\d+)', raw_s)
                size = ('W' + mw.group(1)) if mw else raw_s[:10]
            else:
                size = raw_s[:15]
            break

    # Category parsing
    low = (title + ' ' + clean_desc).lower()
    category = 'accessories'
    if re.search(r'кроссовк|кеды|обувь|ботинк', low):
        category = 'shoes'
    elif re.search(r'рубашк', low):
        category = 'shirts'
    elif re.search(r'свитшот|худи|толстовк|лонгслив|кофта|свитер|джемпер|кардиган|флис', low):
        category = 'hoodies'
    elif re.search(r'куртк|анорак|бомбер|пальто|олимпийк|жилетк|жилет|коуч|ветровк', low):
        category = 'jackets'
    elif re.search(r'джинс|штаны|брюк|шорт|комбинезон|чинос|карго', low):
        category = 'pants'
    elif re.search(r'футболк|майк|поло|топ|джерси', low):
        category = 'tshirts'

    # Measurements
    measurements = {}
    for line in lines:
        chest = re.search(r'полуобхват\s*груди\s*[-–—:]*\s*(\d+)', line, re.IGNORECASE)
        if chest: measurements['width'] = chest.group(1) + ' см'
        length = re.search(r'длина\s*[-–—:]*\s*(\d+)', line, re.IGNORECASE)
        if length: measurements['length'] = length.group(1) + ' см'
        sleeve = re.search(r'рукав\s*[-–—:]*\s*(\d+)', line, re.IGNORECASE)
        if sleeve: measurements['sleeve'] = sleeve.group(1) + ' см'
        waist = re.search(r'полуобхват\s*пояса\s*[-–—:]*\s*([\d-]+)', line, re.IGNORECASE)
        if waist: measurements['waist'] = waist.group(1) + ' см'
        bottom = re.search(r'низ\s*штанины\s*[-–—:]*\s*(\d+)', line, re.IGNORECASE)
        if bottom: measurements['legOpening'] = bottom.group(1) + ' см'

    if not title:
        if category == 'hoodies': title = 'Винтажный свитшот / худи'
        elif category == 'jackets': title = 'Винтажная куртка / олимпийка'
        elif category == 'shirts': title = 'Винтажная рубашка'
        elif category == 'tshirts': title = 'Винтажная футболка / майка'
        elif category == 'pants': title = 'Винтажные брюки / джинсы'
        elif category == 'shoes': title = 'Винтажные кроссовки'
        else: title = 'Винтажный аксессуар'

    # Condition & Era
    condition = 'Отличное селективное'
    if 'нюанс' in low or 'нюансы' in low:
        condition = 'С нюансом'
    elif 'new' in low or 'новый' in low or 'новая' in low or 'новое' in low:
        condition = 'Новое с бирками'

    era = 'Винтаж / Y2K'
    if category == 'shoes': era = 'Архивный / Vintage'
    elif category == 'jackets' and ('горнолыж' in low or 'everest' in low or 'raiski' in low):
        era = 'Gorpcore / Y2K'

    product = {
        'id': new_id,
        'title': title[:100],
        'description': clean_desc[:1800],
        'price': price if price > 0 else 45,
        'currency': 'BYN',
        'category': category,
        'sizes': [size],
        'images': [f'/assets/products/{new_id}.webp'],
        'era': era,
        'condition': condition,
        'status': 'published',
        'inStock': True,
        'featured': True
    }
    if measurements:
        product['measurements'] = measurements

    return product

# Build products list and download tasks
assigned_id = max_vk
new_products = []
download_tasks = []

for item in fresh_items:
    assigned_id += 1
    new_id = f'vk-{assigned_id}'
    img_url = item['images'][0]
    
    prod = parse_fresh_product(item, new_id)
    new_products.append(prod)
    download_tasks.append((new_id, img_url))

print(f"Generated {len(new_products)} new products (IDs: vk-{max_vk + 1} to vk-{assigned_id})")

def download_and_convert(task):
    new_id, url = task
    out_file = os.path.join(OUT_IMG_DIR, f'{new_id}.webp')
    
    if os.path.exists(out_file) and os.path.getsize(out_file) > 1000:
        return new_id, True, 'cached'
    
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=15) as resp:
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
            
            return new_id, True, f'{len(webp_data)} bytes'
        except Exception as e:
            if attempt == 2:
                return new_id, False, str(e)
            time.sleep(0.5)

print("Starting concurrent download of images...")
t0 = time.time()
ok_count = 0
fail_count = 0

with ThreadPoolExecutor(max_workers=16) as executor:
    futures = {executor.submit(download_and_convert, task): task for task in download_tasks}
    for fut in as_completed(futures):
        new_id, ok, msg = fut.result()
        if ok:
            ok_count += 1
        else:
            fail_count += 1
            print(f"Failed to download {new_id}: {msg}")

print(f"Downloaded and converted: {ok_count} ok, {fail_count} failed in {time.time() - t0:.1f}s")

# Update productHdImages.json
for new_id, url in download_tasks:
    hd_images[new_id] = url

with open(HD_PATH, 'w', encoding='utf-8') as f:
    json.dump(hd_images, f, ensure_ascii=False, indent=2)

print(f"Updated {HD_PATH} with {len(download_tasks)} new entries. Total HD images: {len(hd_images)}")

# Prepend new products to seedProducts.json
updated_catalog = new_products + seed_products

with open(SEED_PATH, 'w', encoding='utf-8') as f:
    json.dump(updated_catalog, f, ensure_ascii=False, indent=2)

print(f"Updated {SEED_PATH}: total catalog now has {len(updated_catalog)} products (added {len(new_products)} fresh drop items at the top).")
