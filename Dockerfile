# Multi-stage build for the API
FROM node:18-alpine AS api-builder

WORKDIR /app

# Copy package files
COPY apps/api/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY apps/api/src ./src
COPY apps/api/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production stage for API
FROM node:18-alpine AS api-production

WORKDIR /app

# Copy package files
COPY apps/api/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application and Prisma files
COPY --from=api-builder /app/dist ./dist
COPY --from=api-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY apps/api/prisma ./prisma

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]

# Build stage for Web App
FROM node:18-alpine AS web-builder

WORKDIR /app

# Copy package files
COPY apps/web/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/web/src ./src
COPY apps/web/public ./public
COPY apps/web/index.html ./
COPY apps/web/vite.config.ts ./
COPY apps/web/tsconfig.json ./
COPY apps/web/tsconfig.node.json ./

# Build the application
RUN npm run build

# Production stage for Web App
FROM nginx:alpine AS web-production

# Copy built assets from builder
COPY --from=web-builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
