<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Abmelden, Scorely</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;520;680;780&display=swap"/>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            min-height: 100vh;
            background: #0a0a0a;
            font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            color: #f5f3ee;
        }
        .card {
            background: #111111;
            border: 1px solid #2a2a2a;
            border-radius: 0;
            padding: 2rem;
            width: 100%;
            max-width: 360px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
        }
        .logo { width: 96px; height: auto; }
        .heading { text-align: center; }
        .heading h1 { font-size: 1.25rem; font-weight: 780; }
        .heading p { font-size: 0.875rem; color: #c8c5bd; margin-top: 0.25rem; }
        form { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
        button[type="submit"] {
            width: 100%;
            background: #ff3d2e;
            color: #f5f3ee;
            font-size: 0.9375rem;
            font-weight: 680;
            font-family: inherit;
            padding: 0.625rem 1rem;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            transition: background-color 0.15s;
        }
        button[type="submit"]:hover { background: #ff6f5e; }
        button[type="submit"]:active { background: #c41f10; }
        .cancel { text-align: center; }
        .cancel a { font-size: 0.8125rem; color: #4f7df0; text-decoration: none; }
        .cancel a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="card">
        <img class="logo" src="${url.resourcesPath}/img/lockup-stacked-on-ink.svg" alt="Scorely"/>
        <div class="heading">
            <h1>Abmelden</h1>
            <p>Möchten Sie sich abmelden?</p>
        </div>
        <form action="${url.logoutConfirmAction}" method="post">
            <input type="hidden" name="session_code" value="${logoutConfirm.code}"/>
            <button type="submit">Abmelden</button>
        </form>
        <div class="cancel">
            <a href="${url.loginUrl}">Abbrechen</a>
        </div>
    </div>
</body>
</html>
