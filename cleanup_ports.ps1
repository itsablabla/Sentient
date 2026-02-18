# cleanup_ports.ps1
# Description: Kills processes on ports commonly used by the Sentient application.
# Run this if you see "Address already in use" errors.

$PortsToCheck = @(3000, 3001, 3002, 3005, 8080) + (9000..9100)

Write-Host "Checking for processes on target ports..." -ForegroundColor Cyan

foreach ($Port in $PortsToCheck) {
    try {
        $Connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($Connection) {
            $PID = $Connection.OwningProcess
            $Process = Get-Process -Id $PID -ErrorAction SilentlyContinue
            if ($Process) {
                Write-Host "Killing process on Port $Port (PID: $PID, Name: $($Process.ProcessName))..." -ForegroundColor Yellow
                Stop-Process -Id $PID -Force -ErrorAction SilentlyContinue
                Write-Host "  - Process terminated." -ForegroundColor Green
            }
        }
    }
    catch {
        # Ignore errors (permission denied etc)
    }
}

Write-Host "Cleanup complete." -ForegroundColor Green
