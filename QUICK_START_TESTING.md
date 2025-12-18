# 🚀 Quick Start: Run Your First Test

## Prerequisites
✅ Development server running (`npm run dev`)  
✅ Playwright installed (`npm install` already done)  
✅ Chromium browser installed (already done)

---

## Step 1: Run Smoke Tests (2-3 minutes)

```bash
npm run test:smoke
```

This will:
- Test login for all user roles
- Verify key pages load correctly
- Check for console errors
- Generate a test report

**Expected Output**:
```
Running 8 tests using 1 worker

✓ [chromium] › smoke.spec.ts:6:3 › Smoke Tests › User can login as Job Giver (5s)
✓ [chromium] › smoke.spec.ts:13:3 › Smoke Tests › User can login as Installer (4s)
✓ [chromium] › smoke.spec.ts:20:3 › Smoke Tests › User can login as Admin (4s)
...

8 passed (30s)
```

---

## Step 2: View Test Report

```bash
npm run test:report
```

This opens an HTML report in your browser showing:
- ✅ Test results
- 📸 Screenshots
- 🎥 Videos (if any failures)
- 📊 Timeline

---

## Step 3: Run Full E2E Test (15-20 minutes)

```bash
npm run test:full
```

This runs the complete transaction cycle:
1. Job Posting
2. Bidding
3. Award
4. Acceptance
5. Payment
6. Work Submission
7. Payment Release
8. Review
9. Admin Verification

**Note**: This test takes longer because it includes payment gateway interactions.

---

## 🐛 If Tests Fail

### Check Development Server
```bash
# Make sure dev server is running
npm run dev
```

### Check Browser Console
```bash
# Run in headed mode to see browser
npm run test:e2e:headed
```

### Debug Mode
```bash
# Step through tests
npm run test:debug
```

---

## 📊 Understanding Test Results

### ✅ Green = Pass
All assertions passed, no errors

### ❌ Red = Fail
Test failed, check:
- Error message
- Screenshot
- Video recording
- Trace

### ⏭️ Skipped
Test was skipped (not applicable)

---

## 🎯 Next Steps

1. ✅ Run smoke tests
2. ✅ View report
3. ✅ Fix any failures
4. ✅ Run full E2E test
5. ✅ Add tests to CI/CD

---

## 💡 Tips

- **Run smoke tests frequently** - Quick validation
- **Run full tests before PR** - Comprehensive check
- **Use UI mode for exploration** - `npm run test:e2e:ui`
- **Check reports after failures** - Detailed debugging info

---

## 📚 More Information

- `TESTING_GUIDE.md` - Complete testing documentation
- `E2E_TESTING_GUIDE.md` - Manual testing procedures
- `ADVANCED_TEST_SCENARIOS.md` - Edge cases

---

**Ready to test?** Run: `npm run test:smoke` 🚀
