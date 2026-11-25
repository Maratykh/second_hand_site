import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addToCartList,
  buildDraftProductFromVkPhoto,
  buildProductDownloadFilename,
  calculateCartSummary,
  extractApiPhotoId,
  extractVkPhotosFromAlPhotosPayload,
  extractVkPublicAlbumPhotoUrls,
  filterAndSortProducts,
  formatMeasurementValue,
  generateOrderNumber,
  isVkAlbumsListUrl,
  parseVkAlbumInput,
  removeFromCartList,
  sanitizeImageUrl,
  sanitizeMeasurements,
  toggleIdInList,
  updateCartItemQuantity,
  validateCheckoutForm,
} from './storeLogic';
import { SEED_PRODUCTS } from '../data/seedProducts';
import type { Product } from '../types/store';

test('filterAndSortProducts filters by category, size, hides drafts, and sorts by price', () => {
  const draftItem: Product = {
    ...SEED_PRODUCTS[0],
    id: 'draft-vk-1',
    title: '',
    status: 'draft',
  };

  const visible = filterAndSortProducts([...SEED_PRODUCTS, draftItem], {
    category: 'all',
    size: 'all',
    search: '',
    sort: 'newest',
    onlyInStock: true,
  });
  assert.equal(visible.length, SEED_PRODUCTS.length);
  assert.ok(visible.every((p) => p.status === 'published'));

  const jackets = filterAndSortProducts(SEED_PRODUCTS, {
    category: 'jackets',
    size: 'all',
    search: '',
    sort: 'newest',
    onlyInStock: true,
  });
  assert.ok(jackets.length >= 1);
  assert.ok(jackets.every((p) => p.category === 'jackets'));

  const sortedAsc = filterAndSortProducts(SEED_PRODUCTS, {
    category: 'all',
    size: 'all',
    search: '',
    sort: 'price-asc',
    onlyInStock: true,
  });
  const prices = SEED_PRODUCTS.map((p) => p.price);
  assert.equal(sortedAsc[0].price, Math.min(...prices));
  assert.equal(sortedAsc[sortedAsc.length - 1].price, Math.max(...prices));
});

test('toggleIdInList adds and removes IDs cleanly for fittings and wishlist', () => {
  let list = toggleIdInList([], 'prod-1');
  assert.deepEqual(list, ['prod-1']);
  list = toggleIdInList(list, 'prod-2');
  assert.deepEqual(list, ['prod-2', 'prod-1']);
  list = toggleIdInList(list, 'prod-1');
  assert.deepEqual(list, ['prod-2']);
});

test('measurements sanitization and formatting work accurately', () => {
  assert.equal(formatMeasurementValue('68'), '68 см');
  assert.equal(formatMeasurementValue('68 см'), '68 см');
  assert.equal(formatMeasurementValue('43 см (пояс)'), '43 см (пояс)');
  assert.equal(formatMeasurementValue('  '), '');

  assert.deepEqual(
    sanitizeMeasurements({ length: ' 68 см ', width: '58', sleeve: '  ' }),
    { length: '68 см', width: '58' }
  );
  assert.equal(sanitizeMeasurements({ length: '', width: '', sleeve: '' }), undefined);
});

test('cart operations add, merge sizes, update quantity, remove, and compute totals', () => {
  const jacket = SEED_PRODUCTS[0];
  const tee = SEED_PRODUCTS[1];

  let cart = addToCartList([], jacket, 'L', 1);
  cart = addToCartList(cart, jacket, 'L', 1);
  cart = addToCartList(cart, tee, 'M', 1);

  assert.equal(cart.length, 2);
  assert.equal(cart[0].quantity, 2);

  const summary = calculateCartSummary(cart);
  assert.equal(summary.totalItems, 3);
  assert.equal(summary.totalAmount, jacket.price * 2 + tee.price);

  cart = updateCartItemQuantity(cart, jacket.id, 'L', -1);
  assert.equal(cart[0].quantity, 1);

  cart = removeFromCartList(cart, tee.id, 'M');
  assert.equal(cart.length, 1);
});

test('validateCheckoutForm rejects incomplete input and accepts valid order details', () => {
  const emptyErrors = validateCheckoutForm({
    customerName: '',
    customerPhone: '123',
    customerEmail: 'bad-email',
    deliveryAddress: 'ab',
    deliveryMethod: 'europost',
    comment: '',
  });
  assert.ok(emptyErrors.customerName);
  assert.ok(emptyErrors.customerPhone);
  assert.ok(emptyErrors.customerEmail);
  assert.ok(emptyErrors.deliveryAddress);

  const validErrors = validateCheckoutForm({
    customerName: 'Алексей Морозов',
    customerPhone: '+375 29 555-44-33',
    customerEmail: 'alex@example.com',
    deliveryAddress: 'г. Минск, отделение Европочты №14',
    deliveryMethod: 'europost',
    comment: 'Позвонить перед отправкой',
  });
  assert.deepEqual(validErrors, {});

  const orderNo = generateOrderNumber(new Date('2026-11-23T12:00:00Z'));
  assert.match(orderNo, /^LZ-261123-[A-Z0-9]{4}$/);
});

test('sanitizeImageUrl allows safe local/https/data-image urls and blocks javascript/html/svg/traversal', () => {
  assert.equal(sanitizeImageUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeImageUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(sanitizeImageUrl('data:image/svg+xml;base64,PHN2Zz4='), null);
  assert.equal(sanitizeImageUrl('/assets/../secrets.json'), null);
  assert.equal(sanitizeImageUrl('/src/assets/images/test.jpg'), '/src/assets/images/test.jpg');
  assert.equal(sanitizeImageUrl('/assets/products/tg-1.webp'), '/assets/products/tg-1.webp');
  assert.equal(sanitizeImageUrl('/api/photo?id=img_m8x9abc_1234'), '/api/photo?id=img_m8x9abc_1234');
  assert.equal(sanitizeImageUrl('/api/photo?id=../secret'), null);
  assert.equal(sanitizeImageUrl('/api/photo?id=abc&extra=1'), null);
  assert.equal(extractApiPhotoId('/api/photo?id=img_m8x9abc_1234'), 'img_m8x9abc_1234');
  assert.equal(extractApiPhotoId('/assets/products/tg-1.webp'), null);
  assert.equal(
    sanitizeImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='),
    'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
  );
  assert.equal(sanitizeImageUrl('https://sun9-1.userapi.com/photo.jpg'), 'https://sun9-1.userapi.com/photo.jpg');
});

test('parseVkAlbumInput and extractVkPublicAlbumPhotoUrls handle vk.com, vk.ru, vkuserphoto.ru, and al_photos payloads', () => {
  assert.deepEqual(parseVkAlbumInput('241285866'), {
    ownerId: '-139575762',
    albumId: '241285866',
  });
  assert.deepEqual(parseVkAlbumInput('https://vk.ru/album-139575762_241285866'), {
    ownerId: '-139575762',
    albumId: '241285866',
  });
  assert.deepEqual(
    parseVkAlbumInput('https://vk.ru/albums-139575762?z=photo-139575762_457347325%2Falbum-139575762_241285866'),
    {
      ownerId: '-139575762',
      albumId: '241285866',
    }
  );
  assert.equal(isVkAlbumsListUrl('https://vk.ru/albums-139575762'), true);
  assert.equal(isVkAlbumsListUrl('https://vk.ru/album-139575762_241285866'), false);
  assert.equal(parseVkAlbumInput('invalid-album-!@#'), null);

  const sampleHtml = `
    <div id="photo_row_-139575762_1" style="background-image: url(https:\\/\\/sun9-10.vkuserphoto.ru\\/s\\/v1\\/ig2\\/abc123.jpg?quality=95&amp;cs=240x0);"></div>
    <img src="https://sun9-22.userapi.com/s/v1/ig2/def456.jpg?size=50x50" />
    <img src="https://sun9-6.userapi.com/s/v1/ig1/avatar.jpg?crop=0,0,1500,1500" />
    <div id="photo_row_-139575762_2" style="background-image: url(http://sun9-33.userapi.com/s/v1/ig2/ghi789.jpg?quality=95&cs=240x0);"></div>
  `;
  const extracted = extractVkPublicAlbumPhotoUrls(sampleHtml);
  assert.equal(extracted.length, 2);
  assert.ok(extracted[0].startsWith('https://sun9-10.vkuserphoto.ru/'));
  assert.ok(extracted[0].includes('cs=1280x0'));
  assert.ok(extracted[1].startsWith('https://sun9-33.userapi.com/'));

  const alPayload = JSON.stringify({
    payload: [
      0,
      [
        'album-139575762_241285866',
        260,
        0,
        [
          {
            id: '-139575762_1',
            z_src: 'https://sun9-84.userapi.com/s/v1/ig2/hoodie1.jpg?quality=95&cs=1280x0',
            x_src: 'https://sun9-84.userapi.com/s/v1/ig2/hoodie1.jpg?quality=95&cs=640x0',
          },
          {
            id: '-139575762_2',
            y_src: 'http://sun9-70.vkuserphoto.ru/s/v1/ig2/hoodie2.jpg?quality=95&cs=1080x0',
          },
        ],
      ],
    ],
  });
  const parsedAl = extractVkPhotosFromAlPhotosPayload(alPayload);
  assert.equal(parsedAl.total, 260);
  assert.equal(parsedAl.images.length, 2);
  assert.equal(
    parsedAl.images[0],
    'https://sun9-84.userapi.com/s/v1/ig2/hoodie1.jpg?quality=95&cs=1280x0'
  );
  assert.equal(
    parsedAl.images[1],
    'https://sun9-70.vkuserphoto.ru/s/v1/ig2/hoodie2.jpg?quality=95&cs=1080x0'
  );
});

test('buildDraftProductFromVkPhoto creates draft with photo and empty fields only', () => {
  const draft = buildDraftProductFromVkPhoto('https://sun9-10.userapi.com/jacket.jpg');
  assert.ok(draft);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.title, '');
  assert.equal(draft.price, 0);
  assert.equal(draft.description, '');
  assert.equal(draft.era, '');
  assert.equal(draft.condition, '');
  assert.deepEqual(draft.images, ['https://sun9-10.userapi.com/jacket.jpg']);

  assert.equal(buildDraftProductFromVkPhoto('javascript:alert(1)'), null);
  assert.equal(buildProductDownloadFilename('Кожаная косуха 1990s'), 'кожаная-косуха-1990s.jpg');
});
