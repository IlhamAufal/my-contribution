#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const VERSION = '0.1.0';

const HELP = `my-contribution v${VERSION}
Turn git history into a per-contributor contribution report.

Usage:
  my-contribution [options]

Options:
  --repo <path>      Repository path (default: current directory)
  --branch <name>    Branch or ref to analyze (default: HEAD)
  --since <date>     Only commits after this date (e.g. 2026-01-01)
  --until <date>     Only commits before this date
  --author <text>    Only contributors whose name or email contains this text
  --merge <a,b,...>  Merge aliases into one person (repeatable).
                     The first entry is the display name. Match by name or email.
  --highlights <n>   Max commit highlights per person (default: 8)
  --json             Output JSON instead of markdown
  --out <file>       Write output to a file instead of stdout
  -v, --version      Show version
  -h, --help         Show this help

Examples:
  my-contribution
  my-contribution --since 2026-01-01 --out CONTRIBUTIONS.md
  my-contribution --merge "Budi,budi@mail.com,budi.s" --json
`;

// Files that say little about a person's real work.
const NOISE = [
  /(^|\/)node_modules\//,
  /(^|\/)(dist|build|out|coverage|vendor|\.next|\.nuxt)\//,
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|Cargo\.lock|Gemfile\.lock|poetry\.lock|composer\.lock|go\.sum)$/,
  /\.min\.(js|css)$/,
  /\.(map|snap|lock)$/,
  /\.(png|jpe?g|gif|svg|ico|webp|pdf|woff2?|ttf|eot|mp4|zip)$/i,
];

const LANGS = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'JavaScript',
  ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java', kt: 'Kotlin',
  swift: 'Swift', php: 'PHP', cs: 'C#', c: 'C', h: 'C', cpp: 'C++', hpp: 'C++',
  dart: 'Dart', vue: 'Vue', svelte: 'Svelte',
  html: 'HTML', css: 'CSS', scss: 'CSS', sass: 'CSS',
  sql: 'SQL', sh: 'Shell', bash: 'Shell',
  md: 'Markdown', yml: 'YAML', yaml: 'YAML', json: 'JSON',
};

const TYPES = new Set([
  'feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'perf',
  'style', 'build', 'ci', 'revert',
]);

function parseArgs(argv) {
  const opts = {
    repo: process.cwd(),
    branch: 'HEAD',
    since: null,
    until: null,
    author: null,
    merge: [],
    highlights: 8,
    json: false,
    out: null,
  };
  const needValue = (i, flag) => {
    if (i + 1 >= argv.length) die(`Missing value for ${flag}`);
    return argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h':
      case '--help':
        process.stdout.write(HELP);
        process.exit(0);
        break;
      case '-v':
      case '--version':
        process.stdout.write(VERSION + '\n');
        process.exit(0);
        break;
      case '--repo': opts.repo = path.resolve(needValue(i++, a)); break;
      case '--branch': opts.branch = needValue(i++, a); break;
      case '--since': opts.since = needValue(i++, a); break;
      case '--until': opts.until = needValue(i++, a); break;
      case '--author': opts.author = needValue(i++, a).toLowerCase(); break;
      case '--merge':
        opts.merge.push(needValue(i++, a).split(',').map((s) => s.trim()).filter(Boolean));
        break;
      case '--highlights': {
        const n = Number(needValue(i++, a));
        if (!Number.isInteger(n) || n < 0) die('--highlights must be a non-negative integer');
        opts.highlights = n;
        break;
      }
      case '--json': opts.json = true; break;
      case '--out': opts.out = needValue(i++, a); break;
      default:
        die(`Unknown option: ${a}\n\n${HELP}`);
    }
  }
  return opts;
}

function die(msg) {
  process.stderr.write(`my-contribution: ${msg}\n`);
  process.exit(1);
}

function git(repo, args) {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      maxBuffer: 512 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const stderr = err.stderr ? String(err.stderr).trim() : err.message;
    die(stderr || 'git failed');
  }
}

function readCommits(opts) {
  const args = [
    'log', '--no-merges', '--numstat',
    '--format=%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s',
  ];
  if (opts.since) args.push(`--since=${opts.since}`);
  if (opts.until) args.push(`--until=${opts.until}`);
  args.push(opts.branch);

  const raw = git(opts.repo, args);
  const commits = [];
  for (const chunk of raw.split('\x1e')) {
    if (!chunk.trim()) continue;
    const nl = chunk.indexOf('\n');
    const header = nl === -1 ? chunk : chunk.slice(0, nl);
    const body = nl === -1 ? '' : chunk.slice(nl + 1);
    const [hash, name, email, date, subject] = header.split('\x1f');
    const files = [];
    for (const line of body.split('\n')) {
      if (!line.trim()) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const add = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
      const del = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
      files.push({ add, del, path: cleanPath(parts.slice(2).join('\t')) });
    }
    commits.push({ hash, name, email: (email || '').toLowerCase(), date, subject: subject || '', files });
  }
  return commits;
}

// Handles rename notations like "src/{a => b}/x.js" and "old.js => new.js".
function cleanPath(p) {
  let out = p;
  if (/\{.*? => .*?\}/.test(out)) {
    out = out.replace(/\{(.*?) => (.*?)\}/, '$2').replace(/\/\//g, '/');
  } else if (out.includes(' => ')) {
    out = out.split(' => ').pop();
  }
  return out;
}

function buildIdentityResolver(groups) {
  // Each merge group: first entry = display name, all entries match name or email.
  const lookup = new Map();
  for (const group of groups) {
    const display = group[0];
    for (const key of group) lookup.set(key.toLowerCase(), display);
  }
  return (name, email) => {
    const byEmail = lookup.get(email);
    if (byEmail) return { key: byEmail.toLowerCase(), display: byEmail };
    const byName = lookup.get((name || '').toLowerCase());
    if (byName) return { key: byName.toLowerCase(), display: byName };
    return { key: email || (name || '').toLowerCase(), display: name || email };
  };
}

function isNoise(file) {
  return NOISE.some((re) => re.test(file));
}

function areaOf(file) {
  const seg = file.split('/');
  if (seg.length === 1) return '(root)';
  if (['src', 'packages', 'apps', 'lib'].includes(seg[0]) && seg.length > 2) {
    return `${seg[0]}/${seg[1]}`;
  }
  return seg[0];
}

function langOf(file) {
  const m = /\.([A-Za-z0-9]+)$/.exec(file);
  return m ? LANGS[m[1].toLowerCase()] || null : null;
}

function commitType(subject) {
  const m = /^(\w+)(\([^)]*\))?!?:/.exec(subject);
  if (m && TYPES.has(m[1].toLowerCase())) return m[1].toLowerCase();
  return 'other';
}

function topN(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function analyze(commits, opts) {
  const resolve = buildIdentityResolver(opts.merge);
  const people = new Map();

  for (const c of commits) {
    const id = resolve(c.name, c.email);
    if (opts.author) {
      const hay = `${id.display} ${c.name} ${c.email}`.toLowerCase();
      if (!hay.includes(opts.author)) continue;
    }
    let p = people.get(id.key);
    if (!p) {
      p = {
        name: id.display,
        emails: new Set(),
        commits: 0,
        added: 0,
        deleted: 0,
        files: new Set(),
        areas: new Map(),
        langs: new Map(),
        types: new Map(),
        first: c.date,
        last: c.date,
        highlights: [],
      };
      people.set(id.key, p);
    }
    p.emails.add(c.email);
    p.commits += 1;
    if (c.date < p.first) p.first = c.date;
    if (c.date > p.last) p.last = c.date;

    const type = commitType(c.subject);
    p.types.set(type, (p.types.get(type) || 0) + 1);
    p.highlights.push({ hash: c.hash.slice(0, 7), date: c.date.slice(0, 10), subject: c.subject, type });

    for (const f of c.files) {
      if (isNoise(f.path)) continue;
      p.added += f.add;
      p.deleted += f.del;
      p.files.add(f.path);
      const area = areaOf(f.path);
      p.areas.set(area, (p.areas.get(area) || 0) + f.add + f.del);
      const lang = langOf(f.path);
      if (lang) p.langs.set(lang, (p.langs.get(lang) || 0) + f.add + f.del);
    }
  }

  const total = [...people.values()].reduce((s, p) => s + p.commits, 0);
  return [...people.values()]
    .sort((a, b) => b.commits - a.commits)
    .map((p) => ({
      name: p.name,
      emails: [...p.emails],
      commits: p.commits,
      share: total ? Math.round((p.commits / total) * 1000) / 10 : 0,
      linesAdded: p.added,
      linesDeleted: p.deleted,
      filesTouched: p.files.size,
      firstCommit: p.first.slice(0, 10),
      lastCommit: p.last.slice(0, 10),
      topAreas: topN(p.areas, 5).map(([name, churn]) => ({ name, churn })),
      languages: topN(p.langs, 5).map(([name, churn]) => ({ name, churn })),
      workTypes: topN(p.types, 12).map(([name, count]) => ({ name, count })),
      highlights: p.highlights
        .sort((a, b) => (a.type === 'feat' ? -1 : 0) - (b.type === 'feat' ? -1 : 0) || b.date.localeCompare(a.date))
        .slice(0, opts.highlights),
    }));
}

function fmt(n) {
  return n.toLocaleString('en-US');
}

function renderMarkdown(report, meta) {
  const lines = [];
  lines.push('# Contribution Report', '');
  lines.push(`- **Repository:** ${meta.repoName}`);
  lines.push(`- **Ref:** ${meta.branch}`);
  const period = [meta.since && `since ${meta.since}`, meta.until && `until ${meta.until}`].filter(Boolean).join(', ');
  lines.push(`- **Period:** ${period || 'all history'}`);
  lines.push(`- **Generated:** ${meta.generated}`, '');

  if (report.length === 0) {
    lines.push('_No commits matched._', '');
    return lines.join('\n');
  }

  lines.push('## Summary', '');
  lines.push('| Contributor | Commits | Share | Lines added | Lines deleted | Files |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const p of report) {
    lines.push(`| ${p.name} | ${fmt(p.commits)} | ${p.share}% | ${fmt(p.linesAdded)} | ${fmt(p.linesDeleted)} | ${fmt(p.filesTouched)} |`);
  }
  lines.push('');

  for (const p of report) {
    lines.push(`## ${p.name}`, '');
    lines.push(`- **Active:** ${p.firstCommit} to ${p.lastCommit}`);
    if (p.topAreas.length) {
      lines.push(`- **Main areas:** ${p.topAreas.map((a) => `\`${a.name}\``).join(', ')}`);
    }
    if (p.languages.length) {
      lines.push(`- **Languages:** ${p.languages.map((l) => l.name).join(', ')}`);
    }
    if (p.workTypes.length) {
      lines.push(`- **Work mix:** ${p.workTypes.map((t) => `${t.name} ${t.count}`).join(', ')}`);
    }
    if (p.highlights.length) {
      lines.push('', '**Highlights**', '');
      for (const h of p.highlights) {
        lines.push(`- ${h.subject} (\`${h.hash}\`, ${h.date})`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(opts.repo)) die(`Path not found: ${opts.repo}`);
  const top = git(opts.repo, ['rev-parse', '--show-toplevel']).trim();

  const commits = readCommits(opts);
  const report = analyze(commits, opts);
  const meta = {
    repoName: path.basename(top),
    branch: opts.branch,
    since: opts.since,
    until: opts.until,
    generated: new Date().toISOString().slice(0, 10),
  };

  const output = opts.json
    ? JSON.stringify({ meta, contributors: report }, null, 2) + '\n'
    : renderMarkdown(report, meta) + '\n';

  if (opts.out) {
    fs.writeFileSync(opts.out, output);
    process.stderr.write(`Wrote ${opts.out}\n`);
  } else {
    process.stdout.write(output);
  }
}

main();
