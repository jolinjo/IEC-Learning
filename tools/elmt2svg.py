#!/usr/bin/env python3
"""將 QElectroTech 元件檔(.elmt)轉為教材用 SVG。

用法: python3 elmt2svg.py input.elmt output.svg [顏色]
- 轉換 line/polygon/rect/circle/ellipse/arc 圖元
- terminal 畫成小空心圓(端子)、略過 dynamic_text
- 顏色預設 #8a8a8a(深淺色主題皆可讀)
"""
import re, sys, math
import xml.etree.ElementTree as ET

SCALE = 3          # elmt 座標 → SVG 放大倍率
MAX_H = 110        # 顯示高度上限(px):讓大小元件在表格中視覺一致
MARGIN = 6         # viewBox 外框留白(elmt 單位)

def stroke_width(style):
    # 對應 QET 原生線寬:thin 細線、normal 1px、hight 粗線
    if 'line-weight:thin' in (style or ''):
        return 0.7
    if 'line-weight:hight' in (style or ''):
        return 2.0
    return 1.0


def stroke_color(style):
    """取出元件自帶顏色;黑色回傳 None(交給主題自適應樣式)。"""
    m = re.search(r'color:([^;"]+)', style or '')
    if not m or m.group(1) in ('black', '#000000', '#000'):
        return None
    return m.group(1)

def dash(style):
    if 'line-style:dashed' in (style or ''):
        return '6 4'
    if 'line-style:dotted' in (style or ''):
        return '2 3'
    return None

def convert(src, dst):
    root = ET.parse(src).getroot()
    desc = root.find('description')
    shapes, xs, ys = [], [], []

    def track(*pts):
        for x, y in pts:
            xs.append(x); ys.append(y)

    for el in desc:
        tag = el.tag
        st = el.get('style', '')
        attrs = {'stroke-width': stroke_width(st)}
        c = stroke_color(st)
        if c:
            attrs['color'] = c
        d = dash(st)
        if d:
            attrs['stroke-dasharray'] = d
        if tag == 'line':
            x1, y1 = float(el.get('x1')), float(el.get('y1'))
            x2, y2 = float(el.get('x2')), float(el.get('y2'))
            shapes.append(('line', {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2, **attrs}))
            track((x1, y1), (x2, y2))
        elif tag == 'polygon':
            pts = []
            i = 1
            while el.get(f'x{i}') is not None:
                pts.append((float(el.get(f'x{i}')), float(el.get(f'y{i}'))))
                i += 1
            closed = el.get('closed', 'true') != 'false'
            shapes.append(('polyline', {'points': pts, 'closed': closed, **attrs}))
            track(*pts)
        elif tag == 'rect':
            x, y = float(el.get('x')), float(el.get('y'))
            w, h = float(el.get('width')), float(el.get('height'))
            shapes.append(('rect', {'x': x, 'y': y, 'width': w, 'height': h, **attrs}))
            track((x, y), (x + w, y + h))
        elif tag in ('circle', 'ellipse'):
            x, y = float(el.get('x')), float(el.get('y'))
            if tag == 'circle':
                dia = float(el.get('diameter'))
                w = h = dia
            else:
                w, h = float(el.get('width')), float(el.get('height'))
            shapes.append(('ellipse', {'cx': x + w / 2, 'cy': y + h / 2,
                                       'rx': w / 2, 'ry': h / 2, **attrs}))
            track((x, y), (x + w, y + h))
        elif tag == 'arc':
            # Qt 慣例:start/angle 以度為單位,正值=逆時針(視覺上,y 向下座標系)
            x, y = float(el.get('x')), float(el.get('y'))
            w, h = float(el.get('width')), float(el.get('height'))
            start, span = float(el.get('start')), float(el.get('angle'))
            cx, cy, rx, ry = x + w / 2, y + h / 2, w / 2, h / 2
            def pt(deg):
                r = math.radians(deg)
                return cx + rx * math.cos(r), cy - ry * math.sin(r)
            p1, p2 = pt(start), pt(start + span)
            large = 1 if abs(span) > 180 else 0
            sweep = 0 if span > 0 else 1
            shapes.append(('path', {'d': f'M {p1[0]:.2f} {p1[1]:.2f} '
                                        f'A {rx:.2f} {ry:.2f} 0 {large} {sweep} '
                                        f'{p2[0]:.2f} {p2[1]:.2f}', **attrs}))
            track((x, y), (x + w, y + h))
        elif tag == 'text':
            # 靜態文字是符號的一部分(馬達的 M、電表的 V/A、端子標字)
            x, y = float(el.get('x')), float(el.get('y'))
            content = el.get('text', '')
            if not content.strip() or content.startswith('Form'):
                continue  # 略過空字與多形式元件的「Form 1 / Forme 1」標註
            font = el.get('font', '')
            try:
                size = float(font.split(',')[1])
            except (IndexError, ValueError):
                size = 9.0
            rot = float(el.get('rotation', 0) or 0)
            tshape = {'x': x, 'y': y, 'text': content, 'size': size, 'rotation': rot}
            tc = el.get('color')
            if tc and tc not in ('black', '#000000', '#000'):
                tshape['color'] = tc
            shapes.append(('text', tshape))
            track((x, y - size), (x + size * 0.7 * max(len(content), 1), y))
        # terminal/dynamic_text/input 略過:
        # 端子在正式圖面上不顯示(畫出來會被誤讀成連接點),動態文字為代號欄位

    if not xs:
        sys.exit(f'{src}: 無可轉換圖元')
    x0, y0 = min(xs) - MARGIN, min(ys) - MARGIN
    vw, vh = max(xs) - min(xs) + 2 * MARGIN, max(ys) - min(ys) + 2 * MARGIN

    scale = min(SCALE, MAX_H / vh)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" '
           f'viewBox="{x0:.1f} {y0:.1f} {vw:.1f} {vh:.1f}" '
           f'width="{vw * scale:.0f}">',
           # 深淺主題自適應:淺色底用深灰、深色底用亮灰;元件自帶色以 inline style 保留
           '  <style>',
           '    g.sym { stroke:#3f3f3f; fill:none; stroke-linecap:round; stroke-linejoin:round }',
           '    g.sym text { stroke:none; fill:#3f3f3f }',
           '    @media (prefers-color-scheme: dark) {',
           '      g.sym { stroke:#c9c9c9 }',
           '      g.sym text { fill:#c9c9c9 }',
           '    }',
           '  </style>',
           '  <g class="sym">']
    for kind, a in shapes:
        sw = a.pop('stroke-width', 1)
        extra = f' stroke-dasharray="{a.pop("stroke-dasharray")}"' if 'stroke-dasharray' in a else ''
        col = a.pop('color', None)
        if col:
            extra += f' style="{"fill" if kind == "text" else "stroke"}:{col}"'
        if kind == 'line':
            out.append(f'    <line x1="{a["x1"]}" y1="{a["y1"]}" x2="{a["x2"]}" y2="{a["y2"]}" stroke-width="{sw}"{extra}/>')
        elif kind == 'polyline':
            pts = ' '.join(f'{x},{y}' for x, y in a['points'])
            tag = 'polygon' if a['closed'] else 'polyline'
            out.append(f'    <{tag} points="{pts}" stroke-width="{sw}"{extra}/>')
        elif kind == 'rect':
            out.append(f'    <rect x="{a["x"]}" y="{a["y"]}" width="{a["width"]}" height="{a["height"]}" stroke-width="{sw}"{extra}/>')
        elif kind == 'ellipse':
            out.append(f'    <ellipse cx="{a["cx"]}" cy="{a["cy"]}" rx="{a["rx"]}" ry="{a["ry"]}" stroke-width="{sw}"{extra}/>')
        elif kind == 'path':
            out.append(f'    <path d="{a["d"]}" stroke-width="{sw}"{extra}/>')
        elif kind == 'text':
            # QET 文字 y 即基線;字級為 pt,轉 px 需 ×4/3(以單相/三相馬達 M 置中驗證)
            bx, by, size = a['x'], a['y'], a['size']
            rot = f' transform="rotate({a["rotation"]} {bx} {by})"' if a['rotation'] else ''
            esc = (a['text'].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))
            out.append(f'    <text x="{bx}" y="{by:.1f}" font-size="{size * 4 / 3:.1f}" '
                       f'font-family="sans-serif"{rot}{extra}>{esc}</text>')
    out += ['  </g>', '</svg>', '']
    with open(dst, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    print(f'{src} -> {dst}')

if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2])
