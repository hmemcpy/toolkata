/**
 * MDX component mapping for custom MDX elements.
 *
 * Maps MDX elements to React components for rendering in content pages.
 * Code blocks are handled by prose styling, not a custom component.
 */

import { Callout } from "../ui/Callout"
import { SideBySide } from "../ui/SideBySide"
import { Tab, Tabs } from "../ui/Tabs"
import { TryIt } from "../ui/TryIt"

/**
 * MDX component mappings.
 *
 * These components are available for use in MDX content.
 *
 * Note: Code blocks (```bash etc) are NOT mapped - they use native
 * <pre><code> elements styled by prose classes in StepPageClientWrapper.
 */
export const mdxComponents = {
  SideBySide,
  Callout,
  Tabs,
  Tab,
  TryIt,
}

/**
 * Type for MDX components.
 */
export type MDXComponents = typeof mdxComponents
