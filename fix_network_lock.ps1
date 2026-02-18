# fix_network_lock.ps1
# FIXES: EACCES / Permission Denied on Port 3000
# REASON: Windows Hyper-V/Docker has reserved the port. This script resets it.

Write-Host "1. Stopping Windows NAT Driver (releasing ports)..." -ForegroundColor Yellow
net stop winnat

Write-Host "2. Restarting Windows NAT Driver..." -ForegroundColor Yellow
net start winnat

Write-Host "✅ Network Reset Complete. Port 3000 should be free." -ForegroundColor Green
Write-Host "👉 Now run '.\start_all_services.ps1'." -ForegroundColor Cyan
Read-Host "Press Enter to exit..."
