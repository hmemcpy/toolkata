"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"

/**
 * Content file template types.
 */
export type TemplateType = "step" | "kata" | "overview" | "cheatsheet"

/**
 * Template definition with metadata and content.
 */
interface Template {
  readonly id: TemplateType
  readonly name: string
  readonly description: string
  readonly icon: string
  readonly folder: string
  readonly filePattern: string
  readonly frontmatter: Record<string, unknown>
}

/**
 * Tool pairing option for parent folder selection.
 */
interface ToolPairingOption {
  readonly slug: string
  readonly name: string
}

/**
 * CreateFileDialog component props.
 */
interface CreateFileDialogProps {
  /** Whether the dialog is open */
  readonly isOpen: boolean
  /** Callback when dialog is closed */
  readonly onClose: () => void
  /** Callback when file is created */
  readonly onCreate: (path: string, content: string) => void
  /** Whether file creation is in progress */
  readonly isLoading: boolean
  /** Error message to display */
  readonly error?: string
  /** Available tool pairings for folder selection */
  readonly toolPairings?: readonly ToolPairingOption[]
  /** Pre-selected tool pairing */
  readonly defaultToolPairing?: string
}

/**
 * Template definitions for different content types.
 */
const TEMPLATES: readonly Template[] = [
  {
    id: "step",
    name: "Tutorial Step",
    description: "A step in a tutorial comparison (MDX)",
    icon: "📖",
    folder: "comparisons",
    filePattern: "{step}-step.mdx",
    frontmatter: {
      title: "Step Title",
      step: 1,
      description: "Description of this step",
      gitCommands: [],
      jjCommands: [],
    },
  },
  {
    id: "kata",
    name: "Practice Kata",
    description: "An interactive practice exercise (MDX)",
    icon: "🥋",
    folder: "katas",
    filePattern: "{kata}-kata.mdx",
    frontmatter: {
      title: "Kata Title",
      kata: 1,
      duration: "5 min",
      focus: "commands to practice",
      exercises: [
        {
          id: "1.1",
          title: "Exercise title",
          validation: {
            type: "command",
            command: "jj status",
          },
        },
      ],
    },
  },
  {
    id: "overview",
    name: "Overview Page",
    description: "Introduction page for a tool pairing",
    icon: "🏠",
    folder: "comparisons",
    filePattern: "overview.mdx",
    frontmatter: {
      title: "Tool Pairing Overview",
      description: "Learn to use the new tool based on your existing knowledge",
    },
  },
  {
    id: "cheatsheet",
    name: "Cheat Sheet",
    description: "Quick reference for common commands",
    icon: "📋",
    folder: "comparisons",
    filePattern: "cheatsheet.mdx",
    frontmatter: {
      title: "Cheat Sheet",
      description: "Quick reference for common commands and patterns",
    },
  },
]

/**
 * Generate file content from template.
 */
function generateFileContent(
  template: Template,
  name: string,
  toolPairing: string,
): string {
  const frontmatterObj = { ...template.frontmatter }

  // Customize frontmatter based on template type
  if (template.id === "step") {
    frontmatterObj["title"] = formatSlugAsTitle(name)
  } else if (template.id === "kata") {
    frontmatterObj["title"] = formatSlugAsTitle(name)
  } else if (template.id === "overview") {
    frontmatterObj["title"] = `${toolPairing} Overview`
  } else if (template.id === "cheatsheet") {
    frontmatterObj["title"] = `${toolPairing} Cheat Sheet`
  }

  const frontmatter = `---\n${Object.entries(frontmatterObj)
    .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
    .join("\n")}\n---`

  const body = getTemplateBody(template)

  return `${frontmatter}\n\n${body}`
}

/**
 * Format a value for YAML frontmatter.
 */
function formatYamlValue(value: unknown): string {
  if (typeof value === "string") {
    // Quote strings that contain special characters
    if (/[:#\[\]{}|>]/.test(value) || value.includes("\n")) {
      return `"${value.replace(/"/g, '\\"')}"`
    }
    return `"${value}"`
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    if (typeof value[0] === "object") {
      // Multi-line array of objects
      return `\n${value
        .map((item) => {
          const lines = Object.entries(item as Record<string, unknown>)
            .map(([k, v], i) => {
              const prefix = i === 0 ? "  - " : "    "
              if (typeof v === "object" && v !== null) {
                const nestedLines = Object.entries(v as Record<string, unknown>)
                  .map(([nk, nv]) => `      ${nk}: ${formatYamlValue(nv)}`)
                  .join("\n")
                return `${prefix}${k}:\n${nestedLines}`
              }
              return `${prefix}${k}: ${formatYamlValue(v)}`
            })
            .join("\n")
          return lines
        })
        .join("\n")}`
    }
    return `[${value.map((v) => formatYamlValue(v)).join(", ")}]`
  }
  if (typeof value === "object" && value !== null) {
    return `\n${Object.entries(value)
      .map(([k, v]) => `  ${k}: ${formatYamlValue(v)}`)
      .join("\n")}`
  }
  return String(value)
}

/**
 * Get template body content.
 */
function getTemplateBody(template: Template): string {
  switch (template.id) {
    case "step":
      return `# Step Title

Brief introduction to what this step covers.

## Concept

Explain the concept being covered.

<SideBySide
  left="git status"
  right="jj status"
  leftLabel="Git"
  rightLabel="jj"
  leftComment="Check repository status"
  rightComment="Same command in jj"
/>

## Try It

<TryIt command="jj status" description="Check the repository status" />

## Summary

Key takeaways from this step.
`

    case "kata":
      return `# Kata Title

Practice the fundamental commands through exercises.

## Scenario

Describe the scenario for this kata.

## Exercise 1: First Exercise

Description of what to do.

<TryIt command="jj status" description="Check the repository status" />

## Exercise 2: Second Exercise

Description of what to do.

<TryIt command="jj log" description="View the commit history" />
`

    case "overview":
      return `# Tool Pairing Overview

Introduction to learning the new tool from your existing knowledge.

## Why Learn This?

Explain why someone would want to learn the new tool.

## Prerequisites

- Existing tool experience required
- Any other prerequisites

## What You'll Learn

1. First topic
2. Second topic
3. Third topic

## Getting Started

Click "Start Learning" to begin the tutorial.
`

    case "cheatsheet":
      return `# Cheat Sheet

Quick reference for common commands and patterns.

## Basic Commands

| Old Tool | New Tool | Description |
|----------|----------|-------------|
| \`old-cmd\` | \`new-cmd\` | Description |

## Workflow

### Common Task 1

\`\`\`bash
# Command sequence for task 1
\`\`\`

### Common Task 2

\`\`\`bash
# Command sequence for task 2
\`\`\`
`
  }
}

/**
 * Format a slug as a readable title.
 */
function formatSlugAsTitle(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Validate file name.
 */
function validateFileName(name: string, template: Template): string | null {
  if (!name || name.trim() === "") {
    return "File name is required"
  }

  // Check for valid slug format
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name.toLowerCase())) {
    return "Use lowercase letters, numbers, and hyphens only (e.g., my-file-name)"
  }

  if (name.length < 2) {
    return "Name must be at least 2 characters"
  }

  if (name.length > 50) {
    return "Name must be less than 50 characters"
  }

  // Check for step/kata number format
  if (template.id === "step" || template.id === "kata") {
    if (!/^\d{2}$/.test(name)) {
      return "Use two-digit number format (e.g., 01, 02, 13)"
    }
  }

  return null
}

/**
 * Generate file path from template and inputs.
 */
function generateFilePath(
  template: Template,
  name: string,
  toolPairing: string,
): string {
  const folder = template.folder
  let fileName = template.filePattern

  if (template.id === "step") {
    fileName = fileName.replace("{step}", name)
  } else if (template.id === "kata") {
    fileName = fileName.replace("{kata}", name)
  }

  return `content/${folder}/${toolPairing}/${fileName}`
}

/**
 * CreateFileDialog component.
 *
 * Dialog for creating new content files with templates.
 *
 * Features:
 * - Template picker (step, kata, overview, cheatsheet)
 * - Name input with validation (slug format)
 * - Parent folder selector (tool pairing)
 * - Pre-fill frontmatter from template
 * - Preview of generated file path
 *
 * Follows the terminal aesthetic design system.
 *
 * @example
 * ```tsx
 * <CreateFileDialog
 *   isOpen={showCreateDialog}
 *   onClose={() => setShowCreateDialog(false)}
 *   onCreate={handleCreateFile}
 *   isLoading={isCreating}
 *   toolPairings={[
 *     { slug: "jj-git", name: "jj (git)" },
 *     { slug: "zio-cats", name: "ZIO (Cats Effect)" },
 *   ]}
 * />
 * ```
 */
export function CreateFileDialog(props: CreateFileDialogProps) {
  const {
    isOpen,
    onClose,
    onCreate,
    isLoading,
    error,
    toolPairings = [],
    defaultToolPairing,
  } = props

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("step")
  const [fileName, setFileName] = useState("")
  const [toolPairing, setToolPairing] = useState(defaultToolPairing ?? "")
  const [nameError, setNameError] = useState<string | null>(null)

  // Refs
  const nameInputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Get selected template
  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === selectedTemplate),
    [selectedTemplate],
  )

  // Check if name input should be shown
  const showNameInput = selectedTemplate === "step" || selectedTemplate === "kata"

  // Generate preview path
  const previewPath = useMemo(() => {
    if (!template || !toolPairing) return null
    const name = showNameInput ? fileName || "XX" : ""
    return generateFilePath(template, name, toolPairing)
  }, [template, toolPairing, fileName, showNameInput])

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate("step")
      setFileName("")
      setToolPairing(defaultToolPairing ?? toolPairings[0]?.slug ?? "")
      setNameError(null)

      // Focus name input after short delay
      setTimeout(() => {
        if (showNameInput) {
          nameInputRef.current?.focus()
        }
      }, 50)
    }
  }, [isOpen, defaultToolPairing, toolPairings, showNameInput])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isLoading, onClose])

  // Handle template selection
  const handleTemplateSelect = useCallback((templateId: TemplateType) => {
    setSelectedTemplate(templateId)
    setFileName("")
    setNameError(null)
  }, [])

  // Handle name change
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
      setFileName(value)
      if (template) {
        setNameError(validateFileName(value, template))
      }
    },
    [template],
  )

  // Handle tool pairing change
  const handleToolPairingChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setToolPairing(e.target.value)
    },
    [],
  )

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!template || !toolPairing) return

      // Validate name for step/kata
      if (showNameInput) {
        const error = validateFileName(fileName, template)
        if (error) {
          setNameError(error)
          return
        }
      }

      // Generate path and content
      const path = generateFilePath(template, fileName, toolPairing)
      const content = generateFileContent(template, fileName, toolPairing)

      onCreate(path, content)
    },
    [template, toolPairing, fileName, showNameInput, onCreate],
  )

  // Handle close
  const handleClose = useCallback(() => {
    if (!isLoading) {
      onClose()
    }
  }, [isLoading, onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose()
      }
    },
    [isLoading, onClose],
  )

  // Check if form is valid
  const isFormValid =
    template &&
    toolPairing &&
    (!showNameInput || (fileName && !nameError))

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isLoading) {
          onClose()
        }
      }}
      role="presentation"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-labelledby="create-file-dialog-title"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2
            id="create-file-dialog-title"
            className="text-base font-mono font-semibold text-[var(--color-text)]"
          >
            Create New File
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="p-3 text-sm font-mono text-[var(--color-error)] bg-[rgba(255,65,54,0.1)] border border-[var(--color-error)]/30 rounded">
                {error}
              </div>
            )}

            {/* Template selector */}
            <div className="space-y-2">
              <span className="block text-sm font-mono text-[var(--color-text-muted)]">
                Template
              </span>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateSelect(t.id)}
                    disabled={isLoading}
                    className={`flex items-start gap-3 p-3 text-left border rounded transition-colors ${
                      selectedTemplate === t.id
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-bg)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-text-muted)]"
                    } disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-mono font-medium text-[var(--color-text)]">
                        {t.name}
                      </div>
                      <div className="text-xs font-mono text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                        {t.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tool pairing selector */}
            <div className="space-y-1">
              <label
                htmlFor="tool-pairing"
                className="block text-sm font-mono text-[var(--color-text-muted)]"
              >
                Tool Pairing
              </label>
              <select
                id="tool-pairing"
                value={toolPairing}
                onChange={handleToolPairingChange}
                disabled={isLoading || toolPairings.length === 0}
                className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:border-[var(--color-accent)] disabled:opacity-50"
              >
                {toolPairings.length === 0 ? (
                  <option value="">No tool pairings available</option>
                ) : (
                  toolPairings.map((tp) => (
                    <option key={tp.slug} value={tp.slug}>
                      {tp.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* File name input (for step/kata) */}
            {showNameInput && (
              <div className="space-y-1">
                <label
                  htmlFor="file-name"
                  className="block text-sm font-mono text-[var(--color-text-muted)]"
                >
                  {selectedTemplate === "step" ? "Step Number" : "Kata Number"}
                </label>
                <input
                  ref={nameInputRef}
                  id="file-name"
                  type="text"
                  value={fileName}
                  onChange={handleNameChange}
                  placeholder={selectedTemplate === "step" ? "01" : "01"}
                  maxLength={2}
                  className="w-full px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text)] placeholder-[var(--color-text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:border-[var(--color-accent)]"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "file-name-error" : undefined}
                  disabled={isLoading}
                />
                {nameError && (
                  <p
                    id="file-name-error"
                    className="text-xs font-mono text-[var(--color-error)]"
                  >
                    {nameError}
                  </p>
                )}
                <p className="text-xs font-mono text-[var(--color-text-dim)]">
                  Enter a two-digit number (e.g., 01, 02, 13)
                </p>
              </div>
            )}

            {/* Preview path */}
            {previewPath && (
              <div className="space-y-1">
                <span className="block text-sm font-mono text-[var(--color-text-muted)]">
                  File Path
                </span>
                <div className="px-3 py-2 text-sm font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text-dim)]">
                  {previewPath}
                </div>
              </div>
            )}

            {/* Template preview */}
            {template && (
              <div className="space-y-1">
                <span className="block text-sm font-mono text-[var(--color-text-muted)]">
                  Frontmatter Preview
                </span>
                <pre className="px-3 py-2 text-xs font-mono bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text-dim)] overflow-x-auto max-h-32">
                  {Object.entries(template.frontmatter)
                    .slice(0, 4)
                    .map(([key, value]) => {
                      if (typeof value === "object") {
                        return `${key}: ...`
                      }
                      return `${key}: ${value}`
                    })
                    .join("\n")}
                </pre>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm font-mono text-[var(--color-text)] border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid}
            className="px-3 py-1.5 text-sm font-mono text-[var(--color-bg)] bg-[var(--color-accent)] border border-[var(--color-accent)] rounded hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
          >
            {isLoading ? "Creating..." : "Create File"}
          </button>
        </div>
      </div>
    </div>
  )
}
