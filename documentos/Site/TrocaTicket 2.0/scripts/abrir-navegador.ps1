Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Management') -ErrorAction Stop
Start-Process -FilePath 'http://127.0.0.1:5173'
