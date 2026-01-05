Param()

$ErrorActionPreference = "Stop"

$RepoUrl = "git@github.com:VICTORVICKIE/Elbrit-Play.git"
$TempDir = ".__elbrit_shared_tmp"
$ComponentsSrc = Join-Path $TempDir "src/components"
$GqlSrc = Join-Path $TempDir "src/app/graphql-playground"
$ComponentsDest = "share"
$GqlDest = "share/graphql-playground"

Write-Host "Cloning shared repo from $RepoUrl ..."

if (Test-Path $TempDir) {
  Remove-Item -Recurse -Force $TempDir
}

git clone --depth=1 $RepoUrl $TempDir

Write-Host "Copying components to '$ComponentsDest' ..."
if (Test-Path $ComponentsDest) {
  Remove-Item -Recurse -Force $ComponentsDest
}
New-Item -ItemType Directory -Force -Path $ComponentsDest | Out-Null
Copy-Item -Recurse -Force (Join-Path $ComponentsSrc "*") $ComponentsDest

Write-Host "Copying GraphQL playground to '$GqlDest' ..."
if (Test-Path $GqlDest) {
  Remove-Item -Recurse -Force $GqlDest
}
New-Item -ItemType Directory -Force -Path $GqlDest | Out-Null
Copy-Item -Recurse -Force (Join-Path $GqlSrc "*") $GqlDest

Write-Host "Cleaning up temp directory ..."
Remove-Item -Recurse -Force $TempDir

Write-Host "copy-shared completed successfully."


