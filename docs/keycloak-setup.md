# Keycloak Setup

The `keycloak/realm.json` file is automatically imported by Keycloak on first startup — no manual realm configuration needed.

After `docker compose up -d`, wait ~30 seconds for Keycloak to start, then:

## 1. Create First Admin User

1. Open KC Admin Console: http://localhost:8080/admin (username: `admin`, password: `admin`)
2. **Switch to the `scoring` realm** (dropdown in the top-left)
3. Go to **Users** > **Add user**
4. Fill in: Username, Email, set **Email verified: ON** → Save
5. **Credentials** tab > **Set password** (Temporary: ON — user sets permanent password on first login)
6. **Role mapping** tab > **Assign roles** > select `admin` → Assign

The user can now log in at http://localhost:3000.

## 2. Client Secret (Production only)

For development, the client secret is pre-set to `REPLACE_ME` in `keycloak/realm.json` and `.env.example`. This works out of the box.

For production, regenerate a strong secret:
1. KC Admin Console > realm `scoring` > **Clients** > `scoring-app`
2. **Credentials** tab > **Regenerate**
3. Copy the new secret into your `.env` as `KEYCLOAK_CLIENT_SECRET`

## 3. User Management (Optional)

The `/admin/users` page requires the `scoring-app` service account to have permission to manage users in Keycloak.

1. KC Admin Console > realm `scoring` > **Clients** > `scoring-app`
2. **Service account roles** tab > **Assign roles**
3. Filter: **Filter by clients** > select `realm-management`
4. Assign: `manage-users`, `view-users`, `manage-realm`

Also create an Organization so users can be grouped:
1. Go to **Organizations** > **Create organization**
2. Name: your club name, Domain: your email domain → Save

> **Organizations not visible?** Ensure `KC_FEATURES: organization` (singular) is in docker-compose.yml, then restart Keycloak. Also check: realm `scoring` > Realm settings > General tab > Organizations toggle: ON.

## 4. SMTP for Email Invitations (Optional)

See [docs/smtp-setup.md](smtp-setup.md). Without SMTP, users are created in Keycloak but no invite email is sent — set their password manually via KC Admin Console > Users > Credentials.
