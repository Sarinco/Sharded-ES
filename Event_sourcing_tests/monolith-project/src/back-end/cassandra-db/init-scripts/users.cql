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

CREATE INDEX IF NOT EXISTS ON users.user (role);

INSERT INTO users.user (email, hash, salt, role) VALUES ('admin@test.be', '309c826d3c7fced56bd3ca07808209dea154ebf8da75e0990ae23ee249121c6b09b1c2100998dbee36eca6e1c0e98c1137c00febc6feb03b6df577d7b843ff3d', '829130c028d1ed95bb5c9dcc34148993', 'admin') IF NOT EXISTS;
