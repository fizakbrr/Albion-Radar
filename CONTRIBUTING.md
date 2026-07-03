# Contributing to Camel Radar (Albion Radar)

Thanks for your interest in improving **Camel Radar**, a free and open-source **Albion Online radar**.
Contributions of all sizes are welcome — bug fixes, new resource/enemy mappings, UI polish,
documentation, and translations all help.

## Ways to contribute

- **Report a bug** — open an [issue](https://github.com/fizakbrr/Albion-Radar/issues) with steps to
  reproduce, your OS, Node version, and any console output.
- **Suggest a feature** — open an issue describing the use case.
- **Improve docs** — fix a typo, clarify a step, or translate the README into another language.
- **Submit code** — fix a bug or add a feature via a pull request (see below).
- **Boost discoverability** — star the repo, share it with your guild, and link to it from Albion
  Online communities and wikis.

## Development setup

Requirements: Windows 10/11, Node.js `20.20.2`+, npm `10.8.0`+.

```powershell
git clone https://github.com/fizakbrr/Albion-Radar.git
cd Albion-Radar
npm ci
```

Run the UI without live packet capture:

```powershell
npm run start:no-capture
```

Build everything and run the test suite:

```powershell
npm run build
npm test
```

## Pull request checklist

1. Fork the repo and create a feature branch (`git checkout -b fix/short-description`).
2. Keep changes focused and minimal — one logical change per PR.
3. Make sure `npm run build` is clean and `npm test` passes.
4. Add or update tests when you change parsing, handler, or filtering logic.
5. Match the existing code style (TypeScript, existing formatting).
6. Write a clear PR title and description explaining what and why.

## Reporting security issues

If you find a security problem, please open an issue marked as security, or contact the maintainer
before public disclosure.

## Code of conduct

Be respectful and constructive. Harassment or abuse of any kind is not tolerated.

## License

By contributing, you agree that your contributions will be licensed under the project's
[ISC License](LICENSE).
