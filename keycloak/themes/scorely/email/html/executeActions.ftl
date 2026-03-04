<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body { margin: 0; padding: 0; background: #0a0f1a; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 480px; margin: 40px auto; background: #131929; border-radius: 12px; overflow: hidden; }
    .header { background: #0a0f1a; padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #1e2d47; }
    .logo { font-size: 28px; font-weight: 900; color: #fff; letter-spacing: 4px; }
    .body { padding: 32px 40px; }
    h2 { color: #fff; font-size: 20px; font-weight: 700; margin: 0 0 12px; }
    p { color: #8b9bbf; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    .cta { display: block; background: #2563eb; color: #fff; text-decoration: none; font-weight: 700; font-size: 16px; text-align: center; padding: 14px 24px; border-radius: 8px; margin: 0 0 24px; }
    .footer { padding: 20px 40px; border-top: 1px solid #1e2d47; text-align: center; }
    .footer p { color: #4a5a7a; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">SCORELY</div>
    </div>
    <div class="body">
      <h2>Willkommen bei Scorely!</h2>
      <p>Dein Admin hat dir Zugang zu Scorely eingerichtet. Klicke auf den Button unten, um dein Passwort festzulegen und loszulegen.</p>
      <a href="${link}" class="cta">Passwort festlegen</a>
      <p style="font-size:13px;color:#4a5a7a;">Dieser Link ist ${linkExpirationFormatter(linkExpiration)} gültig. Falls du diese E-Mail nicht erwartet hast, kannst du sie ignorieren.</p>
    </div>
    <div class="footer">
      <p>Scorely — Volleyball Live-Scoring</p>
    </div>
  </div>
</body>
</html>
