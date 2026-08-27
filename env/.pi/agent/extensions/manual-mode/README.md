# Manual Mode

A global pi extension that places approval gates in front of tool calls.

## Behavior

Manual mode starts disabled. When enabled:

- `read`, `grep`, `find`, `ls`, and `ask_user_question` run automatically.
- `bash`, `edit`, `write`, and all other unknown/custom tools require user approval before each execution.
- Non-interactive runs fail closed because no approval UI is available.
- The enabled state is stored in the current session and follows session-tree navigation.

## Usage

- `/manual` — toggle manual mode
- `/manual on` — enable it
- `/manual off` — disable it
- `/manual status` — show its current state
- `Ctrl+Alt+M` — toggle it
- `pi --manual` — start enabled when the session has no saved manual-mode state

Run `/reload` after editing the extension.

## Tests

```bash
node --test ~/.pi/agent/extensions/manual-mode/index.test.ts
```
