$filePath = "C:\Users\hp\Documents\DoDo\src\i18n\locales\en.json"
$content = [System.IO.File]::ReadAllLines($filePath)
$newContent = New-Object System.Collections.Generic.List[string]

# Copy lines 1-1249
for ($i = 0; $i -lt 1249; $i++) {
    $newContent.Add($content[$i])
}

# Line 1250 should have a comma (closing profile)
$line1250 = $content[1249].TrimEnd(",")
$newContent.Add($line1250 + ",")

# Now process everything from 1251 onwards
$remainingLines = $content[1250..($content.Count - 1)]
$minIndent = 1000
foreach ($line in $remainingLines) {
    if ($line.Trim().Length -gt 0) {
        $trimmed = $line.TrimStart()
        $indent = $line.Length - $trimmed.Length
        if ($indent -lt $minIndent) { $minIndent = $indent }
    }
}

# We want $minIndent to become 4.
$shift = 4 - $minIndent

foreach ($line in $remainingLines) {
    if ($line.Trim().Length -gt 0) {
        if ($shift -lt 0) {
            $absShift = [math]::Abs($shift)
            $newLine = $line.Substring([math]::Min($absShift, $line.Length))
            $newContent.Add($newLine)
        }
        else {
            $newLine = (" " * $shift) + $line
            $newContent.Add($newLine)
        }
    }
    else {
        $newContent.Add("")
    }
}

# Ensure root brace is at the very end at 0 indentation
if ($newContent[$newContent.Count - 1].Trim() -ne "}") {
    $newContent.Add("}")
}

# Write without BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines("$filePath.fixed.4", $newContent, $utf8NoBom)
