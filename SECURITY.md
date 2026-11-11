# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 4.x     | :white_check_mark: |
| < 4.0   | :x:                |

## Security Philosophy

VeloMesh is built around zero-trust execution for third-party skills and repository discovery:
1. **No Code Execution:** Fetching repositories only clones data. Build scripts, binaries, and package installation commands are never invoked.
2. **Path Traversal Protection:** All identifiers are strictly sanitized using regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` and checked against directory escape characters.
3. **Symlink Defense:** Safe-copy never follows symlinks from untrusted sources (`followlinks=False`).
4. **Resource Constraints:** Skills are bounded by 150KB per `SKILL.md` and 12MB total bundle footprint.

## Reporting a Vulnerability

If you discover a security vulnerability in VeloMesh, please open a private security advisory on GitHub or email the maintainer directly. All reports will receive a response within 48 hours.
