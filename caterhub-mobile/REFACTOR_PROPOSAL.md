# Proposed Directory Structure Refactor

## Current Issues:
1. Platform logic scattered (Platform.OS checks in multiple files)
2. Web/mobile layouts duplicated in same files (300+ line files)
3. Mixed organization (home separate from customer)
4. No clear separation of platform-specific code

## Proposed Structure:

```
src/
├── utils/
│   ├── platform.ts          # Centralized platform detection
│   └── storage.ts           # Platform-aware storage (already exists in auth.tsx)
│
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx         # Main component (orchestrator)
│   │   ├── mobile/
│   │   │   └── LoginScreen.mobile.tsx
│   │   └── web/
│   │       └── LoginScreen.web.tsx
│   │
│   ├── customer/           # Customer screens (mobile only)
│   │   ├── HomeScreen.tsx
│   │   ├── BookingForm.tsx
│   │   ├── BookingsList.tsx
│   │   └── ...
│   │
│   └── partner/            # Partner screens (web + mobile)
│       ├── DashboardScreen.tsx
│       ├── OrdersScreen.tsx
│       └── ...
│
├── components/
│   ├── customer/           # Customer components
│   ├── partner/            # Partner components
│   └── common/             # Shared components
│       └── PlatformAware.tsx  # Wrapper for platform-specific components
│
└── navigation/
    ├── customer/           # Customer navigation (mobile)
    ├── partner/            # Partner navigation (web + mobile)
    └── RootNav.tsx         # Uses platform utils
```

## Benefits:
- ✅ Platform logic centralized in `utils/platform.ts`
- ✅ Smaller, focused components (web/mobile separated)
- ✅ Easier to maintain and test
- ✅ Clear separation of concerns
- ✅ Better code reusability

Would you like me to implement this refactoring?

