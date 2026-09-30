# PlayLoop
<img width="2560" height="1440" alt="image" src="https://github.com/user-attachments/assets/03259b81-4fe3-4788-965f-104ac3940b1c" />
<img width="2560" height="1440" alt="image" src="https://github.com/user-attachments/assets/a631d2fd-acc8-49b6-97ed-89fbe5dd89de" />
<img width="2560" height="1440" alt="image" src="https://github.com/user-attachments/assets/10daa086-bf7e-4f50-93a8-36c9d8425999" />




Front-end para Windows que reúne emuladores e jogos (ROMs e jogos de PC) em um só lugar, agrupados por console, com capas 3D/2D, vídeo de gameplay de fundo, suporte a controle, favoritos e modo TV de tubo (CRT).

## Download

Baixe o instalador em **[Releases](../../releases)** e execute `PlayLoop - Instalador.exe`.

Requisitos: Windows 10/11 com o Microsoft Edge WebView2 Runtime (o instalador instala automaticamente se faltar).

## Estrutura

- `src/app` — aplicativo (C# .NET Framework 4.8 + WebView2). A interface fica em `src/app/web` (HTML/CSS/JS em módulos) e é embutida no `.exe`.
- `src/installer` — instalador (WinForms).

## Compilar

Com Mono (`mcs`) ou o compilador C# do .NET Framework:

1. Coloque em `src/app` as DLLs do pacote NuGet [Microsoft.Web.WebView2](https://www.nuget.org/packages/Microsoft.Web.WebView2): `Microsoft.Web.WebView2.Core.dll`, `Microsoft.Web.WebView2.WinForms.dll` e `WebView2Loader.dll` (x64 e x86, renomeadas para `WebView2Loader.x64.dll` / `WebView2Loader.x86.dll`).
2. `sh src/app/build.sh` → gera `PlayLoop.exe`.
3. Copie o `PlayLoop.exe` para `src/installer` e rode `sh src/installer/build.sh` → gera `PlayLoop - Instalador.exe`.

## Dados do usuário

Configurações, cache de capas e dados do WebView2 ficam em `%LOCALAPPDATA%\CentralDeJogos`. O desinstalador oferece apagar essa pasta.
