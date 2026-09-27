# Forkity-V3

Version 3 of the original Forkify application, being converted to a full-stack app with a database.

## Development setup

The project uses Parcel for the existing frontend, Express for the API, and PostgreSQL for persistent data.

1. Copy `.env.example` to `.env` and fill in the recipe API key and a strong session secret.
2. Install dependencies with `npm install`.
3. Start PostgreSQL with `npm run db:up`.
4. Start the API with `npm run dev:api`.
5. In another terminal, start the frontend with `npm run dev`.

The API health check is available at `http://localhost:3000/api/v1/health`. Local database credentials in `.env.example` are for development only; use managed secrets and strong credentials outside local development.
