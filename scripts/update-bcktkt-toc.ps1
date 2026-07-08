$ErrorActionPreference = "Stop"

$srcDir = "E:\KitPlatform\docs\sua"
$outPath = Join-Path $srcDir "06.7.BCKTKT_Nen tang quan tri tap trung SVH - da sua chinh ta.docx"
if (-not (Test-Path $outPath)) { throw "Chua co file: $outPath. Chay fix-bcktkt-docx.py truoc." }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

function Invoke-WordReplaceAll {
    param($Doc, [string]$FindText, [string]$ReplaceText)
    $find = $Doc.Content.Find
    $find.ClearFormatting()
    $find.Replacement.ClearFormatting()
    $find.Text = $FindText
    $find.Replacement.Text = $ReplaceText
    $find.Forward = $true
    $find.Wrap = 1
    $find.Format = $false
    $find.MatchCase = $false
    $find.MatchWholeWord = $false
    [void]$find.Execute($FindText, $false, $false, $false, $false, $false, $true, 1, $false, $ReplaceText, 2)
}

try {
    $doc = $word.Documents.Open($outPath, $false, $false, $false)

    $chapterStarts = @(
        "CHƯƠNG I.", "CHƯƠNG II.", "CHƯƠNG III.", "CHƯƠNG IV",
        "CHƯƠNG V", "CHƯƠNG VI.", "CHƯƠNG VII.", "CHƯƠNG VIII.",
        "CHƯƠNG IX.", "CHƯƠNG X."
    )
    foreach ($pattern in $chapterStarts) {
        $rng = $doc.Content
        $f = $rng.Find
        $f.ClearFormatting()
        $f.Text = $pattern
        $f.Forward = $true
        $f.Wrap = 1
        while ($f.Execute()) {
            try { $rng.Paragraphs.Item(1).Style = -2 } catch {}
            $rng.Collapse(0)
        }
    }

    $search = $doc.Content
    $sf = $search.Find
    $sf.ClearFormatting()
    $sf.Text = "MỤC LỤC"
    if ($sf.Execute()) {
        $insertAt = $search.Duplicate
        $insertAt.Collapse(0)
        $insertAt.InsertParagraphAfter() | Out-Null
        $insertAt.Collapse(0)
        if ($doc.TablesOfContents.Count -eq 0) {
            $null = $doc.TablesOfContents.Add($insertAt, $true, 1, 3, $true, "", $true, $true, "", $true, $true, 1)
        }
        $doc.TablesOfContents.Item(1).Update()
    }

    $doc.Fields.Update()
    $doc.Save()
    $doc.Close()
    Write-Host "[OK] Hoan tat: $outPath"
}
finally {
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
}

