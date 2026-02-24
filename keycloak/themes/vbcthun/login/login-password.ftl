<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Anmelden — Volleyball Scoreboard</title>
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
        .alert {
            width: 100%;
            font-size: 0.875rem;
            padding: 0.625rem 0.875rem;
            border-radius: 0.5rem;
            text-align: center;
        }
        .alert-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        .alert-warning { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); color: #fcd34d; }
        .alert-info { background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.25); color: #93c5fd; }
        .identity {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #1e1e1e;
            border: 1px solid #2e2e2e;
            border-radius: 0.5rem;
            padding: 0.625rem 0.75rem;
            font-size: 0.875rem;
        }
        .identity span { color: #ccc; }
        .identity a { font-size: 0.75rem; color: #888; text-decoration: none; }
        .identity a:hover { color: #aaa; }
        form { width: 100%; display: flex; flex-direction: column; gap: 1rem; }
        .field { display: flex; flex-direction: column; gap: 0.375rem; }
        .field label { font-size: 0.8125rem; font-weight: 500; color: #aaa; }
        input[type="password"] {
            width: 100%;
            background: #1e1e1e;
            border: 1px solid #2e2e2e;
            border-radius: 0.5rem;
            padding: 0.625rem 0.75rem;
            font-size: 0.9375rem;
            font-family: inherit;
            color: #f0f0f0;
            outline: none;
            transition: border-color 0.15s;
        }
        input[type="password"]:focus { border-color: #e85d04; }
        .remember {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #888;
        }
        button[type="submit"] {
            width: 100%;
            background: #e85d04;
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
        .forgot { text-align: center; }
        .forgot a { font-size: 0.8125rem; color: #888; text-decoration: none; }
        .forgot a:hover { color: #aaa; }
    </style>
</head>
<body>
    <div class="card">
        <img class="logo" src="${url.resourcesPath}/img/vbcthun-ball.svg" alt="VBC Thun"/>
        <div class="heading">
            <h1>Volleyball Scoreboard</h1>
            <p>VBC Thun</p>
        </div>

        <#if message?has_content>
        <div class="alert alert-${message.type}">${message.summary}</div>
        </#if>

        <div class="identity">
            <span>${login.username}</span>
            <a href="${url.loginRestartFlowUrl}">Ändern</a>
        </div>

        <form action="${url.loginAction}" method="post">
            <input type="hidden" name="credentialId" value="${(auth.selectedCredential)!''}"/>

            <div class="field">
                <label for="password">Passwort</label>
                <input type="password" id="password" name="password"
                       autocomplete="current-password"
                       autofocus/>
            </div>

            <#if realm.rememberMe>
            <div class="remember">
                <input type="checkbox" id="rememberMe" name="rememberMe"
                       <#if login.rememberMe??>checked</#if>/>
                <label for="rememberMe">Angemeldet bleiben</label>
            </div>
            </#if>

            <button type="submit">Anmelden</button>
        </form>

        <#if realm.resetPasswordAllowed>
        <div class="forgot">
            <a href="${url.loginResetCredentialsUrl}">Passwort vergessen?</a>
        </div>
        </#if>
    </div>
</body>
</html>
