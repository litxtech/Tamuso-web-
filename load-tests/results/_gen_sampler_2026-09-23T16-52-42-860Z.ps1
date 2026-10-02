
$csv = 'C:\Users\ilkse\muta\load-tests\results\tail-diag-500-2026-09-23T16-52-42-860Z.generator.csv'
$deadline = (Get-Date).AddMinutes(20)
while ((Get-Date) -lt $deadline) {
  $cpu = 0
  try {
    $cpu = [math]::Round((Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction Stop).CounterSamples.CookedValue, 1)
  } catch { $cpu = -1 }
  $os = Get-CimInstance Win32_OperatingSystem
  $total = [double]$os.TotalVisibleMemorySize
  $free = [double]$os.FreePhysicalMemory
  $memPct = [math]::Round((($total - $free) / $total) * 100, 1)
  $freeMb = [math]::Round($free / 1024, 0)
  $k6 = Get-Process k6 -ErrorAction SilentlyContinue | Select-Object -First 1
  $k6cpu = if ($k6) { [math]::Round($k6.CPU, 2) } else { '' }
  $k6mb = if ($k6) { [math]::Round($k6.WorkingSet64 / 1MB, 1) } else { '' }
  $tcp = 0
  try { $tcp = @(Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue).Count } catch {}
  $line = ((Get-Date).ToUniversalTime().ToString('o')) + ',' + $cpu + ',' + $memPct + ',' + $freeMb + ',' + $k6cpu + ',' + $k6mb + ',' + $tcp
  Add-Content -Path $csv -Value $line -Encoding utf8
  if (-not $k6) {
    Start-Sleep -Seconds 5
    $k6 = Get-Process k6 -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $k6) { break }
  }
  Start-Sleep -Seconds 5
}
