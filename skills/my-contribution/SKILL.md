---
name: my-contribution
description: Turn a project into a list of the user's contributions, written as formal CV/portfolio material, and save it automatically as a markdown file. Uses git history when it exists and falls back to scanning the codebase as a solo developer when it does not. Use when the user wants to know who built what, or wants copy-paste CV material from a project.
---

# my-contribution

Detect who contributed what in a project and produce a contribution list a recruiter can scan. Use git history as evidence when it exists. When it does not, fall back to a codebase scan and clearly mark the result as self-declared. Always finish by saving the user's contributions to a markdown file, without asking for permission first.

## Language rules

- These instructions are in English, but everything the user sees is in **formal Indonesian**: every question, every note, the on-screen output, and the saved file.
- The register must suit a CV or professional portfolio. Use standard Indonesian (Bahasa Indonesia baku). No slang, no casual particles, no emoji, and no first-person narration inside CV text.
- Address the user politely ("Anda"). Questions to the user are formal too, for example "Apakah Anda penulis commit ini?".
- Start each CV bullet with an action verb in its base prefixed form, such as "Mengembangkan", "Merancang", "Mengimplementasikan", "Mengoptimalkan", "Memperbaiki", "Mengintegrasikan".
- Keep technical terms, library names, and code identifiers as they are (for example "JWT", "REST API", `src/auth`).
- At the very end of the conversation, offer one line: "Apakah Anda memerlukan versi bahasa Inggris untuk CV?" Produce it only if the user says yes.

## Step 0: Detect the mode

Run these in the project directory:

```bash
git rev-parse --is-inside-work-tree
git rev-list --count HEAD
git shortlog -sne HEAD
```

Pick exactly one mode:

| Situation | Mode |
|---|---|
| Commits from 2 or more distinct people | **A: multi-contributor** |
| 2 or more commits, all from one person | **B: solo, git-verified** |
| Not a git repository, zero commits, or exactly one commit (for example "initial commit" or a squashed history) | **C: solo fallback** |

Never use mode C when other people's commits exist. Do not ask the user which mode to use. Decide from the evidence and continue without a blocking question.

## Modes A and B: use git history

1. Run the CLI (needs Node.js 18+ and git):

   ```bash
   npx -y my-contribution --json
   ```

   Useful options: `--since <date>`, `--until <date>`, `--author <text>`, and `--merge "Name,email1,email2"` (the first entry is the display name).

   If `npx` is unavailable, fall back to `git log --no-merges --numstat` and aggregate per author by hand.

2. If the same person appears more than once (different names or emails), ask the user, for example: "Nama 'Sari' muncul dengan dua email berbeda. Apakah keduanya merupakan orang yang sama?" Then rerun with `--merge`.

3. Work out which contributor is the user:
   - Run `git config user.email`, `git config user.name`, and the platform lookups from "Detecting the platform username" below.
   - Match those values against the contributor list by email first, then by name. Treat the GitHub noreply format `<id>+<username>@users.noreply.github.com` as a match on `<username>`.
   - If exactly one contributor matches, propose it and ask for confirmation: "Saya mendeteksi Anda sebagai <nama> (<email>). Apakah benar?"
   - If nothing matches, or more than one matches, show the contributor list as numbered choices and ask: "Dari daftar berikut, yang manakah Anda?" The user may pick several entries if they are the same person.
   - In mode A, never skip the confirmation, because the local git identity can differ from the identity used in older commits.
   - In mode B, if the local identity matches the only author, continue without asking. If it does not match, ask: "Seluruh commit tercatat atas nama <nama>. Apakah Anda penulisnya?" Do not continue until the user confirms, so the project is never claimed on someone else's behalf.

4. Go beyond the numbers:
   - Read commit messages, and for vague ones check the diff (`git show <hash> --stat`).
   - If the `gh` CLI is available and authenticated, pull merged pull requests per author (`gh pr list --author <login> --state merged`). PRs show impact better than commit counts.
   - Group related commits into one feature (five commits about login become one "Autentikasi" feature).

5. Every contribution gets the status `✓ git-verified` with its commit hashes or PR links as the source.

## Mode C: solo fallback

Use this when there is no usable history. Build a complete feature list from the codebase and attribute it to the user as the sole developer.

1. Before assuming solo, check for signs of other people: `AUTHORS`, `CONTRIBUTORS`, multiple names in `package.json` (`author`, `contributors`), or multiple names in `LICENSE` or `README`. If you find other people, do not assume solo. Ask: "Ditemukan nama lain pada proyek ini. Bagian manakah yang Anda kerjakan?" and limit the list to what the user confirms.

2. Scan the project for evidence of what was built:
   - Structure: routes and endpoints, pages and screens, components, database models, migrations, background jobs, CLI commands
   - Stack: `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`, `composer.json`, and similar manifests
   - Engineering practice: tests, CI configuration, Dockerfile, linting, docs
   - Context: README and any docs folder
   Skip `node_modules`, build output, vendored code, lock files, and generated files.

3. Group what you found into features (for example "Autentikasi", "Pembayaran", "Dasbor Admin"), each with the concrete parts that make it up. Include every feature you can find so the list is complete.

4. Every contribution gets the status `○ self-declared` with the files or folders where you found it as the source.

5. Do not stop to ask for confirmation about the solo assumption. Put the assumption note in the output instead (see below).

## Detecting the platform username

The saved file shows the user's username on their git platform. Determine it in this order and stop at the first reliable result:

1. Read the platform from `git remote get-url origin` (github.com, gitlab.com, or a self-hosted GitLab host).
2. GitHub: if the `gh` CLI is available and authenticated, run `gh api user --jq .login`.
3. GitLab: if the `glab` CLI is available and authenticated, run `glab api user` and read the `username` field.
4. Parse the username from the user's noreply commit email, such as `<id>+<username>@users.noreply.github.com` or the equivalent GitLab address.
5. If none of these works, ask once: "Apa username GitHub atau GitLab Anda?" Use the answer as given. Never guess or invent a username. If the user does not answer, write "Belum diisi" in its place.

Write the username as a link to the profile when the platform is known, for example `GitHub: [@username](https://github.com/username)`.

## Output

Show the result in the conversation and **also save it automatically** as a markdown file (next section). Never ask whether to create the file.

### Mode C only: assumption note

Include one line, in the conversation and in the file:

> Tidak ditemukan riwayat git yang dapat digunakan, sehingga seluruh fitur berikut diasumsikan dikembangkan sendiri oleh Anda. Mohon dikoreksi apabila tidak sesuai.

### Modes A and B: contributor overview (conversation only)

Before the feature list, show a short overview in the conversation: one line per contributor with the active period and main areas, so the user can see who did what. Do not put other people's contributions in the saved file.

### Feature descriptions

For each feature, write a formal feature name and its details:
- One sentence describing what the feature does and the role of the user in it.
- 2 to 5 detail bullets covering concrete parts (endpoints, screens, data models, integrations, tests, deployment), each starting with an action verb.
- The technologies used.
- The outcome only when it is actually known from the history or the code. Never invent one.

## Save the result as a markdown file

After showing the output, write the user's contributions to a markdown file, automatically.

- **Filename and location:** `CONTRIBUTIONS.md` in the project root (the directory the analysis ran in). If that file already exists, do not overwrite it. Use `CONTRIBUTIONS-<YYYY-MM-DD>.md` instead.
- **Whose contributions:** only the user's. In mode A, include only the confirmed contributor.
- **Layout:** the header holds the project title with the username directly below it. The body holds the list of everything that was developed, from feature name down to its details. Use this structure:

  ````markdown
  # <Nama Proyek>

  **Username:** <Platform>: [@username](https://platform.com/username)

  > <assumption note, mode C only>

  ## Daftar Fitur yang Dikembangkan

  ### 1. <Nama Fitur>

  <Satu kalimat formal yang menjelaskan fitur dan peran pengguna.>

  - <Detail 1, diawali kata kerja>
  - <Detail 2>
  - <Detail 3>

  **Teknologi:** <daftar teknologi>

  ### 2. <Nama Fitur>

  ...

  ## Ringkasan untuk CV

  ```
  - <3 to 6 clean bullets, formal, ready to paste into a CV>
  ```

  ## Lampiran: Bukti

  | # | Fitur | Status | Sumber |
  |---|---|---|---|
  | 1 | <Nama Fitur> | ✓ git-verified | `abc1234`, `def5678` |
  | 2 | <Nama Fitur> | ○ self-declared | `src/api/users.js` |
  ````

- The project title comes from the manifest name (`package.json`, `Cargo.toml`, and so on), the README's first heading, the repository name, or the directory name, in that order. Write it as a readable title, not a slug.
- The feature list and the "Ringkasan untuk CV" block contain clean text only: no status labels, no commit hashes, no file paths. Those belong in the appendix table only. The CV summary sits in a fenced code block so the reader gets a copy button.
- Status is `✓ git-verified` when the claim traces to commits or PRs, and `○ self-declared` when it comes only from the codebase scan and the assumed role.
- Keep the file and the on-screen output identical in content, so they never disagree.
- After writing, tell the user the path, for example: "Hasil telah disimpan pada `CONTRIBUTIONS.md`." If the file sits inside a git repository, add one line: "Berkas ini berada di dalam repositori. Mohon periksa isinya sebelum di-commit apabila repositori bersifat publik."
- If the user asks for the English version, save it as `CONTRIBUTIONS.en.md` instead of replacing the first file.

## Rules

- Only claim what the git history or the codebase supports. Never invent metrics, user counts, performance gains, or business outcomes. If impact is unknown, describe the work and leave the impact out, or ask the user to supply it.
- Commit and line counts are weak signals. Never present them as a measure of quality or seniority.
- Keep the evidence (hash, PR link, or file path) in the appendix table so each claim can be verified. This is what helps the user in an interview.
- If the analysis covered other people, remind the user to get their teammates' consent before sharing it publicly.
- Do not put private details (client names, secrets, internal URLs) into output meant for a public portfolio without asking first.