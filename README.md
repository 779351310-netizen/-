# 给娜的餐厅 · 情侣厨房

A mobile-first couples meal planning and ordering demo.

## Preview

The site is configured for GitHub Pages at `https://779351310-netizen.github.io/-/` once the `Deploy Pages` workflow completes.

## Run locally

Open `index.html` directly, or run `node server.js` and visit `http://127.0.0.1:4174/`.

## Data storage

This version stores menus, orders, ratings, outings, and role selection in the current browser's `localStorage`. GitHub Pages makes the site available from another location, but each browser/device has separate data. To share live orders and changes between two people or devices, the app needs a hosted database and sign-in; no database credentials are included in this repository.

## Files

- `index.html`: app UI and interactions
- `mascot-kitchen.png`: original kitchen illustration used by the home page
- `server.js`: local preview server
- `server-lan.js`: LAN preview server
- `make-qr.js`: QR image generator for a preview URL

