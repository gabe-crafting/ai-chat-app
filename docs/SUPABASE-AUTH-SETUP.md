# Supabase auth setup (required for invite links)

Invite links **will not work** with Supabase defaults alone. Configure these once in the [Supabase Dashboard](https://supabase.com/dashboard).

## 1. URL configuration

**Authentication → URL Configuration**

| Setting | Value (local dev) |
|---------|-------------------|
| Site URL | `http://localhost:3000` |
| Redirect URLs | Add each line separately: |

```
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
http://localhost:3000/auth/hash-callback
http://localhost:3000/**
```

Use your production domain instead of `localhost:3000` when you deploy.

## 2. Invite email template (critical)

**Authentication → Email Templates → Invite user**

Replace the default `{{ .ConfirmationURL }}` link with:

```html
<h2>You are invited</h2>
<p>Follow this link to accept the invite and set your password:</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">
    Accept invite
  </a>
</p>
```

Why: the default link redirects through Supabase and often lands on `/` with tokens the server never sees, or with a PKCE `code` that cannot be exchanged from email. The `token_hash` link goes directly to `/auth/confirm`, which works with SSR.

**Save the template**, then **send a new invite**. Old emails still use the old link.

## 3. Providers

**Authentication → Providers**

- **Email**: disable public sign-ups (invite-only)
- **Anonymous**: enable (for room guest links, Step 5)

## 4. Test the flow

1. Dashboard → Authentication → Users → **Invite user**
2. Open the **new** email → click **Accept invite**
3. You should land on **Set your password** (`/set-password`), not the homepage

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Lands on homepage, URL has no `?code` or `#access_token` | Update invite email template (step 2) and resend invite |
| URL has `#access_token=...` | App now forwards to `/auth/hash-callback` — restart dev server |
| `/auth/error?reason=misconfigured` | Email template still using default ConfirmationURL |
| `/auth/error?reason=expired` | Request a new invite from the dashboard |
