Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\liony\.gemini\antigravity\brain\9b583034-251e-46b8-80bd-f4eca384b665\mesh_app_icon_1780620913786.png"
$img = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-Image {
    param(
        [System.Drawing.Image]$srcImage,
        [int]$width,
        [int]$height,
        [string]$outputPath
    )
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $destImage = New-Object System.Drawing.Bitmap($width, $height)
    $destImage.SetResolution($srcImage.HorizontalResolution, $srcImage.VerticalResolution)
    
    $graphics = [System.Drawing.Graphics]::FromImage($destImage)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    $wrapMode = New-Object System.Drawing.Imaging.ImageAttributes
    $wrapMode.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    
    $graphics.DrawImage($srcImage, $destRect, 0, 0, $srcImage.Width, $srcImage.Height, [System.Drawing.GraphicsUnit]::Pixel, $wrapMode)
    
    $graphics.Dispose()
    
    if ($outputPath.EndsWith(".ico")) {
        $icon = [System.Drawing.Icon]::FromHandle($destImage.GetHicon())
        $fileStream = New-Object System.IO.FileStream($outputPath, [System.IO.FileMode]::Create)
        $icon.Save($fileStream)
        $fileStream.Close()
        $icon.Dispose()
    } else {
        $destImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    
    $destImage.Dispose()
}

Resize-Image $img 192 192 "C:\Users\liony\.gemini\antigravity\scratch\dating-app\public\icon-192.png"
Resize-Image $img 512 512 "C:\Users\liony\.gemini\antigravity\scratch\dating-app\public\icon-512.png"
Resize-Image $img 192 192 "C:\Users\liony\.gemini\antigravity\scratch\dating-app\public\icon-maskable-192.png"
Resize-Image $img 512 512 "C:\Users\liony\.gemini\antigravity\scratch\dating-app\public\icon-maskable-512.png"
Resize-Image $img 32 32 "C:\Users\liony\.gemini\antigravity\scratch\dating-app\src\app\favicon.ico"

$img.Dispose()
write-host "Icons resized and copied successfully!"
