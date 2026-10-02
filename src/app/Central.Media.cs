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

// PlayLoop — busca de vídeos do YouTube
static partial class Central
{
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
}
