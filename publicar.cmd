@echo off
chcp 65001 >nul
rem Envia o código e as versões para o GitHub e publica a Release da versão mais recente com o instalador.
rem Precisa do GitHub CLI (uma vez): winget install GitHub.cli   e depois: gh auth login  (dá para entrar com o Google pelo navegador)
cd /d "%~dp0"
echo Enviando o codigo para o GitHub...
git push origin main
if not errorlevel 1 goto tags
echo.
echo O envio normal foi recusado: o historico do GitHub esta diferente do local.
set /p R=Substituir o historico do GitHub pelo local? (s/n) 
if /i not "%R%"=="s" goto fim
git push --force-with-lease origin main
:tags
git push origin --tags
for /f "delims=" %%t in ('git describe --tags --abbrev^=0') do set TAG=%%t
where gh >nul 2>nul
if errorlevel 1 goto semgh
gh release view %TAG% >nul 2>nul
if not errorlevel 1 goto atualiza
echo Criando a Release %TAG%...
gh release create %TAG% "release/PlayLoop - Instalador.exe" --title "PlayLoop %TAG%" --generate-notes
goto ok
:atualiza
echo Atualizando o instalador da Release %TAG%...
gh release upload %TAG% "release/PlayLoop - Instalador.exe" --clobber
goto ok
:semgh
echo.
echo GitHub CLI nao encontrado: o codigo foi enviado, mas a Release precisa do "gh".
echo Instale uma vez com:  winget install GitHub.cli   e entre com:  gh auth login
goto fim
:ok
echo.
echo Pronto: https://github.com/Budart/PlayLoop/releases
:fim
pause
