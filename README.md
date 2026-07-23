# ZENV Apparel

React 19 + Vite storefront with an Express API and MariaDB persistence.

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure MariaDB.
3. Apply `server/store/mariadb-schema.sql` to the database.
4. Start the API with `npm run api:dev`.
5. Start Vite with `npm run dev`.

The storefront always consumes the REST API. MariaDB is the only supported
data driver; the application intentionally fails when its database
configuration is missing instead of falling back to browser or file data.

## Production

Build with `npm run build`, run the API with `npm run api:start`, and serve the
generated `dist` directory through the web server. See `docs/deploy-vps.md`.
