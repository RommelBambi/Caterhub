# System Requirements (Concise Version)

## Software Requirements

### Frontend Development
- **React Native** (v0.81.5) - Cross-platform mobile application framework
- **Expo** (v54.0.0) - Development platform and build tools
- **React** (v19.1.0) - Web application framework
- **TypeScript** (v5.8.3) - Programming language with static typing

### User Interface
- **React Native Paper** (v5.14.5) - Material Design component library
- **React Navigation** (v7.x) - Navigation and routing system
- **React Hook Form** (v7.62.0) - Form management and validation

### Backend and Database
- **Supabase** (v2.76.1) - Backend-as-a-Service platform
  - PostgreSQL database
  - Authentication and authorization
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Edge Functions (Deno runtime)

### Payment Processing
- **Xendit** - Payment gateway integration
  - GCash, PayMaya, and bank transfer support
  - Server-side payment processing via Supabase Edge Functions

### Geolocation and Mapping
- **Expo Location** (v19.0.7) - GPS and location services
- **React Native Maps** (v1.26.18) - Interactive map components
- **OpenStreetMap Nominatim API** - Geocoding service (address to coordinates)
- **Haversine Formula** - Distance calculation algorithm

### Data Storage
- **AsyncStorage** - Local persistent storage
- **Expo Secure Store** (v15.0.7) - Encrypted secure storage for sensitive data

### Media Handling
- **Expo Image Picker** (v17.0.8) - Camera and photo library access
- **Expo File System** (v19.0.17) - File system operations

### Additional Libraries
- **Axios** (v1.11.0) - HTTP client for API communication
- **React Native Reanimated** (v4.1.1) - Animation library
- **React Native Gesture Handler** (v2.28.0) - Gesture recognition
- **React Native Community DateTimePicker** (v8.4.4) - Date/time selection
- **React Native WebView** (v13.15.0) - Embedded web browser component

## Hardware Requirements

### Mobile Devices
- **iOS**: iPhone/iPad running iOS 13.0 or higher
- **Android**: Devices running Android 6.0 (API level 23) or higher
- GPS capability for location-based features
- Internet connectivity (Wi-Fi or mobile data)

### Development Environment
- **Node.js** (LTS version) - JavaScript runtime
- **npm** - Package manager
- **Git** - Version control system

## Platform Support

- **Mobile**: iOS and Android native applications
- **Web**: Responsive web application for admin and caterer dashboards

## External Services

- **Supabase Cloud** - Backend hosting and database
- **Xendit Payment Platform** - Payment processing
- **OpenStreetMap Nominatim** - Geocoding API (free service)

## Security Features

- **Supabase Authentication** - JWT-based authentication
- **Row Level Security (RLS)** - Database-level access control
- **Expo Secure Store** - Encrypted local storage
- **Server-side payment processing** - Secure API key management

