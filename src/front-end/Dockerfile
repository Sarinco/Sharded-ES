# Base image
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY ./package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app files
COPY --link . .

# Build the app
#RUN npm run build
