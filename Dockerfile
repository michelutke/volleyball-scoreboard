FROM node:22-slim AS build
WORKDIR /app
ENV HUSKY=0
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build > /tmp/build.log 2>&1 || (cat /tmp/build.log && exit 1)

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build"]
