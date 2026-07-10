# Legacy deploy scripts — do not use

These are the pre-`~/badoz_prod` deploy flow, kept for reference only.
They pulled `main` **into the dev working tree** and restarted the server
with pm2 — superseded by `infra/deploy.sh`, which deploys into the
dedicated `~/badoz_prod` clone (see CLAUDE.md → Deployment).

- `deploy-pm2.sh` — old manual deploy (was `deploy.sh` at the repo root).
- `auto-pull.sh` — old cron-driven auto-deploy. Replaced by
  `infra/auto-deploy.sh` (the crontab was repointed in July 2026).
