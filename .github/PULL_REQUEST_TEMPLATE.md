## Pull Request Checklist

- [ ] I have run all local validation scripts before submitting
  ```bash
  node scripts/validate_structure.js
  node scripts/audit_miniprogram_static.js
  node scripts/test_tts_integration_static.js
  node scripts/test_tts_response_parse_static.js
  find miniprogram cloudfunctions scripts -name "*.js" -type f -print0 | xargs -0 -n1 node -c
  ```
- [ ] My code passes all validation checks
- [ ] I have not committed any real API keys, secrets, cloud file IDs, or credentials
- [ ] I have not committed any personal files or test assets
- [ ] My changes are consistent with the project's coding style
- [ ] I have tested my changes on WeChat DevTools (local) or a real device

## Description

<!-- Describe your changes and why they're needed -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code refactor
- [ ] Other (describe)

## Related Issue

<!-- Link any related issue, e.g. "Fixes #12" or "Relates to #15" -->

## Security Reminder

- **Do NOT include** real API keys, `SecretId`, `SecretKey`, `AppSecret`, cloud file IDs (`cloud://...`), or any real credentials in this PR
- **Do NOT include** personal photos or test assets
- All credentials must use environment variables; never hardcode

## Additional Context

<!-- Any other context that reviewers should know -->