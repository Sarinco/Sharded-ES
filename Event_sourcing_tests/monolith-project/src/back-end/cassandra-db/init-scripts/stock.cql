CREATE KEYSPACE IF NOT EXISTS stock WITH REPLICATION =
{ 
    'class' : 'SimpleStrategy',
    'replication_factor' : '1'
};

CREATE TABLE IF NOT EXISTS stock.product (
    id UUID PRIMARY KEY,
    name TEXT,
    price DECIMAL,
    description TEXT
    image TEXT
    category TEXT
    count INT
);
