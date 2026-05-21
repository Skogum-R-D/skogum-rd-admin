# Skogum RD Admin Dashboard

A Next.js 16.2 admin dashboard for monitoring Valkey agent activity.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` file with Valkey configuration:
   ```env
   VALKEY_URL=redis://localhost:6379
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3003`.

## Features

- Real-time monitoring of Valkey `whiteboard:*` keys
- Assignment cards with plan summary, status, and progress
- Expandable task lists with detailed status
- Auto-refresh every 5 seconds

## Development

### Adding new dependencies

```bash
npm install package-name
```

### Running tests

```bash
npm test
```

### Building for production

```bash
npm run build
npm start
```

## Valkey Data Structure

The dashboard expects the following data structure in Valkey:

- Keys: `whiteboard:<id>` (hash)
- Fields:
  - `plan_summary`: string
  - `status`: "in_progress" | "completed" | "dispatched"
  - `timestamp`: ISO 8601 datetime string
  - `tasks`: JSON array of task objects

Task objects:
- `id`: string
- `type`: string
- `agent`: string
- `status`: string
- `completed_at`: ISO 8601 datetime string (optional)

## License

MIT