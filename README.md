# CaterHub - Catering Marketplace Platform

A full-stack catering marketplace with mobile app and admin panel, powered by Supabase.

## 🏗️ Project Structure

- **`caterhub-mobile/`** - React Native mobile app (Expo)
- **`caterhub-admin/`** - Preact admin panel (Vite)
- **`supabase-setup.sql`** - Database schema and setup

## 🚀 Quick Start

### 1. Database Setup (Supabase)

1. Go to your Supabase project: https://qiudzzioqgdusoyylktr.supabase.co
2. Navigate to the SQL Editor
3. Run the contents of `supabase-setup.sql` to create tables and sample data

### 2. Mobile App

```bash
cd caterhub-mobile
npm install
npx expo start
```

- Scan QR code with Expo Go app
- Or press `a` for Android emulator, `i` for iOS simulator

### 3. Admin Panel

```bash
cd caterhub-admin
npm install
npm run dev
```

- Open http://localhost:5173
- Login: admin@demo.com / Abcd1234!

## 📱 Mobile App Features

- **Authentication**: Login/Register with Supabase Auth
- **Service Discovery**: Browse catering services with search
- **Booking System**: Book services with package customization
- **Favorites**: Save favorite catering services
- **User Profile**: Manage account and location preferences

## 🖥️ Admin Panel Features

- **Application Management**: Review caterer applications
- **Service Management**: Manage catering services
- **User Management**: View user accounts and bookings

## 🗄️ Database Schema

### Tables
- **`users`** - User profiles and authentication
- **`services`** - Catering service listings
- **`bookings`** - Customer bookings
- **`favorites`** - User favorite services

### Sample Data
The setup script includes 6 sample catering services with ratings, prices, and metadata.

## 🔧 Tech Stack

### Mobile App
- React Native + Expo SDK 54
- Supabase for backend
- React Navigation
- React Native Paper UI
- TypeScript

### Admin Panel
- Preact + Vite
- React Router DOM
- Custom UI components
- TypeScript

### Backend
- Supabase (PostgreSQL + Auth + Real-time)
- Row Level Security (RLS)
- RESTful API

## 🔐 Authentication

- Supabase Auth handles user registration/login
- JWT tokens for API authentication
- Role-based access (CUSTOMER, CATER, ADMIN)
- Secure token storage with Expo Secure Store

## 📊 API Endpoints

All API calls go through Supabase client:

- **Authentication**: `supabase.auth.signInWithPassword()`
- **Services**: `supabase.from('services').select()`
- **Bookings**: `supabase.from('bookings').insert()`
- **Favorites**: `supabase.from('favorites').insert()`

## 🚀 Deployment

### Mobile App
- Build with `expo build` or EAS Build
- Deploy to App Store/Google Play

### Admin Panel
- Build with `npm run build`
- Deploy to Vercel, Netlify, or any static host

### Database
- Supabase handles hosting and scaling
- Automatic backups and monitoring

## 🛠️ Development

### Adding New Features
1. Update database schema in `supabase-setup.sql`
2. Update TypeScript types in `supabase.ts`
3. Implement API functions in `services/`
4. Update UI components

### Environment Variables
- Supabase URL and keys are hardcoded for demo
- In production, use environment variables

## 📝 Notes

- The app uses mock package data for service customization
- Real-time features can be added with Supabase subscriptions
- Payment integration can be added with Stripe
- Push notifications can be added with Expo Notifications

## 🐛 Troubleshooting

### Metro Bundling Issues
```bash
cd caterhub-mobile
npx expo install --fix
npm install --legacy-peer-deps
```

### Supabase Connection Issues
- Check your Supabase project URL and anon key
- Ensure RLS policies are correctly set up
- Verify database tables exist

### Expo Go Compatibility
- Make sure you're using Expo Go SDK 54
- Or upgrade the project to match your Expo Go version
