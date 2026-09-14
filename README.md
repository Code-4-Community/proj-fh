# Onboarding onto Proj-Fenway-Health

### Node Dependencies

Install Node directly or using NVM

https://nodejs.org/en/download

https://www.nvmnode.com/

Please use verison 24. If you do `node --version` and it doesn't show 24, please keep trying until it uses the correct version.

Do `npm --version` to confirm you have npm.

Install dependencies with Yarn using the repo’s pinned version:

```bash
npm exec --yes yarn@1.22.19 install
```

You can optionally install `nx` globally with `npm install -g nx` - if you don't, you'll just need to prefix the commands below with `npx` (e.g. `npx nx serve frontend`).

### Installing Docker

Because I am using a Windows computer and I know many of you use Macs, we are doing to run things using containers in order to reduce cross-OS friction.

Please download Docker Desktop
https://www.docker.com/products/docker-desktop/

This repo now includes Dockerfiles for both the backend and frontend so you can run those services in containers.

### Database Setup

Make your own env file based off of example.env

Determine your postgres password. It is best to use numbers, letters, and the followign characters ".", "-", and "_" using any other special characters will give you a headache.

Since it is just for local development, you can fill in whatever password you want. Please fill it in the env.

This project uses PostgreSQL. You'll need a running Postgres instance before starting the backend.

On Docker Desktop for Windows/macOS, use `host.docker.internal` in `.env` so the backend container can reach the Postgres container on the host machine.

```bash
docker run --name proj-fh-db \
  --env-file .env \
  -p 5432:5432 \
  -d postgres:18-alpine
```

You can keep this container running forever if you want.

We will not be using PgAdmin on this team - the reason is because PgAdmin is so slow that I've seen it take a whole 5 minutes to startup on computers. Not only is connecting to PSQL using the terminal much faster, but it is a much more marketable skill than relying on the PgAdmin UI as a clutch.

To connect to your database, let's install the PSQL cli:

https://www.postgresql.org/download/

JUST SELECT the command line tools and unselect everything else. Then add the /bin folder to your environmental varables.

Install Postgres 18.


**Run migrations:**

```bash
yarn migration:run
```

To generate a new migration after changing entities:

```bash
name=your_migration_name yarn migration:generate
```

> **Windows users:** The `name=...` syntax above only works on Mac/Linux. On Windows, run `set name=your_migration_name && yarn migration:generate` in Command Prompt, or `$env:name="your_migration_name"; yarn migration:generate` in PowerShell.

To revert the most recent migration:

```bash
yarn migration:revert
```

## Start the app

Build and run the containers from the repo root.

### 1) Start the database

```bash
docker run --name proj-fh-db \
  --env-file .env \
  -p 5432:5432 \
  -d postgres:18-alpine
```

### 2) Build and run the backend container

```bash
docker build -f apps/backend/Dockerfile -t proj-fh-backend .
docker run --rm -it \
  --env-file .env \
  -p 3000:3000 \
  --name proj-fh-backend \
  proj-fh-backend
```

> `.env` should use `POSTGRES_HOST=host.docker.internal` when running the backend inside Docker on Windows/macOS. That lets the container reach the Postgres instance published on port 5432.

### 3) Build and run the frontend container

```bash
docker build -f apps/frontend/Dockerfile -t proj-fh-frontend .
docker run --rm -it \
  -p 4200:80 \
  --name proj-fh-frontend \
  proj-fh-frontend
```

Open your browser and navigate to http://localhost:4200/.

## Running tasks

Use the Docker containers above for normal development. If you need to run a task locally for debugging, use the repo's existing `nx` commands only temporarily.

## Swagger

The backend can expose [Swagger UI](https://github.com/swagger-api/swagger-ui) (built from an OpenAPI document via [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction)) so you can browse and try HTTP routes without reading controller code first.

**Turn it on:** In `.env` at the repo root (copy from [`example.env`](example.env)), set `SWAGGER_ENABLED=true`. Restart the backend (`nx serve backend`), then open **http://localhost:3000/api** for the UI. 

**Turn it off:** Unset `SWAGGER_ENABLED` or set it to `false`.

**TL TODOS:** 
1. In [`apps/backend/src/main.ts`](apps/backend/src/main.ts), replace `[YOUR_APP_NAME]` and other `[TL]` strings, adjust `.addTag()` entries to match your controllers, 
2. Add `@ApiBearerAuth()` onto the controller or handler for specifically protected routes. `addBearerAuth()` only states that the application supports authentication via HTTP Bearer in the Authorization header, it doesn't mark specific routes as protected. [Learn more](https://docs.nestjs.com/openapi/security#bearer-authentication)

**Decorators to know as you add routes!** 
(import from `@nestjs/swagger`):
- `@ApiProperty()` / `@ApiPropertyOptional()`: on top of DTO fields
- `@ApiTags('Name')`: on top of controllers to tag them to specific tags/features
- `@ApiHeader({name: '...', description: '...'})`: on top of individual methods or controllers to define custom headers that are expected as part of the requests to those methods/controllers
- `@ApiResponse({ status: '...', description: '...' })`: to define a custom HTTP response.
  - Prebuilt helpers (fixed status in the spec): `@ApiOkResponse` (200), `@ApiCreatedResponse` (201), `@ApiNotFoundResponse` (404), [additional `@Api*Response` shortcuts](https://docs.nestjs.com/openapi/operations#responses)

[More Decorators](https://docs.nestjs.com/openapi/decorators).

## Other commands

Run `git submodule update --remote` to pull the latest changes from the component library

When cloning the repo, make sure to add the `--recurse-modules` flag to also clone the component library submodule (e.g. `git clone --recurse-submodules https://github.com/Code-4-Community/scaffolding.git` for the `scaffolding` repo)
