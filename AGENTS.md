# Repository Guidelines

Quick reference for AI agents and developers. Detailed documentation: @agent-docs/

## 📝 Maintaining This Documentation (For AI Agents)

**When users request updates to repository guidelines:**

1. **Add content to `agent-docs/` folder**, NOT to this AGENTS.md file
2. **Choose the appropriate file** or create new file (`kebab-case.md`)
3. **Update AGENTS.md** to reference with @ notation: `@agent-docs/filename.md`
4. **Update Documentation Index table** if new file created
5. **Keep AGENTS.md concise** - index only

**When responding to queries:**

- If you load any `agent-docs/` files into context, explicitly state which files at the start of your response
- Example: "Loaded @agent-docs/testing-guidelines.md, @agent-docs/coding-standards.md"

---

## Documentation Index

| Topic | File | Description |
|-------|------|-------------|
| Project Structure | @agent-docs/project-structure.md | How the codebase is organized and APIs are routed. |
| Development | @agent-docs/development-commands.md | Commands for building, running, and testing. |
| Coding Standards | @agent-docs/coding-standards.md | Guidelines for consistent, testable, accessible code. |
| Testing | @agent-docs/testing-guidelines.md | Unit, integration, and cucumber-based end-to-end testing practices. |
| Git Workflow | @agent-docs/git-workflow.md | Commit and pull request structure. |
| Security | @agent-docs/security-config.md | Managing secrets and configuration safely. |
| Environment Variables | @agent-docs/environment-variables.md | Defining and using environment variables. |