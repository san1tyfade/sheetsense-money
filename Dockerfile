# Stage 1: Build the React application
FROM node:22 AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Create placeholder .env to prevent build errors if variables are referenced
RUN echo "GEMINI_API_KEY=PLACEHOLDER" > .env

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Nginx runs in foreground by default in this image
CMD ["nginx", "-g", "daemon off;"]
