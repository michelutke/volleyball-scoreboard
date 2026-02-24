# SMTP Setup for Keycloak (User Invitations)

Without SMTP, Keycloak cannot send set-password emails. The app degrades gracefully — users are created but no invite email is sent. Configure SMTP in production to enable email invitations.

**Without SMTP (dev):** Set the user's password manually via KC Admin Console > realm `scoring` > Users > Credentials > Set password.

## Configure Keycloak SMTP

In KC Admin Console: realm `scoring` > **Realm settings** > **Email** tab.

| Field | Value |
|---|---|
| From | `noreply@yourdomain.com` |
| Host | Your SMTP host (see providers below) |
| Port | `587` |
| Encryption | `STARTTLS` |
| Authentication | Enabled |
| Username | Your email address |
| Password | Your email password |

Click **Test connection** to verify, then **Save**.

### Common SMTP Providers

| Provider | Host | Port |
|---|---|---|
| Hetzner Mail | `mail.your-server.de` | `587` |
| Porkbun | `smtp.porkbun.com` | `587` |
| Brevo | `smtp-relay.brevo.com` | `587` |
| SendGrid | `smtp.sendgrid.net` | `587` |
| Mailgun | `smtp.mailgun.org` | `587` |

All providers use STARTTLS on port 587 with your email address as username.

## Persist SMTP Config

SMTP settings are stored in the Keycloak database and survive container restarts automatically. No extra steps needed.

If you export the realm (`Action > Partial export`), the exported JSON will contain the SMTP password in plaintext — do not commit it. Add `keycloak/realm-export.json` to `.gitignore` or strip the password field before committing.
