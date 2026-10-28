---
name: my-contribute
description: Turn a git repository's history into per-contributor contribution summaries and CV/portfolio bullets. Use when the user wants to see who contributed what, or wants resume/portfolio material from their commits.
---

# my-contribute

Detect who contributed what in a git repository, then turn the raw numbers into readable contribution summaries and CV/portfolio bullets a recruiter can scan.

## Step 1: Collect the data

Run the CLI inside the repository (needs Node.js 18+ and git):

```bash
npx -y my-contribute --json
```

Useful options:
- `--since 2026-01-01` / `--until 2026-06-30` to limit the period
- `--author <text>` to focus on one person
- `--merge "Name,email1,email2"` when one person shows up under several names or emails (the first entry is the display name)

If `npx` is unavailable, fall back to `git log --no-merges --numstat` and aggregate per author by hand.

If the same person appears more than once in the output, ask the user which entries are the same person, then rerun with `--merge`.

## Step 2: Go beyond the numbers

The JSON only has counts, areas, languages, work mix, and commit subjects. To describe real contributions:
- Read the relevant commit messages and, where a subject is vague, the diff (`git show <hash> --stat`) before describing it.
- If the `gh` CLI is available and authenticated, pull merged pull requests per author (`gh pr list --author <login> --state merged`) because PRs show impact better than commit counts.
- Group related commits into one contribution (for example, five commits on login become one "authentication" item).

## Step 3: Write the output

For the whole repository:
1. A short list of contributors, each with a one-line role summary based on their areas and work mix.
2. Per contributor, a list of concrete contributions grouped by feature or area, each with supporting commit or PR references (short hash or PR link).

For the user's own CV/portfolio, add 3 to 6 bullets that follow this pattern: action verb, what was built or fixed, technology used, and the outcome when it is known. Example shape: "Built the authentication flow (TypeScript, JWT) covering login, sessions, and timeout handling."

## Rules

- Only claim what the git history supports. Never invent metrics, users, performance gains, or outcomes. If impact is unknown, describe the work and leave the impact out, or ask the user to supply it.
- Commit and line counts are weak signals. Do not present them as a measure of quality or seniority.
- Keep the reference to the commit or PR next to each claim so a recruiter can verify it.
- If the report covers other people, say so and remind the user to get their teammates' consent before sharing it publicly.
- Do not include private repository details (client names, secrets, internal URLs) in output meant for a public portfolio without asking.
