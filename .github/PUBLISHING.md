# NPM Publishing Setup

This document explains how the automated npm publishing workflow is configured.

## How It Works

The GitHub Actions workflow in `.github/workflows/publish.yml` automatically publishes the package to npm whenever code is pushed to the `main` branch.

### Workflow Steps

1. **Version Bump Check**: Compares the version in `package.json` with the currently published version on npm
   - ✅ If the version is bumped, the workflow continues
   - ❌ If the version is unchanged, the workflow fails with an error

2. **Install Dependencies**: Runs `npm ci` to install exact versions from `package-lock.json`

3. **Build & Test**: Runs `npm run prepublishOnly` which executes:
   - `npm run build` - Compiles TypeScript to JavaScript
   - `npm run test` - Runs the full test suite

4. **Publish**: Publishes the package to npm with `--access public` (required for scoped packages)

## Required GitHub Secret

The workflow requires an **NPM_TOKEN** secret to be configured in your GitHub repository.

### Setting Up NPM_TOKEN

1. **Create an npm Access Token**:
   - Log in to [npmjs.com](https://www.npmjs.com)
   - Go to **Access Tokens** in your account settings
   - Click **Generate New Token** → **Classic Token**
   - Select **Automation** (for CI/CD use)
   - Copy the generated token

2. **Add Secret to GitHub**:
   - Go to your GitHub repository settings
   - Navigate to **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: Paste the npm access token
   - Click **Add secret**

## Publishing a New Version

To publish a new version of the package:

1. **Bump the version** in `package.json`:
   ```bash
   npm version patch   # 1.0.0 → 1.0.1
   npm version minor   # 1.0.0 → 1.1.0
   npm version major   # 1.0.0 → 2.0.0
   ```

2. **Commit and push** the version bump:
   ```bash
   git add package.json package-lock.json
   git commit -m "Bump version to X.Y.Z"
   git push origin main
   ```

3. **Workflow runs automatically**: The GitHub Action will:
   - Verify the version was bumped
   - Run tests and build
   - Publish to npm if all checks pass

## Important Notes

- **Always bump the version** before merging to `main` - the workflow will fail otherwise
- The workflow uses `npm ci` which requires a `package-lock.json` file
- Published packages are **public** by default (required for `@xmer/*` scoped packages)
- The workflow runs on **every push to main**, not just on releases or tags
