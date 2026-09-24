Add-Type -AssemblyName System.Drawing
$imgPath = 'C:\Users\user\.gemini\antigravity\brain\1aaa0b68-65a2-4baa-a5fd-5025a6ee7ee9\.user_uploaded\media_1790205963735.png'
$bmp = New-Object System.Drawing.Bitmap($imgPath)

Write-Output "Image: $($bmp.Width) x $($bmp.Height)"

for ($y = 350; $y -lt $bmp.Height; $y += 15) {
    $c = $bmp.GetPixel(50, $y)
    Write-Output "Sidebar y=$y hex=$($c.R),$($c.G),$($c.B)"
}

for ($y = 350; $y -lt $bmp.Height; $y += 15) {
    $c = $bmp.GetPixel(500, $y)
    Write-Output "Main y=$y hex=$($c.R),$($c.G),$($c.B)"
}

$bmp.Dispose()
