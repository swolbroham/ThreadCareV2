# ThreadCare

ThreadCare is a laundry care web app that helps users manage garments and get personalized washing guidance — including care-symbol references and fabric-specific plans — so clothes get cleaned the right way every time.

**Live demo:** [thread-care-v2.vercel.app](https://thread-care-v2.vercel.app)

This project started as a prototype exported from [Figma Make](https://www.figma.com/design/LinmzsIErrey4yAaNcEysU/Enhance-ThreadCare-Prototype) and is being developed further from there.

## Tech stack

- **React 18** + **TypeScript**
- **Vite** for dev server and build tooling
- **Tailwind CSS v4**
- **shadcn/ui** components (built on Radix UI primitives)
- **React Hook Form**, **Recharts**, **date-fns**, and other supporting libraries

## Getting started

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Deployment

This project is deployed on [Vercel](https://vercel.com). Pushes to `main` trigger a new deployment automatically.

## Project structure

```
src/            # Application source (components, pages, styles)
index.html      # App entry point
vite.config.ts  # Vite configuration
```

## Credits

- UI components from [shadcn/ui](https://ui.shadcn.com/), used under the [MIT license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)
- Photography from [Unsplash](https://unsplash.com), used under the [Unsplash license](https://unsplash.com/license)

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for full details.
