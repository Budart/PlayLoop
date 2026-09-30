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

[assembly: AssemblyTitle("PlayLoop")]
[assembly: AssemblyProduct("PlayLoop")]
[assembly: AssemblyVersion("1.0.0.0")]

// requisição da página (chega pelo WebView2, sem servidor HTTP/porta)
class Req
{
    public string HttpMethod = "GET";
    public Stream InputStream = new MemoryStream();
    public Uri Url;
    public System.Collections.Specialized.NameValueCollection QueryString = new System.Collections.Specialized.NameValueCollection();
    public Req(string url, string method, byte[] body)
    {
        Url = new Uri(url); HttpMethod = method ?? "GET"; InputStream = new MemoryStream(body ?? new byte[0]);
        foreach (var part in Url.Query.TrimStart('?').Split('&'))
        {
            if (part == "") continue;
            int i = part.IndexOf('=');
            string k = i < 0 ? part : part.Substring(0, i), v = i < 0 ? "" : part.Substring(i + 1);
            QueryString[Uri.UnescapeDataString(k.Replace('+', ' '))] = Uri.UnescapeDataString(v.Replace('+', ' '));
        }
    }
}
class Resp
{
    public int StatusCode = 200;
    public string ContentType = "text/plain";
    public long ContentLength64;
    public Dictionary<string, string> Headers = new Dictionary<string, string>();
    public MemoryStream OutputStream = new MemoryStream();
}
class Ctx { public Req Request; public Resp Response = new Resp(); }

static class Central
{
    const string DefaultRoot = @"D:\1 - EMULADORES";
    const string ConfigName = "central-config.json";
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
    static readonly UTF8Encoding Utf8 = new UTF8Encoding(false);
    static string ExePath = Assembly.GetExecutingAssembly().Location;
    static readonly string CacheDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CentralDeJogos", "covers");
    static string Hash(string s) { using (var h = System.Security.Cryptography.SHA1.Create()) return BitConverter.ToString(h.ComputeHash(Encoding.UTF8.GetBytes(s))).Replace("-", "").ToLowerInvariant(); }
    static readonly object CoverLock = new object();

    static string Resource(string name)
    {
        using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
        using (var r = new StreamReader(s, Encoding.UTF8)) return r.ReadToEnd();
    }

    // configuração: %LOCALAPPDATA%\CentralDeJogos\config.json (ou a antiga, na pasta dos emuladores, se existir)
    static readonly string AppConfig = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CentralDeJogos", "config.json");
    static string LegacyConfig { get { return Path.Combine(DefaultRoot, ConfigName); } }
    static string ConfigFile { get { return File.Exists(AppConfig) ? AppConfig : File.Exists(LegacyConfig) ? LegacyConfig : AppConfig; } }
    static bool NeedsSetup { get { return !File.Exists(AppConfig) && !File.Exists(LegacyConfig); } }

    static Dictionary<string, object> LoadConfig()
    {
        string text = null;
        try { if (File.Exists(ConfigFile)) text = File.ReadAllText(ConfigFile, Encoding.UTF8); } catch { }
        if (text == null) return new Dictionary<string, object> { { "port", 8765 }, { "root", "" }, { "consoles", new object[0] } };
        return (Dictionary<string, object>)Json.DeserializeObject(text);
    }
    static void SaveConfigText(string text) { Directory.CreateDirectory(Path.GetDirectoryName(ConfigFile)); File.WriteAllText(ConfigFile, text, Utf8); }

    static string Root(Dictionary<string, object> cfg)
    {
        object r; if (cfg.TryGetValue("root", out r) && r is string && Directory.Exists((string)r)) return (string)r;
        return Path.GetDirectoryName(ExePath);
    }

    static bool IsPc(Dictionary<string, object> c) { return S(c, "type") == "pc"; }
    static string Rel(string root, string full)
    {
        string r = root.TrimEnd('\\') + "\\";
        return full.StartsWith(r, StringComparison.OrdinalIgnoreCase) ? full.Substring(r.Length) : full;
    }
    static string S(Dictionary<string, object> d, string k) { object v; return d.TryGetValue(k, out v) && v != null ? v.ToString() : ""; }
    static bool B(Dictionary<string, object> d, string k) { object v; return d.TryGetValue(k, out v) && v is bool && (bool)v; }
    static List<string> L(Dictionary<string, object> d, string k)
    {
        object v; var res = new List<string>();
        if (d.TryGetValue(k, out v) && v is IEnumerable && !(v is string)) foreach (var x in (IEnumerable)v) res.Add(x.ToString());
        return res;
    }
    static string Full(string root, string rel)
    {
        if (string.IsNullOrEmpty(rel)) return "";
        return Path.GetFullPath(Path.Combine(root, rel.Replace('/', '\\')));
    }
    static IEnumerable<Dictionary<string, object>> Consoles(Dictionary<string, object> cfg)
    {
        foreach (var o in (IEnumerable)cfg["consoles"]) yield return (Dictionary<string, object>)o;
    }

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

    static void Send(Ctx ctx, int code, string type, byte[] body)
    {
        var r = ctx.Response;
        r.StatusCode = code; r.ContentType = type;
        r.Headers["Cache-Control"] = "no-store";
        r.ContentLength64 = body.Length;
        r.OutputStream.Write(body, 0, body.Length); r.OutputStream.Close();
    }
    static void SendJson(Ctx ctx, object o, int code = 200)
    {
        Send(ctx, code, "application/json; charset=utf-8", Utf8.GetBytes(Json.Serialize(o)));
    }
    static Dictionary<string, object> Err(string m) { return new Dictionary<string, object> { { "error", m } }; }

    static void Handle(Ctx ctx)
    {
        try
        {
            var req = ctx.Request;
            string path = req.Url.AbsolutePath;
            var cfg = LoadConfig();
            string root = Root(cfg);

            if (path == "/" || path == "/index.html" || path == "/config" || path == "/welcome")
                Send(ctx, 200, "text/html; charset=utf-8", Utf8.GetBytes(Resource("web/index.html")));
            else if ((path.StartsWith("/css/") || path.StartsWith("/js/")) && !path.Contains(".."))
            {
                using (var st = Assembly.GetExecutingAssembly().GetManifestResourceStream("web" + path))
                {
                    if (st == null) { Send(ctx, 404, "text/plain", new byte[0]); return; }
                    var ms = new MemoryStream(); st.CopyTo(ms);
                    Send(ctx, 200, path.EndsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8", ms.ToArray());
                }
            }
            else if (path == "/sym.png")
            {
                using (var st = Assembly.GetExecutingAssembly().GetManifestResourceStream("sym.png")) { var ms = new MemoryStream(); st.CopyTo(ms); Send(ctx, 200, "image/png", ms.ToArray()); }
            }
            else if (path == "/logo.png")
            {
                using (var st = Assembly.GetExecutingAssembly().GetManifestResourceStream("logo.png")) { var ms = new MemoryStream(); st.CopyTo(ms); Send(ctx, 200, "image/png", ms.ToArray()); }
            }
            else if (path == "/api/consoles")
            {
                var outp = new List<object>();
                foreach (var c in Consoles(cfg))
                {
                    string emu = Full(root, S(c, "emulator"));
                    var gl = Games(root, c);
                    outp.Add(new Dictionary<string, object> {
                        { "id", S(c, "id") }, { "name", S(c, "name") }, { "art", S(c, "art") }, { "thumbs", S(c, "thumbs") },
                        { "emulatorOk", IsPc(c) || (emu != "" && File.Exists(emu)) }, { "type", S(c, "type") }, { "logo", S(c, "logo") }, { "bg", S(c, "bg") }, { "enabled", !(c.ContainsKey("enabled") && c["enabled"] is bool && !(bool)c["enabled"]) }, { "count", gl.Count(g => !IsCustom(g)) }, { "customCount", gl.Count(g => IsCustom(g)) } });
                }
                SendJson(ctx, outp);
            }
            else if (path == "/api/games")
            {
                var c = Consoles(cfg).FirstOrDefault(x => S(x, "id") == req.QueryString["c"]);
                if (c == null) SendJson(ctx, Err("Console não encontrado"), 404);
                else SendJson(ctx, Games(root, c));
            }
            else if (path == "/api/config" && req.HttpMethod == "GET")
            {
                string text = File.Exists(ConfigFile) ? File.ReadAllText(ConfigFile, Encoding.UTF8) : Resource("config.json");
                Send(ctx, 200, "application/json; charset=utf-8", Utf8.GetBytes(text));
            }
            else if (path == "/api/config" && req.HttpMethod == "POST")
            {
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                var parsed = (Dictionary<string, object>)Json.DeserializeObject(bodyText);   // valida
                if (!parsed.ContainsKey("consoles")) throw new Exception("Configuração inválida");
                SaveConfigText(bodyText);
                ApplyAutostart(parsed);
                SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
            }
            else if (path == "/api/browse" && req.HttpMethod == "POST")
            {
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                var body = (Dictionary<string, object>)Json.DeserializeObject(bodyText);
                string start = Full(root, S(body, "start"));
                bool isImg = S(body, "type") == "image";
                bool abs = S(body, "type") == "folderabs";
                string picked = Browse(S(body, "type") == "folder" || abs, start, isImg);
                if (isImg || abs) { SendJson(ctx, new Dictionary<string, object> { { "path", picked ?? "" } }); return; }
                string rel = picked;
                if (picked != null && picked.StartsWith(root.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase))
                    rel = picked.Substring(root.TrimEnd('\\').Length + 1).Replace('\\', '/');
                SendJson(ctx, new Dictionary<string, object> { { "path", rel ?? "" }, { "exists", true } });
            }
            else if (path == "/api/exists")
            {
                string p = Full(root, req.QueryString["p"] ?? "");
                SendJson(ctx, new Dictionary<string, object> { { "file", p != "" && File.Exists(p) }, { "dir", p != "" && Directory.Exists(p) } });
            }
            else if (path == "/api/gameid")
            {
                var c = Consoles(cfg).FirstOrDefault(x => S(x, "id") == req.QueryString["c"]);
                string rom = Full(root, req.QueryString["p"] ?? "");
                string id = "";
                if (c != null && File.Exists(rom)) try { id = GameId(IsPc(c) ? "pc" : S(c, "id"), rom); } catch { }
                SendJson(ctx, new Dictionary<string, object> { { "id", id } });
            }
            else if (path == "/api/steam")
            {
                // busca na loja da Steam (feita pelo servidor, porque a Steam não libera acesso direto do navegador)
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                using (var wc = new WebClient { Encoding = Encoding.UTF8 })
                {
                    wc.Headers[HttpRequestHeader.UserAgent] = "Mozilla/5.0";
                    string q = Uri.EscapeDataString(req.QueryString["q"] ?? "");
                    string txt = wc.DownloadString("https://store.steampowered.com/api/storesearch/?term=" + q + "&l=english&cc=US");
                    Send(ctx, 200, "application/json; charset=utf-8", Utf8.GetBytes(txt));
                }
            }
            else if (path == "/api/order" && req.HttpMethod == "POST")
            {
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                var ids = ((IEnumerable)((Dictionary<string, object>)Json.DeserializeObject(bodyText))["ids"]).Cast<object>().Select(x => x.ToString()).ToList();
                var list = Consoles(cfg).ToList();
                var ordered = list.OrderBy(c => { int i = ids.IndexOf(S(c, "id")); return i < 0 ? 9999 : i; }).ToList();
                cfg["consoles"] = ordered.ToArray();
                SaveConfigText(Json.Serialize(cfg));
                SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
            }
            else if (path == "/api/proxy")
            {
                // busca em wikis que não liberam acesso direto do navegador (Fandom, PCGamingWiki, StrategyWiki...)
                string u = req.QueryString["u"] ?? "";
                if (!Regex.IsMatch(u, @"^https://([a-z0-9-]+\.fandom\.com|www\.pcgamingwiki\.com|strategywiki\.org|[a-z]{2,3}\.wikipedia\.org)/", RegexOptions.IgnoreCase))
                { Send(ctx, 400, "text/plain", new byte[0]); return; }
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                using (var wc = new WebClient { Encoding = Encoding.UTF8 })
                {
                    wc.Headers[HttpRequestHeader.UserAgent] = "CentralDeJogos/1.0";
                    try { Send(ctx, 200, "application/json; charset=utf-8", Utf8.GetBytes(wc.DownloadString(u))); }
                    catch { Send(ctx, 404, "application/json", Utf8.GetBytes("{}")); }
                }
            }
            else if (path == "/api/reveal" && req.HttpMethod == "POST")
            {
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                string p = Full(root, S((Dictionary<string, object>)Json.DeserializeObject(bodyText), "path"));
                if (File.Exists(p)) Process.Start("explorer.exe", "/select,\"" + p + "\"");
                else if (Directory.Exists(p)) Process.Start("explorer.exe", "\"" + p + "\"");
                else { SendJson(ctx, Err("Arquivo não encontrado"), 404); return; }
                SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
            }
            else if (path == "/api/ytsearch")
            {
                string q = (req.QueryString["q"] ?? "").Trim();
                SendJson(ctx, YouTube(q));
            }
            else if (path == "/api/fsarg")
                SendJson(ctx, new Dictionary<string, object> { { "arg", FullscreenArg(Full(root, req.QueryString["emu"] ?? "")) } });
            else if (path == "/api/open" && req.HttpMethod == "POST")
            {   // abre um link no navegador padrão (só https)
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                string u = S((Dictionary<string, object>)Json.DeserializeObject(bodyText), "url");
                if (Regex.IsMatch(u, "^https?://")) Process.Start(new ProcessStartInfo(u) { UseShellExecute = true });
                SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
            }
            else if (path == "/api/sgdb")
            {   // SteamGridDB (a chave fica só no servidor local)
                string p = req.QueryString["p"] ?? "", key = S(cfg, "sgdbKey");
                if (!p.StartsWith("/api/v2/") || key == "") { SendJson(ctx, Err("SteamGridDB não configurado"), 400); return; }
                try
                {
                    using (var wc = Browser())
                    {
                        wc.Headers[HttpRequestHeader.Authorization] = "Bearer " + key;
                        Send(ctx, 200, "application/json; charset=utf-8", Utf8.GetBytes(wc.DownloadString("https://www.steamgriddb.com" + p)));
                    }
                }
                catch (WebException we) { var hr = we.Response as HttpWebResponse; SendJson(ctx, Err(hr != null && (int)hr.StatusCode == 401 ? "Chave da API inválida" : we.Message), hr != null ? (int)hr.StatusCode : 502); }
            }
            else if (path == "/api/delete" && req.HttpMethod == "POST")
            {
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                var body = (Dictionary<string, object>)Json.DeserializeObject(bodyText);
                var c = Consoles(cfg).FirstOrDefault(x => S(x, "id") == S(body, "console"));
                string file = Full(root, S(body, "path"));
                if (c == null || !File.Exists(file) || !L(c, "romDirs").Any(rd => file.StartsWith(Full(root, rd).TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase)))
                { SendJson(ctx, Err("Arquivo não encontrado"), 404); return; }
                SendJson(ctx, IsPc(c) ? UninstallPcGame(file) : DeleteRom(file));
            }
            else if (path == "/api/localimg")
            {
                string p = req.QueryString["p"] ?? "";
                string ext = Path.GetExtension(p).ToLowerInvariant();
                var types = new Dictionary<string, string> { { ".png", "image/png" }, { ".jpg", "image/jpeg" }, { ".jpeg", "image/jpeg" }, { ".webp", "image/webp" }, { ".gif", "image/gif" }, { ".bmp", "image/bmp" } };
                if (!types.ContainsKey(ext) || !File.Exists(p)) { Send(ctx, 404, "text/plain", new byte[0]); return; }
                Send(ctx, 200, types[ext], File.ReadAllBytes(p));
            }
            else if (path == "/api/img")
            {
                // cache de capas em disco: baixa uma vez, depois serve direto do computador
                string u = req.QueryString["u"] ?? "";
                if (!Regex.IsMatch(u, "^https?://")) { Send(ctx, 400, "text/plain", new byte[0]); return; }
                string f = Path.Combine(CacheDir, Hash(u));
                byte[] data = null;
                if (File.Exists(f)) data = File.ReadAllBytes(f);
                else
                {
                    try
                    {
                        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                        using (var wc = new WebClient())
                        {
                            wc.Headers[HttpRequestHeader.UserAgent] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
                            wc.Headers[HttpRequestHeader.Accept] = "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5";
                            wc.Headers[HttpRequestHeader.AcceptLanguage] = "pt-BR,pt;q=0.9,en;q=0.8";
                            if (u.Contains("wikia.nocookie.net")) wc.Headers[HttpRequestHeader.Referer] = "https://www.fandom.com/";
                            data = wc.DownloadData(u);
                        }
                        object en; bool on = !(cfg.TryGetValue("coverCache", out en) && en is bool && !(bool)en);
                        if (on && data.Length > 0) { Directory.CreateDirectory(CacheDir); File.WriteAllBytes(f, data); }
                    }
                    catch { Send(ctx, 404, "text/plain", new byte[0]); return; }
                }
                string type = data.Length > 3 && data[0] == 0x89 ? "image/png" : data.Length > 3 && data[0] == 0xFF ? "image/jpeg" : data.Length > 3 && data[0] == (byte)'<' ? "image/svg+xml" : data.Length > 3 && data[0] == (byte)'R' ? "image/webp" : "image/gif";
                ctx.Response.Headers["Cache-Control"] = "max-age=31536000";
                var r = ctx.Response; r.StatusCode = 200; r.ContentType = type; r.ContentLength64 = data.Length; r.OutputStream.Write(data, 0, data.Length); r.OutputStream.Close();
            }
            else if (path == "/api/artcache")
            {
                string f = Path.Combine(CacheDir, "resolved.json");
                if (req.HttpMethod == "POST")
                {
                    string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                    var body = (Dictionary<string, object>)Json.DeserializeObject(bodyText);
                    lock (CoverLock)
                    {
                        Directory.CreateDirectory(CacheDir);
                        var map = File.Exists(f) ? (Dictionary<string, object>)Json.DeserializeObject(File.ReadAllText(f, Encoding.UTF8)) : new Dictionary<string, object>();
                        object v; body.TryGetValue("val", out v);
                        if (v == null) map.Remove(S(body, "key")); else map[S(body, "key")] = v;
                        File.WriteAllText(f, Json.Serialize(map), Utf8);
                    }
                    SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
                }
                else Send(ctx, 200, "application/json; charset=utf-8", Utf8.GetBytes(File.Exists(f) ? File.ReadAllText(f, Encoding.UTF8) : "{}"));
            }
            else if (path == "/api/cache/info")
            {
                object bm; string bgMode = cfg.TryGetValue("bgMode", out bm) && bm is string ? (string)bm : "video";
                long size = 0; int n = 0;
                if (Directory.Exists(CacheDir)) foreach (var fi in new DirectoryInfo(CacheDir).GetFiles()) { size += fi.Length; n++; }
                object en; bool on = !(cfg.TryGetValue("coverCache", out en) && en is bool && !(bool)en);
                SendJson(ctx, new Dictionary<string, object> { { "enabled", on }, { "size", size }, { "files", n }, { "bgMode", bgMode }, { "coverStyle", S(cfg, "coverStyle") }, { "sgdb", S(cfg, "sgdbKey") != "" && cfg.ContainsKey("useSgdb") && cfg["useSgdb"] is bool && (bool)cfg["useSgdb"] }, { "fav", cfg.ContainsKey("fav") ? cfg["fav"] : null }, { "favConsole", !(cfg.ContainsKey("favConsole") && cfg["favConsole"] is bool && !(bool)cfg["favConsole"]) } });
            }
            else if (path == "/api/cache/clear" && req.HttpMethod == "POST")
            {
                lock (CoverLock) { if (Directory.Exists(CacheDir)) foreach (var fi in new DirectoryInfo(CacheDir).GetFiles()) try { fi.Delete(); } catch { } }
                SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
            }
            else if (path == "/api/hidden")
            {
                string f = Path.Combine(root, "central-hidden.json");
                if (req.HttpMethod == "POST")
                {
                    string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                    Json.DeserializeObject(bodyText);   // valida
                    lock (CoverLock) File.WriteAllText(f, bodyText, Utf8);
                    SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
                }
                else Send(ctx, 200, "application/json; charset=utf-8", Utf8.GetBytes(File.Exists(f) ? File.ReadAllText(f, Encoding.UTF8) : "[]"));
            }
            else if (path == "/api/setup" && req.HttpMethod == "GET")
                SendJson(ctx, new Dictionary<string, object> { { "needed", NeedsSetup }, { "suggest", Directory.Exists(DefaultRoot) ? DefaultRoot : "" } });
            else if (path == "/api/setup" && req.HttpMethod == "POST")
            {
                // configuração automática a partir das pastas escolhidas no "boas-vindas"
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                var body = (Dictionary<string, object>)Json.DeserializeObject(bodyText);
                var auto = AutoConfig.Build(S(body, "root"), S(body, "pc"));
                foreach (Dictionary<string, object> ac in (object[])auto["consoles"]) { ac["fullscreen"] = true; ac["fsArgs"] = FullscreenArg(Full(S(auto, "root"), S(ac, "emulator"))); }
                if (S(body, "sgdbKey") != "") { auto["sgdbKey"] = S(body, "sgdbKey"); auto["useSgdb"] = true; }
                bool runKey = false;
                try { using (var k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run")) runKey = k.GetValue("PlayLoop") != null; } catch { }
                auto["autostart"] = NeedsSetup ? runKey : !(cfg.ContainsKey("autostart") && cfg["autostart"] is bool && !(bool)cfg["autostart"]);
                SaveConfigText(Json.Serialize(auto));
                ApplyAutostart(auto);
                SendJson(ctx, new Dictionary<string, object> { { "ok", true }, { "consoles", ((object[])auto["consoles"]).Length } });
            }
            else if (path == "/api/covers")
            {
                string f = Path.Combine(root, "central-covers.json");
                Send(ctx, 200, "application/json; charset=utf-8", Utf8.GetBytes(File.Exists(f) ? File.ReadAllText(f, Encoding.UTF8) : "{}"));
            }
            else if (path == "/api/cover" && req.HttpMethod == "POST")
            {
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                var body = (Dictionary<string, object>)Json.DeserializeObject(bodyText);
                string f = Path.Combine(root, "central-covers.json");
                lock (CoverLock)
                {
                    var map = File.Exists(f) ? (Dictionary<string, object>)Json.DeserializeObject(File.ReadAllText(f, Encoding.UTF8)) : new Dictionary<string, object>();
                    string k = S(body, "key"), u = S(body, "url");
                    if (u == "") map.Remove(k); else map[k] = u;
                    File.WriteAllText(f, Json.Serialize(map), Utf8);
                }
                SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
            }
            else if (path == "/api/setemu" && req.HttpMethod == "POST")
            {
                // jogo sem emulador: o usuário escolhe o .exe, já configuramos tudo (caminho, argumentos, tela cheia) e salvamos
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                var body = (Dictionary<string, object>)Json.DeserializeObject(bodyText);
                var c = Consoles(cfg).FirstOrDefault(x => S(x, "id") == S(body, "console"));
                if (c == null) { SendJson(ctx, Err("Console não encontrado"), 404); return; }
                string picked = Browse(false, root);
                if (picked == null) { SendJson(ctx, new Dictionary<string, object> { { "ok", false } }); return; }
                string rel = picked.StartsWith(root.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase) ? picked.Substring(root.TrimEnd('\\').Length + 1).Replace('\\', '/') : picked;
                c["emulator"] = rel;
                if (S(c, "args") == "") c["args"] = "\"{rom}\"";
                c["fsArgs"] = FullscreenArg(picked);
                if (!c.ContainsKey("fullscreen")) c["fullscreen"] = true;
                SaveConfigText(Json.Serialize(cfg));
                SendJson(ctx, new Dictionary<string, object> { { "ok", true }, { "emulator", rel } });
            }
            else if (path == "/api/launch" && req.HttpMethod == "POST")
            {
                string bodyText; using (var sr = new StreamReader(req.InputStream, Encoding.UTF8)) bodyText = sr.ReadToEnd();
                var body = (Dictionary<string, object>)Json.DeserializeObject(bodyText);
                var c = Consoles(cfg).FirstOrDefault(x => S(x, "id") == S(body, "console"));
                if (c == null) { SendJson(ctx, Err("Console não encontrado"), 404); return; }
                string emu = Full(root, S(c, "emulator"));
                if (IsPc(c))
                {
                    string game = Full(root, S(body, "path"));
                    bool ok = L(c, "romDirs").Any(rd => game.StartsWith(Full(root, rd).TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase));
                    if (!ok || !File.Exists(game)) { SendJson(ctx, Err("Atalho inválido"), 400); return; }
                    Process.Start(new ProcessStartInfo(game) { WorkingDirectory = Path.GetDirectoryName(game), UseShellExecute = true });
                    WebHost.FollowForeground();   // jogo de PC (Steam etc.): leva a janela nova para o monitor do PlayLoop
                    SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
                    return;
                }
                if (emu == "" || !File.Exists(emu)) { SendJson(ctx, Err("Nenhum emulador configurado para " + S(c, "name") + "."), 400); return; }
                string rom = Full(root, S(body, "path"));
                bool inside = L(c, "romDirs").Any(rd => rom.StartsWith(Full(root, rd).TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase));
                if (!inside || !File.Exists(rom)) { SendJson(ctx, Err("ROM inválida"), 400); return; }
                string args = S(c, "args"); if (args == "") args = "\"{rom}\"";
                // tela cheia (padrão: ligado) — argumento próprio de cada emulador, editável na configuração
                object fsv; bool fs = !(c.TryGetValue("fullscreen", out fsv) && fsv is bool && !(bool)fsv);
                string fsArgs = c.ContainsKey("fsArgs") ? S(c, "fsArgs") : FullscreenArg(emu);
                if (fs && fsArgs != "") args = fsArgs + " " + args;
                var proc = Process.Start(new ProcessStartInfo(emu, args.Replace("{rom}", rom)) { WorkingDirectory = Path.GetDirectoryName(emu), UseShellExecute = true });
                WebHost.FollowToAppScreen(proc);   // abre no mesmo monitor do PlayLoop
                SendJson(ctx, new Dictionary<string, object> { { "ok", true } });
            }
            else Send(ctx, 404, "text/plain", Utf8.GetBytes("404"));
        }
        catch (Exception ex)
        {
            try { SendJson(ctx, Err(ex.Message), 500); } catch { }
        }
    }

    // abre a janela do PlayLoop (WebView2)
    static void OpenBrowser() { OpenBrowser(""); }
    static void OpenBrowser(string path)
    {
        try { WebHost.Show(path); } catch (Exception ex) { WebHost.ShowMissingRuntime(ex.Message); }
    }

    // janela de "Procurar..." do Windows (precisa de thread STA)
    static string Browse(bool folder, string start, bool image = false)
    {
        string result = null;
        var t = new Thread(() =>
        {
            using (var owner = new Form { TopMost = true, ShowInTaskbar = false, StartPosition = FormStartPosition.CenterScreen, Width = 0, Height = 0, FormBorderStyle = FormBorderStyle.None, Opacity = 0 })
            {
                owner.Show(); owner.Activate();
                if (folder)
                {
                    using (var d = new FolderBrowserDialog { Description = "Escolha a pasta", ShowNewFolderButton = false })
                    {
                        if (Directory.Exists(start)) d.SelectedPath = start;
                        if (d.ShowDialog(owner) == DialogResult.OK) result = d.SelectedPath;
                    }
                }
                else
                {
                    using (var d = (image ? new OpenFileDialog { Title = "Escolha a imagem da capa", Filter = "Imagens (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp)|*.png;*.jpg;*.jpeg;*.webp;*.gif;*.bmp|Todos os arquivos|*.*" } : new OpenFileDialog { Title = "Escolha o emulador", Filter = "Programas (*.exe)|*.exe|Todos os arquivos|*.*" }))
                    {
                        string dir = File.Exists(start) ? Path.GetDirectoryName(start) : start;
                        if (Directory.Exists(dir)) d.InitialDirectory = dir;
                        if (d.ShowDialog(owner) == DialogResult.OK) result = d.FileName;
                    }
                }
            }
        });
        t.SetApartmentState(ApartmentState.STA); t.Start(); t.Join();
        return result;
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

    // abrir junto com o Windows (opção "autostart" da configuração; padrão: ligado)
    static void ApplyAutostart(Dictionary<string, object> cfg)
    {
        object v; bool on = !(cfg.TryGetValue("autostart", out v) && v is bool && !(bool)v);
        try
        {
            using (var k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
            {
                try { k.DeleteValue("CentralDeJogos", false); k.DeleteValue("Jogo", false); k.DeleteValue("Joggo", false); } catch { }
                if (on) k.SetValue("PlayLoop", "\"" + ExePath + "\" silent"); else k.DeleteValue("PlayLoop", false);
            }
        }
        catch { }
    }

    // desinstalação (chamada pelo "Adicionar ou remover programas")
    // pergunta se quer desinstalar e se também apaga os dados (configuração, cache, capas...)
    static bool AskUninstall(string dataDir, out bool wipe)
    {
        wipe = false;
        var f = new Form { Text = "Desinstalar PlayLoop", FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = false, StartPosition = FormStartPosition.CenterScreen,
            ClientSize = new Size(470, 200), BackColor = Color.FromArgb(11, 16, 32), ForeColor = Color.FromArgb(229, 231, 235), Font = new Font("Segoe UI", 10f) };
        try { f.Icon = Icon.ExtractAssociatedIcon(ExePath); } catch { }
        var lbl = new Label { Text = "Desinstalar o PlayLoop deste computador?\n\nSeus emuladores e jogos não serão apagados.", Location = new Point(20, 16), Size = new Size(430, 60) };
        var chk = new CheckBox { Text = "Apagar também as configurações, o cache e as capas/vídeos salvos", Location = new Point(20, 82), Size = new Size(440, 24) };
        var path = new Label { Text = dataDir, Location = new Point(38, 106), Size = new Size(420, 20), ForeColor = Color.FromArgb(148, 163, 184), Font = new Font("Segoe UI", 8.5f) };
        var ok = new Button { Text = "Desinstalar", Location = new Point(250, 148), Size = new Size(100, 32), DialogResult = DialogResult.OK, FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(59, 130, 246), ForeColor = Color.White };
        var no = new Button { Text = "Cancelar", Location = new Point(360, 148), Size = new Size(90, 32), DialogResult = DialogResult.Cancel, FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(30, 41, 59), ForeColor = Color.White };
        ok.FlatAppearance.BorderSize = 0; no.FlatAppearance.BorderSize = 0;
        f.Controls.AddRange(new Control[] { lbl, chk, path, ok, no });
        f.AcceptButton = ok; f.CancelButton = no;
        bool r = f.ShowDialog() == DialogResult.OK;
        wipe = chk.Checked;
        return r;
    }
    static void Uninstall()
    {
        string data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CentralDeJogos");
        Application.EnableVisualStyles();
        bool wipe;
        if (!AskUninstall(data, out wipe)) return;
        foreach (var n in new[] { "PlayLoop", "Joggo", "Jogo" })
            foreach (var p in Process.GetProcessesByName(n)) if (p.Id != Process.GetCurrentProcess().Id) try { p.Kill(); p.WaitForExit(3000); } catch { }
        try { using (var k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true)) { k.DeleteValue("PlayLoop", false); k.DeleteValue("CentralDeJogos", false); } } catch { }
        try { Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\PlayLoop", false); } catch { }
        foreach (var lnk in new[] {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "PlayLoop.lnk"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "PlayLoop.lnk"),
            Path.Combine(Path.GetDirectoryName(ExePath), "Desinstalar PlayLoop.lnk") })
            try { if (File.Exists(lnk)) File.Delete(lnk); } catch { }
        try { var sm = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "PlayLoop"); if (Directory.Exists(sm)) Directory.Delete(sm, true); } catch { }
        string extra = "";
        if (wipe)
        {
            try { if (File.Exists(LegacyConfig)) File.Delete(LegacyConfig); } catch { }
            try { Directory.Delete(data, true); } catch { }
            // o que ficar preso (processos do WebView2 ainda fechando) é apagado logo depois que este programa sai
            if (Directory.Exists(data)) extra = " & rmdir /s /q \"" + data + "\"";
        }
        string dir = Path.GetDirectoryName(ExePath);
        MessageBox.Show(wipe ? "O PlayLoop foi desinstalado e seus dados foram apagados." : "O PlayLoop foi desinstalado.", "PlayLoop");
        Process.Start(new ProcessStartInfo("cmd.exe", "/c timeout /t 2 /nobreak >nul & del /f /q \"" + ExePath + "\" & rmdir \"" + dir + "\"" + extra) { CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden });
    }

    // ---- vídeo de fundo: 1º vídeo do YouTube (não-Shorts, que permita incorporação) para "jogo + console + gameplay" ----
    static string YtFile { get { return Path.Combine(CacheDir, "videos.json"); } }
    static WebClient Browser()
    {
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
        var wc = new WebClient { Encoding = Encoding.UTF8 };
        wc.Headers[HttpRequestHeader.UserAgent] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
        wc.Headers[HttpRequestHeader.AcceptLanguage] = "pt-BR,pt;q=0.9,en;q=0.8";
        wc.Headers[HttpRequestHeader.Cookie] = "CONSENT=YES+1; SOCS=CAI";
        return wc;
    }
    static Dictionary<string, object> YouTube(string q)
    {
        // sem cache: sempre busca na internet (e apaga o arquivo das versões antigas)
        try { if (File.Exists(YtFile)) File.Delete(YtFile); } catch { }
        var log = new List<string>(); var cands = new List<object>();
        var res = new Dictionary<string, object> { { "query", q }, { "id", "" }, { "seconds", 0 }, { "start", 0 }, { "title", "" }, { "candidates", cands }, { "log", log } };
        try
        {
            string html;
            using (var wc = Browser()) html = wc.DownloadString("https://www.youtube.com/results?search_query=" + Uri.EscapeDataString(q) + "&sp=EgIQAQ%253D%253D");   // filtro: só vídeos
            log.Add("página de busca: " + html.Length + " bytes");
            // o YouTube usa dois formatos de resultado ("videoRenderer" antigo e "lockupViewModel" novo): pega os IDs de vídeo na ordem em que aparecem
            var seen = new HashSet<string>(); int examined = 0;
            foreach (Match m in Regex.Matches(html, "\"(?:videoId|contentId)\":\"([\\w-]{11})\""))
            {
                string id = m.Groups[1].Value;
                if (!seen.Add(id)) continue;
                if (++examined > 16 || cands.Count >= 6) break;
                string chunk = html.Substring(m.Index, Math.Min(9000, html.Length - m.Index));
                var tm = Regex.Match(chunk, "\"title\":\\{(?:\"runs\":\\[\\{\"text\"|\"content\"):\"((?:[^\"\\\\]|\\\\.){1,200})\"");
                string title = tm.Success ? Regex.Unescape(tm.Groups[1].Value) : "?";
                if (chunk.IndexOf("/shorts/" + id, StringComparison.Ordinal) >= 0) { log.Add(id + " ignorado: Shorts"); continue; }
                var lm = Regex.Match(chunk, "\"lengthText\":\\{.{0,400}?\"simpleText\":\"([\\d:]+)\"");
                if (!lm.Success) lm = Regex.Match(chunk, "\"text\":\"(\\d{1,2}:\\d{2}(?::\\d{2})?)\"");
                int secs = 0;
                if (lm.Success) foreach (var part in lm.Groups[1].Value.Split(':')) secs = secs * 60 + int.Parse(part);
                if (lm.Success && secs < 90) { log.Add(id + " ignorado: curto (" + secs + " s) — " + title); continue; }
                if (Regex.IsMatch(chunk.Substring(0, Math.Min(3000, chunk.Length)), "\"(?:BADGE_STYLE_TYPE_LIVE_NOW|LIVE)\"")) { log.Add(id + " ignorado: ao vivo"); continue; }
                int start = secs > 0 ? secs / 4 : 60;
                cands.Add(new Dictionary<string, object> { { "id", id }, { "seconds", secs }, { "start", start }, { "title", title } });
                log.Add(id + " ok (" + secs + " s) — " + title);
            }
            if (seen.Count == 0) log.Add("nenhum vídeo encontrado na página (formato do YouTube pode ter mudado)");
        }
        catch (Exception ex) { log.Add("erro na busca: " + ex.Message); }
        if (cands.Count > 0) { var c0 = (Dictionary<string, object>)cands[0]; foreach (var k in new[] { "id", "seconds", "start", "title" }) res[k] = c0[k]; }
        return res;
    }

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


    static void KillOldScriptServer()
    {
        try
        {
            using (var q = new ManagementObjectSearcher("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'powershell.exe' OR Name = 'pwsh.exe' OR Name LIKE '.central-antigo%' OR Name = 'Central de Jogos.exe' OR Name = 'PlayLoop.exe' OR Name = 'Jogo.exe' OR Name = 'Joggo.exe'"))
                foreach (ManagementObject p in q.Get())
                {
                    var cl = (p["CommandLine"] ?? "").ToString();
                    int pid = Convert.ToInt32(p["ProcessId"]);
                    if (pid != Process.GetCurrentProcess().Id && (cl.Contains("CENTRAL_BAT") || cl.Contains(".central-antigo") || cl.Contains("Central de Jogos.exe") || cl.Contains("\\PlayLoop.exe") || cl.Contains("\\Jogo.exe") || cl.Contains("\\Joggo.exe")))
                        try { Process.GetProcessById(Convert.ToInt32(p["ProcessId"])).Kill(); } catch { }
                }
            Thread.Sleep(800);
        }
        catch { }
        foreach (var old in Directory.GetFiles(Path.GetDirectoryName(ExePath), ".central-antigo*.exe")) { try { File.Delete(old); } catch { } }
        try { using (var k = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true)) { } } catch { }
    }

    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr v);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [STAThread]
    static void Main(string[] argv)
    {
        // nitidez em telas com escala (125%/150%, ex.: 1440p): o app desenha em pixels reais em vez de o Windows "esticar" a janela
        try { if (!SetProcessDpiAwarenessContext((IntPtr)(-4))) SetProcessDPIAware(); } catch { try { SetProcessDPIAware(); } catch { } }
        bool silent = argv.Any(a => a.Equals("silent", StringComparison.OrdinalIgnoreCase));

        if (argv.Any(a => a.Equals("--uninstall", StringComparison.OrdinalIgnoreCase))) { Uninstall(); return; }
        try { if (!NeedsSetup) ApplyAutostart(LoadConfig()); } catch { }

        foreach (var old in Directory.GetFiles(Path.GetDirectoryName(ExePath), ".central-antigo*.exe")) { try { File.Delete(old); } catch { } }
        // uma instância só: se já estiver rodando, pede para a outra mostrar a janela e sai
        bool first;
        var mutex = new Mutex(true, @"Local\PlayLoop.Instance", out first);
        var showEvt = new EventWaitHandle(false, EventResetMode.AutoReset, @"Local\PlayLoop.Show");
        if (!first) { if (!silent) showEvt.Set(); return; }
        if (Process.GetProcesses().Any(pr => { try { var n = pr.ProcessName; return pr.Id != Process.GetCurrentProcess().Id && (n == "PlayLoop" || n == "Joggo" || n == "Jogo" || n == "Central de Jogos" || n.StartsWith(".central-antigo")); } catch { return false; } }))
            KillOldScriptServer();          // versão antiga (com servidor local) ainda aberta
        ThreadPool.SetMinThreads(48, 48);   // várias capas/vídeos baixando ao mesmo tempo não travam a interface
        try { WebHost.Prepare(); } catch { }
        WebHost.Handler = Handle;

        Application.EnableVisualStyles();
        var menu = new ContextMenuStrip();
        menu.Items.Add("Abrir o PlayLoop", null, (s, e) => OpenBrowser());
        menu.Items.Add("Editar configuração", null, (s, e) =>
        {
            OpenBrowser("config");
        });
        menu.Items.Add("Abrir pasta dos emuladores", null, (s, e) => { try { Process.Start("explorer.exe", "\"" + Root(LoadConfig()) + "\""); } catch { } });
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Sair", null, (s, e) => Application.Exit());

        var tray = new NotifyIcon
        {
            Icon = Icon.ExtractAssociatedIcon(ExePath),
            Text = "PlayLoop",
            ContextMenuStrip = menu,
            Visible = true
        };
        tray.DoubleClick += (s, e) => OpenBrowser();
        var ui = new Control(); var h = ui.Handle;   // para voltar à thread da interface
        new Thread(() => { while (true) { showEvt.WaitOne(); try { ui.BeginInvoke((Action)(() => OpenBrowser())); } catch { } } }) { IsBackground = true }.Start();
        if (!silent) OpenBrowser();
        Application.Run();
        GC.KeepAlive(mutex);
        tray.Visible = false;
    }
}
