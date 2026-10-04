@echo off
chcp 65001 >nul
rem Envia o código e as versões (tags) para o GitHub. O GitHub cria a Release com o instalador sozinho.
cd /d "%~dp0"
echo Enviando para o GitHub...
git push origin main
if not errorlevel 1 goto tags
echo.
echo O envio normal foi recusado: o historico do GitHub esta diferente do local.
set /p R=Substituir o historico do GitHub pelo local? (s/n) 
if /i not "%R%"=="s" goto fim
git push --force-with-lease origin main
:tags
git push origin --tags
echo.
echo Pronto. As Releases aparecem em https://github.com/Budart/PlayLoop/releases em 1 a 2 minutos.
:fim
pause
