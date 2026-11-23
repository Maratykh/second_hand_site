# Lavka Zombie — Firestore Security Specification

## 1. Data Invariants
1. **Catalog Integrity**: Only verified admins (`isAdmin()`) may create, update, or delete documents in `/products/{productId}`. Every product must pass `isValidProduct()` with strict keys (including optional bounded `measurements` map: `length`, `width`, `sleeve`), bounded sizes/images arrays, valid price (`>= 0`), `status == 'draft'` empty-title allowance while `status == 'published'` requires `title.size() >= 2`, and `request.time` timestamps.
2. **Order PII Isolation**: `/orders/{orderId}` contains customer PII (`customerName`, `customerPhone`, `customerEmail`, `deliveryAddress`). Only the owning authenticated user (`resource.data.userId == request.auth.uid`) or a verified admin (`isAdmin()`) may read or list orders. Guest orders (`userId == "guest"`) can be created on checkout with `status == "new"` and `createdAt == request.time`, and can only be read or managed by admins.
3. **No Self-Assigned Roles**: `/users/{userId}` forbids RBAC fields (`role`, `isAdmin`) via strict `keys().hasOnly(...)` allowlists. `/admins/{userId}` can only be written by the bootstrapped verified admin.
4. **Immutable Ownership & Timestamps**: `createdAt`, `userId`, and `orderNumber` are immutable after creation. Terminal order states (`completed`, `cancelled`) cannot be modified except by verified admins.
5. **Admin-Only Public VK Photo Import Proxy**: `/api/vk/import` requires a verified Firebase Admin ID token (`verifyAdminMiddleware`) and fetches only public VK album photo URLs without storing VK service tokens; `/api/download-image` enforces HTTPS and private-network SSRF protection.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Product**: Create product with extra `"isAdminApproved": true` field -> DENIED by `hasOnly`.
2. **Non-Admin Product Tampering**: Authenticated non-admin attempts to update `/products/item-1` price to `0` -> DENIED by `isAdmin()`.
3. **Email Spoofing Admin Bypass**: Unverified token (`email_verified: false`) with admin email attempts to read `/orders` -> DENIED by `email_verified == true`.
4. **Order PII Cross-User Read**: User A attempts `get` on User B's order in `/orders/{orderId}` -> DENIED by owner/admin gate.
5. **Order Blanket List Scraping**: Non-admin runs unfiltered `list` on `/orders` -> DENIED by `resource.data.userId == request.auth.uid`.
6. **Guest Impersonating Authenticated User**: Unauthenticated caller creates order with `userId: "victim-uid"` -> DENIED (unauthenticated must use `userId == "guest"`).
7. **Order Status Skipping on Create**: Caller creates order directly with `status: "completed"` -> DENIED (`status == "new"` required on create).
8. **Backdated Timestamp Spoofing**: Caller sets `createdAt` to client timestamp instead of `request.time` -> DENIED by temporal integrity check.
9. **Self-Privilege Escalation in User Profile**: User writes `{"isAdmin": true, "role": "admin"}` to `/users/{uid}` -> DENIED by `hasOnly` schema check.
10. **ID Poisoning Attack**: Caller writes document at `/products/<200-char-invalid-id!@#>` -> DENIED by `isValidId()`.
11. **Denial of Wallet Oversized Array/String**: Caller submits 50-element `items` list or 5000-char `customerName` in `/orders` -> DENIED by `.size()` limits.
12. **Draft Publish Bypass**: Caller attempts to publish a product with an empty title (`status: "published"`, `title: ""`) -> DENIED by `isValidProduct()`.
