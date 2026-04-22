import re

with open('.github/workflows/ci-cd.yml', 'r') as f:
    lines = f.readlines()

artifact_block = """      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-artifacts

      - name: Extract build artifacts
        run: tar -xzf build-artifacts.tar.gz

      - name: Start Next.js production server in background
        run: npm run start &
"""

artifact_block_no_start = """      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-artifacts

      - name: Extract build artifacts
        run: tar -xzf build-artifacts.tar.gz

"""

def replace_in_job(job_name, is_perf=False):
    global lines
    start_idx = -1
    for i, line in enumerate(lines):
        if line.startswith(f'  {job_name}'):
            start_idx = i
            break
    if start_idx == -1: return
    
    end_idx = len(lines)
    for i in range(start_idx + 1, len(lines)):
        if lines[i].startswith('  ') and not lines[i].startswith('    ') and not lines[i].startswith('   '):
            if re.match(r'^  [a-z0-9-]+:', lines[i]):
                end_idx = i
                break
                
    job_lines = lines[start_idx:end_idx]
    job_str = ''.join(job_lines)
    
    if job_name == 'smoke-auth:':
        job_str = re.sub(r'needs: smoke-http', r'needs: [smoke-http, build]', job_str)
    elif job_name == 'visual-regression-tests:':
        job_str = re.sub(r'needs: lint-and-typecheck', r'needs: [lint-and-typecheck, build]', job_str)
        
    if not is_perf:
        job_str = re.sub(
            r'      - name: Start Next\.js dev server in background\n        run: npm run dev &',
            artifact_block.rstrip(),
            job_str
        )
        job_str = re.sub(
            r'      - name: Start Next\.js dev server for Edge Cases\n        run: npm run dev &',
            artifact_block.rstrip(),
            job_str
        )
        job_str = re.sub(
            r'      - name: Start Next\.js dev server in background\n        run: NODE_OPTIONS="--max-old-space-size=2560" npm run dev &',
            artifact_block.rstrip(),
            job_str
        )
    else:
        # For performance, inject download before Setup env vars
        job_str = job_str.replace(
            '      - name: Setup environment variables',
            artifact_block_no_start + '      - name: Setup environment variables'
        )
            
    lines[start_idx:end_idx] = [job_str]

# Apply to all EXCEPT smoke-http
replace_in_job('smoke-auth:')
replace_in_job('e2e-tests:')
replace_in_job('edge-case-tests:')
replace_in_job('visual-regression-tests:')
replace_in_job('performance-tests:', is_perf=True)

with open('.github/workflows/ci-cd.yml', 'w') as f:
    f.writelines(lines)
    
print("Successfully patched ci-cd.yml precisely")
