FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
COPY agent.mjs ./

ENV NODE_ENV=production

CMD ["npm", "run", "start"]
