import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFeedProductList,
  decodeFeedItems,
  decodeFirestoreValue,
  selectFeedShardForProduct,
} from './catalogSync.ts';

test('decodeFirestoreValue decodes nested REST maps, arrays, numbers, and timestamps', () => {
  const decoded = decodeFirestoreValue({
    mapValue: {
      fields: {
        title: { stringValue: 'Худи Carhartt' },
        price: { integerValue: '120' },
        inStock: { booleanValue: true },
        sizes: { arrayValue: { values: [{ stringValue: 'L' }, { stringValue: 'XL' }] } },
      },
    },
  });

  assert.deepEqual(decoded, {
    title: 'Худи Carhartt',
    price: 120,
    inStock: true,
    sizes: ['L', 'XL'],
  });
});

test('decodeFeedItems & buildFeedProductList sort newest custom items first without internal timestamps', () => {
  const raw = {
    prod_old: {
      title: 'Старая куртка',
      description: '',
      price: 100,
      currency: 'BYN',
      category: 'jackets',
      sizes: ['M'],
      images: ['/api/photo?id=img_1'],
      era: '90s',
      condition: 'Отличное',
      status: 'published',
      inStock: true,
      featured: false,
      createdAtMs: 1000,
      updatedAtMs: 1000,
    },
    prod_new: {
      title: 'Новый свитшот',
      description: '',
      price: 85,
      currency: 'BYN',
      category: 'hoodies',
      sizes: ['L'],
      images: ['/api/photo?id=img_2'],
      era: 'Y2K',
      condition: 'Новое',
      status: 'published',
      inStock: true,
      featured: true,
      createdAtMs: 5000,
      updatedAtMs: 5000,
    },
    corrupt_entry: 'invalid',
  };

  const decoded = decodeFeedItems(raw);
  assert.equal(Object.keys(decoded).length, 2);

  const list = buildFeedProductList(decoded, {});
  assert.equal(list.length, 2);
  assert.equal(list[0].id, 'prod_new');
  assert.equal(list[1].id, 'prod_old');
  assert.equal((list[0] as unknown as Record<string, unknown>).createdAtMs, undefined);
});

test('selectFeedShardForProduct routes overflow only when primary shard exceeds threshold', () => {
  const smallMap = decodeFeedItems({
    p1: {
      title: 'Куртка',
      description: '',
      price: 50,
      currency: 'BYN',
      category: 'jackets',
      sizes: ['L'],
      images: ['/api/photo?id=img_1'],
      era: '90s',
      condition: 'Отличное',
      status: 'published',
      inStock: true,
      featured: false,
    },
  });
  assert.equal(selectFeedShardForProduct('p_new', smallMap, {}), 'catalog_feed');
  assert.equal(selectFeedShardForProduct('p_in_overflow', smallMap, { p_in_overflow: smallMap.p1 }), 'catalog_feed_2');
});
