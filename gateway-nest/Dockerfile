# --- builder ---
# python3/make/g++ - bcrypt is a native module (node-gyp). Alpine's musl
# libc means npm can't just fetch a prebuilt binary the way it might on
# a glibc distro, so these build tools have to be present for `npm ci`
# to compile it here. Only needed in this stage - the compiled binary
# that results gets copied into the runtime stage below, which never
# needs a compiler at all.
FROM node:24-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime ---
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
# Strips devDependencies (jest, ts-node, eslint, the @nestjs/cli used
# for `npm run build`, ...) now that the build is done - bcrypt's
# already-compiled binary (a production dependency) survives this, only
# the dev-only packages get removed.
RUN npm prune --omit=dev
COPY --from=builder /app/dist ./dist

# node:alpine ships a non-root `node` user out of the box - no reason
# this process needs root inside the container.
USER node

EXPOSE 3000
# src/main.ts already reads process.env.PORT (falling back to 3000) -
# no code change needed to run this on a different port in staging.
CMD ["node", "dist/main"]
