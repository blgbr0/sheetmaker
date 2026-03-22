param(
  [int]$Port = 5173
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Static server started at $prefix"
Write-Host "Root: $root"
Write-Host "Press Ctrl+C to stop."

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = $context.Request.Url.AbsolutePath.TrimStart("/")
    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    $decodedPath = [System.Uri]::UnescapeDataString($requestPath)
    $safeRelative = $decodedPath.Replace("/", "\")
    $fullPath = Join-Path $root $safeRelative

    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
      $context.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
      $context.Response.OutputStream.Write($msg, 0, $msg.Length)
      $context.Response.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    $contentType = switch ($ext) {
      ".html" { "text/html; charset=utf-8" }
      ".js" { "application/javascript; charset=utf-8" }
      ".css" { "text/css; charset=utf-8" }
      ".json" { "application/json; charset=utf-8" }
      ".xlsx" { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      ".pdf" { "application/pdf" }
      default { "application/octet-stream" }
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.OutputStream.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
