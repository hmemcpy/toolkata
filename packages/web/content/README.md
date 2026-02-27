# toolkata-content

Tutorial content for [toolkata](https://github.com/hmemcpy/toolkata) - interactive tutorials for learning developer tools.

## Structure

```
{tool-pair}/
├── config.yml      # Sandbox and validation configuration
├── lessons/        # Step-by-step tutorial content (MDX)
├── katas/          # Practice exercises (MDX)
└── glossary.ts     # Command reference mappings
```

## Tool Pairings

| Pairing | Description |
|---------|-------------|
| `jj-git` | Learn Jujutsu (jj) coming from Git |
| `zio-cats` | Learn ZIO coming from Cats Effect |
| `effect-zio` | Learn Effect-TS coming from ZIO |

## Content Format

Lessons and katas are written in MDX with custom components:

- `<TryIt>` - Interactive terminal commands
- `<SideBySide>` - Compare equivalent commands
- `<ScalaComparisonBlock>` - Side-by-side Scala code
- `<Callout>` - Tips, warnings, notes

## Contributing

1. Fork this repository
2. Create a branch for your changes
3. Edit content in the appropriate `{tool-pair}/lessons/` directory
4. Submit a pull request

## License

MIT - see [LICENSE](LICENSE)
