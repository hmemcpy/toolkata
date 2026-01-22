/**
 * loader.ts - File system utilities for loading content with metadata.
 *
 * Provides low-level file operations with Effect-TS for proper error handling.
 */

import { Effect } from "effect"
import { glob } from "glob"
import { ContentError } from "./errors"

/**
 * Result of loading a file from disk.
 */
export interface LoadedFile {
  readonly raw: string
  readonly modifiedAt: Date
}

/**
 * Load a file from disk with its modification timestamp.
 */
export function loadFile(path: string): Effect.Effect<LoadedFile, ContentError> {
  return Effect.gen(function* () {
    const fs = yield* Effect.tryPromise({
      try: async () => await import("node:fs/promises"),
      catch: (error) =>
        ContentError.ioError(path, {
          message: error instanceof Error ? error.message : String(error),
        }),
    })

    const stats = yield* Effect.tryPromise({
      try: () => fs.stat(path),
      catch: (error) => {
        const isNotFound =
          error instanceof Error &&
          ("code" in error ? error.code === "ENOENT" : error.message.includes("ENOENT"))

        if (isNotFound) {
          return ContentError.notFound(path)
        }

        return ContentError.ioError(path, {
          message: error instanceof Error ? error.message : String(error),
        })
      },
    })

    const raw = yield* Effect.tryPromise({
      try: () => fs.readFile(path, "utf-8"),
      catch: (error) =>
        ContentError.ioError(path, {
          message: error instanceof Error ? error.message : String(error),
        }),
    })

    return {
      raw,
      modifiedAt: stats.mtime,
    } as const
  })
}

/**
 * List files matching a glob pattern relative to a root directory.
 */
export function listFiles(
  pattern: string,
  root: string,
): Effect.Effect<ReadonlyArray<string>, ContentError> {
  return Effect.gen(function* () {
    const files = yield* Effect.tryPromise({
      try: () =>
        glob(pattern, {
          cwd: root,
          absolute: false,
          nodir: true,
          windowsPathsNoEscape: true,
        }),
      catch: (error) =>
        ContentError.ioError(root, {
          message: error instanceof Error ? error.message : String(error),
          pattern,
        }),
    })

    return files as ReadonlyArray<string>
  })
}
