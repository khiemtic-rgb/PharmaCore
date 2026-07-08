import win32com.client
from pathlib import Path

p = next(x for x in Path(r"E:\PharmaCore\docs\sua").glob("*.docx") if "da sua" not in x.name.lower())
w = win32com.client.Dispatch("Word.Application")
w.Visible = False
w.DisplayAlerts = 0
d = w.Documents.Open(str(p), False, True, False)

lines = [
    f"ProtectionType={d.ProtectionType}",
    f"Content_sy={d.Content.Text.count('thạc sỹ')}",
    f"Content_hoa_old={d.Content.Text.count('văn hoá')}",
    f"Paragraphs={d.Paragraphs.Count}",
]

rng = d.StoryRanges(1)
sy = 0
while rng:
    sy += rng.Text.count("thạc sỹ")
    rng = rng.NextStoryRange
lines.append(f"AllStories_sy={sy}")

d.Close(False)
w.Quit()
Path(r"E:\PharmaCore\.tmp\doc-inspect.txt").write_text("\n".join(lines), encoding="utf-8")
