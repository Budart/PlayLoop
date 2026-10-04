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

// Koru — excluir ROMs e desinstalar jogos de PC
static partial class Central
{
    // ---- excluir jogo ----
    static Dictionary<string, object> Ok(string msg) { return new Dictionary<string, object> { { "ok", true }, { "msg", msg } }; }
    static void Recycle(string p)
    {   // manda para a Lixeira (dá para recuperar)
        if (Directory.Exists(p)) Microsoft.VisualBasic.FileIO.FileSystem.DeleteDirectory(p, Microsoft.VisualBasic.FileIO.UIOption.OnlyErrorDialogs, Microsoft.VisualBasic.FileIO.RecycleOption.SendToRecycleBin);
        else Microsoft.VisualBasic.FileIO.FileSystem.DeleteFile(p, Microsoft.VisualBasic.FileIO.UIOption.OnlyErrorDialogs, Microsoft.VisualBasic.FileIO.RecycleOption.SendToRecycleBin);
    }
    static Dictionary<string, object> DeleteRom(string file)
    {
        var files = new List<string> { file };
        string dir = Path.GetDirectoryName(file);
        if (Path.GetExtension(file).Equals(".cue", StringComparison.OrdinalIgnoreCase))   // faixas .bin do .cue
            foreach (Match m in Regex.Matches(File.ReadAllText(file), "FILE\\s+\"([^\"]+)\"")) files.Add(Path.Combine(dir, m.Groups[1].Value));
        foreach (var f in new[] { ".sav", ".srm" }) files.Add(Path.ChangeExtension(file, f));   // saves com o mesmo nome
        int n = 0;
        foreach (var f in files.Distinct()) if (File.Exists(f)) { Recycle(f); n++; }
        // pasta do jogo que ficou vazia (ex.: PS1/PS2/Switch com uma pasta por jogo)
        try { if (Directory.Exists(dir) && !Directory.EnumerateFileSystemEntries(dir).Any()) Directory.Delete(dir); } catch { }
        return Ok(n + " arquivo(s) enviado(s) para a Lixeira.");
    }
    static Dictionary<string, object> UninstallPcGame(string shortcut)
    {
        string ext = Path.GetExtension(shortcut).ToLowerInvariant(), text = "";
        try { if (ext == ".url") text = File.ReadAllText(shortcut); } catch { }
        var steam = Regex.Match(text, @"steam://(?:rungameid|run)/(\d+)");
        if (steam.Success)
        {   // a Steam abre a própria janela de desinstalação
            Process.Start(new ProcessStartInfo("steam://uninstall/" + steam.Groups[1].Value) { UseShellExecute = true });
            return new Dictionary<string, object> { { "ok", true }, { "msg", "A Steam vai abrir a desinstalação. Depois de concluir, o atalho some da lista." }, { "keep", true } };
        }
        string target = ext == ".lnk" ? LnkTarget(shortcut) : ext == ".exe" ? shortcut : "";
        if (target != "")
        {
            string tdir = Path.GetDirectoryName(target).TrimEnd('\\') + "\\";
            foreach (var hive in new[] { Registry.CurrentUser, Registry.LocalMachine })
                foreach (var sub in new[] { @"Software\Microsoft\Windows\CurrentVersion\Uninstall", @"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall" })
                    try
                    {
                        using (var k = hive.OpenSubKey(sub)) if (k != null) foreach (var n in k.GetSubKeyNames())
                            using (var app = k.OpenSubKey(n))
                            {
                                string loc = (app.GetValue("InstallLocation") ?? "").ToString().Trim('"').TrimEnd('\\');
                                string un = (app.GetValue("UninstallString") ?? "").ToString();
                                if (loc.Length > 3 && un != "" && tdir.StartsWith(loc + "\\", StringComparison.OrdinalIgnoreCase))
                                {
                                    Process.Start(new ProcessStartInfo("cmd.exe", "/c \"" + un + "\"") { UseShellExecute = true, WindowStyle = ProcessWindowStyle.Hidden });
                                    return new Dictionary<string, object> { { "ok", true }, { "msg", "Desinstalador de \"" + (app.GetValue("DisplayName") ?? n) + "\" aberto." }, { "keep", true } };
                                }
                            }
                    }
                    catch { }
        }
        return new Dictionary<string, object> { { "ok", false }, { "msg", "Não foi possível desinstalar este jogo automaticamente. Desinstale pelo launcher dele (Epic, EA, Ubisoft...) ou em Configurações do Windows → Aplicativos." } };
    }
}
