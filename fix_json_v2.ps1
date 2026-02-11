$filePath = "C:\Users\hp\Documents\DoDo\src\i18n\locales\en.json"
$content = Get-Content $filePath
$newContent = New-Object System.Collections.Generic.List[string]

# Copy lines 1-1249
for ($i = 0; $i -lt 1249; $i++) {
    $newContent.Add($content[$i])
}

# Line 1250 should have a comma (closing profile)
$line1250 = $content[1249] -replace ",$", ""
$newContent.Add($line1250 + ",")

# Now process everything from 1251 onwards
# We want to re-indent everything so that the top-level keys start at 4 spaces.
# In the current corrupted file, top-level keys like verifyInstaller were at 16 or 12 spaces.
# We will find the minimum indentation in the remaining block and shift everything accordingly.

$remainingLines = $content[1250..($content.Count - 1)]
$minIndent = 1000
foreach ($line in $remainingLines) {
    if ($line.Trim().Length -gt 0) {
        $indent = ($line -replace "^( *).*", "$1").Length
        if ($indent -lt $minIndent) { $minIndent = $indent }
    }
}

# We want $minIndent to become 4.
$shift = 4 - $minIndent

foreach ($line in $remainingLines) {
    if ($line.Trim().Length -gt 0) {
        if ($shift -lt 0) {
            $absShift = [math]::Abs($shift)
            $newLine = $line -replace "^ {$absShift}", ""
        }
        else {
            $newLine = (" " * $shift) + $line
        }
        $newContent.Add($newLine)
    }
    else {
        $newContent.Add("")
    }
}

# Ensure root brace is at the very end at 0 indentation
# Look for the last line and if it's not "}", add it.
if ($newContent[$newContent.Count - 1].Trim() -ne "}") {
    $newContent.Add("}")
}

$newContent | Set-Content "$filePath.fixed.3" -Encoding UTF8
