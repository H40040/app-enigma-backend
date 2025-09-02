# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 enigma

# Copy necessary files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Create uploads directory
RUN mkdir -p uploads && chown enigma:nodejs uploads

# Set proper permissions
RUN chown -R enigma:nodejs /app
USER enigma

# Expose port
EXPOSE 4006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node scripts/health-check.js || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=4006

# Start the application
CMD ["npm", "start"]