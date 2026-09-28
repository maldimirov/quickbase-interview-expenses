# Expense Requests

A TypeScript full-stack implementation of the Quickbase expense-request interview exercise.

## Prerequisites

- Node.js 22.12 or newer
- npm 10 or newer

## Development

Install the API dependencies:

```sh
cd api
npm install
```

Install the UI dependencies from the repository root:

```sh
cd ui
npm install
```

Start the API in one terminal:

```sh
cd api
npm run dev
```

Start the UI in another terminal:

```sh
cd ui
npm run dev
```

Open `http://localhost:5173`. The UI's Vite development server forwards browser requests under `/api` to the API at `http://localhost:3000`.

## Verification

Check and build the API:

```sh
cd api
npm run typecheck
npm run build
```

Check and build the UI from the repository root:

```sh
cd ui
npm run typecheck
npm run build
```

Run the compiled API from its project directory after building:

```sh
cd api
npm start
```

The production UI assets are written to `ui/dist`.
