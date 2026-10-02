# PlayLoop
<img width="2556" height="1349" alt="image" src="https://github.com/user-attachments/assets/266e5020-668a-4791-869c-9f692de8419b" />
<img width="2560" height="1351" alt="image" src="https://github.com/user-attachments/assets/67b59040-ef05-4354-8d1b-e435b05d00df" />
<img width="2560" height="1351" alt="image" src="https://github.com/user-attachments/assets/30b4b0f2-8ff5-4dcf-8496-f33633b8d578" />
<img width="2560" height="1351" alt="image" src="https://github.com/user-attachments/assets/8d075adf-b6fa-4724-ad47-613cbdc7bbb3" />
<img width="2560" height="1351" alt="image" src="https://github.com/user-attachments/assets/773244b3-cf6c-461f-9f80-2a0d07a2c071" />







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

## Créditos

Logos, fundos e desenhos de controle dos consoles: tema **"carbon"** para EmulationStation, de **Rookervik** (baseado no tema "simple" de Nils Bonenberger) — [fabricecaruso/es-theme-carbon](https://github.com/fabricecaruso/es-theme-carbon), licença **CC BY-NC-SA** (uso não comercial). Capas de jogos: libretro-thumbnails, SteamGridDB, GameTDB, Steam e wikis. Lista completa em [CREDITS.md](CREDITS.md) e no app em Configuração → Sobre e créditos.
