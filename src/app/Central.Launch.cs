using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Management;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

// Koru — argumentos de tela cheia dos emuladores
static partial class Central
{
    // argumento de tela cheia conhecido de cada emulador
    static string FullscreenArg(string emu)
    {
        string n = Path.GetFileNameWithoutExtension(emu ?? "").ToLowerInvariant();
        if (n == "") return "";
        var map = new[] {
            new[] { "snes9x", "-fullscreen" }, new[] { "duckstation", "-fullscreen" }, new[] { "pcsx2", "-fullscreen" }, new[] { "ppsspp", "--fullscreen" },
            new[] { "dolphin", "--config=Dolphin.Display.Fullscreen=True" }, new[] { "eden", "-f" }, new[] { "yuzu", "-f" }, new[] { "suyu", "-f" }, new[] { "sudachi", "-f" }, new[] { "citron", "-f" },
            new[] { "ryujinx", "--fullscreen" }, new[] { "azahar", "-f" }, new[] { "citra", "-f" }, new[] { "lime3ds", "-f" }, new[] { "mgba", "-f" }, new[] { "melonds", "-f" },
            new[] { "retroarch", "-f" }, new[] { "cemu", "-f" }, new[] { "xemu", "-full-screen" }, new[] { "xenia", "--fullscreen=true" }, new[] { "fusion", "-fullscreen" },
            new[] { "project64", "" }, new[] { "bgb", "" }, new[] { "flycast", "" }, new[] { "rpcs3", "" } };
        foreach (var m in map) if (n.StartsWith(m[0])) return m[1];
        return "";
    }
}
