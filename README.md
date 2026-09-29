# Expense Requests

A TypeScript full-stack implementation of the Quickbase expense-request interview exercise.

## Prerequisites

- Node.js 22.12 or newer
- npm 10 or newer

## Development

Install both projects' dependencies from the repository root:

```sh
npm run setup
```

Start the API in one terminal:

```sh
npm run dev:api
```

Start the UI in another terminal:

```sh
npm run dev:ui
```

Open `http://localhost:5173`. The UI's Vite development server forwards browser requests under `/api` to the API at `http://localhost:3000`.

The root package contains orchestration commands only. The API and UI retain their own dependencies, lockfiles, and npm commands.

## Verification

Check both projects:

```sh
npm run typecheck
```

Build both projects:

```sh
npm run build
```

Run the compiled API after building:

```sh
npm run start:api
```

The production UI assets are written to `ui/dist` and can be previewed with `npm run preview:ui`.
