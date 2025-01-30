CREATE KEYSPACE IF NOT EXISTS users WITH REPLICATION =
{ 
    'class' : 'SimpleStrategy',
    'replication_factor' : '1'
};

CREATE TABLE IF NOT EXISTS users.user (
    email TEXT PRIMARY KEY,
    hash TEXT,
    salt TEXT,
    role TEXT
);
