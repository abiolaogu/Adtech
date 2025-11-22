# Setup Guide

Complete setup instructions for the AdTech/MarTech Platform.

## System Requirements

### Minimum Requirements
- **CPU:** 2 cores
- **RAM:** 4GB
- **Storage:** 20GB
- **OS:** Linux, macOS, or Windows with WSL2

### Recommended Requirements
- **CPU:** 4+ cores
- **RAM:** 8GB+
- **Storage:** 50GB+ SSD
- **OS:** Ubuntu 20.04+ or macOS 12+

## Prerequisites Installation

### 1. Install Node.js

**macOS (using Homebrew):**
```bash
brew install node@18
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download from https://nodejs.org/

Verify installation:
```bash
node --version  # Should be v18.x or higher
npm --version   # Should be v9.x or higher
```

### 2. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

Create database:
```bash
# macOS/Linux
psql postgres
CREATE DATABASE adtech_platform;
CREATE USER adtech_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE adtech_platform TO adtech_user;
\q

# Or use this one-liner
createdb adtech_platform
```

### 3. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows:**
Use Redis for Windows or WSL2

Verify Redis:
```bash
redis-cli ping  # Should return PONG
```

## Project Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd Adtech

# Install all dependencies (root, backend, frontend)
npm install
npm run install:all
```

### 2. Environment Configuration

#### Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL="postgresql://adtech_user:your_password@localhost:5432/adtech_platform?schema=public"

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# RTB Configuration
RTB_TIMEOUT_MS=100
RTB_MAX_BID_REQUESTS=1000

# Email Service (optional, for email inventory)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Analytics
ANALYTICS_BATCH_SIZE=100
ANALYTICS_FLUSH_INTERVAL=5000

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Environment (optional)

```bash
cd frontend
# Create .env if needed
echo "VITE_API_URL=http://localhost:3000" > .env
```

### 3. Database Setup

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view database
npm run prisma:studio
```

### 4. Verify Setup

Test database connection:
```bash
cd backend
npx prisma db push
```

Test Redis connection:
```bash
redis-cli ping
```

## Running the Application

### Development Mode

**Option 1: Run all services concurrently (recommended)**
```bash
# From project root
npm run dev
```

This starts:
- Backend API on http://localhost:3000
- Frontend on http://localhost:5173

**Option 2: Run services separately**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Terminal 3 (Redis - if not running as service):
```bash
redis-server
```

### Production Mode

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build

# Start backend
cd backend
npm start
```

## Initial Data Setup

### 1. Create Admin User

```bash
# Using API
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure_password",
    "name": "Admin User",
    "organizationName": "My Company"
  }'
```

Or visit http://localhost:5173/login and register.

### 2. Create Sample Publisher

```bash
curl -X POST http://localhost:3000/api/v1/adtech/publishers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Publisher",
    "domain": "publisher.example.com",
    "revenueShare": 0.7
  }'
```

### 3. Create Sample Inventory

```bash
curl -X POST http://localhost:3000/api/v1/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "EMAIL",
    "name": "Tech Newsletter",
    "publisherId": "PUBLISHER_ID",
    "totalSlots": 30,
    "emailListSize": 10000,
    "floorPrice": 5.0
  }'
```

## Troubleshooting

### Database Connection Issues

**Error: Can't reach database server**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # macOS

# Check connection manually
psql -h localhost -U adtech_user -d adtech_platform
```

**Error: Password authentication failed**
- Verify DATABASE_URL in .env
- Check PostgreSQL user permissions
- Reset password if needed:
```bash
psql postgres
ALTER USER adtech_user WITH PASSWORD 'new_password';
```

### Redis Connection Issues

**Error: Redis connection failed**
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if not running
sudo systemctl start redis-server  # Linux
brew services start redis  # macOS
```

### Port Already in Use

**Error: Port 3000 already in use**
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or change PORT in .env
```

### NPM Installation Issues

**Error: Permission denied**
```bash
# Don't use sudo with npm
# Fix npm permissions:
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add to ~/.profile or ~/.bashrc:
export PATH=~/.npm-global/bin:$PATH
source ~/.profile
```

### Prisma Issues

**Error: Prisma Client not generated**
```bash
cd backend
npm run prisma:generate
```

**Error: Migration failed**
```bash
# Reset database (⚠️ deletes all data)
cd backend
npx prisma migrate reset

# Or create new migration
npx prisma migrate dev --name init
```

### Build Errors

**Frontend build fails**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Backend build fails**
```bash
cd backend
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

## Development Tools

### Recommended VS Code Extensions
- ESLint
- Prettier
- Prisma
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- GitLens

### Database Tools
- Prisma Studio: `npm run prisma:studio`
- pgAdmin: https://www.pgadmin.org/
- TablePlus: https://tableplus.com/

### API Testing
- Postman: https://www.postman.com/
- Insomnia: https://insomnia.rest/
- cURL (built-in)

## Next Steps

1. ✅ Complete setup following this guide
2. 📚 Read the [API Documentation](README.md#api-documentation)
3. 🏗️ Explore the [Architecture](README.md#architecture)
4. 🚀 Start building your first campaign
5. 📊 Monitor analytics dashboard

## Getting Help

- 📖 Check [README.md](README.md) for feature documentation
- 🐛 Report issues on GitHub
- 💬 Join our community (Discord/Slack)
- 📧 Email: support@adtech-platform.com
