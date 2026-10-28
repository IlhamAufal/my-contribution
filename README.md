# my-contribute

Turn your git history into a per-contributor contribution report you can drop into a portfolio or CV.

No install, no dependencies. Just Node.js 18+ and git.

## Quick start

Run it inside any git repository:

```bash
npx my-contribute
```

Save it as a file:

```bash
npx my-contribute --out CONTRIBUTIONS.md
```

## What you get

- A summary table: commits, share, lines added/deleted, and files touched per contributor
- For each person: active period, main areas of the codebase, languages, work mix (feat/fix/refactor...), and highlights
- Lock files, build output, and binary assets are ignored so the numbers reflect real work

## Common options

Only a time window:

```bash
npx my-contribute --since 2026-01-01 --until 2026-06-30
```

Only one person:

```bash
npx my-contribute --author budi
```

Merge several names or emails that belong to the same person (first entry is the display name):

```bash
npx my-contribute --merge "Budi,budi@mail.com,budi.s"
```

Machine-readable output:

```bash
npx my-contribute --json
```

Run `npx my-contribute --help` for every option.

## Use it as an agent skill

This repo also ships a skill that runs the CLI and turns the result into contribution summaries and CV bullets. Install it from GitHub (replace `username` with your GitHub name):

```bash
npx skills add username/my-contribute
```

Then ask your agent something like "summarize my contributions in this repo for my CV".

## Tips for better reports

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`) so the work mix is accurate.
- Commit counts and line counts are weak signals on their own. Pair the report with links to your pull requests.
- Tell your teammates before you analyze their work.

## License

MIT
