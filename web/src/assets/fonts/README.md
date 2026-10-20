# Vendored web fonts

The web app vendors only the latin and latin-ext files it uses (latin-ext
carries Turkish ı ş ğ İ) so `next build` does not make network requests to a
font CDN. The families match seda.works.

- Geist variable normal: `@fontsource-variable/geist@5.3.0`
- Bricolage Grotesque variable normal: `@fontsource-variable/bricolage-grotesque@5.3.0`
- Geist Mono variable normal: `@fontsource-variable/geist-mono@5.3.0`

All packages publish the Google Fonts binaries under the SIL Open Font
License 1.1. Each family directory includes the corresponding `OFL.txt` from
that package. Source packages:

- https://www.npmjs.com/package/@fontsource-variable/geist/v/5.3.0
- https://www.npmjs.com/package/@fontsource-variable/bricolage-grotesque/v/5.3.0
- https://www.npmjs.com/package/@fontsource-variable/geist-mono/v/5.3.0
