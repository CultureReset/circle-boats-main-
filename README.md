# circle-boats-main-

The website for Beachside Circle Boats, a boat rental business: boats, a live availability calendar, a cart with time slots and add-ons, Stripe checkout and reviews.

Static HTML, CSS and JavaScript on Vercel, with no build step. Last changed in May 2026.

## How it works

The pages (`index.html`, `booking.html`, `checkout.html`, `confirmation.html`, `dashboard.html`) are plain files. Scripts in `js/` load boats, time slots and reviews from the CyberCheck platform, and checkout hands off to Stripe. `config.js` holds the per-business settings (business, installed apps, plan), read from the URL or the session. `vercel.json` serves the folder as-is with clean URLs and a few rewrites, such as `/login`.

`dashboard.html` is the owner's view of the same data. Images are in `images/`.

## Run it

Serve the folder with any static server, for example `npx serve .`, or deploy it to Vercel as-is.

Related: [`cybercheck-dashboard`](https://github.com/CultureReset/cybercheck-dashboard) carries a copy of this site next to the CyberCheck backend.
