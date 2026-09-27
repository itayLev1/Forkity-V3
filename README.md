# Forkity-V3

Version 3 of the original Forkify application, being converted to a full-stack app with a database.

## Development setup

The project uses Parcel for the existing frontend, Express for the API, and PostgreSQL for persistent data.

1. Copy `.env.example` to `.env` and fill in the recipe API key and a strong session secret.
2. Install dependencies with `npm install`.
3. Start PostgreSQL with `npm run db:up`.
4. Apply database migrations with `npm run db:migrate`.
5. Start the API with `npm run dev:api`.
6. In another terminal, start the frontend with `npm run dev`. Parcel proxies `/api` requests to the local API.

The API health check is available at `http://localhost:3000/api/v1/health`. Local database credentials in `.env.example` are for development only; use managed secrets and strong credentials outside local development.

The initial migration creates `users` and `bookmarks`. Bookmark rows belong to a user, store a recipe snapshot for listing saved items, and are unique per user and recipe. Use `npm run db:rollback` to undo the most recently applied migration.

The API provides `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me`. Authentication uses an HTTP-only session cookie stored in PostgreSQL. In production, serve the frontend and proxy `/api` to the API on the same origin, set `NODE_ENV=production`, and provide a unique `SESSION_SECRET` of at least 32 characters.

Signed-in bookmark operations use `GET /api/v1/bookmarks`, `POST /api/v1/bookmarks` with a `{ "recipe": ... }` body, and `DELETE /api/v1/bookmarks/:recipeId`. Each operation is scoped to the authenticated user; requests without a session receive `401`.

Recipe search, recipe details, and recipe uploads go through `GET /api/v1/recipes?search=...`, `GET /api/v1/recipes/:id`, and `POST /api/v1/recipes`. Configure `FORKIFY_API_URL` and `FORKIFY_API_KEY` on the server; neither value is required by or included in the browser bundle. The previous recipe key was embedded in client code, so treat it as exposed and use a newly issued key.
