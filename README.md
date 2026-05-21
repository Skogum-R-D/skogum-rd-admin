# Skogum R&D Admin Dashboard

Real-time admin dashboard for monitoring agent activity in Valkey.

## Features
- List all assignments (all `whiteboard:*` keys in Valkey)
- Per assignment:
  - Plan summary
  - Status
  - Created timestamp
  - Expandable task list with:
    - Task ID
    - Type
    - Assigned agent
    - Status (`pending`/`in_progress`/`completed`/`failed`)
    - `completed_at`
- Auto-refreshes every 5 seconds

## Stack
- Next.js 16.2 (App Router)
- TypeScript
- Tailwind CSS v3 + Framer Motion
- ioredis (for Valkey connection)
- Server-side data fetching via API routes
- Client-side polling

## Configuration

1. Copy `.env.local`:
   ```sh
   cp .env.local .env.local
   ```

2. Set `VALKEY_URL` in `.env.local`:
   ```env
   VALKEY_URL=redis://your-valkey-host:6379
   ```

   Default: `redis://localhost:6379`

## Development

Run locally:
```sh
npm install
npm run dev
```

Open [http://localhost:3003](http://localhost:3003).

## Deployment

Ensure `VALKEY_URL` is set in your hosting provider's environment variables.

## License
MIT