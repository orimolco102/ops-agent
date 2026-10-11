FROM node:20-alpine

WORKDIR /app

COPY pacage*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD [ "node", "app.js" ]