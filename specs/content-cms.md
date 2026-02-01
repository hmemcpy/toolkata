# Content CMS Specification

## Overview

A GitHub-native content management system for creating and editing tutorial content (MDX files) directly through the admin dashboard. Content authors can edit tutorials from GitHub repositories, preview changes, validate code snippets, and create pull requests without leaving the browser.

**Scope**: Single GitHub repository (`toolkata/content`) in Phase 1, with architecture designed to extend to multi-source in Phase 2.

### Core Value Proposition

- "Edit content from GitHub in the browser"
- Live preview of MDX rendering with component support
- Integrated snippet validation before publishing
- GitHub-native workflow (branches, PRs, reviews)
- No local development or Git CLI required

### Target Audience

Tutorial authors managing content for toolkata.

---

## Architecture

### Repository Structure (Phase 1: Single Source)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    toolkata/app (Main Repository)                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Admin Dashboard + CMS UI                                             │ │
│  │  ├─ File browser                                                        │ │
│  │  ├─ MDX editor with Monaco                                          │ │
│  │  ├─ Live preview with app components                                 │ │
│  │  ├─ Snippet validation                                               │ │
│  │  └─ GitHub integration (API)                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  CMS API (sandbox-api)                                                │ │
│  │  ├─ GitHub API integration (octokit)                                  │ │
│  │  ├─ File operations (via GitHub)                                     │ │
│  │  ├─ Validation service                                               │ │
│  │  └─ PR workflow                                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ GitHub API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    toolkata/content (Official Content)                     │
│  ├─ content/comparisons/jj-git/*.mdx                                     │
│  ├─ content/comparisons/zio-cats/*.mdx                                   │
│  └─ content/katas/*.mdx                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Phase 2 Extension**: Add multi-source support for user repositories (future).

---

## User Stories

### Content Editing

- [ ] As an author, I can browse all MDX files from the content repository
- [ ] As an author, I can edit any file with Monaco editor
- [ ] As an author, I can create new files from templates
- [ ] As an author, I can delete files with confirmation
- [ ] As an author, I can rename files

### Preview & Validation

- [ ] As an author, I can preview how my MDX will render on the live site
- [ ] As an author, I can run snippet validation against the edited file
- [ ] As an author, I see validation errors inline with the code
- [ ] As an author, I can see a diff of my changes before committing

### GitHub Workflow

- [ ] As an author, I can create a branch in the content repository
- [ ] As an author, I can commit my changes to the branch
- [ ] As an author, I can create a pull request
- [ ] As an author, I can see the PR URL after creation
- [ ] As an author, I can view commit history for a file
- [ ] As an author, I can discard my changes (delete branch)

---

## Requirements

### R1: File Browser

**R1.1** File tree shows all MDX files from content repository

**R1.2** Tree grouped by tool pairing (jj-git, zio-cats, etc.)

**R1.3** Search across file names

**R1.4** Show file metadata: path, size, last commit

### R2: MDX Editor

**R2.1** Monaco-based editor with MDX syntax highlighting

**R2.2** Frontmatter editing with schema validation

**R2.3** Component autocomplete for custom components

**R2.4** Auto-save to browser localStorage

**R2.5** Multi-file editing with tabs (max 10 tabs)

### R3: Live Preview

**R3.1** Split-pane view (editor left, preview right)

**R3.2** Preview uses actual app components

**R3.3** Preview updates on debounce (500ms)

**R3.4** Show frontmatter errors if validation fails

### R4: Snippet Validation

**R4.1** "Validate" button runs snippet validation

**R4.2** Validation errors shown inline with line numbers

**R4.3** Validation checks: image exists, code compiles/runs

**R4.4** Validation runs before PR creation

**R4.5** Validation results cached per file hash

### R5: GitHub Integration

**R5.1** Create branch in content repository

**R5.2** Commit changes to branch with author info

**R5.3** Create pull request in content repository

**R5.4** View commit history for a file

**R5.5** View diff between commits

**R5.6** Discard changes (delete branch)

---

## Constraints

- **C1**: All file operations via GitHub API (no local filesystem)
- **C2**: CMS runs in sandbox-api (not separate service)
- **C3**: GitHub API rate limiting handled gracefully
- **C4**: Branch-based workflow (no direct main commits)
- **C5**: PR required for content changes
- **C6**: Octokit for GitHub operations
- **C7**: Monaco loaded from CDN
- **C8**: Single GitHub repository in Phase 1

---

## Data Models

### ContentFile

```typescript
interface ContentFile {
  path: string              // Path within content/
  name: string              // Filename
  type: "comparison" | "kata" | "overview" | "cheatsheet"
  size: number              // Bytes
  lastCommit: {
    sha: string
    message: string
    author: string
    date: number            // Unix timestamp
  }
}
```

### ContentFolder

```typescript
interface ContentFolder {
  path: string              // Folder path within content/
  name: string
  children: readonly (ContentFile | ContentFolder)[]
  fileCount: number
}
```

### GitHubBranch

```typescript
interface GitHubBranch {
  name: string
  sha: string
  protected: boolean
}
```

### GitHubCommit

```typescript
interface GitHubCommit {
  sha: string
  shortSha: string
  message: string
  author: {
    name: string
    email: string
    date: number
  }
  committer: {
    name: string
    email: string
    date: number
  }
  parents: readonly string[]
  files: readonly number     // Changed files count
}
```

### GitHubPullRequest

```typescript
interface GitHubPullRequest {
  number: number
  title: string
  state: "open" | "closed" | "merged"
  htmlUrl: string            // Link to GitHub PR
  head: {
    ref: string             // Branch name
    sha: string
  }
  base: {
    ref: string             // Target branch
  }
  createdAt: number
  updatedAt: number
}
```

### SnippetValidationResult

```typescript
interface SnippetValidationResult {
  file: string
  valid: boolean
  errors: readonly SnippetError[]
  duration: number
  timestamp: number
}

interface SnippetError {
  line: number
  column?: number
  message: string
  type: "syntax" | "compilation" | "runtime" | "missing-image"
}
```

---

## API Endpoints

### Files

#### GET /admin/cms/files
List all files from content repository.

**Query Params:**
- `type` (optional) - Filter by content type
- `search` (optional) - Search in file names

**Response:**
```typescript
{
  files: readonly (ContentFile | ContentFolder)[]
  totalCount: number
}
```

---

#### GET /admin/cms/file/:path
Read a file from content repository.

**URL Params:**
- `path` - File path (URL-encoded, relative to content/)

**Response:**
```typescript
{
  path: string
  content: string
  frontmatter: FrontmatterSchema
  lastCommit: GitHubCommit
  validationStatus?: SnippetValidationResult
}
```

---

#### PUT /admin/cms/file/:path
Create or update a file.

**URL Params:**
- `path` - File path

**Request Body:**
```typescript
{
  content: string
  message: string           // Commit message
  branch?: string           // Target branch (default: create new)
}
```

**Response:**
```typescript
{
  success: boolean
  commit: GitHubCommit
  branch: string
}
```

---

#### DELETE /admin/cms/file/:path
Delete a file.

**URL Params:**
- `path` - File path

**Request Body:**
```typescript
{
  message: string           // Commit message
  branch?: string           // Branch to commit on
}
```

**Response:** `{ success: boolean }`

---

### Validation

#### POST /admin/cms/validate
Run snippet validation on files.

**Request Body:**
```typescript
{
  files: readonly string[]    // File paths to validate (all if empty)
}
```

**Response:**
```typescript
{
  results: readonly SnippetValidationResult[]
}
```

---

### GitHub Operations

#### GET /admin/cms/github/branches
List branches in content repository.

**Response:**
```typescript
{
  branches: readonly GitHubBranch[]
}
```

---

#### POST /admin/cms/github/branch
Create a new branch.

**Request Body:**
```typescript
{
  name: string               // Branch name
  from?: string              // Base branch (default: repo default)
}
```

**Response:**
```typescript
{
  branch: GitHubBranch
  success: boolean
}
```

---

#### POST /admin/cms/github/commit
Commit changes to a branch.

**Request Body:**
```typescript
{
  branch: string             // Target branch
  message: string            // Commit message
  files: readonly {           // Files to commit
    path: string
    content: string
  }[]
  author?: {
    name: string
    email: string
  }
}
```

**Response:**
```typescript
{
  commit: GitHubCommit
  success: boolean
}
```

---

#### GET /admin/cms/github/log/:path
Get commit history for a file.

**URL Params:**
- `path` - File path

**Query Params:**
- `branch` (optional) - Branch to query (default: default branch)
- `limit` (optional) - Max commits (default: 20)

**Response:**
```typescript
{
  commits: readonly GitHubCommit[]
}
```

---

#### GET /admin/cms/github/diff/:path
Get diff for a file.

**URL Params:**
- `path` - File path

**Query Params:**
- `branch` (optional) - Compare to this branch
- `base` (optional) - Base commit SHA

**Response:** `GitDiff`

---

#### POST /admin/cms/github/pr
Create a pull request.

**Request Body:**
```typescript
{
  head: string               // Branch with changes
  base: string               // Target branch (default: "main")
  title: string              // PR title
  body?: string              // PR body/description
}
```

**Response:**
```typescript
{
  pr: GitHubPullRequest
  success: boolean
}
```

---

#### DELETE /admin/cms/github/branch/:name
Delete a branch (discard changes).

**URL Params:**
- `name` - Branch name

**Response:** `{ success: boolean }`

---

## UI Components

### FileBrowser
File tree with content repository.

**Props:**
```typescript
interface FileBrowserProps {
  files: readonly (ContentFile | ContentFolder)[]
  selectedFile: string | null
  onFileSelect: (path: string) => void
  filters: {
    type?: string
    search?: string
  }
  onFilterChange: (filters) => void
}
```

**Features:**
- Tree view with expandable folders
- File type icons
- Search input
- File selection

---

### FileEditor (with multi-file support)
Monaco editor with tab management.

**Props:**
```typescript
interface FileEditorProps {
  files: readonly {
    path: string
    content: string
    dirty: boolean
  }[]
  activeFileIndex: number
  onContentChange: (index: number, content: string) => void
  onTabClose: (index: number) => void
  onTabSelect: (index: number) => void
  onSave: (branch: string, message: string) => void
  onValidate: () => void
  validationStatus?: SnippetValidationResult
}
```

**Features:**
- Tab bar with file names
- Close tab button
- Switch between tabs
- Unsaved indicator (dirty state)
- Monaco editor with MDX highlighting
- Auto-save indicator
- Keyboard shortcuts (Ctrl+S, Ctrl+W, Ctrl+Tab)

---

### MDXPreview
Live preview of MDX content.

**Props:**
```typescript
interface MDXPreviewProps {
  content: string
  frontmatter?: FrontmatterSchema
  error?: string
}
```

**Features:**
- Split pane layout (fixed 50/50)
- Render with app's MDX components
- Frontmatter display
- Error boundary
- Sync scroll with editor

---

### ValidationPanel
Shows validation errors.

**Props:**
```typescript
interface ValidationPanelProps {
  results: SnippetValidationResult[]
  onErrorClick: (line: number) => void
  onDismiss: () => void
}
```

**Features:**
- Error list with line numbers
- Click to jump to line in editor
- Severity icons
- Summary badge
- Re-run button
- Dismissible

---

### BranchSelector
Select/create branch for edits.

**Props:**
```typescript
interface BranchSelectorProps {
  branches: readonly GitHubBranch[]
  selectedBranch: string
  onSelect: (branch: string) => void
  onCreate: (name: string) => void
}
```

**Features:**
- Dropdown with existing branches
- "Create new branch" option
- Branch name input
- Create button

---

### PRDialog
Pull request creation dialog.

**Props:**
```typescript
interface PRDialogProps {
  isOpen: boolean
  onClose: () => void
  branch: string
  onCreate: (title: string, body: string) => void
  isLoading: boolean
}
```

**Features:**
- Branch confirmation
- Title editor (auto-filled from commits)
- Body editor with template
- Create PR button
- Validation check

---

### HistoryPanel
Shows commit history.

**Props:**
```typescript
interface HistoryPanelProps {
  commits: readonly GitHubCommit[]
  diff?: GitDiff
  onCommitSelect: (sha: string) => void
  onRevert: (sha: string) => void
}
```

**Features:**
- Commit list (author, date, message)
- Diff viewer for selected commit
- Revert button
- Copy hash button

---

### CreateFileDialog
Create new file dialog.

**Props:**
```typescript
interface CreateFileDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (path: string, template: string) => void
}
```

**Features:**
- Template picker (step, kata, overview, cheatsheet)
- Name input with validation
- Parent folder selector
- Preview of template

---

## Security Considerations

### Authorization

- **Admin-only**: CMS requires admin role
- **X-Admin-Key**: All endpoints protected by admin middleware

### Audit Logging

- **File operations**: Log file reads/writes
- **GitHub operations**: Log commits, PRs, branch operations
- **Validation**: Log validation runs with results

### GitHub Token Security

- **Admin token**: Stored in environment
- **Token scopes**: Minimum required (repo: read/write for content repo)

---

## Out of Scope

- Direct file system access (GitHub API only)
- Private repositories (Phase 1: public repo only)
- Git operations beyond branch/commit/PR (no rebase, cherry-pick, etc.)
- Large file uploads (images, assets) - use external CDN
- Merge conflict resolution (manual on GitHub)
- Webhook integration (poll for changes instead)
- Content versioning beyond Git history
- Collaborative editing (single editor per file)
- Scheduled publishing (immediate PR creation only)
- Multi-source content management (Phase 2)

---

## File Structure (New Files)

### Backend (Sandbox API)
```
packages/sandbox-api/src/
├── services/
│   ├── github.ts                 # GitHub API service (octokit)
│   └── content-validation.ts     # Validation wrapper
├── routes/
│   └── admin-cms.ts              # /admin/cms/* endpoints
└── config/
    └── github.ts                 # GitHub config (tokens, defaults)
```

### Frontend (Web)
```
packages/web/
├── app/admin/cms/
│   ├── page.tsx                  # Main CMS page (browser + editor)
│   └── history/[...path]/page.tsx # History page
├── components/cms/
│   ├── FileBrowser.tsx
│   ├── FileEditor.tsx
│   ├── MDXPreview.tsx
│   ├── ValidationPanel.tsx
│   ├── BranchSelector.tsx
│   ├── PRDialog.tsx
│   ├── HistoryPanel.tsx
│   └── CreateFileDialog.tsx
└── services/
    └── cms-client.ts             # CMS API client (Effect-TS)
```

---

## Dependencies

### Backend Dependencies
```json
{
  "octokit": "^3.1.2"
}
```

### Frontend Dependencies
```json
{
  "@monaco-editor/react": "^4.6.0",
  "react-diff-viewer-continued": "^3.2.6",
  "use-debounce": "^9.0.4"
}
```

---

## Validation Commands

```bash
# Type check and lint
cd packages/sandbox-api && bun run typecheck && bun run lint
cd packages/web && bun run typecheck && bun run lint

# Run tests
cd packages/sandbox-api && bun test
cd packages/web && bun run test

# Build verification
cd packages/web && bun run build
```

---

## Acceptance Criteria

- [ ] File browser shows all files from content repository
- [ ] Authors can edit files with Monaco editor
- [ ] Multi-file editing works with tabs
- [ ] Auto-save saves to localStorage
- [ ] Validation runs on debounce + manual
- [ ] Branch creation works
- [ ] Commits go to content repository
- [ ] PRs created in content repository
- [ ] History panel shows commits and diffs
- [ ] All endpoints protected by admin auth
- [ ] Audit logging captures all CMS operations
- [ ] GitHub API rate limits handled gracefully

---

## Future Enhancements (Phase 2)

- **Multi-source support** - Multiple GitHub repositories
- **GitHub OAuth** - Users connect their own repos
- **Webhook integration** - Auto-sync on GitHub push events
- **Private repository support** - For paid courses
- **Content cloning** - Copy content between sources
- **Bulk operations** - Multi-file commits, validation
- **Content search** - Full-text search across all MDX files
- **Image management** - Upload and manage images via CDN
- **Collaborative editing** - Real-time multi-user editing
- **Scheduled publishing** - Draft branches with scheduled PR creation
