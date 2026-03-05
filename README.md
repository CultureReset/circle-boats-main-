# Beachside Circle Boats - Customer Website

**Professional boat rental website** with booking system, reviews, and gallery.

## Features

- 🎨 **Modern Design** - Clean, professional layout
- 📅 **Live Booking System** - Real-time availability calendar
- 🛒 **Shopping Cart** - Add boats, select time slots, add-ons
- 💳 **Stripe Checkout** - Secure online payments
- ⭐ **Review System** - Display customer testimonials
- 📱 **Mobile Responsive** - Works on all devices
- 🔌 **API Integration** - Connects to backend for live data
- 📊 **Analytics Tracking** - Built-in page view and conversion tracking

## Pages

- **index.html** - Main website with hero, fleet showcase, booking
- **links.html** - Linktree-style links page (Beachside Circle Boats)
- **tracking.js** - Analytics tracking script

## Tech Stack

- Pure HTML/CSS/JavaScript (no build process needed)
- Stripe.js for payments
- Fetch API for backend integration
- Responsive CSS Grid/Flexbox

## Setup

1. Update `tracking.js` with your subdomain
2. Configure Stripe publishable key
3. Point API_BASE to your backend URL
4. Upload to web hosting or serve via backend

## API Integration

Website calls these backend endpoints:
- `GET /api/public/profile` - Business info
- `GET /api/public/fleet` - Boats and pricing
- `GET /api/public/reviews` - Customer reviews
- `GET /api/public/availability` - Booking calendar
- `POST /api/public/bookings` - Create booking
- `POST /api/public/contact` - Contact form

## Customization

All branding tokens can be replaced:
- Business name, phone, email, address
- Colors (CSS variables)
- Images (in /images/ folder)
- Pricing (loaded from API)

## Demo

Business: Beachside Circle Boats
Location: Orange Beach, AL
Type: Electric circle boat rentals
