# Forkity-V3

Version 3 of the original Forkify application, being converted to a full-stack app with a database.

## Prerequisites

- Node.js 24 or newer and npm
- Docker Engine with the Docker Compose plugin
- A Forkify API URL (the default in `.env.example` is the public read-only API)

## Development setup

1. Copy `.env.example` to `.env`.
2. Set a fresh, unique `SESSION_SECRET` of at least 32 characters. Generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
3. Install dependencies with `npm install`.
4. Start PostgreSQL with `npm run db:up`.
5. Apply database migrations with `npm run db:migrate`.
6. In one terminal, start the API with `npm run dev:api`.
7. In a second terminal, start the frontend with `npm run dev` and open the URL Parcel prints (normally `http://localhost:1234`). The frontend proxies `/api` requests to the API at `http://localhost:3000`.

The API health check is available at `http://localhost:3000/api/v1/health`. Local database credentials in `.env.example` are for development only. Never commit `.env`; use managed secrets and strong credentials outside local development. The recipe API is read-only, so uploads are stored in this app's PostgreSQL database.

## npm commands

Run these from the project root:

| Command | Description |
| --- | --- |
| `npm install` | Install frontend and backend dependencies. |
| `npm run dev` | Start the Parcel frontend development server. |
| `npm run dev:api` | Start the Express API with Node watch mode for backend changes. |
| `npm run start:api` | Start the Express API once, without watch mode. |
| `npm run build` | Compile and optimize the frontend into `dist/`. |
| `npm test` | Run integration and unit tests. Start PostgreSQL and apply migrations first; tests use `TEST_DATABASE_URL` or fall back to `DATABASE_URL` from `.env`, and only permit loopback database hosts. |
| `npm run db:up` | Start only the PostgreSQL Compose service in the background. |
| `npm run db:migrate` | Apply pending database migrations using `DATABASE_URL`. |
| `npm run db:rollback` | Roll back the most recently applied migration. This removes that migration's schema objects and may delete their data. |
| `npm run db:down` | Stop the Compose stack and remove its containers and network. The named PostgreSQL data volume is preserved. |

## Docker deployment

The Docker image builds the frontend and runs it with the API in one container. PostgreSQL runs as a separate Compose service. Set a fresh random `SESSION_SECRET` in `.env` before deployment; `.env` is excluded from the image build context. Start the complete stack with `docker compose up --build -d`, then open `http://localhost:3000`. The app container waits for a healthy database and applies pending migrations before starting. Use `APP_PORT` to select a different host port. Compose uses the database service hostname `db` by default; on restricted Docker hosts where containers cannot reach each other directly, set `DATABASE_HOST=host.docker.internal` to use the published database port. For remote use, terminate HTTPS at a reverse proxy because production login cookies are marked `Secure`. Stop the containers with `docker compose down`; the PostgreSQL volume is preserved unless explicitly removed.

## Docker deployment

The Docker image builds the frontend and runs it with the API in one container. PostgreSQL runs as a separate Compose service. Set a fresh random `SESSION_SECRET` in `.env` before deployment; `.env` is excluded from the image build context. Start the complete stack with `docker compose up --build -d`, then open `http://localhost:3000`. The app container waits for a healthy database and applies pending migrations before starting. Use `APP_PORT` to select a different host port. For remote use, terminate HTTPS at a reverse proxy because production login cookies are marked `Secure`. Stop the containers with `docker compose down`; the PostgreSQL volume is preserved unless explicitly removed.

## Verification

After PostgreSQL is running and migrations are applied, run `npm test` to exercise account sessions, bookmark isolation, local recipe creation, and read-only recipe proxying against the local database and a mock recipe service. The integration test removes its temporary accounts when it finishes. To select a separate local test database, set `TEST_DATABASE_URL=postgresql://forkity:forkity_dev@localhost:5432/forkity` before the command. Run `npm run build` to verify the production frontend bundle.

Migrations create `users`, `bookmarks`, server-side sessions, and user-owned `user_recipes`. Bookmark rows belong to a user, store a recipe snapshot for listing saved items, and are unique per user and recipe. Use `npm run db:rollback` to undo the most recently applied migration.

The API provides `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me`. Authentication uses an HTTP-only session cookie stored in PostgreSQL. In production, serve the frontend and proxy `/api` to the API on the same origin, set `NODE_ENV=production`, and provide a unique `SESSION_SECRET` of at least 32 characters.

Signed-in bookmark operations use `GET /api/v1/bookmarks`, `POST /api/v1/bookmarks` with a `{ "recipe": ... }` body, and `DELETE /api/v1/bookmarks/:recipeId`. Each operation is scoped to the authenticated user; requests without a session receive `401`.

Recipe search and external recipe details go through `GET /api/v1/recipes?search=...` and `GET /api/v1/recipes/:id`; the backend makes keyless GET requests to `FORKIFY_API_URL`. The upstream API is never sent recipe uploads. `POST /api/v1/recipes` saves a recipe to PostgreSQL under the signed-in user and adds it to their bookmarks. Local recipe details are only available to their owner. The previous recipe key was embedded in client code, so treat it as exposed; no recipe API key is needed for the read-only upstream API calls.
