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

// PlayLoop — leitura, gravação e normalização da configuração
static partial class Central
{
    static string Resource(string name)
    {
        using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
        using (var r = new StreamReader(s, Encoding.UTF8)) return r.ReadToEnd();
    }

    // configuração: %LOCALAPPDATA%\CentralDeJogos\config.json
    static readonly string AppConfig = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CentralDeJogos", "config.json");
    static string ConfigFile { get { return AppConfig; } }
    static bool NeedsSetup { get { return !File.Exists(AppConfig); } }

    static Dictionary<string, object> LoadConfig()
    {
        string text = null;
        try { if (File.Exists(ConfigFile)) text = File.ReadAllText(ConfigFile, Encoding.UTF8); } catch { }
        if (text == null) return new Dictionary<string, object> { { "port", 8765 }, { "root", "" }, { "consoles", new object[0] } };
        var cfg = (Dictionary<string, object>)Json.DeserializeObject(text);
        FixRomExtensions(cfg);
        return cfg;
    }
    // versões anteriores tiravam .zip/.7z de alguns consoles (as ROMs sumiam e o console saía da tela inicial): devolve na lista
    static void FixRomExtensions(Dictionary<string, object> cfg)
    {
        try
        {
            object cs; if (!cfg.TryGetValue("consoles", out cs) || !(cs is object[])) return;
            foreach (var o in (object[])cs)
            {
                var c = o as Dictionary<string, object>; if (c == null) continue;
                string id = S(c, "id"); if (id != "snes" && id != "sms" && id != "genesis") continue;
                var ext = L(c, "extensions").Select(x => x.ToLowerInvariant()).ToList();
                if (ext.Contains("zip")) continue;
                ext.Add("zip"); ext.Add("7z"); c["extensions"] = ext.Distinct().ToArray();
            }
        }
        catch { }
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
}
