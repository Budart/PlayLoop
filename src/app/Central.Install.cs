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

// PlayLoop — iniciar com o Windows e desinstalação
static partial class Central
{
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
            try { Directory.Delete(data, true); } catch { }
            // o que ficar preso (processos do WebView2 ainda fechando) é apagado logo depois que este programa sai
            if (Directory.Exists(data)) extra = " & rmdir /s /q \"" + data + "\"";
        }
        string dir = Path.GetDirectoryName(ExePath);
        MessageBox.Show(wipe ? "O PlayLoop foi desinstalado e seus dados foram apagados." : "O PlayLoop foi desinstalado.", "PlayLoop");
        Process.Start(new ProcessStartInfo("cmd.exe", "/c timeout /t 2 /nobreak >nul & del /f /q \"" + ExePath + "\" & rmdir \"" + dir + "\"" + extra) { CreateNoWindow = true, WindowStyle = ProcessWindowStyle.Hidden });
    }
}
