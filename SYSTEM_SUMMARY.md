## Comprehensive Summary of Infinity Housing System

Infinity Housing is a comprehensive real estate backend API built with **NestJS**, **MongoDB**, and **Flutterwave** for payment processing. The system enables real estate agents to register, login, post property listings, and manage their operations, while allowing users to browse and save favorite properties. It includes role-based access control, payment processing, escrow services, wallet management, and administrative functions.

### Key Features
- **JWT Authentication**: Secure login/registration for agents, admins, tenants, and landlords with email verification
- **Property Management**: Full CRUD operations for property listings with image uploads
- **User Management**: Role-based access (agents, admins, tenants, landlords)
- **Payment Integration**: Flutterwave for secure transactions
- **Email Notifications**: Gmail SMTP for confirmations and notifications
- **Wallet System**: User wallets for managing funds
- **Escrow Services**: Secure transaction holding for property deals
- **Activity Logging**: Admin audit trails and activity tracking
- **Event Management**: System for managing real estate events
- **File Uploads**: Static serving for property images

### Architecture
The system follows a modular NestJS architecture with the following main modules:

- **Auth**: JWT-based authentication with email verification
- **Admin**: Administrative functions, landlord management, activity logs, audit trails
- **Users**: User account management and profiles
- **Properties**: Property listing CRUD operations with image uploads
- **Tenants**: Tenant information management
- **Payments**: Flutterwave payment processing with webhooks
- **Wallet**: User financial wallet operations and transactions
- **Transactions**: Transaction history and management
- **Escrow**: Secure fund holding for property transactions
- **Events**: Event scheduling and management
- **Common**: Shared utilities, decorators, guards, and configurations

### Tech Stack
- **Framework**: NestJS (Node.js)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with role-based guards
- **Payments**: Flutterwave API with webhooks
- **Email**: Nodemailer with Gmail SMTP
- **File Uploads**: Multer for image handling, static file serving
- **Configuration**: Environment-based config with @nestjs/config
- **Validation**: Class-validator for DTOs
- **Documentation**: Swagger/OpenAPI (implied from structure)

### API Endpoints

#### Authentication (`/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register a new user (agent/admin/tenant) | No |
| POST | `/auth/login` | Login user and return JWT token | No |
| POST | `/auth/verify` | Verify email with code | No |
| POST | `/auth/resend-code` | Resend verification code | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| GET | `/auth/profile` | Get current user profile | JWT |

#### Users (`/users`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | Get all users (admin only) | JWT + Admin |
| GET | `/users/:id` | Get user by ID | JWT |
| PUT | `/users/:id` | Update user profile | JWT |
| DELETE | `/users/:id` | Delete user (admin only) | JWT + Admin |
| GET | `/users/agent/:id` | Get agent profile details | JWT |

#### Properties (`/property`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/property` | Create new property listing | JWT |
| GET | `/property` | Get all properties (with filters) | No |
| GET | `/property/:id` | Get property by ID | No |
| PUT | `/property/:id` | Update property (owner only) | JWT |
| DELETE | `/property/:id` | Delete property (owner only) | JWT |
| POST | `/property/:id/upload` | Upload property images | JWT |
| GET | `/property/agent/:agentId` | Get properties by agent | No |

#### Payments (`/payment`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payment/initiate` | Initiate Flutterwave payment | JWT |
| GET | `/payment/verify` | Verify payment status | JWT |
| GET | `/payment/all` | Get all payments (admin) | JWT + Admin |
| POST | `/payment/webhook` | Flutterwave webhook handler | No (webhook) |

#### Wallet (`/wallet`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/wallet/:userId` | Get wallet balance and details | JWT |
| POST | `/wallet/fund` | Fund wallet | JWT |
| POST | `/wallet/withdraw` | Withdraw from wallet | JWT |
| GET | `/wallet/transactions/:userId` | Get wallet transaction history | JWT |

#### Transactions (`/transactions`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/transactions` | Get all transactions (admin) | JWT + Admin |
| GET | `/transactions/:id` | Get transaction by ID | JWT |
| POST | `/transactions` | Create new transaction | JWT |
| PUT | `/transactions/:id` | Update transaction status | JWT + Admin |
| DELETE | `/transactions/:id` | Delete transaction (admin) | JWT + Admin |

#### Tenants (`/tenants`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/tenants` | Get all tenants | JWT |
| GET | `/tenants/:id` | Get tenant by ID | JWT |
| POST | `/tenants` | Create new tenant | JWT |
| PUT | `/tenants/:id` | Update tenant info | JWT |
| DELETE | `/tenants/:id` | Delete tenant | JWT + Admin |

#### Escrow (`/escrow`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/escrow/initiate` | Initiate escrow transaction | JWT |
| GET | `/escrow/:id` | Get escrow details by ID | JWT |
| PUT | `/escrow/:id/release` | Release escrow funds | JWT |
| PUT | `/escrow/:id/cancel` | Cancel escrow transaction | JWT |

#### Admin (`/private`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/private` | Admin dashboard overview | JWT + Admin |
| POST | `/private/create-admin` | Create new admin user | JWT + Super Admin |
| GET | `/private/admins` | Get all admin users | JWT + Admin |
| GET | `/private/:id` | Get admin by ID | JWT + Admin |
| PUT | `/private/:id` | Update admin details | JWT + Admin |
| DELETE | `/private/:id` | Delete admin | JWT + Super Admin |
| GET | `/private/audit-logs` | Get audit log entries | JWT + Admin |

#### Activity Tracking (`/private/activity`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/private/activity/batch` | Batch log multiple activities | JWT |
| GET | `/private/activity` | Get filtered activities with pagination | JWT |
| GET | `/private/activity/recent` | Get recent activities for user | JWT |
| GET | `/private/activity/stats` | Get activity statistics (admin) | JWT + Admin |
| POST | `/private/activity/cleanup` | Clean up old activity records | JWT + Super Admin |

#### Landlords (`/private/landlord`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/private/landlord` | Get all landlords | JWT + Admin |
| GET | `/private/landlord/:id` | Get landlord by ID | JWT + Admin |
| POST | `/private/landlord` | Create new landlord | JWT + Admin |
| PUT | `/private/landlord/:id` | Update landlord details | JWT + Admin |
| DELETE | `/private/landlord/:id` | Delete landlord | JWT + Admin |

#### App Health (`/`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Health check endpoint | No |

### Authentication & Authorization
- **JWT Tokens**: Required for most endpoints, issued on login
- **Role-Based Access**: Guards for `admin`, `agent`, `tenant`, `landlord` roles
- **Email Verification**: Required for account activation
- **Password Reset**: Secure reset flow with tokens

### Data Models
- **Users**: Agents, admins, tenants, landlords with profiles
- **Properties**: Listings with images, pricing, location data
- **Payments**: Flutterwave transactions with verification
- **Wallets**: User financial accounts with transaction history
- **Escrow**: Secure fund holding for property deals
- **Activities**: Audit logs for all system actions
- **Transactions**: General transaction records

### Configuration
- **Environment Variables**: MongoDB connection, JWT secret, Flutterwave keys, Gmail SMTP
- **File Uploads**: Served from `/uploads` directory
- **CORS**: Configured for cross-origin requests
- **Validation**: DTOs with class-validator decorators

The system is designed for scalability with modular architecture, comprehensive error handling, and production-ready security measures. It supports a full real estate marketplace with agent listings, user interactions, secure financial transactions, and administrative oversight.