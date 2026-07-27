-- Example migration — replace 'my_schema' with your DB_SCHEMA value
SET search_path TO my_schema;

CREATE TABLE sample (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500),
    status      VARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sample_name ON sample(name);
CREATE INDEX idx_sample_status ON sample(status);
