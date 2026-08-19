# Custom Maximized Geometry (KWin Script)

A KWin script for KDE Plasma 6 that enforces a custom window geometry threshold of **1920x980** at **(0, 30)** for maximized and floating windows.

## Features
- **Custom Maximize Target**: Maximized windows fill a precise 1920x980 resolution placed at position (0, 30).
- **Dock & Top Bar Protection**: Prevents newly created or resized windows from extending below the bottom dock or above the top bar.
- **State Restoring**: Smoothly restores windows to their previous unmaximized size/position when unmaximized.
- **Dynamic Enforcement**: Automatically handles window creation, activation, and monitor resolution changes.

## Installation

### Manual Installation
Copy or symlink this directory to `~/.local/share/kwin/scripts/custom-maximized-geometry`:

```bash
mkdir -p ~/.local/share/kwin/scripts/
git clone https://github.com/Edywxz/custom-maximized-geometry.git ~/.local/share/kwin/scripts/custom-maximized-geometry
```

Enable the script in **System Settings > Window Management > KWin Scripts** or via CLI:

```bash
kpackagetool6 --type=KWin/Script --install ~/.local/share/kwin/scripts/custom-maximized-geometry
```

To enable via DBus:
```bash
qdbus org.kde.KWin /Scripting loadScript "$PWD/contents/code/main.js" "custom-maximized-geometry"
qdbus org.kde.KWin /Scripting start
```

## License
GPLv3
