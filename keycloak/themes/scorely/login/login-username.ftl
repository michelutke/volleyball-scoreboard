<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Anmelden — Scorely</title>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;600;700;800;900&display=swap"/>
    <link rel="stylesheet" href="${url.resourcesPath}/css/scoreboard.css"/>
    <style>
        .guest-label {
            font-size: 22px; font-weight: 300;
            color: rgba(255,255,255,0.3);
            text-transform: uppercase; letter-spacing: 0.12em;
        }
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
