FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve to host the built application
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Start the server on port 3000
CMD ["serve", "-s", "build", "-l", "3000"]
