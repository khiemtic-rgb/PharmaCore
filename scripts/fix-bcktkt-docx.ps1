$ErrorActionPreference = "Stop"

$srcDir = "E:\KitPlatform\docs\sua"
$src = Get-ChildItem $srcDir -Filter "*.docx" | Where-Object { $_.Name -notlike "*da sua*" } | Select-Object -First 1
if (-not $src) { throw "Khong tim thay file goc" }

$outPath = Join-Path $srcDir "06.7.BCKTKT_Nen tang quan tri tap trung SVH - da sua chinh ta.docx"
if (Test-Path $outPath) { Remove-Item $outPath -Force }
Copy-Item $src.FullName $outPath

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

    $replacements = @(
        @("ngànhvăn", "ngành văn"),
        @("lĩnh vựcmà", "lĩnh vực mà"),
        @("kiêm nhiệm nhiệm", "kiêm nhiệm"),
        @("phù hợp với phù hợp với", "phù hợp với"),
        @("gồm77", "gồm 77"),
        @("thạc sỹ", "thạc sĩ"),
        @("tiến sỹ", "tiến sĩ"),
        @("Uỷ ban", "Ủy ban"),
        @("Uỷ quyền", "Ủy quyền"),
        @("uỷ quyền", "ủy quyền"),
        @("văn hoá", "văn hóa"),
        @("Văn hoá", "Văn hóa"),
        @("được  đưa", "được đưa"),
        @("NĐ-CР", "NĐ-CP"),
        @("quản tri", "quản trị"),
        @("hàng hoá", "hàng hóa"),
        @("hàng hóa", "hàng hóa"),
        @("Thời gian thực hiện", "Thời gian thực hiện"),
        @("Tổ chức tư vấn lập", "Tổ chức tư vấn lập"),
        @("CÁC TỪ NGỮ VIẾT TẮT VÀ CÁC KHÁI NIỆM", "CÁC TỪ NGỮ VIẾT TẮT VÀ CÁC KHÁI NIỆM")
    )
    foreach ($pair in $replacements) {
        Invoke-WordReplaceAll -Doc $doc -FindText $pair[0] -ReplaceText $pair[1]
    }

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

