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

// Koru — respostas das requisições da página
static partial class Central
{
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
}
