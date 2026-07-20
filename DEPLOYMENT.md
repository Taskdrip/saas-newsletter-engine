# Deploying listmonk on Railway

This guide walks you through deploying a fully working [listmonk](https://listmonk.app) instance (v6.2.0) on Railway — including the database, email sending, custom domain, and ongoing maintenance.

---

## Table of Contents

1. [What you'll need](#1-what-youll-need)
2. [Create the Railway project](#2-create-the-railway-project)
3. [Add PostgreSQL](#3-add-postgresql)
4. [Deploy listmonk](#4-deploy-listmonk)
5. [Set environment variables](#5-set-environment-variables)
6. [First boot — install the database](#6-first-boot--install-the-database)
7. [Log in to the admin UI](#7-log-in-to-the-admin-ui)
8. [Configure email sending (SMTP)](#8-configure-email-sending-smtp)
9. [Add a custom domain](#9-add-a-custom-domain)
10. [Upgrade listmonk](#10-upgrade-listmonk)
11. [Environment variable reference](#11-environment-variable-reference)
12. [Email service options](#12-email-service-options)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What you'll need

| Requirement | Notes |
|---|---|
| Railway account | [railway.com](https://railway.com) — Hobby plan ($5/mo) is enough |
| GitHub account | To link this repo for auto-deploys |
| SMTP credentials | Any email sending service (see §8 and §12) |

---

## 2. Create the Railway project

1. Go to [railway.com/new](https://railway.com/new)
2. Click **Deploy from GitHub repo**
3. Authorise Railway and select **this repository**
4. Railway will detect the `Dockerfile` and `railway.toml` automatically

> Do **not** click Deploy yet — add the database first.

---

## 3. Add PostgreSQL

Inside your Railway project:

1. Click **+ New** → **Database** → **Add PostgreSQL**
2. Wait for it to spin up (30–60 seconds)
3. Click on the Postgres service → **Variables** tab
4. Copy the `DATABASE_URL` value — you'll use it in the next step

Railway automatically injects `DATABASE_URL` into services in the same project, so you may not need to copy it manually (see §5).

---

## 4. Deploy listmonk

Back on the listmonk service:

1. Click **Settings** → confirm the **Build** source is your repo and branch (`main`)
2. Railway will build the Docker image — the first build takes ~3 minutes

---

## 5. Set environment variables

Go to your listmonk service → **Variables** tab → click **+ New Variable** for each:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | *(from Postgres service)* | Railway may inject this automatically via a "reference variable" |
| `DB_SSLMODE` | `require` | Required for Railway Postgres |
| `LISTMONK_ADMIN_USER` | `admin` (or your choice) | Login username for the web UI |
| `LISTMONK_ADMIN_PASSWORD` | *(strong password)* | **Change this from the default!** |
| `LISTMONK_INSTALL` | `true` | **First deploy only** — creates DB tables |
| `LISTMONK_UPGRADE` | `true` | Leave enabled for automatic migrations |

> **Tip:** Use Railway's "Reference Variables" to inject `DATABASE_URL` directly from the Postgres service without copy-pasting. Click the variable field → `${{ Postgres.DATABASE_URL }}`.

---

## 6. First boot — install the database

With `LISTMONK_INSTALL=true` set:

1. **Deploy** the service (or it may deploy automatically after saving variables)
2. Watch the **Deploy Logs** — you should see:
   ```
   [entrypoint] Running --install to initialise the database …
   [entrypoint] Install complete.
   [entrypoint] Starting listmonk on port XXXX …
   ```
3. Once the health check passes, **go back to Variables** and:
   - Change `LISTMONK_INSTALL` to `false` (or delete it)
   - **Redeploy** — this prevents re-initialising on every restart

> ⚠️ If you leave `LISTMONK_INSTALL=true`, it will attempt to install on every restart (listmonk will warn you but won't wipe data if tables exist).

---

## 7. Log in to the admin UI

1. On your Railway service, click the **generated domain** (e.g. `listmonk-production-xxxx.up.railway.app`)
2. You'll be redirected to `/` — append `/admin` to the URL, or just wait; it redirects automatically
3. Log in with your `LISTMONK_ADMIN_USER` / `LISTMONK_ADMIN_PASSWORD`

**First things to do in the UI:**

- **Settings → General** — set your site name, root URL (your public domain), and logo
- **Settings → Performance** — adjust concurrency and rate limits for your plan

---

## 8. Configure email sending (SMTP)

listmonk sends email via SMTP. Set this up in the admin UI:

1. Go to **Settings → SMTP**
2. Fill in your SMTP provider's details (host, port, username, password)
3. Send a test email to verify it works

**Recommended providers** (see §12 for full comparison):

| Provider | Free tier | Best for |
|---|---|---|
| [Mailgun](https://mailgun.com) | 1,000/mo | Transactional + newsletters |
| [Amazon SES](https://aws.amazon.com/ses/) | 62,000/mo (if on EC2) | High volume, low cost |
| [Postmark](https://postmarkapp.com) | 100/mo | High deliverability |
| [SendGrid](https://sendgrid.com) | 100/day | Easy setup |
| [Brevo](https://brevo.com) | 300/day | Free tier newsletters |
| [Resend](https://resend.com) | 3,000/mo | Developer-friendly |

> **SPF + DKIM**: Every provider will ask you to add DNS records to your domain. Do this before sending real campaigns — it's required for good deliverability.

---

## 9. Add a custom domain

1. In Railway → your listmonk service → **Settings** → **Networking** → **Custom Domain**
2. Enter your domain (e.g. `mail.yourdomain.com`)
3. Railway will show you a `CNAME` record to add in your DNS provider
4. Wait for DNS propagation (usually 5–30 minutes)
5. In listmonk admin → **Settings → General** → set **Root URL** to `https://mail.yourdomain.com`

---

## 10. Upgrade listmonk

When a new listmonk version is released:

1. Update the `FROM` version in `Dockerfile`:
   ```dockerfile
   FROM listmonk/listmonk:v6.3.0   # ← new version
   ```
2. Commit and push — Railway rebuilds automatically
3. The entrypoint runs `--upgrade` automatically on every boot (if `LISTMONK_UPGRADE=true`)

---

## 11. Environment variable reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Full Postgres connection string from Railway |
| `DB_SSLMODE` | ✅ | `require` | SSL mode for DB. Use `disable` only locally |
| `LISTMONK_ADMIN_USER` | ✅ | `listmonk` | Admin login username |
| `LISTMONK_ADMIN_PASSWORD` | ✅ | — | Admin login password (no default — must be set) |
| `LISTMONK_INSTALL` | First boot only | `false` | Set `true` once to create DB schema |
| `LISTMONK_UPGRADE` | — | `true` | Runs DB migrations on boot |
| `PORT` | — | Injected by Railway | Do not set manually on Railway |

---

## 12. Email service options

### Option A — Mailgun (recommended for most)

1. Sign up at [mailgun.com](https://mailgun.com)
2. Add and verify your sending domain (add the DNS records they give you)
3. Go to **Sending** → **Domain settings** → **SMTP credentials**
4. In listmonk SMTP settings:
   - **Host**: `smtp.mailgun.org`
   - **Port**: `587`
   - **Auth**: `PLAIN`
   - **Username**: `postmaster@yourdomain.com`
   - **Password**: your Mailgun SMTP password

### Option B — Amazon SES (cheapest at scale)

1. Verify your domain in the [SES console](https://console.aws.amazon.com/ses/)
2. Create SMTP credentials (**SES** → **SMTP Settings** → **Create credentials**)
3. In listmonk SMTP settings:
   - **Host**: `email-smtp.us-east-1.amazonaws.com` *(your region)*
   - **Port**: `587`
   - **Auth**: `LOGIN`
   - **Username / Password**: the SMTP credentials you created

> SES starts in "sandbox" mode — you can only send to verified addresses. [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html) before real campaigns.

### Option C — Resend (developer-friendly)

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Go to **API Keys** → create a key
4. In listmonk SMTP settings:
   - **Host**: `smtp.resend.com`
   - **Port**: `587`
   - **Auth**: `PLAIN`
   - **Username**: `resend`
   - **Password**: your Resend API key

### Option D — Brevo / Sendinblue (generous free tier)

1. Sign up at [brevo.com](https://brevo.com)
2. Go to **Transactional** → **Settings** → **SMTP & API**
3. In listmonk SMTP settings:
   - **Host**: `smtp-relay.brevo.com`
   - **Port**: `587`
   - **Auth**: `LOGIN`
   - **Username**: your Brevo account email
   - **Password**: the SMTP key from Brevo settings

---

## 13. Troubleshooting

### "LISTMONK_ADMIN_PASSWORD env var is required"
You forgot to set the `LISTMONK_ADMIN_PASSWORD` variable. Add it and redeploy.

### Health check fails / service keeps restarting
- Check **Deploy Logs** for the actual error
- Most common cause: DB connection failed. Verify `DATABASE_URL` is correct and `DB_SSLMODE=require`

### "pq: SSL is not enabled on the server" error
Change `DB_SSLMODE` to `disable` — only if you're running a local Postgres without SSL (e.g. in docker-compose).

### Can't receive emails / bad deliverability
- Verify your domain's SPF, DKIM, and DMARC records with your email provider
- Check [MXToolbox](https://mxtoolbox.com) for DNS record validation

### DB tables already exist error on boot
You left `LISTMONK_INSTALL=true` after the first deploy. Set it to `false` and redeploy.

### Forgot admin password
Run this one-time command via Railway's service shell or a one-off job:
```sh
./listmonk --config /listmonk/config.toml --reset-password
```
Or set a new password directly in the DB:
```sql
UPDATE users SET password = crypt('new_password', gen_salt('bf')) WHERE username = 'admin';
```

---

## Local development

To run listmonk locally with Docker:

```sh
cp .env.sample .env
# Edit .env — set LISTMONK_ADMIN_PASSWORD and verify other values

docker compose up -d
# First run: tables are created automatically (LISTMONK_INSTALL=true in docker-compose.yml)

open http://localhost:9000
```

On subsequent runs, edit `docker-compose.yml` and change `LISTMONK_INSTALL: "true"` → `"false"`.

---

*listmonk documentation: [listmonk.app/docs](https://listmonk.app/docs)*
