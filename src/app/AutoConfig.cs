using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

// Configuração automática: descobre consoles, emuladores e pastas de jogos dentro da pasta principal
static class AutoConfig
{
    class Kind
    {
        public string Id, Name, Art, Thumbs, Args = "\"{rom}\"";
        public Regex Folder, Emu;
        public string[] Ext;
        public bool NameFromFolder, SwitchBase;
    }

    static Regex R(string p) { return new Regex(p, RegexOptions.IgnoreCase); }

    // ordem importa: os mais específicos primeiro (PS2 antes de PS1, Wii U antes de Wii, GBC antes de GB...)
    static readonly Kind[] Kinds = {
        new Kind { Id="ps2", Name="PlayStation 2", Art="ps2", Thumbs="Sony_-_PlayStation_2", Folder=R(@"playstation\s*2|\bps2\b"), Emu=R(@"^pcsx2"), Ext=new[]{"iso","chd"}, NameFromFolder=true },
        new Kind { Id="ps3", Name="PlayStation 3", Art="ps3", Thumbs="Sony_-_PlayStation_3", Folder=R(@"playstation\s*3|\bps3\b"), Emu=R(@"^rpcs3"), Ext=new[]{"iso","pkg"} },
        new Kind { Id="psp", Name="PSP", Art="psp", Thumbs="Sony_-_PlayStation_Portable", Folder=R(@"\bpsp\b|playstation\s*portable"), Emu=R(@"^ppsspp"), Ext=new[]{"iso","cso"} },
        new Kind { Id="ps1", Name="PlayStation", Art="psx", Thumbs="Sony_-_PlayStation", Folder=R(@"playstation\s*1?\b|\bps1\b|\bpsx\b|\bpsone\b"), Emu=R(@"^duckstation|^epsxe|^mednafen|^pcsx-?r"), Ext=new[]{"cue","chd"}, NameFromFolder=true },
        new Kind { Id="wiiu", Name="Wii U", Art="wiiu", Thumbs="", Folder=R(@"wii\s*u"), Emu=R(@"^cemu"), Ext=new[]{"wux","rpx"}, Args="-g \"{rom}\"" },
        new Kind { Id="wii", Name="Nintendo Wii", Art="wii", Thumbs="Nintendo_-_Wii", Folder=R(@"\bwii\b"), Emu=R(@"^dolphin(?!tool)"), Ext=new[]{"iso","wbfs","rvz"}, Args="-e \"{rom}\"" },
        new Kind { Id="gc", Name="GameCube", Art="gc", Thumbs="Nintendo_-_GameCube", Folder=R(@"game\s*cube|\bgcn?\b"), Emu=R(@"^dolphin(?!tool)"), Ext=new[]{"iso","rvz"}, Args="-e \"{rom}\"" },
        new Kind { Id="switch", Name="Nintendo Switch", Art="switch", Thumbs="", Folder=R(@"switch"), Emu=R(@"^(eden|yuzu|suyu|sudachi|citron|torzu|ryujinx)(?!-cli)"), Ext=new[]{"nsp","xci"}, Args="-g \"{rom}\"", NameFromFolder=true, SwitchBase=true },
        new Kind { Id="3ds", Name="Nintendo 3DS", Art="3ds", Thumbs="Nintendo_-_Nintendo_3DS", Folder=R(@"3ds"), Emu=R(@"^(azahar|citra|lime3ds|lime|mandarine|panda3ds)(?!-room)"), Ext=new[]{"3ds","cia"} },
        new Kind { Id="nds", Name="Nintendo DS", Art="nds", Thumbs="Nintendo_-_Nintendo_DS", Folder=R(@"nintendo\s*ds|\bnds\b|\bds\b"), Emu=R(@"^(melonds|desmume|drastic|nogba)"), Ext=new[]{"nds"} },
        new Kind { Id="n64", Name="Nintendo 64", Art="n64", Thumbs="Nintendo_-_Nintendo_64", Folder=R(@"nintendo\s*64|\bn64\b"), Emu=R(@"^(project64|mupen64|simple64|rmg|ares)"), Ext=new[]{"z64","zip","7z"} },
        new Kind { Id="gba", Name="Game Boy Advance", Art="gba", Thumbs="Nintendo_-_Game_Boy_Advance", Folder=R(@"game\s*boy\s*advance|\bgba\b"), Emu=R(@"^(mgba|visualboyadvance|vba|nogba)"), Ext=new[]{"gba","zip","7z"} },
        new Kind { Id="gbc", Name="Game Boy Color", Art="gbc", Thumbs="Nintendo_-_Game_Boy_Color", Folder=R(@"game\s*boy\s*colou?r|\bgbc\b"), Emu=R(@"^(bgb|sameboy|mgba|gambatte)"), Ext=new[]{"gbc","zip","7z"} },
        new Kind { Id="gb", Name="Game Boy", Art="gb", Thumbs="Nintendo_-_Game_Boy", Folder=R(@"game\s*boy|\bgb\b"), Emu=R(@"^(bgb|sameboy|mgba|gambatte)"), Ext=new[]{"gb","zip","7z"} },
        new Kind { Id="snes", Name="Super Nintendo", Art="snes", Thumbs="Nintendo_-_Super_Nintendo_Entertainment_System", Folder=R(@"super\s*nintendo|\bsnes\b|super\s*famicom"), Emu=R(@"^(snes9x|bsnes|zsnes|superzsnes|higan)"), Ext=new[]{"sfc","smc","zip","7z"} },
        new Kind { Id="nes", Name="Nintendo (NES)", Art="nes", Thumbs="Nintendo_-_Nintendo_Entertainment_System", Folder=R(@"\bnes\b|famicom|nintendinho"), Emu=R(@"^(mesen|fceux|nestopia|punes)"), Ext=new[]{"nes","zip","7z"} },
        new Kind { Id="sms", Name="Master System", Art="mastersystem", Thumbs="Sega_-_Master_System_-_Mark_III", Folder=R(@"master\s*system|\bsms\b"), Emu=R(@"^(fusion|kega|emulicious|meka)"), Ext=new[]{"sms","zip","7z"} },
        new Kind { Id="genesis", Name="Sega Genesis", Art="genesis", Thumbs="Sega_-_Mega_Drive_-_Genesis", Folder=R(@"genesis|mega\s*drive"), Emu=R(@"^(sandopolis|fusion|kega|blastem|genesis|gens)"), Ext=new[]{"md","bin","zip","7z"}, NameFromFolder=true },
        new Kind { Id="dreamcast", Name="Dreamcast", Art="dreamcast", Thumbs="Sega_-_Dreamcast", Folder=R(@"dreamcast"), Emu=R(@"^(flycast|redream|demul)"), Ext=new[]{"gdi","cdi","chd"} },
        new Kind { Id="saturn", Name="Sega Saturn", Art="saturn", Thumbs="Sega_-_Saturn", Folder=R(@"saturn"), Emu=R(@"^(yabause|kronos|mednafen|ssf)"), Ext=new[]{"cue","chd"} },
        new Kind { Id="neogeo", Name="Neo-Geo", Art="neogeo", Thumbs="SNK_-_Neo_Geo", Folder=R(@"neo\s*-?\s*geo"), Emu=R(@"^(fbneo|finalburn|mame|neoragex)"), Ext=new[]{"zip","7z"} },
        new Kind { Id="xbox", Name="Xbox", Art="xbox", Thumbs="", Folder=R(@"^xbox$|xbox\s*classic|original\s*xbox"), Emu=R(@"^xemu"), Ext=new[]{"iso"} },
        new Kind { Id="xbox360", Name="Xbox 360", Art="xbox360", Thumbs="", Folder=R(@"xbox\s*360"), Emu=R(@"^xenia"), Ext=new[]{"iso","xex"} },
    };

    static readonly Regex NotEmu = R(@"unins|setup|install|updater|update|crash|report|tool|helper|server|room|test|config|nsp_installer|chdman|namdhc|reshade|vc_?redist|dxsetup|7z|winrar");
    static readonly Regex RomDirName = R(@"^(roms?|jogos?|games?|isos?|roms?\s.*|.*roms)$");

    public static Dictionary<string, object> Build(string root, List<string> pcDirs)
    {
        var consoles = new List<object>();
        var used = new HashSet<string>();
        var pcOk = (pcDirs ?? new List<string>()).Where(Directory.Exists).ToArray();
        if (pcOk.Length > 0)
            consoles.Add(new Dictionary<string, object> {
                { "id", "pc" }, { "type", "pc" }, { "name", "Jogos de PC" }, { "art", "pc" }, { "thumbs", "" }, { "emulator", "" }, { "args", "" },
                { "romDirs", pcOk.Cast<object>().ToArray() }, { "extensions", new object[] { "lnk", "url", "exe" } } });
        if (Directory.Exists(root))
            foreach (var dir in Directory.GetDirectories(root).OrderBy(d => d))
            {
                string name = Path.GetFileName(dir);
                var k = Kinds.FirstOrDefault(x => x.Folder.IsMatch(name) && !used.Contains(x.Id));
                if (k == null) k = GuessByFiles(dir, used);
                if (k == null) continue;
                var c = Detect(root, dir, k);
                if (c == null) continue;
                used.Add(k.Id); consoles.Add(c);
            }
        return new Dictionary<string, object> { { "port", 8765 }, { "root", root }, { "setupDone", true }, { "consoles", consoles.ToArray() } };
    }

    // pasta com nome desconhecido: tenta pelo tipo de arquivo / emulador
    static Kind GuessByFiles(string dir, HashSet<string> used)
    {
        var exes = SafeFiles(dir, "*.exe", 3).Select(f => Path.GetFileNameWithoutExtension(f)).ToList();
        foreach (var k in Kinds) if (!used.Contains(k.Id) && exes.Any(e => k.Emu.IsMatch(e)) && !(k.Id == "gc" || k.Id == "gb")) return k;
        return null;
    }

    static Dictionary<string, object> Detect(string root, string dir, Kind k)
    {
        // emulador: exe conhecido; senão o único exe "de verdade" da pasta
        var exes = SafeFiles(dir, "*.exe", 4).Where(f => !NotEmu.IsMatch(Path.GetFileNameWithoutExtension(f))).ToList();
        string emu = exes.Where(f => k.Emu.IsMatch(Path.GetFileNameWithoutExtension(f)))
            .OrderByDescending(f => Regex.IsMatch(Path.GetFileName(f), "qt|64", RegexOptions.IgnoreCase) ? 1 : 0)
            .ThenBy(f => f.Length).FirstOrDefault();
        if (emu == null && exes.Count == 1) emu = exes[0];

        // pastas de jogos: subpastas chamadas "ROMs", "Jogos", "Games"...; senão a própria pasta do console
        var romDirs = new List<string>();
        foreach (var sd in SafeDirs(dir)) if (RomDirName.IsMatch(Path.GetFileName(sd))) romDirs.Add(sd);
        // subpastas "favoritos"/traduções que também tenham jogos
        foreach (var sd in SafeDirs(dir))
            if (!romDirs.Contains(sd) && Regex.IsMatch(Path.GetFileName(sd), "favorit|tradu|hack|br\\b", RegexOptions.IgnoreCase) && CountGames(sd, k) > 0) romDirs.Insert(0, sd);
        var exclude = new List<string>();
        if (romDirs.Count == 0)
        {
            if (CountGames(dir, k, emu) > 0) romDirs.Add(dir);
            if (emu != null) exclude.Add(Path.GetDirectoryName(emu));
        }
        if (emu == null && romDirs.Count == 0) return null;

        Func<string, string> rel = p => p.Substring(root.TrimEnd('\\').Length).TrimStart('\\').Replace('\\', '/');
        var c = new Dictionary<string, object> {
            { "id", k.Id }, { "name", k.Name }, { "art", k.Art }, { "thumbs", k.Thumbs },
            { "emulator", emu == null ? "" : rel(emu) }, { "args", k.Args },
            { "romDirs", romDirs.Select(rel).Cast<object>().ToArray() }, { "extensions", k.Ext.Cast<object>().ToArray() } };
        if (exclude.Count > 0 && romDirs.Contains(dir)) c["excludeDirs"] = exclude.Select(rel).Cast<object>().ToArray();
        if (k.NameFromFolder) c["nameFromFolder"] = true;
        if (k.SwitchBase) c["switchBaseOnly"] = true;
        return c;
    }

    static int CountGames(string dir, Kind k, string emu = null)
    {
        var exts = new HashSet<string>(k.Ext.Select(e => "." + e));
        string emuDir = emu == null ? null : Path.GetDirectoryName(emu);
        return SafeFiles(dir, "*", 4).Count(f => exts.Contains(Path.GetExtension(f).ToLowerInvariant()) && (emuDir == null || !f.StartsWith(emuDir, StringComparison.OrdinalIgnoreCase)));
    }

    static IEnumerable<string> SafeDirs(string dir) { try { return Directory.GetDirectories(dir); } catch { return new string[0]; } }
    static List<string> SafeFiles(string dir, string pattern, int depth)
    {
        var res = new List<string>();
        try { res.AddRange(Directory.GetFiles(dir, pattern)); } catch { }
        if (depth > 0) foreach (var d in SafeDirs(dir)) res.AddRange(SafeFiles(d, pattern, depth - 1));
        return res;
    }
}
