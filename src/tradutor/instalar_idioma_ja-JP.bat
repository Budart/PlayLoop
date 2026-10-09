@echo off
chcp 65001 >nul
title Instalando idioma ja-JP - Tradutor de Tela
net session >nul 2>&1
if errorlevel 1 (
  echo Este instalador precisa ser executado como Administrador.
  echo Clique com o botao direito no arquivo e escolha "Executar como administrador".
  pause
  exit /b 1
)
echo ============================================================
echo  Instalando reconhecimento de texto (OCR) para: ja-JP
echo  Isso baixa o pacote do Windows Update e pode levar minutos.
echo ============================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; try { Add-WindowsCapability -Online -Name 'Language.OCR~~~ja-JP~0.0.1.0' | Out-Null; $c = Get-WindowsCapability -Online -Name 'Language.OCR~~~ja-JP~0.0.1.0'; Write-Host ('Estado: ' + $c.State) -ForegroundColor Green } catch { Write-Host ('ERRO: ' + $_.Exception.Message) -ForegroundColor Red; exit 1 }"
echo.
if errorlevel 1 (
  echo Falhou. Alternativa: Configuracoes ^> Hora e idioma ^> Idioma e regiao ^> Adicionar idioma.
) else (
  echo Concluido! Volte ao Tradutor e clique em "Verificar novamente".
)
echo.
pause
