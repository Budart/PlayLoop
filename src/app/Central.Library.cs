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

// PlayLoop — descoberta de jogos, categorias e código do jogo nas ROMs
static partial class Central
{
    static readonly Regex TitleId = new Regex(@"\[([0-9A-Fa-f]{16})\]");
    static readonly RegexOptions RI = RegexOptions.IgnoreCase;
    static readonly Tuple<string, Regex>[] Cats = {
        Tuple.Create("Traduzidos",       new Regex(@"\[T[+-]|\(BR\)|\bPT-?BR\b|romsportugues|\(Traduzid|\(T\d", RI)),
        Tuple.Create("Hack / Mod",      new Regex(@"\bhacks?\b|\[h\d*[^\]]*\]|\bmods?\b|\b4K\b|randomizer|\bredux\b|kaizo", RI)),
        Tuple.Create("Homebrew / Port", new Regex(@"\(PD\)|\[PD\]|homebrew|test ?suite|harkinian|\bport\b", RI)),
        Tuple.Create("Beta / Protótipo",new Regex(@"\((Beta|Proto|Prototype|Demo|Sample|Kiosk)[^)]*\)", RI)),
        Tuple.Create("Não licenciado",  new Regex(@"\((Unl|Unlicensed|Pirate)\)|\[p\d|\d+-in-1", RI)),
    };
    static bool IsCustom(Dictionary<string, object> g) { var c = (string)g["cat"]; return c != "" && c != "Traduzidos" && c != PcTools && c != PcOther; }
    const string PcTools = "Ferramentas para jogos", PcOther = "Outros programas";

    // ---- "inteligência" para separar jogos, ferramentas de jogos e outros programas nos atalhos do PC ----
    static readonly Regex ToolWords = new Regex(@"\b(launcher|uninstall\w*|desinstal\w*|setup|config\w*|settings|editor|mod ?manager|mods?\b|vortex|mo2|reshade|dxvk|benchmark|afterburner|rivatuner|rtss|steam|epic games|gog galaxy|ea app|origin|ubisoft connect|uplay|battle\.?net|rockstar games launcher|playnite|launchbox|retroarch|duckstation|pcsx2|rpcs3|dolphin|yuzu|ryujinx|eden|cemu|ppsspp|citra|azahar|xenia|project64|snes9x|ds4windows|x360ce|dsx|controller|joy ?to ?key|server|crash ?report\w*|readme|manual|tool(s|kit)?|patch(er)?|trainer|wemod|cheat ?engine|7th heaven|nexus|overlay|geforce experience|nvidia app|adrenalin|parsec|moonlight|sunshine|obs|discord|twitch|nsp[_ ]?installer|tico)\b", RegexOptions.IgnoreCase);
    static readonly Regex GameDirs = new Regex(@"steamapps\\common|\\epic games\\|gog galaxy\\games|\\gog games\\|xboxgames|\\riot games\\|ubisoft game launcher\\games|\\ea games\\|\\games\\|\\jogos\\|rockstar games\\(?!launcher)|\\battle\.net\\(?!battle)", RegexOptions.IgnoreCase);
    static readonly Regex OtherApps = new Regex(@"\b(chrome|firefox|microsoft edge|opera|brave|word|excel|powerpoint|outlook|onenote|office|teams|zoom|skype|slack|whatsapp|telegram|spotify|tidal|deezer|vlc|media player|photoshop|illustrator|premiere|acrobat|adobe|reader|winrar|7-?zip|ccleaner|calculadora|calculator|notepad|bloco de notas|file explorer|explorador de arquivos|onedrive|dropbox|google drive|painel de controle|control panel|qbittorrent|utorrent|anydesk|teamviewer|visual studio|vs ?code|android studio|intellij|pycharm|python|terminal|powershell|prompt de comando|gimp|audacity|handbrake|virtualbox|vmware|docker|postman|figma|notion|evernote|chatgpt|claude|codex|copilot|lm studio)\b", RegexOptions.IgnoreCase);

    static string LnkTarget(string lnk)
    {
        try
        {
            var t = Type.GetTypeFromProgID("WScript.Shell");
            object sh = Activator.CreateInstance(t);
            object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, sh, new object[] { lnk });
            return (string)sc.GetType().InvokeMember("TargetPath", BindingFlags.GetProperty, null, sc, null) ?? "";
        }
        catch { return ""; }
    }
    static string PcCategory(FileInfo f)
    {
        string name = Path.GetFileNameWithoutExtension(f.Name), target = "", ext = f.Extension.ToLowerInvariant();
        if (ext == ".url") { try { target = File.ReadAllText(f.FullName); } catch { } }
        else if (ext == ".lnk") target = LnkTarget(f.FullName);
        else target = f.FullName;
        bool storeGame = Regex.IsMatch(target, @"steam://(rungameid|run)/|com\.epicgames\.launcher://apps|goggalaxy://|uplay://launch|origin2?://game|battlenet://", RegexOptions.IgnoreCase);
        if (ToolWords.IsMatch(name)) return PcTools;
        if (storeGame || GameDirs.IsMatch(target)) return "";
        if (OtherApps.IsMatch(name) || OtherApps.IsMatch(Path.GetFileNameWithoutExtension(target))) return PcOther;
        if (ToolWords.IsMatch(Path.GetFileNameWithoutExtension(target))) return PcTools;
        if (Regex.IsMatch(target, @"\\(windows|system32)\\|\\microsoft office\\|\\common files\\", RegexOptions.IgnoreCase)) return PcOther;
        return "";   // na dúvida, considera jogo
    }
    static string Category(string text)
    {
        foreach (var c in Cats) if (c.Item2.IsMatch(text)) return c.Item1;
        return "";
    }
    static readonly Regex NonBase = new Regex(@"\((Update|DLC|eShop)");

    static List<Dictionary<string, object>> Games(string root, Dictionary<string, object> c)
    {
        var exts = new HashSet<string>(L(c, "extensions").Select(e => "." + e.ToLowerInvariant()));
        var games = new List<Dictionary<string, object>>();
        foreach (var rd in L(c, "romDirs"))
        {
            string dir = Full(root, rd);
            if (!Directory.Exists(dir)) continue;
            List<FileInfo> files;
            try
            {
                files = new DirectoryInfo(dir).EnumerateFiles("*", SearchOption.AllDirectories)
                    .Where(f => exts.Contains(f.Extension.ToLowerInvariant())).ToList();
            }
            catch { continue; }
            var excl = L(c, "excludeDirs").Select(x => Full(root, x).TrimEnd('\\') + "\\").ToList();
            if (excl.Count > 0) files = files.Where(f => !excl.Any(x => f.FullName.StartsWith(x, StringComparison.OrdinalIgnoreCase))).ToList();
            foreach (var grp in files.GroupBy(f => f.DirectoryName))
            {
                var list = grp.ToList();
                if (list.Any(f => f.Extension.Equals(".cue", StringComparison.OrdinalIgnoreCase)))
                    list = list.Where(f => !f.Extension.Equals(".bin", StringComparison.OrdinalIgnoreCase)).ToList();
                if (B(c, "switchBaseOnly"))
                    list = list.Where(f =>
                    {
                        var m = TitleId.Match(f.Name);
                        if (m.Success) return m.Groups[1].Value.EndsWith("000");
                        return !NonBase.IsMatch(f.Name);
                    }).ToList();
                foreach (var f in list)
                {
                    string name = Path.GetFileNameWithoutExtension(f.Name);
                    if (B(c, "nameFromFolder") && list.Count == 1 &&
                        !f.Directory.FullName.TrimEnd('\\').Equals(dir.TrimEnd('\\'), StringComparison.OrdinalIgnoreCase))
                        name = f.Directory.Name;
                    games.Add(new Dictionary<string, object> {
                        { "name", name }, { "path", Rel(root, f.FullName) }, { "size", f.Length }, { "mtime", (long)(f.LastWriteTimeUtc - new DateTime(1970, 1, 1)).TotalMilliseconds },
                        { "cat", IsPc(c) ? PcCategory(f) : Category(f.FullName.Substring(dir.Length)) }
                    });
                }
            }
        }
        return games.OrderBy(g => (string)g["name"], StringComparer.CurrentCultureIgnoreCase).ToList();
    }

    // lê o código do jogo dentro da ROM (para o repositório GameTDB / xlenore)
    static readonly Regex Serial = new Regex(@"(S[CL][UEPKA][SMD])[_-](\d{3})\.?(\d{2})");
    static string GameId(string console, string rom)
    {
        string ext = Path.GetExtension(rom).ToLowerInvariant();
        if (ext == ".cue")
        {
            var m = Regex.Match(File.ReadAllText(rom), "FILE\\s+\"([^\"]+)\"");
            if (m.Success) rom = Path.Combine(Path.GetDirectoryName(rom), m.Groups[1].Value); ext = Path.GetExtension(rom).ToLowerInvariant();
        }
        if (console == "pc")
        {
            if (ext != ".url") return "";
            var m = Regex.Match(File.ReadAllText(rom), @"steam://(?:rungameid|run)/(\d+)");
            return m.Success ? m.Groups[1].Value : "";
        }
        if (!File.Exists(rom) || ext == ".zip" || ext == ".7z" || ext == ".chd" || ext == ".cso") return "";
        Func<long, int, string> read = (off, len) =>
        {
            using (var f = File.OpenRead(rom)) { if (f.Length < off + len) return ""; f.Seek(off, SeekOrigin.Begin); var b = new byte[len]; f.Read(b, 0, len); return Encoding.ASCII.GetString(b).Trim('\0', ' '); }
        };
        Func<string, bool> clean = v => Regex.IsMatch(v, "^[A-Z0-9]+$");
        switch (console)
        {
            case "wii": { var v = read(ext == ".wbfs" ? 0x200 : 0, 6); return clean(v) ? v : ""; }
            case "nds": { var v = read(0x0C, 4); return clean(v) ? v : ""; }
            case "3ds": { var v = read(0x4150, 16); var m = Regex.Match(v, "CTR-[A-Z]-([A-Z0-9]{4})"); return m.Success ? m.Groups[1].Value : ""; }
            case "ps1": case "ps2":
            {
                using (var f = File.OpenRead(rom))
                {
                    var buf = new byte[Math.Min(f.Length, 8 * 1024 * 1024)];
                    int n = f.Read(buf, 0, buf.Length);
                    var m = Serial.Match(Encoding.ASCII.GetString(buf, 0, n));
                    return m.Success ? m.Groups[1].Value + "-" + m.Groups[2].Value + m.Groups[3].Value : "";
                }
            }
        }
        return "";
    }
}
