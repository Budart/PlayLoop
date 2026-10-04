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

// PlayLoop — estado e utilidades compartilhadas (JSON, UTF-8, caminhos, cache)
static partial class Central
{
    const string ConfigName = "central-config.json";
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
    static readonly UTF8Encoding Utf8 = new UTF8Encoding(false);
    static string ExePath = Assembly.GetExecutingAssembly().Location;
    static readonly string CacheDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CentralDeJogos", "covers");
    static readonly string BgCacheDir = Path.Combine(CacheDir, "bg");
    // tipos de cache: covers = imagens de capas/logos, bg = imagens de fundo, search = resultados de busca (resolved.json), videos = vídeos achados (videos.json)
    static IEnumerable<FileInfo> CacheFiles(string kind)
    {
        string d = kind == "bg" ? BgCacheDir : CacheDir; if (!Directory.Exists(d)) yield break;
        foreach (var fi in new DirectoryInfo(d).GetFiles())
        {
            string nm = fi.Name.ToLowerInvariant();
            bool ok = kind == "bg" ? true : kind == "search" ? nm == "resolved.json" : kind == "videos" ? nm == "videos.json" : kind == "covers" && !nm.EndsWith(".json");
            if (ok) yield return fi;
        }
    }
    static string Hash(string s) { using (var h = System.Security.Cryptography.SHA1.Create()) return BitConverter.ToString(h.ComputeHash(Encoding.UTF8.GetBytes(s))).Replace("-", "").ToLowerInvariant(); }
    static readonly object CoverLock = new object();
}
