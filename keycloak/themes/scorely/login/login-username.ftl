<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Anmelden — Scorely</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800;900&display=swap"/>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            min-height: 100vh;
            background: radial-gradient(ellipse at 20% 0%, #3d0000 0%, #0a0a0a 55%);
            font-family: 'Montserrat', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
            color: #f0f0f0;
        }
        .title {
            font-size: clamp(2.5rem, 10vw, 5rem);
            font-weight: 900;
            color: #fff;
            letter-spacing: 0.1em;
            margin-bottom: 2rem;
            text-align: center;
        }
        .alert {
            width: 100%;
            max-width: 680px;
            font-size: 0.875rem;
            padding: 0.625rem 0.875rem;
            border-radius: 0.5rem;
            text-align: center;
            margin-bottom: 1rem;
        }
        .alert-error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #f87171; }
        .alert-warning { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); color: #fcd34d; }
        .alert-info { background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.25); color: #93c5fd; }
        form {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }
        .scoreboard-wrap { overflow-x: auto; width: 100%; max-width: 680px; }
        .scoreboard { display: flex; flex-direction: column; gap: 3px; min-width: 550px; }
        .row {
            display: grid;
            grid-template-columns: 10px minmax(240px, 1fr) 64px 56px 56px 56px 72px 18px;
            height: 64px;
            border-radius: 0.5rem;
            overflow: hidden;
        }
        .name-cell { display: flex; align-items: center; padding: 0 1rem; }
        .sets-cell {
            background: #111;
            border-left: 2px solid #333;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; font-weight: 700; color: #fff;
        }
        .set-cell {
            background: #141414;
            border-left: 1px solid #333;
            border-bottom: 3px solid transparent;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.9375rem; font-weight: 600;
        }
        .h-win { color: #fff; border-bottom-color: #c0392b; }
        .g-win { color: #fff; border-bottom-color: #4a5568; }
        .lose { color: rgba(255,255,255,0.4); }
        .points-cell {
            display: flex; align-items: center; justify-content: center;
            font-size: 2rem; font-weight: 900; color: #fff;
        }
        .timeout-cell {
            border-left: 1px solid #fff;
            display: flex; flex-direction: column; gap: 3px; padding: 8px 3px;
        }
        .timeout-box { flex: 1; border-radius: 2px; background: rgba(255,255,255,0.3); }
        .timeout-box.used { background: #fff; }

        .home-row .strip { background: #c0392b; }
        .home-row .name-cell { background: linear-gradient(to right, #1e0505, #161616); }
        .home-row .points-cell { background: #c0392b; }
        .home-row .timeout-cell { background: #c0392b; }

        .guest-row .strip { background: #4a5568; }
        .guest-row .name-cell { background: #141414; }
        .guest-row .points-cell { background: #4a5568; }
        .guest-row .timeout-cell { background: #4a5568; }

        .name-input {
            background: transparent; border: none;
            color: #fff; font-weight: 300; font-size: 22px;
            font-family: 'Montserrat', sans-serif;
            width: 100%; outline: none;
        }
        .name-input::placeholder { color: rgba(255,255,255,0.4); }
        .guest-label {
            font-size: 22px; font-weight: 300;
            color: rgba(255,255,255,0.3);
            text-transform: uppercase; letter-spacing: 0.12em;
        }
        .actions { margin-top: 1.5rem; width: 100%; max-width: 360px; }
        button[type="submit"] {
            width: 100%;
            background: #0ea5e9; color: #fff;
            font-size: 0.9375rem; font-weight: 600; font-family: inherit;
            padding: 0.75rem 1rem;
            border: none; border-radius: 0.5rem;
            cursor: pointer; transition: opacity 0.15s;
        }
        button[type="submit"]:hover { opacity: 0.88; }
    </style>
</head>
<body>
    <div class="title">SCORELY</div>

    <#if message?has_content>
    <div class="alert alert-${message.type}">${message.summary}</div>
    </#if>

    <form action="${url.loginAction}" method="post">
        <input type="hidden" name="credentialId" value="${(auth.selectedCredential)!''}"/>

        <div class="scoreboard-wrap">
            <div class="scoreboard">
                <div class="row home-row">
                    <div class="strip"></div>
                    <div class="name-cell">
                        <input class="name-input" type="text" id="username" name="username"
                               value="${(login.username)!''}"
                               placeholder="E-Mail"
                               autocomplete="email"
                               autofocus/>
                    </div>
                    <div class="sets-cell">2</div>
                    <div class="set-cell h-win">25</div>
                    <div class="set-cell lose">18</div>
                    <div class="set-cell h-win">15</div>
                    <div class="points-cell">15</div>
                    <div class="timeout-cell">
                        <div class="timeout-box used"></div>
                        <div class="timeout-box"></div>
                    </div>
                </div>

                <div class="row guest-row">
                    <div class="strip"></div>
                    <div class="name-cell">
                        <span class="guest-label">Gast</span>
                    </div>
                    <div class="sets-cell">1</div>
                    <div class="set-cell lose">18</div>
                    <div class="set-cell g-win">25</div>
                    <div class="set-cell lose">10</div>
                    <div class="points-cell">10</div>
                    <div class="timeout-cell">
                        <div class="timeout-box"></div>
                        <div class="timeout-box"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="actions">
            <button type="submit">Weiter</button>
        </div>
    </form>
</body>
</html>
