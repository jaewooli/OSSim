# OS Simulator

Interactive operating-system simulator built with React, TypeScript, and Vite.

The app visualizes core OS concepts in one dashboard:

- CPU scheduling with Round Robin, FCFS, and Priority modes
- Ready queue dispatching and process state transitions
- I/O blocking and completion events
- Memory frames with simple page loading and replacement behavior
- Live kernel-style event log and resource indicators

## Requirements

- Node.js 20 or newer
- npm

## Getting Started

```bash
npm install
npm run dev
```

The Vite dev server is configured to use port `5174` by default.

## Available Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

- `dev`: start the local development server
- `build`: type-check and create a production build
- `lint`: run ESLint
- `preview`: serve the production build locally

## Project Structure

```text
src/
  App.tsx       Main simulator UI and state logic
  main.tsx      React entry point
  styles.css    Application styles
```

## Repository Notes

Generated folders such as `node_modules/` and `dist/` are intentionally ignored.
Install dependencies from `package-lock.json` instead of committing installed packages.

## License

No license has been selected yet. Add a license before publishing if you want others to use, modify, or redistribute the code.
