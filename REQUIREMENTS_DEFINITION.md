# 4.1. Requirements Definition

| Functional Requirements | Non-functional Requirements |
|------------------------|----------------------------|
| Users can register for an account using valid credentials (email, password, username) and accept terms and conditions. | The system must authenticate user inputs during registration, ensuring all required fields are completed, email format is valid, and passwords meet security requirements. |
| Users can log in with correct credentials and access role-specific interfaces (customer, caterer, or admin). | All user data and passwords must be securely encrypted using industry-standard encryption protocols, and authentication tokens must be securely stored. |
| Users can update their profile information, change passwords, and manage saved delivery locations. | Password changes must require current password verification and comply with security standards to prevent unauthorized access. |
| Users can browse available caterers and services by location, search query, and filter by distance, ratings, or featured status. | The system must provide fast search and filtering with results loading under 5 seconds, and location-based services must function accurately with GPS data. |
| Users can view detailed service information including packages, menu items, pricing, reviews, and caterer locations on an interactive map. | The service details interface should load within 3 seconds, and map rendering must be responsive with smooth interaction and marker placement. |
| Users can select catering packages and customize services including number of guests, menu selections, dietary restrictions, special requests, and event date. | The customization interface should be easy to use, must have real-time price updates and validation, and system response time under 2 seconds during customization. |
| Users can book a catering service, review booking summary with itemized pricing (package cost, delivery fee, platform fee), and schedule event dates. | The booking system must support real-time availability checking, calendar synchronization, conflict detection, and booking confirmation within 5 seconds. |
| Users can process payments through multiple payment methods (GCash, PayMaya, bank transfers) via Xendit payment gateway with automatic deposit calculation (50% of total). | Payment processing must be secure with encrypted transactions, support real-time payment status updates via webhooks, and payment links must be generated within 3 seconds. |
| Users receive notifications on booking confirmations, payment status updates, booking status changes, and service updates. | Notifications must be delivered within 2 seconds and must support in-app notifications with reliable delivery and proper read/unread status tracking. |
| Users can view ratings and reviews for caterers, submit feedback with star ratings (1-5) and text comments after completed bookings. | The feedback system should ensure data is stored reliably, reviews are displayed without performance lag, and average ratings are calculated accurately in real-time. |
| Users can manage favorites, view booking history, track booking status, and submit support tickets for issues. | Booking history must load within 3 seconds, and support ticket submission must validate inputs and provide confirmation within 2 seconds. |
| Caterers can submit partner applications with business information, legal documentation (DTI Registration, permits), and service locations. | The system must support secure upload of legal documents (PDF, JPEG), validate formats and file sizes, encrypt files at rest, and provide application status updates within 48 hours. |
| Caterers can create and manage catering packages with menu items, pricing per head, inclusions, and package images. | Package management interface must support real-time updates, validate pricing inputs, and save changes within 2 seconds with proper error handling. |
| Caterers can view and manage orders, update booking status (PENDING, CONFIRMED, ON_THE_WAY, COMPLETED), and track earnings through wallet system. | Order management must support real-time status updates, earnings calculations must be accurate, and wallet balance must update immediately after payment completion. |
| Caterers can request withdrawals of earnings, select payment methods, and track withdrawal request status. | Withdrawal requests must be processed securely, validate minimum withdrawal amounts, and provide status updates within 24 hours of submission. |
| Caterers can subscribe to premium plans (monthly/yearly) for featured listings and manage subscription status. | Subscription payment processing must be secure, subscription status must update in real-time via webhooks, and featured status must activate immediately upon payment confirmation. |
| Administrators can manage user accounts, review and approve caterer applications, monitor bookings, process refunds, and view analytics dashboard. | Admin operations must have proper authorization checks, analytics data must load within 5 seconds, and all administrative actions must be logged for audit purposes. |








