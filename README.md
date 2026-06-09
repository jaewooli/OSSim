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
npm start
```

- `dev`: start the local development server
- `build`: type-check and create a production build
- `lint`: run ESLint
- `preview`: serve the production build locally
- `start`: serve the production build on `127.0.0.1:8082`

## Deployment

This project is configured to be served from `/ossimulator/`.
Run `npm run build` and deploy the generated `dist/` contents to the server location mapped by Nginx.

If Nginx is reverse proxying `/ossimulator/` to port `8082`, run the app process with:

```bash
npm ci
npm run build
pm2 start npm --name ossimulator -- start
pm2 save
```

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
