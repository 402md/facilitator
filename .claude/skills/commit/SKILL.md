---
name: commit
description: Stage changes and create a conventional commit. Analyzes the diff, generates a commit message in English using conventional commits format, and commits. Use when the user invokes /commit or asks to commit changes.
---

# Commit

Analyze current changes and create a conventional commit in English.

## When to Use

- User invokes `/commit`
- User asks to commit their changes

## Instructions

Follow these steps in order:

### Step 1: Gather git context

Run these commands in parallel using Bash:

1. `git status` — see staged, unstaged, and untracked files
2. `git diff --cached` — see staged changes
3. `git diff` — see unstaged changes
4. `git log --oneline -5` — recent commits for context

### Step 2: Determine what to commit

- If there are **staged** changes, use those.
- If **nothing is staged**, stage all modified and untracked files that are relevant to the change. Prefer `git add <specific files>` over `git add .`. Never stage `.env`, credentials, or secrets.
- Read changed files if the diff alone is not enough to understand the intent.

### Step 3: Analyze the changes

Identify:

- **Type**: `feat`, `fix`, `chore`, `refactor`, `hotfix`, `docs`, `style`, `test`, `perf`, `ci`, `build`
- **Scope** (optional): the module or area affected (e.g., `auth`, `proxy`, `skill`)
- **Description**: what changed and why, in imperative mood

### Step 4: Generate the commit message

Rules:

- Format: `<type>(<scope>): <description>` or `<type>: <description>` if no clear scope
- Always in **English**
- Lowercase type and description start
- Imperative mood ("add", not "added" or "adds")
- No period at the end
- Minimum 10 characters total (enforced by commit-msg hook)
- **Never** add `Co-Authored-By` lines
- If changes span multiple concerns, suggest splitting into separate commits

### Step 5: Present and confirm

Show the user:

1. **Files to be committed** — list of staged files
2. **Proposed commit message** — in a code block

Ask the user to confirm before committing. If the user passed `--no-confirm` or `-y`, skip confirmation.

### Step 6: Commit

Run the commit using a HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
<commit message here>
EOF
)"
```

After committing, run `git status` to verify success and show the result.

### Arguments

- `--no-confirm` or `-y` — skip confirmation, commit directly
- `--amend` — amend the previous commit instead of creating a new one (only if user explicitly requests)
