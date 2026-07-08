# -*- coding: utf-8 -*-
"""Fast BCKTKT fix: spelling via docx XML, TOC via minimal Word COM."""
from __future__ import annotations

import re
import shutil
import time
import zipfile
from datetime import datetime
from pathlib import Path

SRC_DIR = Path(r"E:\PharmaCore\docs\sua")
SRC = next(
    p
    for p in SRC_DIR.glob("*.docx")
    if "da sua" not in p.name.lower() and not p.name.startswith("~$") and not p.name.startswith("_")
)
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
OUT = SRC_DIR / f"06.7.BCKTKT_Nen tang quan tri tap trung SVH - da sua chinh ta ({STAMP}).docx"
LOG = Path(r"E:\PharmaCore\.tmp\docx-fix-fast-log.txt")

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
    ("hàng hoá", "hàng hóa"),
    ("Thời gian thực hiện", "Thời gian thực hiện"),
    ("Tổ chức tư vấn lập", "Tổ chức tư vấn lập"),
    ("CÁC TỪ NGỮ VIẾT TẮT VÀ CÁC KHÁI NIỆM", "CÁC TỪ NGỮ VIẾT TẮT VÀ CÁC KHÁI NIỆM"),
    ("dữ liệu  ", "dữ liệu "),
    ("cử nhân  ", "cử nhân "),
    ("  và ", " và "),
    ("Nguyên  ", "Nguyên "),
]

XML_PART_RE = re.compile(r"word/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$")
WD_REPLACE_ALL = 2
WD_COLLAPSE_END = 0
WD_STYLE_HEADING_1 = -2
CHAPTER_MARKERS = [
    "CHƯƠNG I.",
    "CHƯƠNG II.",
    "CHƯƠNG III.",
    "CHƯƠNG IV",
    "CHƯƠNG V",
    "CHƯƠNG VI.",
    "CHƯƠNG VII.",
    "CHƯƠNG VIII.",
    "CHƯƠNG IX.",
    "CHƯƠNG X.",
]


def apply_xml_replacements(docx_path: Path) -> int:
  changed = 0
  tmp = docx_path.with_suffix(".tmp.docx")
  with zipfile.ZipFile(docx_path, "r") as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
      data = zin.read(item.filename)
      if XML_PART_RE.search(item.filename):
        text = data.decode("utf-8")
        original = text
        for old, new in REPLACEMENTS:
          text = text.replace(old, new)
        if text != original:
          changed += 1
          data = text.encode("utf-8")
      zout.writestr(item, data)
  tmp.replace(docx_path)
  return changed


def update_toc_with_word(docx_path: Path) -> None:
  import win32com.client

  word = win32com.client.Dispatch("Word.Application")
  word.Visible = False
  word.DisplayAlerts = 0
  doc = None
  try:
    doc = word.Documents.Open(str(docx_path), False, False, False)

    for marker in CHAPTER_MARKERS:
      rng = doc.Content
      f = rng.Find
      f.ClearFormatting()
      f.Text = marker
      f.Forward = True
      f.Wrap = 0
      if f.Execute():
        try:
          rng.Paragraphs.Item(1).Style = WD_STYLE_HEADING_1
        except Exception:
          pass

    search = doc.Content
    sf = search.Find
    sf.ClearFormatting()
    sf.Text = "MỤC LỤC"
    sf.Forward = True
    sf.Wrap = 0
    if sf.Execute():
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
    doc.Save()
  finally:
    if doc is not None:
      doc.Close(False)
    word.Quit()


def main() -> None:
  t0 = time.time()
  shutil.copy2(SRC, OUT)
  xml_parts = apply_xml_replacements(OUT)
  update_toc_with_word(OUT)
  elapsed = round(time.time() - t0, 1)
  LOG.write_text(
    f"SRC={SRC.name}\nOUT={OUT.name}\nSIZE={OUT.stat().st_size}\nXML_PARTS_CHANGED={xml_parts}\nELAPSED_SEC={elapsed}\n",
    encoding="utf-8",
  )
  print(f"OK {OUT}")
  print(f"Elapsed: {elapsed}s")


if __name__ == "__main__":
  main()
