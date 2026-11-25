# Frontend for The Stacks

This repository hosts the source code for the frontend server of The Stacks. The frontend was created using React 18, React Router 7, TypeScript 5, Tailwind CSS 4, and shadcn/ui components.

## UI/UX

The frontend was designed in late 2025 by Audrey Bell. All designs can be found in [the Figma project](https://www.figma.com/design/1wnAXaveqmuaHWEvGQ88o8/FINAL-STACKS-DESIGNS).

## Installation

1. Download and install the latest version of [`Node.js`](https://nodejs.org/en/download).

2. Install [pnpm](https://pnpm.io/installation). Any pnpm install switches to the version pinned in the root `package.json` (`packageManager`).

3. Clone the repository.

   ```sh
   git clone https://github.com/Astera-org/thestacks.git
   cd thestacks
   ```

4. Install dependencies.

   ```sh
   pnpm install
   ```

## Development

As of January 2026, there is no workflow for local setup of the backend server and database. As such, the frontend fetches all data directly from the staging backend environment.

### Commands

| Command              | Action                                      |
| :------------------- | :------------------------------------------ |
| `pnpm install`       | Installs dependencies                       |
| `pnpm run dev`       | Starts local dev server at `localhost:3000` |
| `pnpm run build`     | Build the production server                 |
| `pnpm run start`     | Start the production server locally         |
| `pnpm run format`    | Format project files using Prettier         |
| `pnpm run lint`      | Lint project files using ESLint             |
| `pnpm run typecheck` | Type check project files                    |
| `pnpm run precommit` | Format, lint and type check project files   |

## Deployment

The frontend is deployed on Vercel. This means that every branch (as well as every commit) in the repository will generate a preview deployment. Deployments require the following environment variables to be set in Vercel:

- `VITE_BACKEND_URL`: The URL of the backend server to connect to (e.g. `https://api.thestacks.org` for production).

The URLs should **not** have a trailing slash. They are used in places where it is not possible to modify the input value, so there is this annoying restriction.

### Staging

The `staging` branch is intended for changes that are ready to push to production. This includes completed features, bug fixes, and updates to content and design.

For experimental and draft features, please keep your changes in a feature branch until they've been readily tested and approved for production.

### Production

Merges to the `production` branch will trigger a new production deployment in Vercel, which will become available to all users navigating to <https://thestacks.org>. **Only changes from `staging` should be merged to `production`!**
