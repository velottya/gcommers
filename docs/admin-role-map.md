# Admin Role Map for Gcommers

## Roles

- `SuperAdmin`: kantor pusat, akses penuh lintas region.
- `AdminRegion`: kantor region, akses terbatas ke region masing-masing.
- `AdminTransport`: manager mitra transportir, fokus ke order delivery dan status pengiriman.

## Existing Database Tables

- `Users`: akun login dan profil admin.
- `Products`: master produk.
- `Orders`: header transaksi.
- `OrderItems`: detail item transaksi.
- `OrderEvents`: riwayat proses order.
- `Notifications`: notifikasi sistem.

## Recommended Screen Map

### SuperAdmin

- Dashboard global.
- Region management.
- Admin user management.
- Product management.
- Order monitoring.
- Notification center.
- System settings and audit.

### AdminRegion

- Dashboard region.
- Order list for assigned region.
- Product monitoring for region.
- Regional admin user list.
- Notification center.

### AdminTransport

- Operational dashboard.
- Assigned orders.
- Delivery progress and order events.
- Transport profile.
- Notification center.

## Suggested Table Usage by Role

- `Users`:
  - `Role` determines access level.
  - `Region` scopes region users.
  - `Type`, `CompanyName`, `TransportirName`, and `PoliceNumber` support transport user profiles.
- `Orders`:
  - SuperAdmin sees all.
  - AdminRegion sees region scoped orders.
  - AdminTransport sees assigned delivery orders.
- `OrderItems`:
  - Used in order detail for all roles.
- `OrderEvents`:
  - Most important for AdminTransport and order tracking.
- `Notifications`:
  - Filter by user, role, or region.

## Current Gap

- Laravel still uses the default auth model and default `users` table schema.
- The SQL Server database uses a custom `Users` table with different column names.
- No model exists yet for `Products`, `Orders`, `OrderItems`, `OrderEvents`, or `Notifications`.

## Shared Database Safety

- Do not create or modify migrations that alter the existing SQL Server schema used by the user-facing app.
- Reuse the existing tables as-is and map Laravel models to them.
- Keep admin-specific behavior in Laravel code: models, policies, middleware, controllers, and views.
- If extra admin metadata is needed later, prefer a separate admin-only table or a non-invasive nullable column only after confirming it will not affect the user app.
- For now, avoid schema changes entirely and treat the current database as the single source of truth.

## Practical Next Step

1. Create a custom `User` model mapping to the SQL Server `Users` table.
2. Add role-aware middleware or gates.
3. Build role-based dashboard routes and layouts.
4. Add models for order, product, event, and notification tables.
