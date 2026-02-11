$filePath = "C:\Users\hp\Documents\DoDo\src\i18n\locales\en.json"
$content = Get-Content $filePath
$newContent = New-Object System.Collections.Generic.List[string]

# Line 1-1249 are fine (0-1248 in 0-indexed)
for ($i = 0; $i -lt 1249; $i++) {
    $newContent.Add($content[$i])
}

# Line 1250 (i=1249) needs a comma
$line1250 = $content[1249]
if (-not $line1250.EndsWith(",")) {
    $line1250 = $line1250 + ","
}
$newContent.Add($line1250)

# Shift all subsequent lines (i=1250 to end) by 12 spaces left
for ($i = 1250; $i -lt $content.Count; $i++) {
    $line = $content[$i]
    $newLine = $line -replace "^            ", "" # Remove 12 spaces
    $newContent.Add($newLine)
}

# Ensure final brace
if ($newContent[$newContent.Count - 1] -ne "}") {
    $newContent.Add("}")
}

$newContent | Set-Content "$filePath.fixed" -Encoding UTF8
