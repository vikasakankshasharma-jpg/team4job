import subprocess
import time
import json
import sys

run_id = '32059921237'
print(f"Monitoring run {run_id}...")

while True:
    try:
        result = subprocess.run(
            ['gh', 'api', f'repos/vikasakankshasharma-jpg/team4job/actions/runs/{run_id}'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            status = data.get('status')
            conclusion = data.get('conclusion')
            print(f"Status: {status}, Conclusion: {conclusion}")
            if status == 'completed':
                print("Run finished!")
                break
        else:
            print("Error checking status")
    except Exception as e:
        print(e)
    
    time.sleep(60)
