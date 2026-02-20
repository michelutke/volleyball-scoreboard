# SMTP Setup for Keycloak (User Invitations)

Without SMTP configured, Keycloak cannot send set-password emails. The app degrades gracefully (user is created and added to the org, but no invite email is sent). Configure SMTP in prod to enable email invitations.

## Hetzner Email (recommended for self-hosted EU deployments)

Hetzner provides transactional email via [Hetzner Mail](https://www.hetzner.com/mail). You can also use any third-party SMTP provider (Brevo, Mailgun, SendGrid, etc.).

### 1. Hetzner Mail credentials

After creating a Hetzner Mail account, note:
- **SMTP host**: `mail.your-server.de` (or as shown in your Hetzner Mail dashboard)
- **Port**: `587` (STARTTLS) or `465` (SSL)
- **Username**: your email address (e.g. `noreply@yourdomain.com`)
- **Password**: your mail account password

### 2. Configure Keycloak realm SMTP

Via Keycloak Admin Console:

1. Open `https://<your-keycloak>/admin` → realm `scoring`
2. **Realm settings** → **Email** tab
3. Fill in:
   - **From**: `noreply@yourdomain.com`
   - **From display name**: `VBC Thun Scoring`
   - **Host**: `mail.your-server.de`
   - **Port**: `587`
   - **Encryption**: `STARTTLS`
   - **Authentication**: enabled
   - **Username**: `noreply@yourdomain.com`
   - **Password**: `<your mail password>`
4. Click **Test connection** to verify, then **Save**

Or via `kcadm.sh`:

```bash
kcadm.sh update realms/scoring -s 'smtpServer.host=mail.your-server.de' \
  -s 'smtpServer.port=587' \
  -s 'smtpServer.from=noreply@yourdomain.com' \
  -s 'smtpServer.fromDisplayName=VBC Thun Scoring' \
  -s 'smtpServer.starttls=true' \
  -s 'smtpServer.auth=true' \
  -s 'smtpServer.user=noreply@yourdomain.com' \
  -s 'smtpServer.password=<your mail password>'
```

### 3. Persist via realm export

After configuring, export the realm so the settings survive container recreation:

```bash
docker exec <keycloak-container> /opt/keycloak/bin/kc.sh export \
  --dir /tmp/export --realm scoring
docker cp <keycloak-container>:/tmp/export/scoring-realm.json keycloak/realm-export.json
```

> **Note:** The exported JSON includes the SMTP password in plaintext. Do not commit it. Add `keycloak/realm-export.json` to `.gitignore` or strip the password before committing.

## Dev environment

No SMTP needed in dev. When SMTP is not configured, the admin UI shows:
> "Nutzer erstellt — kein SMTP konfiguriert, E-Mail nicht gesendet"

The user is created and added to the org. Set their password manually via the Keycloak admin console:
1. `http://localhost:8080/admin` → realm `scoring` → **Users**
2. Find the user → **Credentials** → **Set password**
