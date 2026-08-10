---
name: 15 Minutes Progress Tracker
description: Automatically prompts the agent to update a progress tracker every 15 minutes.
---

# 15 Minutes Progress Tracker

The "15 Minutes Progress Tracker" is a required project standard. It ensures continuous transparency and monitoring of ongoing tasks.

## Requirements
Whenever a long-running task or a sequence of complex tasks is active, you MUST set a background schedule using the `schedule` tool to trigger every 15 minutes:
- `CronExpression`: `*/15 * * * *`
- `Prompt`: `Update the 15_minutes_progress_tracker.md artifact.`
- `IsDaemon`: `false` (since it is monitoring active tasks).

## Artifact Format
When prompted by the timer (or manually by the user), you must update the `15_minutes_progress_tracker.md` artifact (or create it if it doesn't exist). 

The tracker MUST include:
1. **Timestamp of Update**: The current local time.
2. **Current Task**: What is actively being worked on right now.
3. **Estimated Time**: 
   - ETA for the current specific task.
   - ETA for the overall overhaul/goal.
4. **Good News**: Positive developments, successful tests, or completed milestones since the last update.
5. **Bad News**: Blockers, errors, regressions, or unexpected complexities discovered.
6. **Hanging Status Comparison**: A direct comparison with the last check to identify if the task is "hanging" (i.e., stuck on the same issue without meaningful progress). If it is hanging, explicitly state what strategy shift will be applied.

## Handling Interruptions
If the schedule fires while you are in the middle of executing another complex action, acknowledge the tracker update request in your thoughts, update the artifact as part of your ongoing tool calls, and continue your task without breaking the flow.
