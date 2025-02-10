CREATE KEYSPACE IF NOT EXISTS orders WITH REPLICATION =
{ 
    'class' : 'SimpleStrategy',
    'replication_factor' : '1'
};

CREATE TABLE IF NOT EXISTS orders.entry (
    id UUID PRIMARY KEY,
    customer UUID,
    location TEXT,
    product UUID,
    count INT
);
