# CaterHub Admin Panel

A modern, responsive admin panel for the CaterHub catering marketplace platform.

## Project Structure

```
caterhub-admin/
├── src/
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   │   ├── Container.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Field.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Chip.tsx
│   │   │   └── Stepper.tsx
│   │   ├── admin/             # Admin-specific components
│   │   │   └── AdminShell.tsx
│   │   └── auth/              # Authentication components
│   │       └── LoginModal.tsx
│   ├── pages/                 # Main page components
│   │   ├── HomePage.tsx
│   │   └── PartnersPage.tsx
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts
│   ├── constants/             # Application constants
│   │   ├── colors.ts
│   │   └── storage.ts
│   ├── utils/                 # Utility functions
│   │   └── storage.ts
│   ├── assets/                # Static assets
│   │   └── caterhub-logo.png
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles
├── public/                   # Public assets
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Features

### 🏠 Home Page
- Hero section with call-to-action
- Service categories
- How it works section
- Partner benefits

### 🤝 Partners Registration
- Multi-step registration form
- Business profile setup
- Owner & contact information
- Menu & packages configuration
- Compliance & policies
- Review & submission

### 🔧 Admin Dashboard
- Dashboard overview with KPIs
- Caterer recruitment management
- Booking management
- User management
- Payment tracking
- Analytics & reporting
- Settings configuration
- Refund processing

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Data Fetching**: TanStack Query
- **State Management**: Zustand
- **Storage**: localStorage (web)
- **Styling**: CSS-in-JS + CSS Modules

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

## Key Components

### UI Components
- **Container**: Responsive container with max-width
- **Card**: Elevated card component with shadow
- **Button**: Flexible button with multiple variants
- **Field**: Form input field with validation states
- **Badge**: Status indicator with color coding
- **Chip**: Selectable chip component
- **Stepper**: Multi-step progress indicator

### Admin Features
- **AdminShell**: Main admin interface with sidebar navigation
- **Dashboard**: Overview with key metrics and quick actions
- **Recruitment**: Manage caterer applications
- **Bookings**: Track and manage bookings
- **Users**: User management with role-based access
- **Payments**: Payment tracking and processing
- **Analytics**: Data visualization and reporting
- **Settings**: Platform configuration
- **Refunds**: Refund request processing

## Storage Management

The application uses a cross-platform storage system that works on both web and mobile:

- **Web**: localStorage
- **Mobile**: AsyncStorage

Storage keys are centralized in `constants/storage.ts` for easy management.

## Responsive Design

The admin panel is designed to work seamlessly across:
- Desktop browsers
- Tablet devices
- Mobile phones

## Development Notes

- All components are built with React Native Web for cross-platform compatibility
- TypeScript provides type safety throughout the application
- Modular architecture allows for easy maintenance and scaling
- Consistent design system with centralized color and styling constants
