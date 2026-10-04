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

// Koru — janela do app e diálogos de arquivo/pasta
static partial class Central
{
    // abre a janela do Koru (WebView2)
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
                    result = FolderPicker.Pick(owner, "Escolha a pasta", start);
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
}
