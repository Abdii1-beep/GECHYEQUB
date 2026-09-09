param($PrismaPath = "D:\CARAPP\apps\api")
Write-Host "Generating Prisma client..." -ForegroundColor Green
Set-Item -Path "env:PATH" -Value "C:\Program Files\PostgreSQL\18\bin;$env:PATH"
Set-Location $PrismaPath
& "npx" "prisma" "generate"
Write-Host "Prisma client generated successfully!" -ForegroundColor Green