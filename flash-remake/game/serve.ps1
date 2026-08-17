$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 8088
if ($env:PORT) { $Port = [int]$env:PORT }
$Prefix = "http://127.0.0.1:$Port/"
$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)
$Listener.Start()
Write-Host "DaMing Legend v20260817d"
Write-Host $Prefix
Start-Process $Prefix
$Types = @{
  ".html" = "text/html; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png" = "image/png"
  ".jpg" = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif" = "image/gif"
  ".txt" = "text/plain; charset=utf-8"
}
try {
  while ($Listener.IsListening) {
    $Ctx = $Listener.GetContext()
    $Path = [Uri]::UnescapeDataString($Ctx.Request.Url.AbsolutePath)
    if ($Path -eq "/") { $Path = "/index.html" }
    $File = [IO.Path]::GetFullPath((Join-Path $Root ($Path.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar))))
    $Resp = $Ctx.Response
    if (-not $File.StartsWith($Root)) {
      $Resp.StatusCode = 403
      $Resp.Close()
      continue
    }
    if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
      $Resp.StatusCode = 404
      $Resp.Close()
      continue
    }
    $Ext = [IO.Path]::GetExtension($File).ToLowerInvariant()
    $Resp.ContentType = $Types[$Ext]
    if (-not $Resp.ContentType) { $Resp.ContentType = "application/octet-stream" }
    $Bytes = [IO.File]::ReadAllBytes($File)
    $Resp.ContentLength64 = $Bytes.Length
    $Resp.OutputStream.Write($Bytes, 0, $Bytes.Length)
    $Resp.Close()
  }
} finally {
  $Listener.Stop()
}
