# Ethiopian Car Lottery Platform - Architecture Documentation

## System Overview

The Ethiopian Car Lottery Platform is a production-ready, legally compliant lottery management system designed for authorized lottery operators in Ethiopia. The platform prioritizes security, transparency, auditability, and regulatory compliance.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with shadcn/ui patterns
- **Internationalization**: i18next with react-i18next
- **Routing**: React Router v6
- **State Management**: React hooks + Context API

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT with refresh token architecture
- **Security**: Helmet, CORS, rate limiting, bcrypt/Argon2id

### Infrastructure
- **Containerization**: Docker
- **Reverse Proxy**: Nginx
- **SSL/TLS**: HTTPS only in production
- **Environment**: Environment variables for configuration

## Project Structure

```
CARAPP/
├── apps/
│   ├── api/                # Backend API server
│   │   ├── src/
│   │   │   ├── controllers/ # Request handlers
│   │   │   ├── services/    # Business logic
│   │   │   ├── repositories/# Data access
│   │   │   ├── middleware/  # Express middleware
│   │   │   ├── routes/      # API routes
│   │   │   ├── utils/       # Utilities
│   │   │   └── index.ts     # Entry point
│   │   ├── prisma/
│   │   │   └── schema.prisma # Database schema
│   │   └── package.json
│   └── web/                # Frontend React app
│       ├── src/
│       │   ├── components/   # Reusable components
│       │   ├── pages/       # Page components
│       │   ├── lib/         # Utilities and API client
│       │   ├── i18n/        # Internationalization
│       │   └── main.tsx     # Entry point
│       └── package.json
├── packages/               # Shared packages
│   ├── types/             # TypeScript types
│   ├── config/            # Shared configuration
│   └── i18n/              # Shared translations
├── infrastructure/        # Infrastructure as code
│   ├── docker/
│   └── nginx/
├── docs/                  # Documentation
├── tests/                 # Test suites
└── package.json           # Root package.json
```

## Database Schema

### Core Tables

#### Users & Authentication
- `User` - User accounts with authentication
- `CustomerProfile` - Customer personal information
- `KycRecord` - KYC verification records

#### Lottery Operations
- `LotteryCampaign` - Campaign management
- `Vehicle` - Vehicle inventory
- `Ticket` - Ticket issuance and tracking
- `Draw` - Lottery draw execution
- `DrawEligibleTicket` - Eligible ticket pool
- `DrawResult` - Draw verification records
- `Winner` - Winner management

#### Financial
- `Order` - Purchase orders
- `PaymentTransaction` - Payment processing
- `Refund` - Refund management

#### System
- `Notification` - User notifications
- `FraudAlert` - Fraud detection
- `AuditLog` - Audit trail
- `SystemSetting` - Configuration
- `SoftDeleteLog` - Soft deletion tracking

### Key Design Decisions

1. **UUID Primary Keys**: All entities use UUIDs for security and distributed system compatibility
2. **Foreign Keys**: Proper referential integrity with foreign key constraints
3. **Indexes**: Strategic indexing on frequently queried fields
4. **Soft Deletion**: Important records support soft deletion for audit trail
5. **JSON Fields**: Flexible storage for configuration and metadata
6. **Timestamps**: Created/updated timestamps on all records

## Security Architecture

### Authentication Flow
1. User registers with email/password
2. Password hashed using bcrypt/Argon2id
3. JWT access token issued (short-lived, 15 minutes)
4. Refresh token issued (long-lived, 7 days)
5. Access token used for API requests
6. Refresh token used to obtain new access tokens

### Role-Based Access Control (RBAC)

#### Roles
- **SUPER_ADMIN**: Full system access
- **LOTTERY_MANAGER**: Campaign and draw management
- **FINANCE_OFFICER**: Payment and refund operations
- **KYC_OFFICER**: KYC verification
- **DRAW_OFFICER**: Draw execution
- **AUDITOR**: Read-only audit access
- **CUSTOMER_SUPPORT**: Customer assistance
- **CONTENT_MANAGER**: Content management

#### Permission Model
- Role-based permissions with granular controls
- Middleware enforces permission checks
- Audit logging for all permission changes

### Security Measures
- Rate limiting (100 requests per 15 minutes)
- Brute-force protection on login
- Input validation and sanitization
- SQL injection protection (Prisma ORM)
- XSS protection
- CSRF protection
- Secure HTTP headers (Helmet)
- HTTPS only in production
- IP logging for sensitive operations
- Session monitoring

## Payment Architecture

### Provider Abstraction
```typescript
interface PaymentProvider {
  initiatePayment(amount: number, currency: string): Promise<PaymentInitiation>;
  verifyPayment(transactionId: string): Promise<PaymentVerification>;
  processRefund(transactionId: string, amount: number): Promise<RefundResult>;
  handleWebhook(data: any): Promise<WebhookResult>;
}
```

### Supported Providers (Prepared)
- CBE (Commercial Bank of Ethiopia)
- BIRR
- Stripe (for international)
- Extensible for additional providers

### Payment Flow
1. Customer initiates purchase
2. Order created with PENDING status
3. Payment provider abstraction called
4. Customer redirected to provider
5. Provider webhook callback
6. Server-side verification
7. Order status updated
8. Ticket issued only after confirmed payment

## Draw Engine Architecture

### Security Principles
- **Transparency**: All steps logged and verifiable
- **Reproducibility**: Draw can be reproduced with same inputs
- **Auditability**: Complete audit trail
- **Tamper Resistance**: Cryptographic protections

### Draw Process
1. **Locking**: Eligible ticket pool locked before draw
2. **Commitment**: Cryptographic hash of eligible tickets generated
3. **Configuration**: Draw parameters recorded
4. **Execution**: Cryptographically secure random selection
5. **Verification**: Draw result verified and recorded
6. **Finalization**: Draw locked against modifications
7. **Publication**: Results published with verification data

### Cryptographic Security
- Uses crypto.randomBytes() for secure random
- Commitment scheme prevents manipulation
- Verification hashes for audit trail
- Draw certificates for transparency

## API Architecture

### REST Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

#### Customer
- `GET /api/customers/me` - Get current customer
- `PUT /api/customers/me` - Update customer profile
- `GET /api/customers/tickets` - Get customer tickets
- `GET /api/customers/transactions` - Get transaction history

#### Campaigns
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns` - Create campaign (admin)
- `PUT /api/campaigns/:id` - Update campaign (admin)
- `DELETE /api/campaigns/:id` - Delete campaign (admin)

#### Vehicles
- `GET /api/vehicles` - List vehicles
- `GET /api/vehicles/:id` - Get vehicle details
- `POST /api/vehicles` - Create vehicle (admin)
- `PUT /api/vehicles/:id` - Update vehicle (admin)

#### Tickets
- `POST /api/tickets/purchase` - Purchase ticket
- `GET /api/tickets/:id` - Get ticket details
- `GET /api/tickets/verify/:token` - Verify ticket (public)

#### Payments
- `POST /api/payments/initiate` - Initiate payment
- `POST /api/payments/verify` - Verify payment
- `POST /api/payments/refund` - Process refund (admin)

#### Draws
- `GET /api/draws` - List draws
- `GET /api/draws/:id` - Get draw details
- `POST /api/draws/prepare` - Prepare draw (admin)
- `POST /api/draws/execute` - Execute draw (admin)
- `POST /api/draws/verify` - Verify draw (admin)

#### Winners
- `GET /api/winners` - List winners (public)
- `GET /api/winners/:id` - Get winner details
- `PUT /api/winners/:id/verify` - Verify winner (admin)
- `PUT /api/winners/:id/approve` - Approve winner (admin)

#### KYC
- `GET /api/kyc/me` - Get KYC status
- `POST /api/kyc/submit` - Submit KYC documents
- `PUT /api/kyc/:id/approve` - Approve KYC (admin)
- `PUT /api/kyc/:id/reject` - Reject KYC (admin)

#### Reports
- `GET /api/reports/financial` - Financial reports (admin)
- `GET /api/reports/tickets` - Ticket reports (admin)
- `GET /api/reports/customers` - Customer reports (admin)
- `GET /api/reports/draws` - Draw reports (admin)

#### Audit
- `GET /api/audit/logs` - Get audit logs (admin)

### Middleware Stack
1. Request ID generation
2. Rate limiting
3. CORS handling
4. Authentication (JWT verification)
5. Authorization (RBAC check)
6. Input validation
7. Route handler
8. Error handling
9. Audit logging

## Frontend Architecture

### Component Structure
- **Pages**: Route-level components
- **Components**: Reusable UI components
- **Layouts**: Page layout wrappers
- **Hooks**: Custom React hooks
- **Services**: API client services

### State Management
- React Context for global state (auth, theme)
- Local component state for UI state
- Server state via API calls

### Internationalization
- Translation keys organized by module
- Namespace-based translation loading
- Language persistence in localStorage
- Browser language detection

### Responsive Design
- Mobile-first approach
- Tailwind CSS breakpoints
- Touch-friendly interfaces
- Optimized for Android, iOS, tablets, desktop

## Separation of Duties

### Critical Security Rule
No single administrator can:
1. Create campaign
2. Modify ticket pool
3. Execute draw
4. Change winner
5. Delete audit logs

without appropriate authorization and audit controls.

### Role Separation
- **DRAW_OFFICER**: Can execute draws, cannot modify financial records
- **FINANCE_OFFICER**: Can inspect payments, cannot modify draw results
- **AUDITOR**: Read-only access to audit data, cannot modify operations
- **LOTTERY_MANAGER**: Can manage campaigns, cannot execute draws without DRAW_OFFICER

## Audit Trail

### Logged Events
- User login/logout
- KYC updates
- Campaign creation/modification
- Ticket issuance
- Payment verification
- Refunds
- Campaign cancellation
- Draw locking/execution
- Winner verification
- Prize assignment
- Admin permission changes

### Audit Record Fields
- ID
- User ID
- Role
- Action
- Entity type
- Entity ID
- Timestamp
- IP address
- User agent
- Request ID
- Before/after values
- Result

## Notification System

### Notification Types
- Registration confirmation
- KYC approval/rejection
- Payment confirmation
- Ticket issuance
- Draw reminder
- Winner notification
- Prize delivery

### Channels
- In-app notifications
- SMS (prepared for integration)
- Email (prepared for integration)

## Transparency

### Public Transparency Page (`/transparency`)
- Campaign information
- Eligible ticket count
- Draw date and status
- Draw methodology summary
- Verification information
- Winning ticket (limited info)
- Publication timestamp

### QR Code Verification
- Each ticket has unique QR code
- Encodes secure verification token
- Public verification returns limited info
- No personal data exposed

## Development Phases

### Phase 1: Foundation
- Project structure
- Authentication
- RBAC
- Database schema
- Admin dashboard

### Phase 2: Core Operations
- Campaign management
- Vehicle management
- Ticket management

### Phase 3: Financial
- Payment abstraction
- Payment verification
- Transaction history

### Phase 4: Draw Engine
- Secure draw implementation
- Draw locking
- Winner management

### Phase 5: Compliance
- KYC system
- Fraud monitoring
- Audit system

### Phase 6: Features
- Notifications
- Reports
- Multilingual support

### Phase 7: Production
- Security hardening
- Testing
- Performance optimization
- Deployment

## Regulatory Compliance

### Configurable Compliance
- System name configurable
- Licensing information fields
- Terms and conditions
- Eligibility rules
- Age restrictions
- Responsible participation information

### Data Privacy
- KYC data encrypted
- Sensitive documents protected
- Minimal public data exposure
- GDPR-style data handling

## Deployment Architecture

### Production Setup
- Docker containers for API and web
- Nginx reverse proxy
- PostgreSQL database
- Redis for session/cache (optional)
- SSL/TLS certificates
- Environment-based configuration

### Environment Variables
- Database connection
- JWT secrets
- Payment provider credentials
- SMTP/SMS credentials
- CORS origins
- Rate limiting settings

## Monitoring & Logging

### Structured Logging
- Request/response logging
- Error logging
- Security event logging
- Performance metrics

### Monitoring
- Application health checks
- Database connection monitoring
- Payment provider monitoring
- Error rate tracking

## Testing Strategy

### Unit Tests
- Service layer logic
- Utility functions
- Data validation

### Integration Tests
- API endpoints
- Database operations
- Payment flows

### E2E Tests
- Critical user journeys
- Draw execution
- Payment processing

## Performance Considerations

### Database Optimization
- Proper indexing
- Query optimization
- Connection pooling
- Read replicas (future)

### Caching Strategy
- Static asset caching
- API response caching where appropriate
- Session caching

### Scalability
- Horizontal scaling ready
- Stateless API design
- Database sharding considerations

## Backup & Recovery

### Database Backups
- Regular automated backups
- Point-in-time recovery
- Backup encryption

### Disaster Recovery
- Multi-region deployment (future)
- Failover procedures
- Data restoration procedures

## Documentation Requirements

### Technical Documentation
- Architecture documentation (this file)
- API documentation
- Database schema documentation
- Deployment guide
- Security documentation

### User Documentation
- Admin user guide
- Customer user guide
- Draw methodology documentation
- Compliance documentation

## Quality Assurance

### Code Quality
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Code review process

### Security Review
- Regular security audits
- Penetration testing
- Dependency vulnerability scanning
- OWASP guidelines compliance

## Future Enhancements

### Planned Features
- Mobile applications (React Native)
- Advanced analytics
- Machine learning fraud detection
- Blockchain verification (optional)
- Multi-currency support
- International expansion

### Integration Points
- Ethiopian payment gateways
- National ID verification
- SMS providers
- Email providers
- Document verification services

## Compliance Checklist

Before production launch, verify:
- [ ] Lottery operator licensing confirmed
- [ ] Payment provider authorization obtained
- [ ] KYC procedures approved
- [ ] Tax compliance verified
- [ ] Consumer protection measures in place
- [ ] Data privacy compliance verified
- [ ] Security audit completed
- [ ] Draw methodology approved by regulator
- [ ] Terms and conditions reviewed
- [ ] Refund/cancellation policies defined
- [ ] Responsible gambling measures implemented
- [ ] Age verification system operational
