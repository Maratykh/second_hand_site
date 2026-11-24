import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isSeededLocalProductImage, pickVkResolutionUrl } from './hdImages.ts';

test('isSeededLocalProductImage only matches unedited default seeded asset paths', () => {
  assert.equal(isSeededLocalProductImage('vk-521', '/assets/products/vk-521.webp'), true);
  assert.equal(isSeededLocalProductImage('vk-521', 'data:image/jpeg;base64,abc'), false);
  assert.equal(isSeededLocalProductImage('vk-521', '/assets/products/vk-522.webp'), false);
  assert.equal(isSeededLocalProductImage('vk-521', 'https://example.com/custom.jpg'), false);
  assert.equal(isSeededLocalProductImage('vk-521', undefined), false);
});

test('pickVkResolutionUrl selects highest fitting width <= preferredMaxWidth and sets cs=', () => {
  const sample =
    'https://sun9-80.vkuserphoto.ru/s/v1/ig2/abc.jpg?quality=95&as=32x40,480x600,1280x1600,1440x1800,2048x2560&from=bu&cs=1280x0';

  assert.match(pickVkResolutionUrl(sample, 1620), /[?&]cs=1440x0$/);
  assert.match(pickVkResolutionUrl(sample, 2048), /[?&]cs=2048x0$/);

  const smallerAs =
    'https://sun9-80.vkuserphoto.ru/s/v1/ig2/abc.jpg?quality=95&as=32x40,720x900,1080x1350&from=bu&cs=1080x0';
  assert.match(pickVkResolutionUrl(smallerAs, 1620), /[?&]cs=1080x0$/);

  const nonVk = 'https://example.com/photo.jpg';
  assert.equal(pickVkResolutionUrl(nonVk, 1620), nonVk);
});

test('public/data/productHdImages.json contains valid https VK URLs matching seedProducts', () => {
  const seed = JSON.parse(fs.readFileSync('public/data/seedProducts.json', 'utf8'));
  const hdMap = JSON.parse(fs.readFileSync('public/data/productHdImages.json', 'utf8'));
  const seedIds = new Set(seed.map((p: { id: string }) => p.id));

  const entries = Object.entries(hdMap as Record<string, string>);
  assert.ok(entries.length >= 1400, `Expected >= 1400 HD entries, got ${entries.length}`);

  for (const [id, url] of entries) {
    assert.ok(seedIds.has(id), `HD manifest contains unknown product ID: ${id}`);
    assert.ok(url.startsWith('https://'), `Expected https URL for ${id}`);
    assert.ok(/[?&]cs=\d+x\d+/.test(url), `Expected cs= width param for ${id}`);
  }
});
