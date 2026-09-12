const { execFile } = require('node:child_process');
const path = require('node:path');

// One native read per sample; no process command lines, environment or user data.
module.exports = async (processIds) => {
  if (process.platform !== 'win32') return { available: false, reason: 'not-windows' };
  const ids = [...new Set(processIds)].filter((id) => Number.isSafeInteger(id) && id > 0);
  if (!ids.length) return { available: false, reason: 'no-processes' };
  const command = `
    Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class SafeMeetWindowProbe { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr handle, out uint processId); }'
    $taskForegroundPid = [uint32]0
    [void][SafeMeetWindowProbe]::GetWindowThreadProcessId([SafeMeetWindowProbe]::GetForegroundWindow(), [ref]$taskForegroundPid)
    $taskProcessIds = @(${ids.join(',')})
    $taskProcesses = @(Get-Process -Id $taskProcessIds -ErrorAction SilentlyContinue | ForEach-Object {
      @{ id=$_.Id; cpuSeconds=$_.CPU; workingSetBytes=$_.WorkingSet64; privateBytes=$_.PrivateMemorySize64 }
    })
    $taskGPU = Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction SilentlyContinue -ErrorVariable taskCounterErrors
    $taskEngines = @($taskGPU.CounterSamples | Where-Object { $_.CookedValue -gt 0 } | ForEach-Object {
      @{ engine=$_.InstanceName; percent=$_.CookedValue }
    })
    @{ available=$true; processes=$taskProcesses; foregroundPid=$taskForegroundPid; gpuAvailable=($null -ne $taskGPU); gpuEngines=$taskEngines;
       gpuErrorIds=@($taskCounterErrors | ForEach-Object { $_.FullyQualifiedErrorId }) } | ConvertTo-Json -Depth 5 -Compress
  `;
  return new Promise((resolve) => {
    const moduleRoot = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/Modules');
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command],
      { windowsHide: true, timeout: 4500, maxBuffer: 2 * 1024 ** 2,
        env: { ...process.env, PSModulePath: `${moduleRoot};${process.env.PSModulePath || ''}` } }, (error, stdout) => {
        if (error) return resolve({ available: false, reason: 'native-counter-failed' });
        try { return resolve(JSON.parse(stdout)); }
        catch { return resolve({ available: false, reason: 'native-counter-invalid' }); }
      });
  });
};
