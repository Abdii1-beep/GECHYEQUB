# Ethiopian Car Lottery Platform - API Documentation

## Overview

The Ethiopian Car Lottery Platform API provides a comprehensive RESTful API for managing lottery campaigns, tickets, payments, KYC verification, fraud detection, and more. This documentation covers all available endpoints, authentication requirements, and response formats.

**Base URL**: `https://api.ethiopiancarlottery.com/api`
**API Version**: v1

## Authentication

Most endpoints require authentication using JWT (JSON Web Tokens). Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "role": "CUSTOMER"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "CUSTOMER"
  }
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

## Roles

The platform uses Role-Based Access Control (RBAC) with the following roles:

- **SUPER_ADMIN**: Full system access
- **LOTTERY_MANAGER**: Manage campaigns and draws
- **FINANCE_OFFICER**: Manage payments and financial reports
- **KYC_OFFICER**: Manage KYC verification
- **DRAW_OFFICER**: Execute and verify draws
- **AUDITOR**: View audit logs
- **CUSTOMER**: Purchase tickets and view own data
- **CUSTOMER_SUPPORT**: Support operations

## Campaign Management

### Get All Campaigns
```http
GET /api/campaigns
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (ACTIVE, UPCOMING, COMPLETED)

### Create Campaign
```http
POST /api/campaigns
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Summer Car Lottery 2026",
  "description": "Win a brand new car!",
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-08-31T23:59:59Z",
  "drawDate": "2026-09-15T14:00:00Z",
  "ticketPrice": 500,
  "totalTickets": 10000,
  "eligibilityRules": {
    "minAge": 18,
    "maxTicketsPerPerson": 10
  }
}
```

**Required Roles**: SUPER_ADMIN, LOTTERY_MANAGER

### Update Campaign
```http
PUT /api/campaigns/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Campaign Name",
  "status": "ACTIVE"
}
```

**Required Roles**: SUPER_ADMIN, LOTTERY_MANAGER

### Delete Campaign
```http
DELETE /api/campaigns/:id
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN

## Ticket Management

### Get User Tickets
```http
GET /api/tickets
Authorization: Bearer <access_token>
```

### Get Ticket by ID
```http
GET /api/tickets/:id
Authorization: Bearer <access_token>
```

### Purchase Ticket
```http
POST /api/tickets/purchase
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "campaignId": "campaign-id",
  "quantity": 1
}
```

## Payment Processing

### Create Payment
```http
POST /api/payments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "orderId": "order-id",
  "provider": "TELEBIRR",
  "amount": 500,
  "currency": "ETB"
}
```

### Verify Payment
```http
POST /api/payments/verify/:transactionId
Authorization: Bearer <access_token>
```

### Get Payment Status
```http
GET /api/payments/:transactionId/status
Authorization: Bearer <access_token>
```

## KYC Verification

### Submit KYC Documents
```http
POST /api/kyc/submit
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

{
  "fullName": "John Doe",
  "dateOfBirth": "1990-01-01",
  "phone": "+251911234567",
  "email": "john@example.com",
  "address": "Addis Ababa, Ethiopia",
  "nationalId": "ET123456789",
  "idDocument": <file>,
  "selfie": <file>
}
```

### Get KYC Status
```http
GET /api/kyc/status
Authorization: Bearer <access_token>
```

### Verify KYC (Admin)
```http
POST /api/kyc/:id/verify
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "VERIFIED",
  "rejectionReason": null
}
```

**Required Roles**: SUPER_ADMIN, KYC_OFFICER

## Draw Engine

### Prepare Draw
```http
POST /api/draws/prepare
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "campaignId": "campaign-id",
  "vehicleCount": 5
}
```

**Required Roles**: SUPER_ADMIN, DRAW_OFFICER

### Execute Draw
```http
POST /api/draws/:id/execute
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "seed": "random-seed-value"
}
```

**Required Roles**: SUPER_ADMIN, DRAW_OFFICER

### Get Draw Results
```http
GET /api/draws/:id/results
Authorization: Bearer <access_token>
```

### Verify Winner
```http
POST /api/draws/:drawId/verify/:resultId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "verified": true,
  "notes": "Winner verified successfully"
}
```

**Required Roles**: SUPER_ADMIN, DRAW_OFFICER

## Fraud Detection

### Get Risk Score
```http
GET /api/fraud/risk-score/:userId
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, FRAUD_OFFICER

### Detect Suspicious Activity
```http
GET /api/fraud/suspicious-activity
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, FRAUD_OFFICER

### Flag Account
```http
POST /api/fraud/flag
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userId": "user-id",
  "severity": "HIGH",
  "reason": "Suspicious payment pattern",
  "evidence": {}
}
```

**Required Roles**: SUPER_ADMIN, FRAUD_OFFICER

### Resolve Flag
```http
PUT /api/fraud/flags/:id/resolve
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "resolution": "False positive - legitimate activity",
  "resolvedBy": "admin-id"
}
```

**Required Roles**: SUPER_ADMIN, FRAUD_OFFICER

### Get Fraud Statistics
```http
GET /api/fraud/statistics
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, FRAUD_OFFICER

## Audit Logging

### Get Audit Logs
```http
GET /api/audit/logs
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `role` (optional): Filter by role
- `userId` (optional): Filter by user ID
- `result` (optional): Filter by result (SUCCESS, FAILURE)
- `page` (optional): Page number
- `limit` (optional): Items per page

**Required Roles**: SUPER_ADMIN, AUDITOR

### Get Audit Log Details
```http
GET /api/audit/logs/:id
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, AUDITOR

### Get Audit Statistics
```http
GET /api/audit/statistics
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, AUDITOR

## Notifications

### Get User Notifications
```http
GET /api/notifications
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `page` (optional): Page number
- `limit` (optional): Items per page
- `unreadOnly` (optional): Filter by unread status

### Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <access_token>
```

### Mark All as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <access_token>
```

### Send Notification (Admin)
```http
POST /api/notifications/send
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userId": "user-id",
  "type": "INFO",
  "title": "Payment Successful",
  "message": "Your ticket purchase was successful",
  "data": {}
}
```

**Required Roles**: SUPER_ADMIN, LOTTERY_MANAGER, CUSTOMER_SUPPORT

## Reports

### Financial Reports
```http
GET /api/reports/financial
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `startDate` (optional): Start date for report
- `endDate` (optional): End date for report

**Required Roles**: SUPER_ADMIN, FINANCE_OFFICER

### Ticket Reports
```http
GET /api/reports/tickets
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, LOTTERY_MANAGER

### Customer Reports
```http
GET /api/reports/customers
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, LOTTERY_MANAGER

### Draw Reports
```http
GET /api/reports/draws
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, DRAW_OFFICER

### Platform Overview
```http
GET /api/reports/overview
Authorization: Bearer <access_token>
```

**Required Roles**: SUPER_ADMIN, LOTTERY_MANAGER

### Export Report
```http
GET /api/reports/export?type=payments&format=csv
Authorization: Bearer <access_token>
```

**Query Parameters**:
- `type` (required): Report type (payments, tickets, users, draws)
- `format` (optional): Export format (json, csv)
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Required Roles**: SUPER_ADMIN, LOTTERY_MANAGER, FINANCE_OFFICER

## QR Code Generation

### Generate Ticket QR Code
```http
GET /api/qr/ticket/:ticketId
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "ticketId": "ticket-id",
  "ticketIdentifier": "purchase-id",
  "qrCode": "data:image/png;base64,..."
}
```

### Generate Verification QR Code
```http
GET /api/qr/verify/:purchaseId
Authorization: Bearer <access_token>
```

### Validate QR Code
```http
POST /api/qr/validate
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "payload": "{\"tid\":\"...\",\"tn\":\"...\",\"cid\":\"...\",\"ts\":...}"
}
```

### Generate QR Code SVG
```http
GET /api/qr/ticket/:ticketId/svg
Authorization: Bearer <access_token>
```

**Response**: SVG image

### Batch Generate QR Codes
```http
POST /api/qr/batch
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "ticketIds": ["ticket-id-1", "ticket-id-2"]
}
```

**Required Roles**: SUPER_ADMIN, LOTTERY_MANAGER

## Public Transparency API

These endpoints are publicly accessible without authentication.

### Get Public Campaigns
```http
GET /api/transparency/campaigns
```

### Get Campaign Details
```http
GET /api/transparency/campaigns/:id
```

### Get Public Draw Results
```http
GET /api/transparency/draws
```

### Get Draw Verification
```http
GET /api/transparency/verification/:drawId
```

### Get Public Winners
```http
GET /api/transparency/winners
```

### Get Platform Statistics
```http
GET /api/transparency/statistics
```

### Get Public Audit Logs
```http
GET /api/transparency/audit-logs
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Strict**: 5 requests per 15 minutes (auth, payments)
- **Moderate**: 100 requests per 15 minutes (most endpoints)
- **Lenient**: 1000 requests per hour (public endpoints)

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

## Security

- All sensitive endpoints require authentication
- JWT tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- All requests are logged for audit purposes
- Input validation and sanitization on all endpoints
- CORS enabled for configured origins
- Rate limiting to prevent abuse

## Support

For API support, contact:
- Email: api-support@ethiopiancarlottery.com
- Documentation: https://docs.ethiopiancarlottery.com
