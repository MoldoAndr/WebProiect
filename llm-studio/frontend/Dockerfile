FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Ensure proper permissions for the build directory
RUN mkdir -p /app/build && chmod -R 777 /app/build

# Build the application
RUN npm run build

# Explicitly ensure build files have correct permissions
RUN chmod -R 755 /app/build

# Keep container running
CMD ["sh", "-c", "echo 'Frontend build complete at:' && ls -la /app/build && tail -f /dev/null"]
