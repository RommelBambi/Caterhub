# Definition of Terms

## Haversine Formula

**Haversine Formula** is a mathematical algorithm used in the Caterhub system to calculate the great-circle distance in kilometers between two geographic points (latitude and longitude coordinates) on the Earth's surface, accounting for the Earth's spherical shape. The formula uses the Earth's radius constant of 6,371 kilometers to compute the straight-line distance between a customer's location and a caterer's service location.

Within the Caterhub platform, this distance calculation serves two primary functions: (1) **Service Discovery** - determining which caterers are within a customer's proximity by comparing the calculated distance against each caterer's service radius (serviceRadiusKm), filtering and displaying only nearby catering services; and (2) **Delivery Fee Calculation** - using the computed distance as the basis for calculating transportation fees, with a base fee of ₱500 for the first 5 kilometers and ₱50 per additional kilometer, multiplied by the number of transportation vehicles required based on guest count.

The Haversine formula ensures accurate distance measurements for location-based service matching and transparent pricing, enabling customers to discover nearby caterers and receive accurate delivery fee estimates.

