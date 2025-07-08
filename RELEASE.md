# Release Workflow

This package uses [Changesets](https://github.com/changesets/changesets) for version management and automated publishing to npm.

## Setup Required

### 1. NPM Token
Create an NPM token with publish permissions:
1. Go to https://www.npmjs.com/settings/tokens
2. Generate a new **Automation** token
3. Add it to your GitHub repository secrets as `NPM_TOKEN`

### 2. GitHub Token
The `GITHUB_TOKEN` is automatically provided by GitHub Actions.

## Development Workflow

### When making changes:

1. **Make your changes** to the codebase
2. **Add a changeset** to describe your changes:
   ```bash
   npm run changeset
   ```
   This will:
   - Ask you what type of change (patch/minor/major)
   - Ask you to describe the change
   - Create a `.changeset/*.md` file

3. **Commit both your changes AND the changeset file**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature-branch
   ```

4. **Create a pull request** to master branch

### When changes are merged to master:

The GitHub Action will automatically:

1. **If there are changesets pending:**
   - Create/update a "Version Packages" PR
   - This PR will contain version bumps and CHANGELOG updates

2. **When you merge the "Version Packages" PR:**
   - Publish the new version to npm
   - Create a GitHub release
   - Clean up the changeset files

## Example Changeset Types

- **Patch** (`1.0.0` → `1.0.1`): Bug fixes, documentation updates
- **Minor** (`1.0.0` → `1.1.0`): New features, non-breaking changes
- **Major** (`1.0.0` → `2.0.0`): Breaking changes

## Manual Release (if needed)

```bash
# 1. Version packages (applies changesets)
npm run version

# 2. Build and publish
npm run release
```

## First Time Setup

1. **Add npm token to GitHub Secrets:**
   - Repository Settings → Secrets and Variables → Actions
   - Add `NPM_TOKEN` with your npm automation token

2. **Ensure proper permissions:**
   - Repository Settings → Actions → General
   - Set "Workflow permissions" to "Read and write permissions"

## Branch Protection

Consider adding branch protection rules to master:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date

This ensures the release process is controlled and tested.