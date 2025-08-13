#!/usr/bin/env pwsh

$ProjectPath = (Resolve-Path -Path "$PSScriptRoot/..").Path
$SshId="carme-web"

Push-Location $ProjectPath
pnpm build
if (!(Test-Path -Path "build")) {
  New-Item -Name "build" -ItemType "Directory"
}

$AppId="steampunk-city"
$ArchiveFileName="$AppId.tgz"
$UploadPath="/home/web/uploads"
$TargetPath="/var/www/static/$AppId"

tar -C dist --exclude="./*.xrg" -czf build/$ArchiveFileName *
scp build/$ArchiveFileName "${SshId}:$UploadPath/"
ssh $SshId "rm -rf $TargetPath/* && tar -xzf $UploadPath/$ArchiveFileName -C $TargetPath/ && rm $UploadPath/$ArchiveFileName"
Remove-Item -Path build/$ArchiveFileName
Pop-Location