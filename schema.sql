DROP TABLE IF EXISTS locations;

CREATE TABLE locations(
    city_id SERIAL PRIMARY KEY,
    search_query VARCHAR (200),
    display_name VARCHAR (200),
    lat NUMERIC(10,7),
    lon NUMERIC(10,7)
)