import sys

error_counts = {}
warning_counts = {}

with open('lint-out.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if "error" in line or "warning" in line:
            parts = line.split()
            # typical format: 30:14 warning 'error' is defined but never used @typescript-eslint/no-unused-vars
            if len(parts) > 3:
                rule = parts[-1]
                if not rule.startswith('@') and not rule.startswith('react'):
                    if '/' not in rule and '-' not in rule:
                        continue # Probably not a rule name
                if 'error' in parts[1:3]:
                    error_counts[rule] = error_counts.get(rule, 0) + 1
                elif 'warning' in parts[1:3]:
                    warning_counts[rule] = warning_counts.get(rule, 0) + 1

print("ERRORS:")
for r, c in sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f"{c}\t{r}")
print("\nWARNINGS:")
for r, c in sorted(warning_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
    print(f"{c}\t{r}")
