<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8"/>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Abmelden — Scorely</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap"/>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            min-height: 100vh;
            background: #0a0a0a;
            font-family: 'Montserrat', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            color: #f0f0f0;
        }
        .card {
            background: #141414;
            border: 1px solid #262626;
            border-radius: 1rem;
            padding: 2rem;
            width: 100%;
            max-width: 360px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.5rem;
        }
        .logo { width: 4rem; height: 4rem; }
        .heading { text-align: center; }
        .heading h1 { font-size: 1.25rem; font-weight: 600; }
        .heading p { font-size: 0.875rem; color: #888; margin-top: 0.25rem; }
        form { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
        button[type="submit"] {
            width: 100%;
            background: #0ea5e9;
            color: #fff;
            font-size: 0.9375rem;
            font-weight: 600;
            font-family: inherit;
            padding: 0.625rem 1rem;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: opacity 0.15s;
        }
        button[type="submit"]:hover { opacity: 0.88; }
        .cancel { text-align: center; }
        .cancel a { font-size: 0.8125rem; color: #888; text-decoration: none; }
        .cancel a:hover { color: #aaa; }
    </style>
</head>
<body>
    <div class="card">
        <img class="logo" src="${url.resourcesPath}/img/volleyball.svg" alt="Scorely"/>
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
