#!/bin/sh
cd "$(dirname "$0")"
mcs -codepage:utf8 -target:winexe -sdk:4.5 -optimize+ -win32icon:jogo.ico -out:"PlayLoop - Instalador.exe" -r:System.Windows.Forms.dll -r:System.Drawing.dll -r:System.Web.Extensions.dll -resource:PlayLoop.exe,PlayLoop.exe -resource:logo256.png,logo.png Setup.cs
