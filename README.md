# Volleyball Scoreboard

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

A real-time volleyball scoring application built with SvelteKit, PostgreSQL, and Drizzle ORM.

<!-- TODO: Add screenshots -->

## Features

- Live match scoring
- Swiss Volley integration
- Mobile-friendly interface

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Tailwind CSS 4
- **Backend**: SvelteKit (Node adapter)
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 22+
- Docker

### Setup

```bash
# Start database
docker compose up -d

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run database migrations
npx drizzle-kit push

# Start dev server
npm run dev
```

### Environment Variables

| Variable              | Description                  |
|-----------------------|------------------------------|
| `DATABASE_URL`        | PostgreSQL connection string |
| `SWISS_VOLLEY_API_KEY`| Swiss Volley API key         |

See `.env.example` for defaults.

## Scripts

| Command           | Description              |
|-------------------|--------------------------|
| `npm run dev`     | Start dev server         |
| `npm run build`   | Production build         |
| `npm run preview` | Preview production build |
| `npm run check`   | Type checking            |
| `npm run test`    | Run tests                |

## Deployment

Build and run with Node adapter:

```bash
npm run build
node build
```

Required: set environment variables on the host. Never commit secrets.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

This project is licensed under [CC BY-NC-SA 4.0](LICENSE).
Attribution required. No commercial use. Share-alike.
