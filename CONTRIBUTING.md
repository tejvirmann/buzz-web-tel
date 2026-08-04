# Contributing

Thanks for contributing to Buzz Web. This repository accepts focused bug fixes, accessibility and
internationalization improvements, protocol compatibility work, tests, and Roadmap features.

## Before Starting

- Search existing issues and pull requests for the same problem.
- For a substantial feature or protocol change, open an issue first and describe the user outcome,
  Relay event/API contract, security boundary, and expected tests.
- Read [AGENTS.md](AGENTS.md), even when the change is written by a human; it is the concise source
  of repository architecture and quality rules.

## Setup

Use Node.js 24 and npm:

```bash
cd web
npm ci
npm run dev
```

The optional Agent Control service has its own lockfile:

```bash
cd agent-control
npm ci
npm test
```

Do not put real credentials or deployment-specific addresses in either public `config.json`.

## Pull Requests

- Keep one behavioral concern per pull request.
- Add or update tests for every bug fix and user-visible behavior change.
- Add both English and Simplified Chinese text for all application-owned UI copy.
- Include screenshots for meaningful visual changes at desktop and mobile widths.
- Explain protocol or security tradeoffs in the PR description.
- Use a Conventional Commit title such as `fix(repos): honor the runtime relay URL`.
- Sign each commit with the Developer Certificate of Origin:

  ```bash
  git commit -s
  ```

The sign-off certifies that you have the right to submit the contribution under this repository's
Apache-2.0 license.

## Required Verification

```bash
cd web
npm run typecheck
npm test
npm run check
npm run test:e2e

cd ../agent-control
npm test

cd ..
git diff --check
```

Run `docker compose -f deploy/compose.yml config` when changing deployment files. If a check cannot
run in your environment, state that clearly in the pull request.

## Security Reports

Do not open a public issue for a vulnerability or include private Relay data in a reproduction.
Follow [SECURITY.md](SECURITY.md).
