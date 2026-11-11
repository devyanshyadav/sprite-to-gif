# Contributing

Thanks for helping improve SpriteToGIF. This project is a client-side studio: keep changes focused, testable, and aligned with the copy in `lib/studio-copy.ts`.

## Getting started

1. Fork and clone the repo.
2. `bun install`
3. `bun dev` — verify the studio at http://localhost:3000
4. `bun run lint` and `bun run test` before opening a PR.

## Pull requests

- One logical change per PR when possible (feature, fix, or docs—not everything at once).
- Match existing patterns: kebab-case files in `components/studio/`, shared UI in `components/library/`.
- User-visible strings belong in `lib/studio-copy.ts`, not scattered in components.
- Avoid drive-by refactors outside the scope of your change.

## Adding samples

Do not commit huge binary assets without need. Prefer reasonably sized PNG/WebP sheets. Always add an entry to `SAMPLE_SPRITE_SHEETS` with an accurate `columns×rows` label.

## Tests

Vitest covers pure logic under `lib/**/*.test.ts`. Add or update tests when changing grid math, prompts, neon detection, or clarity passes.

## Questions

Open a GitHub issue with steps to reproduce, browser version, and a sample sheet if the bug is grid-related.
