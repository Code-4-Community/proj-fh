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

**Every variable in `.env` must be filled in.** Env vars are validated at startup, so the backend, `yarn migration:run`, and the frontend Docker build fail with an error naming any variable that is missing or blank.

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
### 2) Build the shared base image
The backend and the frontend imaged both start from the same base image that holds the projects baseline dependencies. Build it once from the repo root, before building either the frontend or the backend:

```bash
docker build -f Dockerfile.base -t fh-base:latest .
```
The base image is local-only. It is not pushed anywehre, so every dev has to build it on their own machine.

Rebuild the base image (re-run the same command) when:

- `yarn.lock` changes on `main`, for example after you pull new changes.
- your builds start failing because of missing dependencies. 


**If you see "pull access denied" or "not found" for `fh-base`:** you haven't built the base image yet. Because `fh-base` only exists on your machine, Docker doesn't find it locally and tries to pull it from Docker Hub, where it doesn't exist, so the build fails with an error like:

```
pull access denied, repository does not exist or may require authorization
```

The fix is to build the base image first, then re-run the frontend/backend build:

```bash
docker build -f Dockerfile.base -t fh-base:latest .
```


### 3) Build and run the backend container

```bash
docker build -f apps/backend/Dockerfile -t proj-fh-backend .
docker run --rm -it \
  --env-file .env \
  -p 3000:3000 \
  --name proj-fh-backend \
  proj-fh-backend
```

> `.env` should use `POSTGRES_HOST=host.docker.internal` when running the backend inside Docker on Windows/macOS. That lets the container reach the Postgres instance published on port 5432.

### 4) Build and run the frontend container

Vite bakes the `VITE_` variables into the frontend at build time, and `.env` is not copied into the image, so pass them as build args. The build fails if any are missing.

**macOS** (reads the values from `.env`):

```bash
(set -a; . ./.env; set +a; docker build -f apps/frontend/Dockerfile -t proj-fh-frontend \
  --build-arg VITE_API_BASE_URL \
  --build-arg VITE_COGNITO_USER_POOL_ID \
  --build-arg VITE_COGNITO_APP_CLIENT_ID .)
```

**Windows** - copy the values from your `.env`:

```powershell
docker build -f apps/frontend/Dockerfile -t proj-fh-frontend `
  --build-arg VITE_API_BASE_URL=http://localhost:3000 `
  --build-arg VITE_COGNITO_USER_POOL_ID=<value from .env> `
  --build-arg VITE_COGNITO_APP_CLIENT_ID=<value from .env> .
```

Then run it:

```bash
docker run --rm -it \
  -p 4200:80 \
  --name proj-fh-frontend \
  proj-fh-frontend
```

Open your browser and navigate to http://localhost:4200/.

## Running tasks

Use the Docker containers above for normal development. If you need to run a task locally for debugging, use the repo's existing `nx` commands only temporarily.
