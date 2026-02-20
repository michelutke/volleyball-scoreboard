FROM node:22-slim AS build
WORKDIR /app
ENV HUSKY=0
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build"]
