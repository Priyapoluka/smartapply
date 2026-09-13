# B2B RFQ Marketplace

A full-stack B2B Request for Quotation (RFQ) marketplace where buyers can post business requirements and suppliers can discover RFQs and submit quotations.

## Live Application

Frontend: https://rfq-marketplace-enrg.onrender.com

Backend API: https://rfq-marketplace-api-eb3x.onrender.com

## GitHub Repository

https://github.com/Priyapoluka/smartapply

## Features

### Buyer

- Secure signup and login
- Create RFQs
- Edit RFQs
- Delete RFQs
- View submitted RFQs
- View quotations received from suppliers
- RFQ fields:
  - Product/service name
  - Requirement description
  - Quantity
  - Delivery location
  - RFQ deadline

### Supplier

- Secure signup and login
- Browse available RFQs
- Search RFQs
- View complete RFQ details
- Submit quotations
- View previously submitted quotations
- Quotation fields:
  - Quoted price
  - Estimated delivery time
  - Message/notes

## Technology Stack

### Frontend

- React
- Vite
- CSS
- JavaScript

### Backend

- Node.js
- Express.js
- JWT authentication
- bcryptjs for password hashing
- CORS

### Database

- SQLite
- better-sqlite3

### Deployment

- Render

## Architecture

The application follows a simple client-server architecture.

```text
React + Vite Frontend
        |
        | HTTP REST API
        v
Node.js + Express Backend
        |
        v
SQLite Database