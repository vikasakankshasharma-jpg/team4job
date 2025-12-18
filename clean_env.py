import os, re
def clean():
    path = '.env.local'
    if not os.path.exists(path): return
    raw = open(path, 'rb').read()
    # Remove null bytes which were introduced by PowerShell encoding mismatches
    raw = raw.replace(b'\x00', b'')
    # Remove UTF-8 BOM
    if raw.startswith(b'\xef\xbb\xbf'):
        raw = raw[3:]
    
    content = raw.decode('utf-8', errors='ignore')
    
    # Remove all variations of the key
    content = re.sub(r'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[^\s\n\r]*', '', content)
    
    lines = content.splitlines()
    clean_lines = [l.strip() for l in lines if l.strip()]
    clean_lines.append('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyAhKb0H_hwdg32gkS08GR3sFD9qi_bHvSY"')
    
    # Write back a clean UTF-8 file without BOM
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(clean_lines) + '\n')
    print("Deep cleaned .env.local (removed null bytes)")

if __name__ == "__main__":
    clean()
