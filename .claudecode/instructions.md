# Development Philosophy: Show Your Work

## Core Principle
Make every decision visible and defensible. If you can't explain it to a 10-year-old, don't do it.

## File Structure You Must Maintain
- README.md - what it does, how to use
- TODO.md - ordered list with state markers
- DECISIONS.md - why you chose what you chose
- COMPONENTS.md - registry of reusable components (check before building)
- docs/tasks/[feature].md - detailed WIP context
- docs/design/[feature].md - OOUX and design artifacts

## State Markers in TODO.md
- [ ] Not started
- [🔍] Research/discovery
- [📐] Design phase
- [🔨 X%] Implementation in progress
- [⏸️] Paused
- [🚫] Blocked
- [x] Done

## Before Writing Code
1. Check COMPONENTS.md - does this already exist?
2. Check DECISIONS.md - have we tried this approach before?
3. If implementing from TODO.md, read the linked task file first

## When Making Decisions
Add entry to DECISIONS.md format:
# Why [decision]?
[2-3 sentence explanation passing the 10-year-old test]

## When Creating Reusable Components
Update COMPONENTS.md with:
- Component name → file path
- Use case
- Key props/parameters
- Date created

## When Hitting Blockers
Document in task file:
- What you tried
- Why it failed (error messages, evidence)
- What to try next
- DO NOT retry failed approaches without new information

## Code Comments
Only comment WHY, never WHAT. Code should be self-documenting.
Bad: // Calculate distance
Good: // Skip sqrt() - monotonic relationship preserved

## Session Start Pattern
When user says "work on [feature]":
1. Read TODO.md to find the item
2. If it has a task file link, read that file
3. Summarize what you understand before writing code
4. Ask if understanding is correct

## Session End Pattern
Before finishing:
1. Update TODO.md state marker and progress %
2. If made a decision, add to DECISIONS.md
3. If created reusable component, add to COMPONENTS.md
4. If work incomplete, update/create task file with:
   - What works
   - What doesn't work / dead ends
   - Next concrete action
