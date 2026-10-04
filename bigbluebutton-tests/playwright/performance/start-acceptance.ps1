[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [Parameter(Mandatory = $true)][string]$MeetingId,
  [Parameter(Mandatory = $true)][string]$Output,
  [string]$TargetDist
)

$playwrightRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $playwrightRoot $Output
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
if (Test-Path (Join-Path $outputPath 'samples.jsonl')) {
  throw 'Output already contains samples.jsonl; choose a new output directory'
}

$environment = @{
  BBB_SERVER = $Server
  PERF_MEETING_ID = $MeetingId
  PERF_USERS = '12'
  PERF_JOIN_CONCURRENCY = '3'
  PERF_TARGET = '2'
  PERF_CAMERAS = '0,1,4,8,12'
  PERF_SCREEN_CAMERAS = '8,12'
  PERF_WARMUP_SECONDS = '120'
  PERF_SAMPLE_SECONDS = '300'
  PERF_REPETITIONS = '3'
  PERF_SOAK_SECONDS = '1800'
  PERF_VIDEO = 'test-results/performance/media/motion.y4m'
  PERF_AUDIO = 'test-results/performance/media/tone.wav'
  PERF_ACTIONS = '1'
  PERF_NATIVE_METRICS = '1'
  PERF_OUTPUT = $Output
}
if ($TargetDist) { $environment.PERF_TARGET_DIST = (Resolve-Path $TargetDist).Path }

$node = (Get-Command node -ErrorAction Stop).Source
$process = Start-Process -FilePath $node `
  -ArgumentList 'performance/with-server.cjs' `
  -WorkingDirectory $playwrightRoot `
  -Environment $environment `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $outputPath 'runner.stdout.log') `
  -RedirectStandardError (Join-Path $outputPath 'runner.stderr.log') `
  -PassThru

Set-Content -LiteralPath (Join-Path $outputPath 'runner.pid') -Value $process.Id -NoNewline
$runner = [pscustomobject]@{
  pid = $process.Id
  startedAt = $process.StartTime.ToUniversalTime().ToString('o')
  output = $outputPath
}
$runner | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputPath 'runner.json')
$runner
