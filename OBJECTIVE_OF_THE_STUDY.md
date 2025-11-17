# Objective of the Study

## Main Objective

The goal of this study is to develop and implement a comprehensive **web and mobile application platform** that facilitates the discovery, booking, and management of catering services. The system aims to connect customers with caterers through location-based matching, automated pricing, and streamlined booking processes.

## Specific Objectives

### 1. Platform Development
To create a **multi-platform catering service application** that includes:
- **Mobile application** (React Native/Expo) for customers to discover and book catering services
- **Web application** for caterers to manage their services, packages, and bookings
- **Web-based admin dashboard** for platform administration and oversight

### 2. Geolocation-Based Service Matching
To implement **proximity-based matching** that:
- Utilizes GPS coordinates and geocoding services to determine user and caterer locations
- Calculates distances between customers and caterers using the Haversine formula
- Filters and displays caterers based on their service radius (`serviceRadiusKm`)
- Enables customers to find nearby catering services within their geographic area
- Supports multiple service locations per caterer with automatic selection of the closest location

### 3. Automated Price Calculation System
To develop an **automated pricing mechanism** that:
- Calculates base package pricing based on per-head rates and number of guests
- Automatically computes delivery fees using:
  - Distance between customer and caterer locations
  - Number of guests (affecting transportation requirements)
  - Base fee structure (₱500 for first 5 km, ₱50 per additional kilometer)
  - Transportation capacity calculations (jeepney-based logistics)
- Provides real-time price estimates during the booking process
- Stores menu customization selections (though currently not affecting price calculation)

### 4. Comprehensive Booking Management System
To establish a **complete booking workflow** that includes:
- Package browsing and detailed service information display
- Menu customization with dish selection options
- Dietary restriction and allergy accommodation tracking
- Booking creation with event date, guest count, and venue address
- Payment processing integration (Xendit) supporting:
  - Deposit and full payment options
  - Multiple payment methods (GCash, bank transfer, etc.)
  - Payment status tracking
- Booking status management (PENDING, CONFIRMED, ON_THE_WAY, COMPLETED, CANCELLED, DECLINED)
- Order management interface for caterers

### 5. User Experience Features
To provide **enhanced user experience** through:
- Service search and filtering capabilities
- Favorites system for saving preferred caterers
- Review and rating system for service quality assessment
- Caterer profile display with contact information, service areas, and sample images
- Real-time notifications and booking updates
- Interactive map picker for location selection

### 6. Platform Administration
To enable **platform management** with:
- Caterer application and approval system
- User management and analytics
- Booking oversight and support
- Payment and withdrawal management
- Platform fee calculation and distribution

## Expected Outcomes

Upon completion, the system should demonstrate:
1. **Improved accessibility** to catering services through digital platform
2. **Enhanced matching efficiency** through location-based filtering
3. **Transparent pricing** with automated delivery fee calculations
4. **Streamlined booking process** reducing time from discovery to confirmation
5. **Better service discovery** through search, filtering, and recommendation features
6. **Increased trust** through verified caterers, reviews, and ratings

## Scope and Limitations

### Current Implementation Status:
- ✅ Geolocation-based proximity matching
- ✅ Automated delivery fee calculation based on distance and guests
- ✅ Package price calculation (per-head × guests)
- ✅ Complete booking workflow
- ✅ Payment integration
- ⚠️ Menu selections are stored but do not currently affect pricing
- ⚠️ Testing and validation procedures need to be documented

### Future Enhancements:
- Price adjustments based on menu customization selections
- Advanced recommendation algorithms
- Comprehensive testing framework and validation procedures
- Performance optimization for large-scale deployment

