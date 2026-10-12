# Kingdom of Chess

A chess tournament platform built with Next.js, TypeScript, and Material UI.
The current dashboard is a responsive frontend preview with sample tournament,
leaderboard, and match data. It does not yet connect to an API or persist changes.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available scripts

- `npm run dev` — start the development server.
- `npm run lint` — check source formatting and lint rules.
- `npm run build` — create a production build.

Material UI is integrated with the Next.js App Router using its Emotion cache
provider. TanStack Query and the authentication context are available
throughout the app via `src/app/providers.tsx`. The `/login` and `/register`
pages use React Hook Form, and `src/lib/axios.ts` exports a shared Axios client
that attaches the saved access token to protected requests.

Set `NEXT_PUBLIC_API_URL` in `.env.local` to configure the Axios client's API
base URL. If it is unset, requests use relative URLs. The auth context handles
registration, login, logout, refresh, and profile retrieval through the
endpoints documented in `docs/FRONTEND_API.md`. Tournament filters and search
still work against the clearly labeled sample records.
