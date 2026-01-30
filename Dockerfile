# Stage 1: Build the React application
FROM node:22 AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application
FROM node:22-slim

WORKDIR /app

# Install 'serve' package to serve static files
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (Google Cloud Run uses 8080 by default)
ENV PORT=8080
EXPOSE 8080

# Start command using 'serve'
# -s: Single-page application mode (redirects 404s to index.html)
# -l: Listen on specified port
CMD ["sh", "-c", "serve -s dist -l $PORT"]
