# pet-forge Public Audit Checklist

Use this checklist before publishing or releasing pet-forge.

## Scope

Audit the repository as a standalone open-source toolkit for building SVG/APNG desktop pets. The public repository must not depend on private local paths, private project checkouts, personal accounts, or unpublished assets.

## Required Checks

1. **Personal information**
   - No personal names, nicknames, handles, email addresses, local usernames, or private machine paths.
   - No references to private directories such as Windows drive paths or user home directories.

2. **Repository usability**
   - README quick start commands run from the paths shown.
   - `routes/apng/tools/package.json` declares all Node dependencies.
   - `.env.example` contains only placeholder keys and no real secrets.
   - Generated files, `node_modules`, `.env`, and caches are ignored.

3. **Documentation consistency**
   - README, SKILL, CLAUDE, route docs, and shared docs describe the same SVG/APNG split.
   - State counts and A/B/C loop classifications match `routes/apng/prompts/template.js`.
   - No document claims a private source file is available to public users.

4. **License boundary**
   - Public docs distinguish reusable methodology/tools from any private product assets.
   - Copied or adapted code keeps appropriate attribution and license notes.

5. **Tool entry points**
   - `npm test --prefix routes/apng/tools` passes without making external API calls.
   - `node gen-video.js` prints help without missing modules.
   - `node gen-images.js --list` prints the state list.
   - `node test-api.js` handles missing API keys gracefully.
   - Python helper scripts print `--help` without importing project-specific paths.

## Output Format

Report findings in this order:

1. **Must Fix**: privacy leaks, secrets, broken quick start, incorrect license claims.
2. **Should Fix**: confusing public docs, stale private-project references, unclear commands.
3. **Verified**: commands and files checked successfully.
