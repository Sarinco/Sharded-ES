# this image relies on the nodejs image
FROM node:20-alpine
# set working directory
WORKDIR /app
# we need CURL to verify that the key-value storage is running (see boot-in-order.sh)
RUN apk update && apk add curl

# copy package.json and package-lock.json
COPY package*.json ./

# install dependencies
RUN npm install

# copy the rest of the files
COPY . .

# get the port from the environment
ARG PORT

# health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD curl --fail http://localhost:${PORT}/health || exit 1
