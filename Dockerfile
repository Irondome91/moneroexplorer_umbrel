# Build and compile the Deno application
FROM denoland/deno:alpine AS builder
WORKDIR /app
COPY deno.json deno.lock package.json ./
RUN deno install
COPY public public
COPY src src
CMD ["deno", "run", "--allow-all", "./src/app.ts"]