
$csv = 'C:\Users\ilkse\muta\load-tests\results\tail-diag-500-2026-09-23T16-41-22-279Z.generator.csv'
$end = (Get-Date).AddMinutes(25)
while ((Get-Date) -lt $end) {
  $cpu = 0
  try { $cpu = [math]::Round((Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue,1) } catch {}
  $os = Get-CimInstance Win32_OperatingSystem
  $total = [double]$os.TotalVisibleMemorySize
  $free = [double]$os.FreePhysicalMemory
  $memPct = [math]::Round((($total-$free)/$total)*100,1)
  $freeMb = [math]::Round($free/1024,0)
  $k6 = Get-Process k6 -ErrorAction SilentlyContinue | Select-Object -First 1
  $k6cpu = if ($k6) { [math]::Round($k6.CPU,2) } else { '' }
  $k6mb = if ($k6) { [math]::Round($k6.WorkingSet64/1MB,1) } else { '' }
  $tcp = (Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | Measure-Object).Count
  $line = "{0},{1},{2},{3},{4},{5},{6},sample" -f (Get-Date).ToUniversalTime().ToString('o'), $cpu, $memPct, $freeMb, $k6cpu, $k6mb, $tcp
  Add-Content -Path $csv -Value $line
  if (-not $k6 -and (Get-Date) -gt (Get-Date).AddSeconds(30)) { break }
  Start-Sleep -Seconds 5
}
