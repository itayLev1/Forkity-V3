FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src/server.js ./src/server.js
COPY migrations ./migrations
COPY --from=build /app/dist ./dist

USER node

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && node src/server.js"]