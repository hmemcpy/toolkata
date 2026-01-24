// Welcome banners per tool pairing
// These are displayed in the terminal when a session starts
// Keep messages short to avoid wrapping issues in narrow terminals

// ANSI color codes
const GREEN = "\x1b[32m" // jj color
const ORANGE = "\x1b[33m" // git color (yellow renders as orange in most terminals)
const RESET = "\x1b[0m"

export const WELCOME_BANNERS: Record<string, string> = {
  "jj-git": `Welcome to the ${GREEN}jj${RESET}/${ORANGE}git${RESET} sandbox!\r\nTry ${GREEN}jj${RESET} and ${ORANGE}git${RESET} commands safely here.\r\n\r\n`,
}

// Get banner for a tool pair, or undefined if none configured
export const getBanner = (toolPair: string): string | undefined => {
  return WELCOME_BANNERS[toolPair]
}
