# Contributing

Thanks for your interest in contributing to Volleyball Scoreboard!

## Getting Started

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL)
- [gitleaks](https://github.com/gitleaks/gitleaks) (`brew install gitleaks`)

### Setup

```bash
# Clone the repo
git clone git@github.com:michelutke/volleyball-scoreboard.git
cd volleyball-scoreboard

# Install dependencies
npm install

# Start the database
docker compose up -d

# Copy env and configure
cp .env.example .env

# Run database migrations
npx drizzle-kit push

# Start dev server
npm run dev
```

## Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Run checks: `npm run check && npm run test`
4. Commit with a descriptive message
5. Open a pull request

## Code Style

- TypeScript with strict types
- SvelteKit conventions
- Tailwind CSS for styling
- Drizzle ORM for database access

## Pull Requests

- Keep PRs focused on a single change
- Include a clear description of what and why
- Ensure CI passes before requesting review
- Link related issues

## Reporting Issues

Use GitHub Issues with the provided templates for bugs and feature requests.
