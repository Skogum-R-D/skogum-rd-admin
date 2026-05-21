# Skogum RD Admin Dashboard

A Next.js 16.2 admin dashboard for monitoring real-time agent activity in Valkey.

## Features
- List all assignments (all `whiteboard:*` keys in Valkey)
- Display plan summary, status, and created timestamp for each assignment
- Expandable task list with task details
- Auto-refresh every 5 seconds

## Stack
- Next.js 16.2 App Router + TypeScript
- Tailwind CSS v3 + Framer Motion
- ioredis for Valkey connection
- Server-side data fetching via API routes with client-side polling

## Pages
- `/`: Dashboard with assignment cards sorted by most recent first

## Configuration

### Environment Variables
Create a `.env.local` file in the root directory with the following variables:

| Variable      | Description                          | Example                     |
|---------------|--------------------------------------|-----------------------------|
| `VALKEY_URL`  | URL of the Valkey server             | `redis://user:pass@host:port` |

Example:
```env
VALKEY_URL=redis://localhost:6379
```

### Running Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3003](http://localhost:3003) in your browser.

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

## API Routes
- `GET /api/assignments`: Fetch all assignments
- `GET /api/tasks?assignmentId=<id>`: Fetch tasks for a specific assignment

## Error Handling
The API routes return structured errors in the following format:
```json
{
  "error": "ErrorCode",
  "message": "Error message"
}
```

Possible error codes:
- `ValkeyUnavailable`: Failed to connect to Valkey
- `InvalidQuery`: Missing or invalid query parameters
- `InternalServerError`: An unexpected error occurred

## Logging
The application uses `pino` for structured logging. Logs are written to the console in development and can be configured for production.

## License
MIT