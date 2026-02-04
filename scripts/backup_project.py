import zipfile
import os
import datetime

def zip_project():
    output_filename = "project_backup.zip"
    
    # Exclude list
    exclude_dirs = {
        'node_modules', '.git', '.next', '.firebase', 
        'playwright-report', 'test-results', '.vercel', '.idx', 'test-results'
    }
    
    print(f"Starting backup to {output_filename}...")
    
    file_count = 0
    try:
        with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk('.'):
                # Modify dirs in-place to skip excluded directories
                dirs[:] = [d for d in dirs if d not in exclude_dirs]
                
                for file in files:
                    if file.endswith('.zip'):
                        continue
                    
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, '.')
                    
                    try:
                        zipf.write(file_path, arcname)
                        file_count += 1
                        if file_count % 100 == 0:
                            print(f"Zipped {file_count} files...", flush=True)
                    except Exception as e:
                        print(f"could not zip {file_path}: {e}")
    except PermissionError:
        print(f"Permission denied accessing {output_filename}. Make sure it is not open.")
        return

    print(f"Backup complete. Total files: {file_count}")

if __name__ == "__main__":
    zip_project()
