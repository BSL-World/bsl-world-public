param([Parameter(Mandatory=$true)][ValidateSet('free','pro')][string]$Edition)
$ErrorActionPreference='Stop'
$workspace=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $workspace
$package=Get-Content package.json -Raw | ConvertFrom-Json
$config=Get-Content src-tauri/tauri.conf.json -Raw | ConvertFrom-Json
$version=$package.version
if($config.version -ne $version){throw 'Package/Tauri version mismatch'}
$out=Join-Path $workspace "src-tauri/target/release-handoff/$version"
New-Item -ItemType Directory -Force $out | Out-Null
$installer=Join-Path $out "bsl-timer_${version}_${Edition}_x64-setup.exe"
if(Test-Path -LiteralPath $installer){throw 'Candidate already exists; use a new version for a different build'}
$unsigned=Join-Path $out 'build-without-auto-sign.json'
[IO.File]::WriteAllText($unsigned,'{"bundle":{"createUpdaterArtifacts":false}}')
$env:CARGO_NET_OFFLINE='true'
$env:VITE_BSL_EDITION=$Edition
Remove-Item Env:VITE_BSL_GLASS_OPTICS_STUDY -ErrorAction SilentlyContinue
npm run tauri -- build --bundles nsis --config $unsigned
if($LASTEXITCODE -ne 0){throw "Build failed: $Edition"}
Copy-Item -LiteralPath "src-tauri/target/release/bundle/nsis/bsl-timer_${version}_x64-setup.exe" -Destination $installer
Copy-Item -LiteralPath src-tauri/target/release/bsl-timer.exe -Destination (Join-Path $out "bsl-timer_${version}_${Edition}.exe")
Compress-Archive -Path dist/* -DestinationPath (Join-Path $out "$Edition-dist.zip")
$hashes=[ordered]@{}
Get-ChildItem -LiteralPath $out -File | Where-Object {$_.Extension -in @('.exe','.zip')} | Sort-Object Name | ForEach-Object {
  $hashes[$_.Name]=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
}
[IO.File]::WriteAllText((Join-Path $out 'sha256.json'),($hashes | ConvertTo-Json))
Get-Item -LiteralPath $installer | Select-Object Name,Length,@{Name='Version';Expression={$_.VersionInfo.ProductVersion}}
Write-Output 'Candidate built. Updater signing, installed upgrade acceptance and publication are separate steps.'
