# ============================================
# বাংলার ভয়েস — AI Worker Pipeline
# Railway / Docker deploy
# ============================================

FROM node:20-alpine

WORKDIR /app

# Install dependencies (including tsx for runtime TS execution)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install tsx@4

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Environment
ENV NODE_ENV=production

# Health check (worker logs heartbeat; adjust if you add /health endpoint)
HEALTHCHECK --interval=60s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "process.exit(0)"

# Run
CMD ["npx", "tsx", "src/index.ts"]
