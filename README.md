# dmenu for Chrome

<img src="assets/dmenu-logo.svg" alt="" width="96" height="96" align="left">

A browser extension that lets you search tabs with a dynamic menu program—such as [dmenu].

[dmenu]: https://tools.suckless.org/dmenu/

**[Documentation] | [Changelog] | [Contributing]**

**[Add to Chrome]**

[Documentation]: docs/manual.md
[Changelog]: CHANGELOG.md
[Contributing]: CONTRIBUTING.md
[Add to Chrome]: #installation

## Features

- Tab search.
- List tabs by recency.
- Recently closed tab search.
- Synced tab search.
- Bookmark search.
- Reading list search.
- Recently visited page search.
- Download search.
- Installed extension search.
- Combined search.

## Installation

Requires [chrome-shell] for running shell commands.

[chrome-shell]: https://github.com/taupiqueur/chrome-shell

### Nightly builds

Download the [Nightly builds].

[Nightly builds]: https://github.com/taupiqueur/chrome-dmenu/releases/nightly

### Build from source

Install [Inkscape] to build the images.

[Inkscape]: https://inkscape.org

``` sh
git clone https://github.com/taupiqueur/chrome-dmenu.git
cd chrome-dmenu
make build
```

### Load an unpacked extension

1. Navigate to `chrome://extensions`.
2. Enable “Developer mode”.
3. Click “Load unpacked” and select the extension directory.

### Allow native messaging with the shell application

Copy the extension ID and run the following in your terminal.

```
chrome-shell install [--target=<platform>] [<extension-id>...]
```

Possible targets are `chrome`, `chrome-dev`, `chrome-beta`, `chrome-canary` and `chromium`.

## Documentation

See the [manual] for setup and usage instructions.

[Manual]: docs/manual.md

dmenu for Chrome is also documented via the extension’s internal pages—Right-click the dmenu toolbar button
and select “Documentation”.

## Contributing

Report bugs on the [issue tracker],
ask questions on the [IRC channel],
send patches on the [mailing list].

[Issue tracker]: https://github.com/taupiqueur/chrome-dmenu/issues
[IRC channel]: https://web.libera.chat/gamja/#taupiqueur
[Mailing list]: https://github.com/taupiqueur/chrome-dmenu/pulls
