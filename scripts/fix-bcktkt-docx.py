# -*- coding: utf-8 -*-
import shutil
import win32com.client
from pathlib import Path

SRC_DIR = Path(r"E:\PharmaCore\docs\sua")
SRC = next(p for p in SRC_DIR.glob("*.docx") if "da sua" not in p.name.lower())
OUT = SRC_DIR / "06.7.BCKTKT_Nen tang quan tri tap trung SVH - da sua chinh ta v2.docx"

REPLACEMENTS = [
    ("ngànhvăn", "ngành văn"),
    ("lĩnh vựcmà", "lĩnh vực mà"),
    ("kiêm nhiệm nhiệm", "kiêm nhiệm"),
    ("phù hợp với phù hợp với", "phù hợp với"),
    ("gồm77", "gồm 77"),
    ("thạc sỹ", "thạc sĩ"),
    ("tiến sỹ", "tiến sĩ"),
    ("Uỷ ban", "Ủy ban"),
    ("Uỷ quyền", "Ủy quyền"),
    ("uỷ quyền", "ủy quyền"),
    ("văn hoá", "văn hóa"),
    ("Văn hoá", "Văn hóa"),
    ("được  đưa", "được đưa"),
    ("NĐ-CР", "NĐ-CP"),
    ("quản tri", "quản trị"),
    ("hàng hoá", "hàng hóa"),
    ("hàng hóa", "hàng hóa"),
    ("Thời gian thực hiện", "Thời gian thực hiện"),
    ("Tổ chức tư vấn lập", "Tổ chức tư vấn lập"),
    ("CÁC TỪ NGỮ VIẾT TẮT VÀ CÁC KHÁI NIỆM", "CÁC TỪ NGỮ VIẾT TẮT VÀ CÁC KHÁI NIỆM"),
]

WD_REPLACE_ALL = 2
WD_COLLAPSE_END = 0
WD_STYLE_HEADING_1 = -2


def replace_all(doc, find_text: str, replace_text: str):
    find = doc.Content.Find
    find.ClearFormatting()
    find.Replacement.ClearFormatting()
    find.Text = find_text
    find.Replacement.Text = replace_text
    find.Forward = True
    find.Wrap = 1
    find.Format = False
    find.MatchCase = False
    find.MatchWholeWord = False
    find.Execute(Replace=WD_REPLACE_ALL)


def apply_heading_styles(doc):
    for para in doc.Paragraphs:
        text = para.Range.Text.strip()
        if text.startswith("CHƯƠNG "):
            try:
                para.Style = WD_STYLE_HEADING_1
            except Exception:
                pass


def insert_toc(doc):
    search = doc.Content
    sf = search.Find
    sf.ClearFormatting()
    sf.Text = "MỤC LỤC"
    if not sf.Execute():
        return
    insert_at = search.Duplicate
    insert_at.Collapse(WD_COLLAPSE_END)
    insert_at.InsertParagraphAfter()
    insert_at.Collapse(WD_COLLAPSE_END)
    if doc.TablesOfContents.Count == 0:
        doc.TablesOfContents.Add(
            Range=insert_at,
            UseHeadingStyles=True,
            UpperHeadingLevel=1,
            LowerHeadingLevel=3,
            IncludePageNumbers=True,
        )
    doc.TablesOfContents(1).Update()
    doc.Fields.Update()


def main():
    if OUT.exists():
        OUT.unlink()
    shutil.copy2(SRC, OUT)

    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    doc = word.Documents.Open(str(OUT), False, False, False)
    try:
        for old, new in REPLACEMENTS:
            replace_all(doc, old, new)
        apply_heading_styles(doc)
        insert_toc(doc)
        doc.Save()
    finally:
        doc.Close()
        word.Quit()

    Path(r"E:\PharmaCore\.tmp\docx-fix-log.txt").write_text(
        f"OUT={OUT}\nSIZE={OUT.stat().st_size}\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
