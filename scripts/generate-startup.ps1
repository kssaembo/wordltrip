# Generate native iOS startup layouts from the app artwork (no student data).
Add-Type -AssemblyName System.Drawing
$assetRoot = Join-Path $PSScriptRoot '../public/pwa'
$artwork = [System.Drawing.Image]::FromFile((Join-Path $assetRoot 'icon-512.png'))
$links = @()
foreach ($device in @(@(390,844,3),@(430,932,3),@(820,1180,2),@(1024,1366,2))) {
 foreach ($landscape in @($false,$true)) {
  $w=$device[0]*$device[2];$h=$device[1]*$device[2]
  $orientation='portrait';if($landscape){$swap=$w;$w=$h;$h=$swap;$orientation='landscape'}
  $bitmap=New-Object System.Drawing.Bitmap($w,$h)
  $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f3ed'))
  $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $side=[int]([Math]::Min($w,$h)*0.4)
  $graphics.DrawImage($artwork,[int](($w-$side)/2),[int](($h-$side)/2-$side*0.15),$side,$side)
  $format=New-Object System.Drawing.StringFormat;$format.Alignment=[System.Drawing.StringAlignment]::Center
  $font=New-Object System.Drawing.Font('Malgun Gothic',([Math]::Min($w,$h)*0.038),[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
  $brush=New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#223e42'))
  $graphics.DrawString('지구 한 바퀴',$font,$brush,[single]($w/2),[single]($h/2+$side*0.43),$format)
  $filename="splash-$w-$h.png"
  $bitmap.Save((Join-Path $assetRoot $filename),[System.Drawing.Imaging.ImageFormat]::Png)
  $links += '<link rel="apple-touch-startup-image" href="/pwa/'+$filename+'" media="(device-width: '+$device[0]+'px) and (device-height: '+$device[1]+'px) and (-webkit-device-pixel-ratio: '+$device[2]+') and (orientation: '+$orientation+')" />'
  $brush.Dispose();$font.Dispose();$format.Dispose();$graphics.Dispose();$bitmap.Dispose()
 }
}
$artwork.Dispose()
$pagePath=Join-Path $PSScriptRoot '../index.html'
$page=Get-Content -LiteralPath $pagePath -Raw
$page=$page -replace '(?s)\s*<!-- ios-startup -->.*?<!-- /ios-startup -->',''
$page=$page.Replace('</head>',("<!-- ios-startup -->`n"+($links -join "`n")+"`n<!-- /ios-startup -->`n</head>"))
Set-Content -LiteralPath $pagePath -Value $page -Encoding utf8
