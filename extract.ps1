$failures = Select-String -Path "full-test-run.log" -Pattern '^\s+(\d+)\)\s+\[chromium\]'
$count = $failures.Count
Write-Host "Found $count failures"
$failures | ForEach-Object { $_.Line.Trim() } > extracted_failures.txt
