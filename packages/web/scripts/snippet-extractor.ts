/**
 * Snippet Extractor - Extracts code snippets from MDX content for validation.
 *
 * Parses MDX files to find:
 * - SideBySide components (fromCommands, toCommands arrays)
 * - TryIt components (command prop)
 * - Markdown code blocks (```bash, ```shell, etc.)
 *
 * Strips | prefix format (stripMargin) for code that uses it.
 */

import { readFile } from "node:fs/promises"
import { join, basename } from "node:path"
import { glob } from "glob"

/**
 * Represents an extracted code snippet from MDX content.
 */
export interface ExtractedSnippet {
  /** Source file path, e.g., "content/comparisons/jj-git/03-step.mdx" */
  readonly file: string
  /** Tool pairing, e.g., "jj-git" */
  readonly toolPair: string
  /** Step number (0 for index.mdx) */
  readonly step: number
  /** Line number where the snippet starts */
  readonly lineStart: number
  /** Programming language or shell type */
  readonly language: "bash" | "shell" | "scala" | "typescript"
  /** Source component type */
  readonly source:
    | "SideBySide"
    | "TryIt"
    | "codeblock"
    | "ScalaComparisonBlock"
    | "CrossLanguageBlock"
  /** The actual code content (normalized) */
  readonly code: string
  /** For SideBySide: which prop (fromCommands/toCommands), for Scala: zioCode/catsEffectCode */
  readonly prop?: string
  /** Whether validation should be skipped (from validate={false} prop) */
  readonly validate?: boolean
  /** Setup commands to override default (from setup={...} prop) */
  readonly setup?: readonly string[]
}

/**
 * Process code using stripMargin-style formatting (like Scala).
 * Each line starting with `|` has everything before and including the `|` stripped.
 */
export function normalizeCode(code: string): string {
  const lines = code.split("\n")

  // Apply stripMargin: remove everything up to and including `|` on each line
  const strippedLines = lines.map((line) => {
    const pipeIndex = line.indexOf("|")
    if (pipeIndex !== -1) {
      return line.slice(pipeIndex + 1)
    }
    return line
  })

  // Remove leading blank lines
  let startIndex = 0
  while (startIndex < strippedLines.length && strippedLines[startIndex]?.trim() === "") {
    startIndex++
  }

  // Remove trailing blank lines
  let endIndex = strippedLines.length - 1
  while (endIndex >= startIndex && strippedLines[endIndex]?.trim() === "") {
    endIndex--
  }

  return strippedLines.slice(startIndex, endIndex + 1).join("\n")
}

/**
 * Parse step number from filename (e.g., "03-step.mdx" -> 3, "index.mdx" -> 0)
 */
function parseStepNumber(filename: string): number {
  const base = basename(filename, ".mdx")
  if (base === "index") return 0
  const match = base.match(/^(\d+)-step$/)
  const stepNum = match?.[1]
  return stepNum ? Number.parseInt(stepNum, 10) : 0
}

/**
 * Find line number where a pattern first appears in content.
 */
function findLineNumber(content: string, searchIndex: number): number {
  return content.slice(0, searchIndex).split("\n").length
}

/**
 * Extract TryIt components from MDX content.
 *
 * Matches: <TryIt command="..." validate={false} setup={...} />
 */
function extractTryItSnippets(
  content: string,
  file: string,
  toolPair: string,
  step: number,
): ExtractedSnippet[] {
  const snippets: ExtractedSnippet[] = []

  // Match <TryIt command="..." /> - handles nested quotes properly
  // command="..." allows single quotes inside
  // command='...' allows double quotes inside
  const doubleQuoteRegex = /<TryIt\s+[^>]*command="([^"]+)"[^>]*\/>/g
  const singleQuoteRegex = /<TryIt\s+[^>]*command='([^']+)'[^>]*\/>/g

  const processMatch = (match: RegExpMatchArray) => {
    const command = match[1]
    const fullMatch = match[0]
    if (command?.trim()) {
      const snippet: ExtractedSnippet = {
        file,
        toolPair,
        step,
        lineStart: findLineNumber(content, match.index ?? 0),
        language: "bash",
        source: "TryIt",
        code: command.trim(),
      }

      // Check for validate={false}
      const hasValidateFalse = /validate\s*=\s*{\s*false\s*}/.test(fullMatch)

      // Check for setup={...} prop
      const setupMatch = fullMatch.match(/setup\s*=\s*{\s*\[(.*?)\]\s*}/s)
      let extractedSnippet = { ...snippet }
      if (hasValidateFalse) {
        extractedSnippet = { ...extractedSnippet, validate: false as const }
      }
      if (setupMatch) {
        // Parse the setup array - commands are in "cmd", 'cmd', or `cmd` format
        // setupMatch[1] can be empty string for setup={[]}
        const setupArrayStr = setupMatch[1] ?? ""
        const commands: string[] = []
        const cmdRegex = /["'`]([^"'`]+)["'`]/g
        for (const cmdMatch of setupArrayStr.matchAll(cmdRegex)) {
          if (cmdMatch[1]) {
            commands.push(cmdMatch[1])
          }
        }
        extractedSnippet = { ...extractedSnippet, setup: commands }
      }

      snippets.push(extractedSnippet)
    }
  }

  for (const match of content.matchAll(doubleQuoteRegex)) {
    processMatch(match)
  }

  for (const match of content.matchAll(singleQuoteRegex)) {
    processMatch(match)
  }

  return snippets
}

/**
 * Extract SideBySide components from MDX content.
 *
 * Matches:
 * <SideBySide
 *   fromCommands={["cmd1", "cmd2"]}
 *   toCommands={["cmd1", "cmd2"]}
 * />
 */
function extractSideBySideSnippets(
  content: string,
  file: string,
  toolPair: string,
  step: number,
): ExtractedSnippet[] {
  const snippets: ExtractedSnippet[] = []

  // Match entire SideBySide component
  const sideBySideRegex = /<SideBySide\s+([\s\S]*?)\/>/g

  for (const match of content.matchAll(sideBySideRegex)) {
    const propsContent = match[1]
    if (!propsContent) continue

    const lineStart = findLineNumber(content, match.index ?? 0)

    // Check for validate={false}
    const shouldValidate = !/validate\s*=\s*\{\s*false\s*\}/.test(propsContent)
    if (!shouldValidate) continue

    // Extract fromCommands array
    const fromMatch = propsContent.match(/fromCommands=\{(\[[\s\S]*?\])\}/)
    const fromArrayStr = fromMatch?.[1]
    if (fromArrayStr) {
      const commands = parseJsArray(fromArrayStr)
      for (const cmd of commands) {
        if (cmd.trim()) {
          snippets.push({
            file,
            toolPair,
            step,
            lineStart,
            language: "bash",
            source: "SideBySide",
            code: cmd.trim(),
            prop: "fromCommands",
          })
        }
      }
    }

    // Extract toCommands array
    const toMatch = propsContent.match(/toCommands=\{(\[[\s\S]*?\])\}/)
    const toArrayStr = toMatch?.[1]
    if (toArrayStr) {
      const commands = parseJsArray(toArrayStr)
      for (const cmd of commands) {
        if (cmd.trim()) {
          snippets.push({
            file,
            toolPair,
            step,
            lineStart,
            language: "bash",
            source: "SideBySide",
            code: cmd.trim(),
            prop: "toCommands",
          })
        }
      }
    }
  }

  return snippets
}

/**
 * Parse a JavaScript array literal into string values.
 * Handles: ["a", "b", "c"] or ['a', 'b', 'c']
 * Also handles nested quotes like "echo 'a'" correctly.
 */
function parseJsArray(arrayStr: string): string[] {
  const results: string[] = []
  let current = 0
  const inner = arrayStr.trim()

  // Skip opening bracket
  if (inner[0] === "[") current = 1

  while (current < inner.length) {
    // Skip whitespace and commas
    while (current < inner.length && /[\s,]/.test(inner[current])) {
      current++
    }

    if (current >= inner.length || inner[current] === "]") break

    // Find the opening quote
    const quote = inner[current]
    if (quote !== '"' && quote !== "'") break

    current++
    let value = ""

    // Read until the closing quote, handling escaped quotes
    while (current < inner.length) {
      const char = inner[current]

      if (char === "\\") {
        // Escape sequence - consume both backslash and next char
        if (current + 1 < inner.length) {
          value += inner[current + 1]
          current += 2
        } else {
          current++
        }
      } else if (char === quote) {
        // Closing quote
        current++
        break
      } else {
        value += char
        current++
      }
    }

    results.push(value)
  }

  return results
}

/**
 * Extract ScalaComparisonBlock components from MDX content.
 *
 * Matches:
 * <ScalaComparisonBlock
 *   zioCode={`...`}
 *   catsEffectCode={`...`}
 * />
 */
function extractScalaComparisonBlocks(
  content: string,
  file: string,
  toolPair: string,
  step: number,
): ExtractedSnippet[] {
  const snippets: ExtractedSnippet[] = []

  // Match entire ScalaComparisonBlock component
  const blockRegex = /<ScalaComparisonBlock\s+([\s\S]*?)\/>/g

  for (const match of content.matchAll(blockRegex)) {
    const propsContent = match[1]
    if (!propsContent) continue

    const lineStart = findLineNumber(content, match.index ?? 0)

    // Check for validate={false}
    const validateFalse = /validate=\{false\}/.test(propsContent)

    // Extract zioCode
    const zioMatch = propsContent.match(/zioCode=\{`([\s\S]*?)`\}/)
    const zioCode = zioMatch?.[1]
    if (zioCode !== undefined) {
      const snippet: ExtractedSnippet = {
        file,
        toolPair,
        step,
        lineStart,
        language: "scala",
        source: "ScalaComparisonBlock",
        code: normalizeCode(zioCode),
        prop: "zioCode",
      }
      if (validateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }

    // Extract catsEffectCode
    const ceMatch = propsContent.match(/catsEffectCode=\{`([\s\S]*?)`\}/)
    const ceCode = ceMatch?.[1]
    if (ceCode !== undefined) {
      const snippet: ExtractedSnippet = {
        file,
        toolPair,
        step,
        lineStart,
        language: "scala",
        source: "ScalaComparisonBlock",
        code: normalizeCode(ceCode),
        prop: "catsEffectCode",
      }
      if (validateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }
  }

  return snippets
}

/**
 * Extract CrossLanguageBlock components from MDX content.
 *
 * Matches:
 * <CrossLanguageBlock
 *   zioCode={`...`}
 *   effectCode={`...`}
 * />
 */
function extractCrossLanguageBlocks(
  content: string,
  file: string,
  toolPair: string,
  step: number,
): ExtractedSnippet[] {
  const snippets: ExtractedSnippet[] = []

  // Match entire CrossLanguageBlock component
  const blockRegex = /<CrossLanguageBlock\s+([\s\S]*?)\/>/g

  for (const match of content.matchAll(blockRegex)) {
    const propsContent = match[1]
    if (!propsContent) continue

    const lineStart = findLineNumber(content, match.index ?? 0)

    // Check for validate={false}
    const validateFalse = /validate=\{false\}/.test(propsContent)

    // Extract zioCode (Scala)
    const zioMatch = propsContent.match(/zioCode=\{`([\s\S]*?)`\}/)
    const zioCode = zioMatch?.[1]
    if (zioCode !== undefined) {
      const snippet: ExtractedSnippet = {
        file,
        toolPair,
        step,
        lineStart,
        language: "scala",
        source: "CrossLanguageBlock",
        code: normalizeCode(zioCode),
        prop: "zioCode",
      }
      if (validateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }

    // Extract effectCode (TypeScript)
    const effectMatch = propsContent.match(/effectCode=\{`([\s\S]*?)`\}/)
    const effectCode = effectMatch?.[1]
    if (effectCode !== undefined) {
      const snippet: ExtractedSnippet = {
        file,
        toolPair,
        step,
        lineStart,
        language: "typescript",
        source: "CrossLanguageBlock",
        code: normalizeCode(effectCode),
        prop: "effectCode",
      }
      if (validateFalse) {
        snippets.push({ ...snippet, validate: false })
      } else {
        snippets.push(snippet)
      }
    }
  }

  return snippets
}

/**
 * Extract all snippets from a single MDX file.
 *
 * Extracts from:
 * - TryIt: Interactive sandbox commands
 * - SideBySide: Git ↔ jj command comparisons (both fromCommands and toCommands)
 * - ScalaComparisonBlock: ZIO vs Cats Effect code comparisons
 * - CrossLanguageBlock: ZIO (Scala) vs Effect (TypeScript) comparisons
 *
 * Note: Regular markdown code blocks are NOT extracted - they're documentation
 * examples that may reference files/state not present in the sandbox.
 */
export function extractSnippetsFromContent(
  content: string,
  file: string,
  toolPair: string,
  step: number,
): ExtractedSnippet[] {
  const snippets: ExtractedSnippet[] = []

  // Extract from different component types
  snippets.push(...extractTryItSnippets(content, file, toolPair, step))
  snippets.push(...extractSideBySideSnippets(content, file, toolPair, step))
  snippets.push(...extractScalaComparisonBlocks(content, file, toolPair, step))
  snippets.push(...extractCrossLanguageBlocks(content, file, toolPair, step))

  // Sort by line number for consistent ordering
  snippets.sort((a, b) => a.lineStart - b.lineStart)

  return snippets
}

/**
 * Discover MDX files for a tool pair.
 */
export async function discoverMdxFiles(contentDir: string, toolPair: string): Promise<string[]> {
  const pattern = join(contentDir, "comparisons", toolPair, "*.mdx")
  const files = await glob(pattern)

  // Filter out index.mdx for validation (only validate step files)
  return files.filter((f) => !f.endsWith("index.mdx")).sort()
}

/**
 * Extract all snippets from a tool pair.
 */
export async function extractSnippetsFromToolPair(
  contentDir: string,
  toolPair: string,
): Promise<ExtractedSnippet[]> {
  const files = await discoverMdxFiles(contentDir, toolPair)
  const allSnippets: ExtractedSnippet[] = []

  for (const file of files) {
    const content = await readFile(file, "utf-8")
    const step = parseStepNumber(file)
    const relativePath = file.replace(/^.*\/content\//, "content/")
    const snippets = extractSnippetsFromContent(content, relativePath, toolPair, step)
    allSnippets.push(...snippets)
  }

  return allSnippets
}

/**
 * Group snippets by step for session reuse during validation.
 */
export function groupSnippetsByStep(
  snippets: readonly ExtractedSnippet[],
): Map<number, ExtractedSnippet[]> {
  const grouped = new Map<number, ExtractedSnippet[]>()

  for (const snippet of snippets) {
    const existing = grouped.get(snippet.step)
    if (existing) {
      existing.push(snippet)
    } else {
      grouped.set(snippet.step, [snippet])
    }
  }

  return grouped
}

/**
 * Check if a snippet looks like pseudo-code that shouldn't be validated.
 * Detects patterns like `???`, `...`, `# comment only`, etc.
 */
export function isPseudoCode(code: string): boolean {
  const trimmed = code.trim()

  // Empty or only whitespace
  if (!trimmed) return true

  // Scala/TS placeholder
  if (trimmed === "???" || trimmed.includes("= ???")) return true

  // Common pseudo-code patterns
  if (trimmed === "..." || trimmed === "// ...") return true

  // Only comments
  if (trimmed.startsWith("#") && !trimmed.includes("\n")) return true
  if (trimmed.startsWith("//") && !trimmed.includes("\n")) return true

  return false
}

/**
 * Check if a snippet is an installation command that can't run in the sandbox.
 * These are typically OS-level package manager commands.
 */
export function isInstallationCommand(code: string): boolean {
  const trimmed = code.trim()

  // Package manager installation patterns
  const installPatterns = [
    /^brew\s+(install|upgrade|tap)/, // Homebrew
    /^cargo\s+install/, // Cargo
    /^apt\s+(install|update|upgrade)/, // APT
    /^apt-get\s+(install|update|upgrade)/, // APT
    /^yum\s+(install|update|upgrade)/, // YUM
    /^dnf\s+(install|update|upgrade)/, // DNF
    /^pacman\s+-S\s/, // Pacman
    /^pip\s+install/, // pip
    /^pip3\s+install/, // pip3
    /^npm\s+(install|global|ci)/, // npm
    /^yarn\s+(add|global)/, // Yarn
    /^pnpm\s+(install|add)/, // pnpm
    /^bun\s+(install|add)/, // bun
    /^curl\s+.*\|?\s*(bash|sh|sudo)/, // curl pipe to shell
    /^wget\s+.*\|?\s*(bash|sh|sudo)/, // wget pipe to shell
    /^npm\s+i\s/, // npm install shorthand
    /^yarn\s+add\s+(@?[^@\s]+)/, // yarn add pattern
  ]

  return installPatterns.some((pattern) => pattern.test(trimmed))
}
