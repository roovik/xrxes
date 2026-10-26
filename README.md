# XRXES

Company site and the first product demo, the XRXES Virtual Showroom, on Cloudflare Workers.

- `public/index.html`: the company site (divisions, platform, showroom, privacy, contact).
- `public/showroom/`: the 3D boutique (three.js 0.170, self-hosted in `public/vendor/`). Products come from `products.json` (the PantiesOn sample catalog). Every product links to the merchant's own page with `?ref=XRXES` for attribution. A list view shows every product without 3D. Enter VR appears on headsets that support WebXR.
- `src/worker.js`: the contact form (`/api/contact`), anonymous showroom view counts (`/api/event`) and the admin page (`/admin/`).

## Settings (Cloudflare dashboard, as secrets)
- `ADMIN_KEY`: password for /admin/ (at least 12 characters).
- Optional email for new leads: `RESEND_KEY`, `MAIL_FROM`, `NOTIFY_EMAIL`.

## Point the showroom at a store
Edit `public/showroom/products.json`: `base` is the store address, `ref` the attribution code, `products` the catalog.

## Before investing
The plan notes that an Austrian technology group already uses the XRXES name. Trademark clearance comes first.
