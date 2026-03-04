' Banquito Launcher
' Arranca el backend y frontend en segundo plano, sin ventanas visibles,
' y abre el browser en http://localhost:5173
' 
' Doble-click para usar.

Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")

' Directorio donde esta este .vbs (raiz del proyecto)
Dim root
root = oFSO.GetParentFolderName(WScript.ScriptFullName)

' Lanzar el ps1 escondido usando PowerShell
' -WindowStyle Hidden: sin ventana
' -NonInteractive: sin prompts
' -ExecutionPolicy Bypass: no pide permisos
Dim cmd
cmd = "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -NonInteractive -File """ & root & "\start_banquito.ps1"""

oShell.Run cmd, 0, False   ' 0 = escondido, False = no esperar

' Esperar que el backend levante antes de abrir el browser
WScript.Sleep 5000

' Abrir el browser
oShell.Run "http://localhost:5173", 1, False

WScript.Quit
