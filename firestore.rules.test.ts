import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

test('firestore.rules enforces global default deny and covers all blueprint collections', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

  assert.match(rules, /rules_version = '2';/);
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);

  for (const collectionPath of Object.keys(blueprint.firestore)) {
    const cleanPath = collectionPath.replace(/^\//, '');
    assert.ok(
      rules.includes(`match /${cleanPath}`),
      `Missing match block for blueprint collection ${collectionPath}`
    );
  }
});

test('firestore.rules enforces draft/published product visibility, verified admin, and PII isolation', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');

  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /isValidProductStatus\(data\.status\)/);
  assert.match(rules, /resource\.data\.status == 'published' \|\| isAdmin\(\)/);
  assert.match(rules, /isValidProduct[\s\S]*data\.keys\(\)\.hasOnly/);
  assert.match(rules, /isValidOrder[\s\S]*data\.keys\(\)\.hasOnly/);
  assert.match(rules, /isValidUserProfile[\s\S]*data\.keys\(\)\.hasOnly/);
  assert.match(rules, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rules, /incoming\(\)\.updatedAt == request\.time/);
  assert.doesNotMatch(rules, /allow (read|list|get):\s*if\s+isSignedIn\(\)\s*;/);
});
