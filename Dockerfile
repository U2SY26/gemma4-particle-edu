FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY server.js index.html favicon.svg ./
COPY js/ js/
COPY css/ css/
COPY api/ api/
COPY public/ public/
COPY data/ data/

EXPOSE 3000

ENV NODE_ENV=production
ENV OLLAMA_BASE=http://ollama:11434

CMD ["node", "server.js"]
