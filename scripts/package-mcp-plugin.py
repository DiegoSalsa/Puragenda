"""Create a reproducible, credentials-free plugin ZIP from its reviewed source."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parents[1]
source = root / "plugins" / "puragenda"
version = json.loads((source / "plugin.json").read_text(encoding="utf-8"))["version"]
destination = root / "dist" / f"puragenda-plugin-{version}.zip"
destination.parent.mkdir(exist_ok=True)
with ZipFile(destination, "w", compression=ZIP_DEFLATED) as archive:
    for item in sorted(source.rglob("*")):
        if not item.is_file():
            continue
        if item.is_symlink() or item.name.startswith(".env"):
            raise ValueError("Unexpected plugin member")
        info = ZipInfo(item.relative_to(source).as_posix(), (2026, 1, 1, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, item.read_bytes())
with ZipFile(destination) as archive:
    assert archive.testzip() is None
    assert "plugin.json" in archive.namelist() and "mcp.json" in archive.namelist()
print(f"{destination}\nSHA-256 {hashlib.sha256(destination.read_bytes()).hexdigest()}")
