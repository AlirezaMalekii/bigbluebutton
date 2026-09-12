[CmdletBinding()]
param(
  [string]$Server = 'https://live51.roomeet.ir',
  [string]$MeetingId = 'tqzdwyz0i2e4pe5lakx8ahclfdj7kno6gywav61b',
  [Parameter(Mandatory = $true)][string]$Output,
  [ValidateRange(2, 100)][int]$Users = 50,
  [string]$Cameras = '0,10,25,50',
  [string]$ScreenCameras = '50',
  [ValidateRange(5, 3600)][int]$WarmupSeconds = 60,
  [ValidateRange(5, 7200)][int]$SampleSeconds = 180,
  [ValidateRange(0, 14400)][int]$SoakSeconds = 0,
  [ValidateSet(390, 768, 1440)][int]$Width = 1440,
  [ValidateSet(1, 4, 6)][int]$CpuRate = 1,
  [ValidateRange(1, 10)][int]$JoinConcurrency = 3,
  [ValidateRange(1, 10)][int]$MediaConcurrency = 5,
  [switch]$UseTunnel,
  [switch]$Actions
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
  PERF_USERS = [string]$Users
  PERF_JOIN_CONCURRENCY = [string]$JoinConcurrency
  PERF_MEDIA_CONCURRENCY = [string]$MediaConcurrency
  PERF_AUDIO_USERS = '2'
  PERF_API_ATTEMPTS = '10'
  PERF_TARGET = '2'
  PERF_CAMERAS = $Cameras
  PERF_SCREEN_CAMERAS = $ScreenCameras
  PERF_WARMUP_SECONDS = [string]$WarmupSeconds
  PERF_SAMPLE_SECONDS = [string]$SampleSeconds
  PERF_REPETITIONS = '1'
  PERF_SOAK_SECONDS = [string]$SoakSeconds
  PERF_VIDEO = 'test-results/performance/media/motion.y4m'
  PERF_AUDIO = 'test-results/performance/media/tone.wav'
  PERF_ACTIONS = $(if ($Actions) { '1' } else { '0' })
  PERF_NATIVE_METRICS = '1'
  PERF_REMOTE_METRICS = '1'
  PERF_ABORT_HOST_CPU = '97'
  PERF_ABORT_FREE_MEMORY_MB = '1024'
  PERF_WIDTH = [string]$Width
  PERF_CPU_RATE = [string]$CpuRate
  PERF_OUTPUT = $Output
}
if ($UseTunnel) { $environment.PERF_USE_TUNNEL = '1' }

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
[pscustomobject]@{
  pid = $process.Id
  startedAt = $process.StartTime.ToUniversalTime().ToString('o')
  output = $outputPath
  meetingBackend = 'live51'
  localRole = 'HTML5 assets, proxy, and simulated browsers only'
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputPath 'runner.json')
Get-Content -LiteralPath (Join-Path $outputPath 'runner.json') | ConvertFrom-Json
