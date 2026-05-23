# Open Source Maintainer Notes

This document is for maintainers of the WarmWords open-source project.

## Export Strategy

This repository is a **clean open-source export** of the internal development project. It was created using `rsync` with explicit exclusions, and committed to a fresh git repository — **not** a direct push of the internal project history.

This approach ensures:
- No API keys, secrets, or credentials in git history
- No personal files (photos, backups, test assets)
- No internal-only phase documents in the main commit history
- A clean starting point for community contributions

## Deliberately Excluded Files

The following categories are excluded from this repository:

| Category | Reason |
|----------|--------|
| `.env`, `*.key`, `*.pem`, `*.p12` | Real credentials — never commit |
| `project.private.config.json` | Contains real AppID |
| `backups/` | Internal backup files |
| `test-results/`, `test-assets/` | Personal test data |
| `miniprogram/miniprogram_npm/` | Build artifacts |
| `node_modules/` | Dependencies |
| `OPENCLAW_RUN_REPORT.md` | Internal dev session logs with cloud paths |
| `.git/` | Internal git history |

## Handling Secrets

**If you find any secret in the repo, treat it as compromised and rotate immediately.**

For credential handling:
- All credentials are stored in **WeChat cloud function environment variables** — not in frontend code
- Environment variable names used: `AI_PROVIDER_*`, `TTS_SECRET_ID`, `TTS_SECRET_KEY`, etc.
- The `.env.example` file provides placeholders only
- Never commit `.env` files or files containing real credentials

## How to Create a Release

```bash
# 1. Make sure local repo is clean and up to date
git checkout main
git pull origin main

# 2. Create release notes in docs/RELEASE_NOTES_vX.Y.Z.md

# 3. Tag the release
git tag -a v0.1.0 -m "v0.1.0 — WarmWords Mini Program Initial Open Source Release"
git push origin v0.1.0

# 4. Create GitHub Release
gh release create v0.1.0 \
  --title "v0.1.0 — WarmWords Mini Program Initial Open Source Release" \
  --notes-file docs/RELEASE_NOTES_v0.1.0.md

# Or manually:
# 1. Open https://github.com/conanxin/warmwords-miniprogram/releases
# 2. Draft a new release
# 3. Set tag: v0.1.0, target: main
# 4. Paste contents of docs/RELEASE_NOTES_v0.1.0.md
```

## Internal Development Docs

The `docs/` directory contains both user-facing docs and internal development notes (prefixed `PHASE_*`). These internal notes document the development process but contain references to:
- Cloud resource IDs and file paths
- Internal decision logs
- Session-specific metadata

**These are not actively harmful but may be noisy.** Future releases may:
- Move internal notes to a separate `docs/internal/` directory
- Or remove them entirely, keeping only user-facing documentation

## GitHub Topics

Recommended topics for this repo:
- `wechat-miniprogram`
- `ai`
- `vision-language`
- `tts`
- `language-learning`
- `parent-child-learning`
- `cloud-functions`
- `tencent-cloud`
- `flashcards`

## Pull Request Guidelines

See `CONTRIBUTING.md` for details. Key points:
- Run all validation scripts before submitting
- Do not commit real secrets
- Do not include personal photos or test assets
- Security audit (`scripts/audit_miniprogram_static.js`) must pass

## If You Accidentally Commit a Secret

1. **Revoke the secret immediately** in the provider console
2. Generate a new secret
3. Remove it from git history: `git filter-repo` or GitHub's documented process
4. Do NOT assume `git rm` is sufficient — history persists

See GitHub docs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository