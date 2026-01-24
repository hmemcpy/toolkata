# Cats Effect & ZIO Branding Guide

## Quick Color Reference

### Cats Effect
```
Primary Teal:     #6dd3ce (rgb: 109, 211, 206)
Slate Blue:       #53729a (rgb: 83, 114, 154)
Coral/Peach:      #f7a278 (rgb: 247, 162, 120)
Soft Pink:        #f1beca (rgb: 241, 190, 202)
Black:            #000000
```

### ZIO
```
Brand Orange:     #e73c00 (rgb: 231, 60, 0)
Bright Red:       #FF3300 (rgb: 255, 51, 0)
Orange:           #FF6600 (rgb: 255, 102, 0)
Dark Maroon:      #990000 (rgb: 153, 0, 0)
Yellow Accent:    #FFFF00 (rgb: 255, 255, 0)
```

## Logo Files

### Available Locally
- `/Users/hmemcpy/git/zio-cats/cats-effect-logo.svg` - Cats Effect logo (6.9KB)
- `/Users/hmemcpy/git/zio-cats/zio-web-logo.png` - ZIO logo (200KB, 2757x1123px)

### Online Sources
**Cats Effect:**
- SVG: https://typelevel.org/cats-effect/img/cats-effect-logo.svg
- Repo: https://github.com/typelevel/cats-effect

**ZIO:**
- PNG: https://zio.dev/img/zio.png
- Brand Kit: https://github.com/zio/zio/tree/master/website/static/img

## Using These Colors

### CSS Variables
Import `logo-colors.css` for ready-to-use CSS custom properties:

```css
@import './logo-colors.css';

/* Use in your styles */
.my-element {
  color: var(--cats-effect-teal);
  background: var(--zio-brand-orange);
}
```

### Tailwind Configuration
Add to `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        'cats-teal': '#6dd3ce',
        'cats-slate': '#53729a',
        'cats-coral': '#f7a278',
        'cats-pink': '#f1beca',
        'zio-orange': '#e73c00',
        'zio-red': '#FF3300',
        'zio-maroon': '#990000',
        'zio-yellow': '#FFFF00',
      }
    }
  }
}
```

## Design Philosophy

### Cats Effect
- **Mood**: Friendly, approachable, academic
- **Visual Language**: Soft pastels, illustrative, playful
- **Key Element**: Hexagonal frame with cat and books
- **Usage Context**: Documentation, technical content

### ZIO
- **Mood**: Energetic, dynamic, bold
- **Visual Language**: Warm gradients, strong typography
- **Key Element**: Stylized "ZIO" text with color gradient
- **Usage Context**: Branding, CTAs, high-impact elements

## Combination Guidelines

When using both brands together:

1. **Hierarchy**: Use Cats Effect teal as primary, ZIO orange as accent
2. **Contrast**: These colors work well together (teal provides cool balance to warm orange)
3. **Balance**: 60% Cats Effect colors, 40% ZIO colors creates good visual harmony
4. **Context**: Use Cats Effect for content/educational sections, ZIO for actions/highlights

### Example Color Scheme
```css
/* Background */
--bg-primary: #0a0a0a;           /* Dark terminal background */
--bg-secondary: #1a1a1a;         /* Slightly lighter */

/* Cats Effect (Content) */
--text-primary: #6dd3ce;         /* Teal for headings */
--text-secondary: #53729a;       /* Slate for body */

/* ZIO (Actions/Highlights) */
--accent-primary: #e73c00;       /* Orange for CTAs */
--accent-secondary: #FF6600;     /* Bright orange for highlights */
```

## File Reference

See `LOGO-ASSETS.md` for complete documentation including:
- Detailed color extraction methodology
- SVG path descriptions
- Usage guidelines
- Brand asset locations

See `logo-colors.css` for:
- CSS custom properties
- RGB values
- Opacity variants
- Utility classes
