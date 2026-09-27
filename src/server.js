import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import pg from 'pg';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET;
const recipeApiUrl = process.env.FORKIFY_API_URL;
const recipeApiKey = process.env.FORKIFY_API_KEY;
const recipeApiTimeout = 10_000;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

if (!sessionSecret || Buffer.byteLength(sessionSecret) < 32) {
  throw new Error('SESSION_SECRET must be set to at least 32 characters');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
const PgSession = connectPgSimple(session);
const cookieName = 'forkity.sid';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: cookieName,
  store: new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: false,
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: cookieOptions,
}));

const validateCredentials = ({ email, password } = {}) => {
  if (typeof email !== 'string' || typeof password !== 'string') return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (
    normalizedEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return null;
  }

  return { email: normalizedEmail, password };
};

const establishSession = (request, userId) => new Promise((resolve, reject) => {
  request.session.regenerate((regenerateError) => {
    if (regenerateError) return reject(regenerateError);

    request.session.userId = userId;
    request.session.save((saveError) => {
      if (saveError) return reject(saveError);
      resolve();
    });
  });
});

const publicUser = (row) => ({ id: row.id, email: row.email });

app.post('/api/v1/auth/register', async (request, response, next) => {
  const credentials = validateCredentials(request.body);
  if (!credentials) {
    return response.status(400).json({
      message: 'Enter a valid email and a password between 8 and 72 bytes.',
    });
  }

  try {
    const passwordHash = await bcrypt.hash(credentials.password, 12);
    let result;

    try {
      result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [credentials.email, passwordHash],
      );
    } catch (error) {
      if (error.code === '23505') {
        return response.status(409).json({ message: 'An account with this email already exists.' });
      }
      throw error;
    }

    const user = publicUser(result.rows[0]);
    await establishSession(request, user.id);
    response.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/login', async (request, response, next) => {
  const credentials = validateCredentials(request.body);
  if (!credentials) {
    return response.status(400).json({ message: 'Enter a valid email and password.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE lower(email) = $1',
      [credentials.email],
    );
    const account = result.rows[0];
    const passwordMatches = account && await bcrypt.compare(credentials.password, account.password_hash);

    if (!passwordMatches) {
      return response.status(401).json({ message: 'Email or password is incorrect.' });
    }

    const user = publicUser(account);
    await establishSession(request, user.id);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get('/api/v1/auth/me', async (request, response, next) => {
  if (!request.session.userId) return response.json({ user: null });

  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE id = $1',
      [request.session.userId],
    );
    response.json({ user: result.rows[0] ? publicUser(result.rows[0]) : null });
  } catch (error) {
    next(error);
  }
});

app.post('/api/v1/auth/logout', (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);

    response.clearCookie(cookieName, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
    });
    response.status(204).end();
  });
});

const proxyRecipeRequest = async (request, response) => {
  if (!recipeApiUrl || !recipeApiKey) {
    return response.status(503).json({ message: 'Recipe service is not configured.' });
  }

  const upstreamUrl = new URL(recipeApiUrl);
  if (request.params.id) {
    upstreamUrl.pathname = `${upstreamUrl.pathname.replace(/\/$/, '')}/${encodeURIComponent(request.params.id)}`;
  }
  if (request.query.search) upstreamUrl.searchParams.set('search', request.query.search);
  upstreamUrl.searchParams.set('key', recipeApiKey);

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: request.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: request.method === 'POST' ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(recipeApiTimeout),
    });
    const data = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      return response.status(upstreamResponse.status).json({
        message: typeof data.message === 'string' ? data.message : 'Recipe service request failed.',
      });
    }

    response.status(upstreamResponse.status).json(data);
  } catch (error) {
    const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError';
    response.status(isTimeout ? 504 : 502).json({
      message: isTimeout ? 'Recipe service request timed out.' : 'Recipe service is unavailable.',
    });
  }
};

app.get('/api/v1/recipes', (request, response) => {
  if (typeof request.query.search !== 'string' || !request.query.search.trim() || request.query.search.length > 200) {
    return response.status(400).json({ message: 'A search query between 1 and 200 characters is required.' });
  }
  proxyRecipeRequest(request, response);
});

app.get('/api/v1/recipes/:id', (request, response) => {
  if (!request.params.id || request.params.id.length > 128) {
    return response.status(400).json({ message: 'A valid recipe ID is required.' });
  }
  proxyRecipeRequest(request, response);
});

app.post('/api/v1/recipes', (request, response) => {
  if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body)) {
    return response.status(400).json({ message: 'A recipe object is required.' });
  }
  proxyRecipeRequest(request, response);
});

app.get('/api/v1/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch {
    response.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.use((error, _request, response, _next) => {
  console.error('API request failed:', error);
  response.status(500).json({ message: 'The request could not be completed.' });
});

const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}