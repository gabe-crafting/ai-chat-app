# Supabase → Google Cloud Storage backups

Daily logical backups run via [`.github/workflows/supabase-backup.yml`](../.github/workflows/supabase-backup.yml).

Each run uploads:

- `postgres.dump` — full database (`pg_dump` custom format)
- `storage-schema.sql` — `storage` schema only (bucket/object metadata, not file bytes)

## One-time setup

### 1. GCS bucket

Create a bucket (e.g. `your-project-supabase-backups`) in Google Cloud.

Optional lifecycle rule (Console → bucket → Lifecycle): delete objects under `supabase-backups/` older than 30 days.

### 2. Service account

1. IAM → Service accounts → Create.
2. Grant **Storage Object Creator** on the bucket (or `roles/storage.objectAdmin` if you want the workflow to prune old objects later).
3. Keys → Add key → JSON. Store the file securely; you will paste it into GitHub once.

### 3. GitHub repository secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|--------|
| `SUPABASE_DB_URL` | Postgres connection string from [Supabase Connect](https://supabase.com/dashboard/project/_/database/settings?showConnect=true). Prefer **Direct connection** for `pg_dump`. Format: `postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres` |
| `GCP_SERVICE_ACCOUNT_KEY` | Entire JSON key file contents |
| `GCS_BACKUP_BUCKET` | Bucket name only (no `gs://`), e.g. `my-supabase-backups` |

### 4. Enable the workflow

Push this repo to GitHub. The schedule runs daily at **02:00 UTC**. Use **Actions → Supabase backup to GCS → Run workflow** to test immediately.

## Restore (outline)

Download from GCS, then against a **new** empty Postgres (local or Supabase project):

```bash
pg_restore -d "$TARGET_DB_URL" --no-owner --no-acl postgres.dump
psql "$TARGET_DB_URL" -f storage-schema.sql
```

Storage **files** are not in these dumps; sync buckets separately if needed.

## Local test (optional)

With `pg_dump` installed and `SUPABASE_DB_URL` set:

```bash
export SUPABASE_DB_URL='postgresql://...'
export OUTPUT_DIR=./backup-out
bash scripts/backup-database.sh
```
