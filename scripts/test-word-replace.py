import shutil
import win32com.client
from pathlib import Path

src = next(p for p in Path(r"E:\PharmaCore\docs\sua").glob("*.docx") if "da sua" not in p.name.lower())
test = Path(r"E:\PharmaCore\docs\sua\_spell-test.docx")
if test.exists():
    test.unlink()
shutil.copy2(src, test)

w = win32com.client.Dispatch("Word.Application")
w.Visible = False
w.DisplayAlerts = 0
d = w.Documents.Open(str(test), False, False, False)

lines = []
for method in ("named", "positional", "selection"):
    if method != "named":
        shutil.copy2(src, test)
        d.Close(False)
        d = w.Documents.Open(str(test), False, False, False)

    if method == "named":
        f = d.Content.Find
        f.ClearFormatting()
        f.Replacement.ClearFormatting()
        ok = f.Execute(
            FindText="thạc sỹ",
            ReplaceWith="thạc sĩ",
            Replace=2,
            Forward=True,
            Wrap=1,
        )
    elif method == "positional":
        f = d.Content.Find
        f.ClearFormatting()
        f.Replacement.ClearFormatting()
        ok = f.Execute("thạc sỹ", False, False, False, False, False, True, 1, False, "thạc sĩ", 2)
    else:
        w.Selection.WholeStory()
        f = w.Selection.Find
        f.ClearFormatting()
        f.Replacement.ClearFormatting()
        ok = f.Execute("thạc sỹ", False, False, False, False, False, True, 1, False, "thạc sĩ", 2)

    lines.append(
        f"{method}: execute={ok}, sy={d.Content.Text.count('thạc sỹ')}, si={d.Content.Text.count('thạc sĩ')}"
    )

d.Close(False)
w.Quit()
test.unlink(missing_ok=True)
Path(r"E:\PharmaCore\.tmp\spell-test.txt").write_text("\n".join(lines), encoding="utf-8")
