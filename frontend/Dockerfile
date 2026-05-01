# glibc-based image: @rolldown/binding-linux-x64-gnu (Vite 8/Rolldown) rejects musl/Alpine
FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
