# Quick Browser QA Guide

## Run QA Tests in 3 Steps

### 1. Open Simulator with QA Flag
```
http://localhost:3000/?qa=true
```

### 2. Watch Console (F12)
The QA suite will automatically run and show results in console:
```
🧪 QA Mode Enabled - Running browser tests...
[QA] Starting Browser QA Tests...
[QA SUCCESS] All required buttons exist
[QA SUCCESS] Turn advanced correctly
✅ ALL TESTS PASSED!
📊 Report downloaded: qa-report-1739318400000.json
```

### 3. Check Results
- **Console:** Shows real-time test execution
- **JSON report:** Auto-downloads with detailed results
- **Visual:** If overlay is blocking, you'll see it

## What Gets Tested

| Test | What It Checks |
|------|----------------|
| Loading Overlay | Is hidden, doesn't block clicks |
| Required Buttons | All buttons exist in DOM |
| Button Clicks | Respond to interactions |
| Scenario Modal | Opens, shows JSON, closes |
| Turn Controls | Step button advances turn |
| Console Errors | Captures any JS errors |

## Common Bugs Detected

### 1. Overlay Blocking Clicks
```
❌ [QA ERROR] Loading overlay is still visible! This blocks all interactions.
```
**Fix:** Check if `hideLoading()` is called in `init()`

### 2. Missing Buttons
```
❌ [QA ERROR] Element #play-btn not found within 5000ms
```
**Fix:** Check HTML structure, button IDs, or CSS `display: none`

### 3. Module Import Errors
```
❌ [Browser Error] SyntaxError: The requested module does not provide export
```
**Fix:** Check all exports in modules, especially imports between engine files

## Troubleshooting

### QA Doesn't Run
- Check console for "QA Mode Enabled" message
- If missing, append `?qa=true` to URL
- Refresh page (Ctrl+F5)

### No Report Downloads
- Check browser popup blocker
- Allow downloads from localhost
- Check console for errors

### Tests Fail But No Clear Reason
- Look at `errorsDetail` in the JSON report
- Check browser DevTools Network tab for failed requests
- Verify card data loads (`data/*.json`)

## Manual Execution

If auto-run doesn't work, run manually in console:

```javascript
// Option 1: Simple run
window.qa.runAll()

// Option 2: Debug mode
window.qa.debug = true
window.qa.runAll()

// Option 3: Specific test
await window.qa.testBasicInteractions()
await window.qa.testScenarioLoading()
await window.qa.testGameControls()
```

## Integration with Cron

For automated QA, add this to your cron job script:

```bash
# 1. Start simulator server if not running
cd /home/deckie/.openclaw/workspace/pocket-tcg-simulator
npm run serve &

# 2. Wait for server to start
sleep 3

# 3. Open browser with QA flag (manual step for now)
# TODO: Automate with Playwright once installed

# echo "Please open http://localhost:3000/?qa=true in your browser"
```

## Next Steps

1. ✅ Test current fixes in browser with `?qa=true`
2. ⏳ Install Playwright for full automation: `npm install playwright`
3. ⏳ Integrate with cron job for nightly QA
4. ⏳ Add more specific UI tests (drag-drop, modals, etc.)

## Report Format

```json
{
  "timestamp": "2026-02-11T20:00:00.000Z",
  "totalChecks": 25,
  "errors": 0,
  "successes": 25,
  "errorsDetail": [],
  "results": [
    {
      "type": "success",
      "message": "All required buttons exist",
      "time": 1739318400000
    }
  ]
}
```

Downloaded report shows:
- ✅ Total checks executed
- ❌ Any errors found
- 📊 Success rate
- 🔍 Detailed error messages with context
