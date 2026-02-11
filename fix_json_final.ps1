$filePath = "C:\Users\hp\Documents\DoDo\src\i18n\locales\en.json"
$content = [System.IO.File]::ReadAllLines($filePath)
$newContent = New-Object System.Collections.Generic.List[string]

# Copy lines 1-1249
for ($i = 0; $i -lt 1249; $i++) {
    $newContent.Add($content[$i])
}

# Line 1250 should have a comma
$line1250 = $content[1249].TrimEnd(",")
$newContent.Add($line1250 + ",")

# Zone 1: 1251 to 2024 (i=1250 to 2023) - Remove 12 spaces
for ($i = 1250; $i -lt 2024; $i++) {
    $line = $content[$i]
    $newLine = $line -replace "^ {12}", ""
    $newContent.Add($newLine)
}

# Zone 2: 2025 to end (i=2024 to end) - Remove 8 spaces
for ($i = 2024; $i -lt $content.Count; $i++) {
    $line = $content[$i]
    $newLine = $line -replace "^ {8}", ""
    $newContent.Add($newLine)
}

# Ensure root closure
if ($newContent[$newContent.Count - 1].Trim() -ne "}") {
    $newContent.Add("}")
}

# Write without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines("$filePath.fixed.final", $newContent, $utf8NoBom)
