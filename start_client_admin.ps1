# start_client_admin.ps1
# Automagically re-runs itself as Administrator to unblock Port 3000

$CurrentScript = $MyInvocation.MyCommand.Path

# Check for Admin rights
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Requesting Administrator privileges to open Port 3000..." -ForegroundColor Yellow
    Start-Process powershell.exe "-NoProfile -ExecutionPolicy Bypass -File `"$CurrentScript`"" -Verb RunAs
    exit
}

# We are Admin now
Write-Host "Admin Access Granted. Starting Client on Port 3000..." -ForegroundColor Green
Set-Location "D:\Sentient\Sentient\src\client"

# Run the dev server
npm run dev

# Keep window open if it crashes
Read-Host "Press Enter to exit..."
