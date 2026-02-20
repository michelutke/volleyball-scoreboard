# Keycloak Setup

Step-by-step guide for configuring Keycloak for the Scoring app.

## 1. Create Realm

1. Open KC Admin Console: http://localhost:8080/admin (default: admin/admin)
2. Click the realm dropdown (top-left) > Create realm
3. Realm name: `scoring`
4. Enabled: ON
5. Save

## 2. Create OIDC Client: scoring-app

1. Go to Clients > Create client
2. Client type: OpenID Connect
3. Client ID: `scoring-app`
4. Next
5. Client authentication: **ON** (confidential)
6. Authorization: OFF
7. Authentication flow: check **Standard flow** only
8. Next
9. Valid redirect URIs:
   - `http://localhost:5173/*` (dev)
   - `http://localhost:3000/*` (production)
   - Add your production domain: `https://your-domain.com/*`
10. Web origins: `+` (allows all origins matching redirect URIs)
11. Save
12. Go to Credentials tab > copy the Client secret for `.env`

## 3. Add Realm Roles Mapper

By default, the ID token does not include `realm_access.roles`. The app decodes the **access token** to extract roles, but you must ensure the roles claim is present.

1. Go to Clients > `scoring-app` > Client scopes tab
2. Click `scoring-app-dedicated` (the dedicated scope)
3. Click "Configure a new mapper" (or "Add mapper" > "By configuration")
4. Select "User Realm Role"
5. Configure:
   - Name: `realm roles`
   - Token Claim Name: `realm_access.roles`
   - Add to access token: **ON**
   - Add to ID token: OFF (not needed)
   - Add to userinfo: OFF
6. Save

## 4. Create Service Account Client: scoring-admin

This client is used by the SaaS provisioning service (scoring-saas) to manage organizations and users programmatically.

1. Go to Clients > Create client
2. Client type: OpenID Connect
3. Client ID: `scoring-admin`
4. Next
5. Client authentication: **ON** (confidential)
6. Authentication flow: uncheck **Standard flow**, uncheck **Direct access grants**
7. Check **Service accounts roles**
8. Save
9. Go to Credentials tab > copy the Client secret
10. Go to Service account roles tab:
    - Click "Assign role"
    - Filter by clients > select `realm-management`
    - Assign these roles:
      - `manage-users`
      - `view-users`
      - `manage-realm`

## 5. Create Realm Roles

1. Go to Realm roles > Create role
2. Role name: `admin`
3. Description: `Full access to scoring app administration`
4. Save

## 6. Create First Admin User

1. Go to Users > Add user
2. Username: your email or preferred username
3. Email: your email
4. Email verified: ON
5. Save
6. Go to Credentials tab > Set password
   - Temporary: ON (user will be prompted to change on first login)
7. Go to Role mapping tab > Assign roles
   - Select `admin`
   - Assign

## 7. Export Realm (Optional)

To create a portable realm configuration for other environments:

1. Go to Realm Settings
2. Click "Action" dropdown (top-right) > Partial export
3. Check: Export groups and roles, Export clients
4. Export

**Note:** The export does not include client secrets. After importing on a new instance, regenerate secrets and update `.env`.

## 8. Create Organization (required for user management)

The user invitation feature (`/admin/users`) requires a Keycloak Organization linked to the app. Skip this section if you only need basic scoring without user management.

1. In KC Admin Console, go to **Organizations** > Create organization
2. Name: anything (e.g. your club name)
3. Domain: your email domain (e.g. `example.com`)
4. Save
5. Copy the Organization ID from the URL: `http://localhost:8080/admin/master/console/#/scoring/organizations/<UUID>`
6. Insert it into the scoring database:

```sql
INSERT INTO settings (org_id, key, value)
VALUES ('default', 'kcOrgId', '<paste-UUID-here>')
ON CONFLICT (org_id, key) DO UPDATE SET value = EXCLUDED.value;
```

Or via psql in Docker:
```bash
docker-compose exec postgres psql -U scoring -d scoring -c \
  "INSERT INTO settings (org_id, key, value) VALUES ('default', 'kcOrgId', '<UUID>') ON CONFLICT (org_id, key) DO UPDATE SET value = EXCLUDED.value;"
```

After this, `/admin/users` will show org members and allow inviting new scorers.

## Organizations Feature

Keycloak's Organizations feature is required for multi-tenancy. It is enabled via the `KC_FEATURES` environment variable in `docker-compose.yml`:

```yaml
KC_FEATURES: organization
```

**Important:** The value is `organization` (singular), not `organizations`. Using the plural form silently does nothing.

After enabling, verify in KC Admin Console: the realm settings should show an "Organizations" tab.
