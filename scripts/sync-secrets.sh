#!/bin/bash

# Automates uploading secrets from .env.local to GitHub Actions
# Falls back to printing secrets if 'gh' CLI is not available.

envFile=".env.local"
if [ ! -f "$envFile" ]; then
    echo "Error: $envFile not found!" >&2
    exit 1
fi

gh_installed=false
if command -v gh &> /dev/null; then
    gh_installed=true
fi

if [ "$gh_installed" = false ]; then
    echo "Warning: GitHub CLI ('gh') not found in PATH." >&2
    echo "Running in FALLBACK MODE: Printing secrets to console." >&2
    echo "Please manually add these to: Settings -> Secrets and variables -> Actions"
    echo "---------------------------------------------------"
else
    echo "Found GitHub CLI. Attempting to sync secrets..."
    echo "Checking auth status..."
    gh auth status
fi

# Read file line by line
while IFS= read -r line || [[ -n "$line" ]]; do
    # Trim leading/trailing whitespace
    line=$(echo "$line" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')

    # Ignore comments and empty lines
    if [ -n "$line" ] && [[ ! "$line" =~ ^# ]]; then
        # Check for presence of '='
        if [[ "$line" == *"="* ]]; then
            key=$(echo "$line" | cut -d '=' -f 1)
            value=$(echo "$line" | cut -d '=' -f 2-)

            # Filter for keys we care about
            if [[ "$key" =~ NEXT_PUBLIC_FIREBASE || "$key" =~ NEXT_PUBLIC_GOOGLE_MAPS || "$key" =~ CASHFREE || "$key" =~ SENTRY ]]; then
                if [ "$gh_installed" = true ]; then
                    echo "Syncing secret: $key"
                    echo "$value" | gh secret set "$key"
                else
                    echo "---------------------------------------------------"
                    echo -e "\e[33m$key\e[0m" # Yellow color for key
                    echo "$value"
                fi
            fi
        fi
    fi
done < "$envFile"

echo "---------------------------------------------------"
echo -e "\e[32mOperation complete!\e[0m" # Green color for complete
