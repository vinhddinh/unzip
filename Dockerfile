FROM node:24-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund && npm cache clean --force

# Copy source code and build
COPY . .
RUN npm run build

# Change ownership of the app directory to nextjs user
RUN chown -R nextjs:nodejs /app
USER nextjs

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

EXPOSE 3000
CMD ["npm", "start"]
