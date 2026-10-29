"""Erzeugt die Icons der Erweiterung (reines Python, ohne Bibliotheken).
Motiv: zwei Leitlinien mit Kerbe, dazwischen ein Wortbalken mit rotem Fixierungspunkt.
Aufruf: python3 tools/make_icons.py extension/icons
"""
import struct
import sys
import zlib

BG = (29, 29, 31)
FG = (242, 242, 242)
RED = (214, 38, 28)
SS = 4  # Supersampling für weiche Kanten


def shape(x, y):
    """Farbe an Position (0..1) oder None für transparent."""
    r = 0.2  # Eckenradius
    cx = min(max(x, r), 1 - r)
    cy = min(max(y, r), 1 - r)
    if (x - cx) ** 2 + (y - cy) ** 2 > r * r:
        return None
    axis = 0.40
    # Leitlinien oben und unten, mit Kerbe auf der Achse
    for ly, ny0, ny1 in ((0.20, 0.20, 0.31), (0.80, 0.69, 0.80)):
        if 0.12 <= x <= 0.88 and abs(y - ly) <= 0.035:
            return FG
        if abs(x - axis) <= 0.035 and ny0 <= y <= ny1:
            return FG
    # Wort: Balken links und rechts, roter Buchstabe auf der Achse
    if 0.40 <= y <= 0.60:
        if abs(x - axis) <= 0.08:
            return RED
        if 0.16 <= x <= axis - 0.12 or axis + 0.12 <= x <= 0.84:
            return FG
    return BG


def render(size):
    rows = []
    n = SS * SS
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            r = g = b = cov = 0
            for sy in range(SS):
                for sx in range(SS):
                    c = shape((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size)
                    if c:
                        r += c[0]
                        g += c[1]
                        b += c[2]
                        cov += 1
            if cov:
                row += bytes([r // cov, g // cov, b // cov, 255 * cov // n])
            else:
                row += bytes(4)
        rows.append(bytes(row))

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


if __name__ == "__main__":
    out = sys.argv[1]
    for s in (16, 32, 48, 128):
        with open(f"{out}/icon{s}.png", "wb") as f:
            f.write(render(s))
    print("Icons geschrieben nach", out)
