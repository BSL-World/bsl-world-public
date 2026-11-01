"""Verify the two local candidate editions; never signs or publishes."""
import hashlib
import json
import re
import tomllib
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
package = json.loads((root / 'package.json').read_text(encoding='utf-8'))
version = package['version']
out = root / 'src-tauri/target/release-handoff' / version
lock = json.loads((root / 'package-lock.json').read_text(encoding='utf-8'))
config = json.loads((root / 'src-tauri/tauri.conf.json').read_text(encoding='utf-8'))
cargo = tomllib.loads((root / 'src-tauri/Cargo.toml').read_text(encoding='utf-8'))
cargolock = tomllib.loads((root / 'src-tauri/Cargo.lock').read_text(encoding='utf-8'))
versions = [lock['version'], lock['packages']['']['version'], config['version'],
            cargo['package']['version'],
            next(p['version'] for p in cargolock['package'] if p['name'] == 'bsl-timer')]
assert all(v == version for v in versions), versions
assert f"WHATS_NEW_VERSION = '{version}'" in (root / 'src/whats-new.js').read_text(encoding='utf-8')
assert 'glass-device' in cargo['features']['default']
hashes = {}
for edition in ('free', 'pro'):
    exe = out / f'bsl-timer_{version}_{edition}.exe'
    installer = out / f'bsl-timer_{version}_{edition}_x64-setup.exe'
    assert b'Optics setup:' in exe.read_bytes(), 'Native Glass backend missing'
    assert installer.stat().st_size > 1_000_000
    with zipfile.ZipFile(out / f'{edition}-dist.zip') as archive:
        assert archive.testzip() is None
        assert 'index.html' in archive.namelist()
        assert 'glass-device.html' not in archive.namelist()
        assert 'glass-optics.html' not in archive.namelist()
        sources = '\n'.join(archive.read(n).decode('utf-8')
                            for n in archive.namelist() if n.endswith('.js'))
        assert re.search(r'\.PRO===`' + edition + r'`', sources), 'Wrong frontend edition'
        assert version in sources and 'device-events-tooltip' in sources
        assert 'bsl-timer:glass-layout-request' in sources
        assert '\ufffd' not in sources
for path in sorted(out.iterdir()):
    if path.suffix in ('.exe', '.zip'):
        hashes[path.name] = hashlib.sha256(path.read_bytes()).hexdigest().upper()
assert hashes[f'bsl-timer_{version}_free.exe'] != hashes[f'bsl-timer_{version}_pro.exe']
existing = json.loads((out / 'sha256.json').read_text(encoding='utf-8-sig'))
assert hashes == existing, 'Artifact checksums changed'
print(json.dumps({'version': version, 'editions': ['free', 'pro'],
                  'versions_consistent': True, 'native_backend': True,
                  'production_frontends': True, 'checksums': hashes}, indent=2))
