# Contributing to WarmWords

Thank you for your interest in contributing to WarmWords!

## How to Contribute

### Reporting Issues

- Search existing issues first before creating a new one
- For bugs, include your environment (WeChat version, device, OS)
- For feature requests, describe the use case and expected behavior
- Do NOT include any real API keys, secrets, or cloud file IDs in issue descriptions

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write clean, readable code following the existing style
4. Add tests if applicable
5. Run local validation before submitting:

```bash
# All of these must pass before submitting a PR
node scripts/validate_structure.js
node scripts/audit_miniprogram_static.js
node scripts/test_tts_integration_static.js
node scripts/test_tts_response_parse_static.js
find miniprogram cloudfunctions scripts -name "*.js" -type f -print0 | xargs -0 -n1 node -c
```

6. Open a Pull Request with a clear description

### Code Style

- Use 2-space indentation in JavaScript files
- Use `const` / `let` — no `var`
- Always use strict equality (`===`)
- Max line length: 100 characters
- Use descriptive variable names in English

### What NOT to Submit

- **Real API keys, secrets, or tokens** — Even in comments
- **Personal data or images** — Do not include real children's photos
- **Cloud file IDs** (`cloud://...`) — In code or documentation
- **Environment files** — `.env`, `.env.local`, etc.
- **Private config files** — `project.private.config.json`
- **Files larger than 1MB** — GitHub has a hard limit

### Security

- If your PR introduces any credential handling, note it explicitly
- Do not print secrets, keys, or full IDs in console.log
- Use environment variables for all credentials
- After adding a new cloud function call, run `node scripts/audit_miniprogram_static.js`

### Getting Help

Open an issue on GitHub if you have questions about contributing.