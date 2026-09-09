param(
  [int]$Port = 8843,
  [string]$Root = $PSScriptRoot
)

Add-Type -AssemblyName System.Net.Http

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/"

$mime = @{
  ".html" = "text/html"; ".js" = "application/javascript"; ".css" = "text/css";
  ".json" = "application/json"; ".ico" = "image/x-icon"; ".png" = "image/png";
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    try {
      $path = $req.Url.LocalPath
      if ($path -eq "/") { $path = "/index.html" }
      $filePath = Join-Path $Root ($path.TrimStart("/"))
      if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath)
        $contentType = $mime[$ext]
        if (-not $contentType) { $contentType = "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $res.ContentType = $contentType
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $path")
        $res.ContentLength64 = $msg.Length
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
    } catch {
      Write-Host "Request error: $_"
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
}
