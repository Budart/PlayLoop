// Seletor de pastas moderno (o mesmo do Explorer, grande e redimensionável) no lugar do FolderBrowserDialog antigo
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;

static class FolderPicker
{
    [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")] class FileOpenDialogRCW { }

    [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IFileOpenDialog
    {
        [PreserveSig] int Show(IntPtr parent);
        void SetFileTypes(uint c, IntPtr specs);
        void SetFileTypeIndex(uint i);
        void GetFileTypeIndex(out uint i);
        void Advise(IntPtr sink, out uint cookie);
        void Unadvise(uint cookie);
        void SetOptions(uint fos);
        void GetOptions(out uint fos);
        void SetDefaultFolder(IShellItem si);
        void SetFolder(IShellItem si);
        void GetFolder(out IShellItem si);
        void GetCurrentSelection(out IShellItem si);
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string name);
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string text);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        void GetResult(out IShellItem si);
        void AddPlace(IShellItem si, int fdap);
        void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string ext);
        void Close(int hr);
        void SetClientGuid(ref Guid guid);
        void ClearClientData();
        void SetFilter(IntPtr filter);
        void GetResults(out IntPtr items);
        void GetSelectedItems(out IntPtr items);
    }

    [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IShellItem
    {
        void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
        void GetParent(out IShellItem si);
        void GetDisplayName(uint sigdn, [MarshalAs(UnmanagedType.LPWStr)] out string name);
        void GetAttributes(uint mask, out uint attrs);
        void Compare(IShellItem si, uint hint, out int order);
    }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = true)]
    static extern int SHCreateItemFromParsingName(string path, IntPtr pbc, ref Guid riid, out IShellItem item);

    const uint FOS_PICKFOLDERS = 0x20, FOS_FORCEFILESYSTEM = 0x40, FOS_PATHMUSTEXIST = 0x800, SIGDN_FILESYSPATH = 0x80058000;

    // devolve a pasta escolhida ou null; cai no seletor antigo só se o moderno não existir
    public static string Pick(IWin32Window owner, string title, string start)
    {
        try
        {
            var d = (IFileOpenDialog)new FileOpenDialogRCW();
            uint o; d.GetOptions(out o);
            d.SetOptions(o | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST);
            if (!string.IsNullOrEmpty(title)) d.SetTitle(title);
            if (!string.IsNullOrEmpty(start) && System.IO.Directory.Exists(start))
            {
                Guid g = typeof(IShellItem).GUID; IShellItem si;
                if (SHCreateItemFromParsingName(start, IntPtr.Zero, ref g, out si) == 0) d.SetFolder(si);
            }
            if (d.Show(owner != null ? owner.Handle : IntPtr.Zero) != 0) return null;   // cancelado
            IShellItem r; d.GetResult(out r); string path; r.GetDisplayName(SIGDN_FILESYSPATH, out path);
            return path;
        }
        catch (COMException) { }
        catch (InvalidCastException) { }
        using (var f = new FolderBrowserDialog { Description = title ?? "", ShowNewFolderButton = true })
        {
            if (!string.IsNullOrEmpty(start) && System.IO.Directory.Exists(start)) f.SelectedPath = start;
            return f.ShowDialog(owner) == DialogResult.OK ? f.SelectedPath : null;
        }
    }
}
