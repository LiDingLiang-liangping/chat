# -*- coding: utf-8 -*-
"""把 world_new.html 拆成 world_new/index.html + css/style.css + js/*.js，
并同步改 index.html / world.html 链接与版本记录。"""
import re, os, sys

SRC, OUT = "world_new.html", "world_new"
VER, DATE = "V.T-20261125-2213", "2026-11-25 22:13"

s = open(SRC, encoding="utf-8").read()

# ---- CSS ----
m = re.search(r"<style>(.*?)</style>", s, re.S)
if not m:
    sys.exit("no <style> block")
css_block, css_code = m.group(0), m.group(1)

# ---- JS 模块 ----
mods = []
for mm in re.finditer(r"<script>(.*?)</script>", s, re.S):
    body = mm.group(1)
    tag = re.match(r"\s*/\* ==== ([A-Za-z0-9._-]+) ==== \*/", body)
    if not tag:
        sys.exit("missing module marker: " + body[:60])
    name = tag.group(1)
    code = body[tag.end():].lstrip("\n")
    mods.append((name, code, mm.group(0)))

# ---- 新 index.html ----
html = s.replace(css_block, "{{CSS}}", 1)
for name, code, whole in mods:
    html = html.replace(whole, "{{JS:%s}}" % name, 1)
html = html.replace("{{CSS}}", '<link rel="stylesheet" href="css/style.css">')
for name, code, whole in mods:
    html = html.replace("{{JS:%s}}" % name, '<script src="js/%s"></script>' % name)

os.makedirs(OUT + "/css", exist_ok=True)
os.makedirs(OUT + "/js", exist_ok=True)
open(OUT + "/css/style.css", "w", encoding="utf-8").write(css_code)
for name, code, whole in mods:
    open(OUT + "/js/" + name, "w", encoding="utf-8").write(code)
open(OUT + "/index.html", "w", encoding="utf-8").write(html)

# ---- 改 index.html 入口链接与版本号 ----
idx = open("index.html", encoding="utf-8").read()
old = "const worldUrl=`world.html?room=${rid}-world&name=${nameQ}`;"
new = "const worldUrl=`world_new/index.html?room=${rid}-world&name=${nameQ}`;"
if idx.count(old) != 1:
    sys.exit("index.html worldUrl anchor not found")
idx = idx.replace(old, new)
if "index · V.T-20261125-2156" not in idx:
    sys.exit("index.html version anchor not found")
idx = idx.replace("index · V.T-20261125-2156", "index · " + VER)
open("index.html", "w", encoding="utf-8").write(idx)

# ---- 改 world.html 版本选择页里的新版卡片 ----
w = open("world.html", encoding="utf-8").read()
if w.count("go('world_new.html')") != 1 or "world · V.T-20261117-2058" not in w:
    sys.exit("world.html anchor not found")
w = w.replace("go('world_new.html')", "go('world_new/index.html')")
w = w.replace("world · V.T-20261117-2058", "world · " + VER)
open("world.html", "w", encoding="utf-8").write(w)

# ---- 版本记录 ----
vr = open("VersionRecord.txt", encoding="utf-8").read()
lines = vr.split("\n")
for i, ln in enumerate(lines):
    if ln.startswith("index.html  V.T-20261125-2156"):
        lines[i] = "index.html  %s  %s  #世界入口指向 world_new/index.html" % (VER, DATE)
    elif ln.startswith("world.html  V.T-20261117-2058"):
        lines[i] = "world.html  %s  %s  版本页新版卡片指向 world_new/index.html" % (VER, DATE)
    elif ln.startswith("world_new.html V.T-20261117-2058"):
        lines[i] = ln + "\n世界版 world_new/index.html  %s  %s  world_new.html 拆分：css/style.css + js/*.js（14 模块）" % (VER, DATE)
open("VersionRecord.txt", "w", encoding="utf-8").write("\n".join(lines))

print("split ok: css %d bytes, %d js modules, index %d bytes" % (
    len(css_code.encode()), len(mods), len(html.encode())))
