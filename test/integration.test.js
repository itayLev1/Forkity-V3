import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

test('accounts, user-owned recipes and bookmarks, and read-only recipe proxy work end to end', async (context) => {
  assert.ok(databaseUrl, 'Set TEST_DATABASE_URL to a local migrated PostgreSQL database.');
  const databaseHost = new URL(databaseUrl).hostname;
  assert.ok(
    ['localhost', '127.0.0.1', '::1'].includes(databaseHost),
    'Integration tests only run against a loopback database host.',
  );

  const pool = new Pool({ connectionString: databaseUrl });
  const emails = [
    `stage6-a-${randomUUID()}@example.test`,
    `stage6-b-${randomUUID()}@example.test`,
  ];
  const upstreamRequests = [];
  let accountApi;
  let upstream;
  let accountApiOrigin;
  let upstreamOrigin;
  const cookies = [];

  context.after(async () => {
    for (const cookie of cookies) {
      await fetch(`${accountApiOrigin}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { cookie },
      }).catch(() => {});
    }
    if (accountApi?.pid && accountApi.exitCode === null) {
      accountApi.kill('SIGTERM');
      await new Promise((resolve) => accountApi.once('exit', resolve));
    }
    if (upstream?.listening) {
      await new Promise((resolve, reject) => {
        upstream.close((error) => error ? reject(error) : resolve());
      });
    }
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
    await pool.end();
  });

  await pool.query('SELECT 1');

  upstream = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    upstreamRequests.push({
      method: request.method,
      url: new URL(request.url, 'http://localhost'),
      body,
    });
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      data: {
        recipes: [{ id: 'mock-recipe' }],
        recipe: { id: 'mock-recipe' },
      },
    }));
  });
  await new Promise((resolve, reject) => {
    upstream.once('error', reject);
    upstream.listen(0, '127.0.0.1', resolve);
  });
  upstreamOrigin = `http://127.0.0.1:${upstream.address().port}/api/v2/recipes/`;

  const apiPortServer = createServer();
  await new Promise((resolve, reject) => {
    apiPortServer.once('error', reject);
    apiPortServer.listen(0, '127.0.0.1', resolve);
  });
  const apiPort = apiPortServer.address().port;
  await new Promise((resolve, reject) => {
    apiPortServer.close((error) => error ? reject(error) : resolve());
  });

  accountApiOrigin = `http://127.0.0.1:${apiPort}`;
  accountApi = spawn(process.execPath, ['src/server.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(apiPort),
      DATABASE_URL: databaseUrl,
      SESSION_SECRET: randomBytes(32).toString('hex'),
      FORKIFY_API_URL: upstreamOrigin,
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('API did not start within five seconds.')), 5000);
    accountApi.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('API listening')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    accountApi.once('error', reject);
    accountApi.once('exit', (code) => reject(new Error(`API exited early with code ${code}.`)));
  });

  const apiRequest = async (path, { method = 'GET', payload, cookie } = {}) => {
    const response = await fetch(`${accountApiOrigin}${path}`, {
      method,
      headers: {
        ...(payload && { 'content-type': 'application/json' }),
        ...(cookie && { cookie }),
      },
      ...(payload && { body: JSON.stringify(payload) }),
    });
    const setCookie = response.headers.getSetCookie()[0];
    const cookiePair = setCookie?.split(';')[0];
    if (cookiePair) cookies.push(cookiePair);
    return {
      response,
      data: response.status === 204 ? null : await response.json(),
      setCookie,
      cookie: cookiePair,
    };
  };

  assert.deepEqual(await (await fetch(`${accountApiOrigin}/api/v1/health`)).json(), {
    status: 'ok',
    database: 'connected',
  });
  assert.equal((await apiRequest('/api/v1/bookmarks')).response.status, 401);

  const password = 'Stage6-integration-password-123';
  const accountA = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    payload: { email: emails[0], password },
  });
  const accountB = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    payload: { email: emails[1], password },
  });
  assert.equal(accountA.response.status, 201);
  assert.match(accountA.setCookie, /HttpOnly/i);
  assert.equal('password_hash' in accountA.data.user, false);
  assert.equal(accountB.response.status, 201);
  const cookieA = accountA.cookie;
  const cookieB = accountB.cookie;

  const recipe = {
    id: 'shared-stage6-recipe',
    title: 'Integration recipe',
    publisher: 'Stage 6',
    sourceUrl: 'https://example.test/recipe',
    image: 'https://example.test/recipe.jpg',
    servings: 2,
    cookingTime: 25,
    ingredients: [{ quantity: 1, unit: 'cup', description: 'test ingredient' }],
  };
  assert.equal((await apiRequest('/api/v1/bookmarks', {
    method: 'POST', payload: { recipe }, cookie: cookieA,
  })).response.status, 200);
  assert.equal((await apiRequest('/api/v1/bookmarks', {
    method: 'POST', payload: { recipe }, cookie: cookieA,
  })).response.status, 200);
  assert.equal((await apiRequest('/api/v1/bookmarks', { cookie: cookieA })).data.bookmarks.length, 1);
  assert.equal((await apiRequest('/api/v1/bookmarks', { cookie: cookieB })).data.bookmarks.length, 0);
  assert.equal((await apiRequest(`/api/v1/bookmarks/${recipe.id}`, {
    method: 'DELETE', cookie: cookieB,
  })).response.status, 404);
  assert.equal((await apiRequest('/api/v1/bookmarks', {
    method: 'POST', payload: { recipe }, cookie: cookieB,
  })).response.status, 200);
  assert.equal((await apiRequest(`/api/v1/bookmarks/${recipe.id}`, {
    method: 'DELETE', cookie: cookieA,
  })).response.status, 204);
  assert.equal((await apiRequest('/api/v1/bookmarks', { cookie: cookieB })).data.bookmarks.length, 1);

  const searchResponse = await apiRequest('/api/v1/recipes?search=tomato%20soup');
  assert.equal(searchResponse.response.status, 200);
  assert.equal(searchResponse.data.data.recipes[0].id, 'mock-recipe');
  assert.equal(upstreamRequests.at(-1).url.searchParams.get('search'), 'tomato soup');
  assert.equal(upstreamRequests.at(-1).method, 'GET');
  assert.equal(upstreamRequests.at(-1).url.searchParams.has('key'), false);

  const detailResponse = await apiRequest('/api/v1/recipes/mock-recipe');
  assert.equal(detailResponse.response.status, 200);
  assert.equal(upstreamRequests.at(-1).url.pathname, '/api/v2/recipes/mock-recipe');
  assert.equal(upstreamRequests.at(-1).url.searchParams.has('key'), false);

  const uploadPayload = {
    title: 'Uploaded integration recipe',
    publisher: 'Stage 6',
    cooking_time: 20,
    servings: 2,
    ingredients: [{ quantity: null, unit: '', description: 'local ingredients' }],
  };
  const previousUpstreamRequestCount = upstreamRequests.length;
  const uploadResponse = await apiRequest('/api/v1/recipes', {
    method: 'POST', payload: uploadPayload, cookie: cookieA,
  });
  assert.equal(uploadResponse.response.status, 201);
  const localRecipeId = uploadResponse.data.data.recipe.id;
  assert.match(localRecipeId, /^local-/);
  assert.equal(uploadResponse.data.data.recipe.key, 'user');
  assert.equal(uploadResponse.data.data.recipe.source_url, null);
  assert.equal(uploadResponse.data.data.recipe.image_url, null);
  assert.equal(upstreamRequests.length, previousUpstreamRequestCount);

  const ownerRecipe = await apiRequest(`/api/v1/recipes/${localRecipeId}`, { cookie: cookieA });
  assert.equal(ownerRecipe.response.status, 200);
  assert.equal(ownerRecipe.data.data.recipe.title, uploadPayload.title);
  assert.equal((await apiRequest(`/api/v1/recipes/${localRecipeId}`, { cookie: cookieB })).response.status, 404);
  assert.equal((await apiRequest('/api/v1/bookmarks', { cookie: cookieA })).data.bookmarks[0].id, localRecipeId);
});