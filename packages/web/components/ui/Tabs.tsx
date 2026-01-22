/**
 * Tabs - Tabbed content container for grouped options like OS-specific instructions.
 *
 * Features:
 * - Keyboard navigation (arrow keys, Home, End)
 * - ARIA compliant tablist/tab/tabpanel
 * - Remembers selection in localStorage (optional)
 *
 * @example
 * ```tsx
 * <Tabs defaultTab="macos">
 *   <Tab id="macos" label="macOS">
 *     ```bash
 *     brew install jj
 *     ```
 *   </Tab>
 *   <Tab id="linux" label="Linux">
 *     ```bash
 *     cargo install jj-cli
 *     ```
 *   </Tab>
 * </Tabs>
 * ```
 */

"use client"

import { Children, isValidElement, useEffect, useState } from "react"

interface TabProps {
  /**
   * Unique identifier for this tab.
   */
  readonly id: string

  /**
   * Label displayed in the tab button.
   */
  readonly label: string

  /**
   * Content to display when this tab is active.
   */
  readonly children: React.ReactNode
}

/**
 * Individual tab content wrapper.
 */
export function Tab({ children }: TabProps) {
  return <>{children}</>
}

interface TabsProps {
  /**
   * ID of the tab to show by default.
   */
  readonly defaultTab?: string

  /**
   * Optional key for persisting selection in localStorage.
   */
  readonly persistKey?: string

  /**
   * Tab components as children.
   */
  readonly children: React.ReactNode
}

/**
 * Tabs container component.
 */
export function Tabs({ defaultTab, persistKey, children }: TabsProps) {
  // Extract tab info from children
  const tabs = Children.toArray(children)
    .filter((child): child is React.ReactElement<TabProps> => {
      if (!isValidElement(child)) return false
      const props = child.props as Partial<TabProps>
      return typeof props.id === "string"
    })
    .map((child) => {
      const props = child.props as TabProps
      return {
        id: props.id,
        label: props.label,
        content: props.children,
      }
    })

  const [activeTab, setActiveTab] = useState<string>(() => {
    // Will be updated in useEffect for SSR safety
    return defaultTab ?? tabs[0]?.id ?? ""
  })

  // Load persisted tab on mount
  useEffect(() => {
    if (persistKey) {
      const stored = localStorage.getItem(`tabs-${persistKey}`)
      if (stored && tabs.some((t) => t.id === stored)) {
        setActiveTab(stored)
      }
    }
  }, [persistKey, tabs])

  // Persist selection
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (persistKey) {
      localStorage.setItem(`tabs-${persistKey}`, tabId)
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const tabCount = tabs.length
    let newIndex = currentIndex

    switch (e.key) {
      case "ArrowLeft":
        newIndex = (currentIndex - 1 + tabCount) % tabCount
        break
      case "ArrowRight":
        newIndex = (currentIndex + 1) % tabCount
        break
      case "Home":
        newIndex = 0
        break
      case "End":
        newIndex = tabCount - 1
        break
      default:
        return
    }

    e.preventDefault()
    const newTab = tabs[newIndex]
    if (newTab) {
      handleTabChange(newTab.id)
      // Focus the new tab button
      const button = document.getElementById(`tab-${newTab.id}`)
      button?.focus()
    }
  }

  const activeContent = tabs.find((t) => t.id === activeTab)?.content

  return (
    <div className="my-4">
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Installation options"
        className="flex gap-0 border-b border-[var(--color-border)]"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset ${
              activeTab === tab.id
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)] -mb-px"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panel */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="pt-2 [&>pre]:mt-0"
      >
        {activeContent}
      </div>
    </div>
  )
}
