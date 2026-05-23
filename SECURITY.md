# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in WarmWords, please report it privately:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer directly (via GitHub)
3. Describe what you found and how to reproduce it
4. Allow 48 hours for an initial response

## Sensitive Information — Do Not Commit

### Never commit the following to GitHub:

| Type | Examples |
|------|---------|
| API Keys | `sk-...`, `AI_PROVIDER_API_KEY=real_key` |
| Secrets | `TTS_SECRET_KEY`, `SecretId`, `AppSecret` |
| Private keys | `*.pem`, `*.key`, `*.p12`, `*.pfx` |
| Cloud file IDs | `cloud://.../xxx.mp3` (full IDs) |
| Access tokens | `Bearer sk-...`, `Authorization: Bearer ...` |
| Environment files | `.env`, `.env.local`, `.env.production` |
| Config with real values | `project.private.config.json` |

### If you accidentally commit a secret:

1. **Immediately revoke the secret** in your provider's console (CAM, AI provider dashboard, etc.)
2. Generate a new secret immediately
3. Contact GitHub to remove the secret from history — see [GitHub's documentation on removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
4. Do NOT assume git history is safe just because you deleted the file

## Cloud Function Environment Variables

All credentials are stored in **WeChat cloud function environment variables**, not in frontend code.

- `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, `AI_PROVIDER_MODEL` — for recognizeObject
- `TTS_SECRET_ID`, `TTS_SECRET_KEY`, `TTS_REGION`, `TTS_VOICE_TYPE`, `TTS_CODEC`, `TTS_SAMPLE_RATE` — for tts

> **Important:** WeChat cloud functions do NOT support `QCLOUD_`, `SCF_`, or `TENCENTCLOUD_` prefixes. Use the plain names shown above.

## Scope of This Project

WarmWords is a WeChat Mini Program. It does not:
- Collect children's personal information (names, school, ID numbers, etc.)
- Store images long-term on external servers
- Share data with third parties for advertising
- Conduct automated profiling

Images are deleted from WeChat cloud storage shortly after recognition. The AI vision provider processes images as a service and should not retain them beyond the API call.

## Security Testing

If you'd like to conduct a security test, please coordinate with the maintainer first to define scope and avoid disrupting production services.