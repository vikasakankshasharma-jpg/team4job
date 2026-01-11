#!/bin/bash
# Script to create test admin account
# Run this once to set up test environment

curl -X POST http://localhost:3000/api/e2e/setup-installer \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin-test@team4job.com",
    "password": "Test@1234",
    "isAdmin": true
  }'
