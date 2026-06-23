Set shell = CreateObject("WScript.Shell")

Set fso = CreateObject("Scripting.FileSystemObject")

siteDir = fso.GetParentFolderName(WScript.ScriptFullName)

desktop = shell.SpecialFolders("Desktop")



Set l1 = shell.CreateShortcut(desktop & "\PIXELA Site.lnk")

l1.TargetPath = siteDir & "\BASLAT.cmd"

l1.WorkingDirectory = siteDir

l1.WindowStyle = 1

l1.Description = "PIXELA sitesini ac"

l1.Save



Set l2 = shell.CreateShortcut(desktop & "\PIXELA (HTML).lnk")

l2.TargetPath = siteDir & "\SITE-AC.html"

l2.WorkingDirectory = siteDir

l2.Description = "PIXELA siteye git"

l2.Save

