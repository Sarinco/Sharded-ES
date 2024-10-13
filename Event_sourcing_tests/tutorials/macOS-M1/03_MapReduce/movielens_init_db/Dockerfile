FROM node:20-alpine

WORKDIR /usr/src/app

ENV COUCHDB_URL http://admin:admin@ml_db:5984/movielens_db

# we need CURL to verify that the key-value storage is running (see boot-in-order.sh)
RUN apk update && apk add curl

RUN npm install debug

COPY dataset ./dataset
COPY views ./views
COPY func_to_string.js ./
COPY fill_db.sh ./
COPY wait-for-couchdb.sh ./

CMD source wait-for-couchdb.sh
