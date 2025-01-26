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