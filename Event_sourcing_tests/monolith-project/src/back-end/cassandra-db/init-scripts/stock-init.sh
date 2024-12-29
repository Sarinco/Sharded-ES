#!/usr/bin/env bash

until printf "" 2>>/dev/null >>/dev/tcp/db-stock/9042; do
    sleep 5;
    echo "Waiting for cassandra...";
done

echo "Creating keyspace"
cqlsh db-stock -u db-stock -p db-stock -e "CREATE KEYSPACE IF NOT EXISTS products WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'};"
