# Ethiopian Car Lottery Platform - Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Docker Deployment](#docker-deployment)
5. [Production Deployment](#production-deployment)
6. [Database Setup](#database-setup)
7. [Security Configuration](#security-configuration)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **PostgreSQL**: v15.x or higher
- **Redis**: v7.x or higher
- **Docker**: v20.x or higher (for containerized deployment)
- **Docker Compose**: v2.x or higher
- **Git**: Latest version

### System Requirements

- **Minimum RAM**: 4GB (8GB recommended)
- **Disk Space**: 20GB minimum
- **CPU**: 2 cores minimum (4 cores recommended)

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ethiopian-car-lottery/platform.git
cd platform
```

### 2. Install Dependencies

```bash
# Install API dependencies
cd apps/api
npm install

# Install Web dependencies
cd ../web
npm install
```

### 3. Environment Configuration

Create environment files for both applications:

#### API Environment (apps/api/.env)

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/carapp_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# QR Code Secret
QR_SECRET_KEY="your-qr-secret-key-change-in-production"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:5173"

# Payment Providers
TELEBIRR_API_KEY="your-telebirr-api-key"
TELEBIRR_SECRET="your-telebirr-secret"
CBE_BIRR_API_KEY="your-cbe-birr-api-key"

# Email (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"

# SMS (for notifications)
SMS_API_KEY="your-sms-api-key"
SMS_API_SECRET="your-sms-api-secret"

# Trusted IPs (optional)
TRUSTED_IPS="127.0.0.1,::1"
```

#### Web Environment (apps/web/.env)

```env
VITE_API_URL="http://localhost:3000"
VITE_APP_NAME="Ethiopian Car Lottery"
VITE_DEFAULT_LANGUAGE="en"
```

## Local Development

### 1. Start PostgreSQL and Redis

Using Docker:
```bash
docker-compose up postgres redis
```

Or install locally and start services.

### 2. Setup Database

```bash
cd apps/api

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### 3. Start Development Servers

```bash
# Terminal 1: Start API
cd apps/api
npm run dev

# Terminal 2: Start Web
cd apps/web
npm run dev
```

The API will be available at `http://localhost:3000`
The Web app will be available at `http://localhost:5173`

### 4. Create Initial Admin User

```bash
cd apps/api
npm run create-admin
```

Follow the prompts to create the first SUPER_ADMIN user.

## Docker Deployment

### Quick Start with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Docker Compose Services

- **postgres**: PostgreSQL database
- **redis**: Redis cache
- **api**: Backend API server
- **web**: Frontend web application

### Custom Docker Configuration

Create a `.env` file in the project root:

```env
# Database
DB_USER=carapp
DB_PASSWORD=your-secure-password
DB_NAME=carapp_db

# Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
QR_SECRET_KEY=your-qr-secret-key

# CORS
CORS_ORIGIN=https://your-domain.com
```

## Production Deployment

### Option 1: Docker Deployment (Recommended)

#### 1. Prepare Production Environment

```bash
# Create production environment file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

#### 2. Build and Deploy

```bash
# Build images
docker-compose -f docker-compose.yml build

# Deploy to production
docker-compose -f docker-compose.yml up -d

# Check health status
docker-compose ps
```

#### 3. Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Web App
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Option 2: Manual Deployment

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Deploy API

```bash
# Clone repository
git clone https://github.com/ethiopian-car-lottery/platform.git
cd platform/apps/api

# Install dependencies
npm ci --only=production

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/index.js --name carapp-api
pm2 save
pm2 startup
```

#### 3. Deploy Web App

```bash
cd apps/web

# Install dependencies
npm ci

# Build for production
npm run build

# Serve with Nginx or use a static file server
# Copy dist/ contents to Nginx web root
sudo cp -r dist/* /var/www/html/
```

## Database Setup

### PostgreSQL Configuration

#### 1. Create Database

```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Create database and user
CREATE DATABASE carapp_db;
CREATE USER carapp WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE carapp_db TO carapp;
\q
```

#### 2. Configure Connection Pooling

Update `apps/api/.env`:
```env
DATABASE_URL="postgresql://carapp:secure_password@localhost:5432/carapp_db?connection_limit=10&pool_timeout=20"
```

#### 3. Enable Extensions (if needed)

```sql
-- Connect to database
\c carapp_db

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Redis Configuration

#### 1. Configure Redis

Edit `/etc/redis/redis.conf`:
```
bind 127.0.0.1
port 6379
requirepass your-redis-password
maxmemory 256mb
maxmemory-policy allkeys-lru
```

#### 2. Restart Redis

```bash
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## Security Configuration

### 1. SSL/TLS Configuration

#### Generate Self-Signed Certificate (Development)

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/your-domain.key \
  -out /etc/ssl/certs/your-domain.crt
```

#### Use Let's Encrypt (Production)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. Firewall Configuration

```bash
# Configure UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Application Security

#### Update Secrets

Generate secure random secrets:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate QR secret
openssl rand -base64 32
```

Update environment variables with generated secrets.

#### Enable Security Headers

The application includes security headers via Helmet middleware. Ensure they are enabled in production.

### 4. Rate Limiting

Configure rate limiting in `apps/api/src/middleware/security.ts`:

```typescript
export const strictRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests
  "Too many attempts, please wait before trying again"
);
```

## Monitoring and Logging

### 1. Application Logs

Logs are stored in:
- **API**: `apps/api/logs/`
- **Docker**: Container logs via `docker-compose logs`

#### View Logs

```bash
# API logs
docker-compose logs -f api

# All logs
docker-compose logs -f
```

### 2. Database Monitoring

```bash
# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

### 3. Health Checks

The application includes health check endpoints:

- **API**: `GET /health`
- **Web**: `GET /health`

Configure monitoring tools to check these endpoints regularly.

### 4. Performance Monitoring

Consider integrating:
- **New Relic** or **Datadog** for APM
- **Prometheus** and **Grafana** for metrics
- **Sentry** for error tracking

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Error**: `Connection refused at localhost:5432`

**Solution**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Check if port is open
sudo netstat -tlnp | grep 5432
```

#### 2. Redis Connection Failed

**Error**: `Redis connection refused`

**Solution**:
```bash
# Check Redis status
sudo systemctl status redis-server

# Start Redis
sudo systemctl start redis-server

# Test connection
redis-cli ping
```

#### 3. Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Or use different port in .env
PORT=3001
```

#### 4. Prisma Migration Failed

**Error**: `Migration failed`

**Solution**:
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or resolve migration conflict manually
npx prisma migrate resolve --applied <migration-name>
```

#### 5. Build Errors

**Error**: TypeScript compilation errors

**Solution**:
```bash
# Clean build artifacts
rm -rf dist node_modules

# Reinstall dependencies
npm install

# Run type check
npm run type-check

# Build again
npm run build
```

### Getting Help

If you encounter issues not covered here:

1. Check the application logs for detailed error messages
2. Review the API documentation: `docs/API_DOCUMENTATION.md`
3. Check GitHub issues: https://github.com/ethiopian-car-lottery/platform/issues
4. Contact support: support@ethiopiancarlottery.com

## Backup and Recovery

### Database Backup

```bash
# Backup database
pg_dump -U carapp carapp_db > backup_$(date +%Y%m%d).sql

# Restore database
psql -U carapp carapp_db < backup_20240101.sql
```

### Automated Backups

Create a cron job for daily backups:

```bash
# Edit crontab
sudo crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U carapp carapp_db > /backups/carapp_$(date +\%Y\%m\%d).sql
```

## Scaling Considerations

### Horizontal Scaling

For high-traffic deployments:

1. **Load Balancer**: Use Nginx or HAProxy
2. **Multiple API Instances**: Deploy multiple API containers
3. **Session Storage**: Use Redis for session management
4. **Database Replication**: Set up PostgreSQL read replicas

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Enable database connection pooling
- Use Redis caching for frequently accessed data

## Maintenance

### Regular Tasks

1. **Daily**: Monitor logs and error rates
2. **Weekly**: Review security logs, check disk space
3. **Monthly**: Update dependencies, review performance metrics
4. **Quarterly**: Security audit, backup verification

### Updates

```bash
# Update dependencies
cd apps/api
npm update
cd ../web
npm update

# Rebuild and redeploy
docker-compose down
docker-compose build
docker-compose up -d
```

## Compliance

### Data Protection

- Ensure GDPR compliance for EU users
- Implement data retention policies
- Regular security audits
- Penetration testing

### Regulatory

- Comply with Ethiopian lottery regulations
- Maintain audit logs for required period
- Report suspicious activities to authorities
- Regular financial audits
