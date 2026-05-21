# Stage 1: Build the Next.js app
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Create standalone output
FROM node:18-alpine AS standalone
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Stage 3: Runtime image
FROM node:18-alpine
WORKDIR /app
COPY --from=standalone /app ./

ENV NODE_ENV production
ENV PORT 3003
ENV VALKEY_URL redis://localhost:6379

EXPOSE 3003
CMD ["node", "server.js"]