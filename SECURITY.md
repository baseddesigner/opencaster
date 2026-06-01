# Security Policy

## Supported versions

The `main` branch is the only actively supported line while the project is pre-1.0.

## Reporting a vulnerability

Please do **not** open a public issue for vulnerabilities.

Report privately through GitHub Security Advisories if available, or contact the maintainers directly with:

- affected route or file;
- impact;
- reproduction steps;
- whether credentials, user data, or provider keys could be exposed.

## Security boundaries

Farcaster Lite Client is designed to be read-only:

- provider calls are server-side;
- `.env` files and API keys must not be committed;
- no generic provider proxy routes are allowed;
- no app-side write actions, signer custody, wallet actions, or payments are in scope;
- rendered Farcaster content must remain escaped.

If a change weakens one of these boundaries, treat it as security-sensitive and open a design discussion first.
