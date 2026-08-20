/*
 * Custom Maximized Geometry - KWin Script for KDE Plasma 6
 * Target geometry: configurable (default: x = 0, y = 30, width = 1920, height = 980)
 * Filtering: configurable whitelist and blacklist (default blacklist includes Spectacle)
 */

var savedGeometries = {};
var customMaximized = {};
var busyWindows = {};

function getConfig(key, defaultValue) {
    if (typeof readConfig === "function") {
        try {
            var val = readConfig(key, defaultValue);
            if (val !== undefined && val !== null) {
                return val;
            }
        } catch (e) {
            print("[CustomMaximizedGeometry] Error reading config '" + key + "': " + e);
        }
    }
    return defaultValue;
}

function getTargetGeometry() {
    var x = Number(getConfig("TargetX", 0));
    var y = Number(getConfig("TargetY", 30));
    var w = Number(getConfig("TargetWidth", 1920));
    var h = Number(getConfig("TargetHeight", 980));
    return {
        x: isNaN(x) ? 0 : x,
        y: isNaN(y) ? 30 : y,
        width: isNaN(w) || w <= 0 ? 1920 : w,
        height: isNaN(h) || h <= 0 ? 980 : h
    };
}

function getThresholdBounds() {
    var target = getTargetGeometry();
    return {
        target: target,
        maxX: target.x + target.width,
        maxY: target.y + target.height
    };
}

function getWindowIdentifiers(window) {
    if (!window) return [];
    var list = [];
    if (window.resourceClass) list.push(window.resourceClass.toString().toLowerCase());
    if (window.resourceName) list.push(window.resourceName.toString().toLowerCase());
    if (window.desktopFileName) list.push(window.desktopFileName.toString().toLowerCase());
    if (window.caption) list.push(window.caption.toString().toLowerCase());
    return list;
}

function parseList(str) {
    if (!str || typeof str !== 'string') return [];
    return str.split(',')
        .map(function (item) { return item.trim().toLowerCase(); })
        .filter(function (item) { return item.length > 0; });
}

function matchesFilter(window, filterList) {
    if (!window || !filterList || filterList.length === 0) return false;
    var ids = getWindowIdentifiers(window);
    for (var i = 0; i < filterList.length; i++) {
        var pattern = filterList[i];
        for (var j = 0; j < ids.length; j++) {
            var id = ids[j];
            if (id === pattern || id.indexOf(pattern) !== -1) {
                return true;
            }
        }
    }
    return false;
}

function isWindowAllowed(window) {
    if (!window || !window.normalWindow) return false;
    if (window.skipTaskbar || window.dock || window.desktopWindow) return false;

    var rawBlacklist = getConfig("Blacklist", "org.kde.spectacle, spectacle, Spectacle");
    var blacklist = parseList(rawBlacklist);
    if (blacklist.length > 0 && matchesFilter(window, blacklist)) {
        return false;
    }

    var rawWhitelist = getConfig("Whitelist", "");
    var whitelist = parseList(rawWhitelist);
    if (whitelist.length > 0) {
        if (!matchesFilter(window, whitelist)) {
            return false;
        }
    }

    return true;
}

function runDelayed(ms, callback) {
    var timer = new QTimer();
    timer.interval = ms;
    timer.singleShot = true;
    timer.timeout.connect(function () {
        try {
            callback();
        } catch (e) {
            print("[CustomMaximizedGeometry] Timer error: " + e);
        }
    });
    timer.start();
}

function getWindowId(window) {
    if (!window) return null;
    return window.internalId ? window.internalId.toString() : (window.caption || null);
}

function cloneGeometry(geo) {
    if (!geo) return null;
    return {
        x: geo.x,
        y: geo.y,
        width: geo.width,
        height: geo.height
    };
}

function isSameGeometry(g1, g2) {
    if (!g1 || !g2) return false;
    return Math.abs(g1.x - g2.x) <= 3 &&
        Math.abs(g1.y - g2.y) <= 3 &&
        Math.abs(g1.width - g2.width) <= 3 &&
        Math.abs(g1.height - g2.height) <= 3;
}

function isNativeMaximized(window) {
    if (!window) return false;
    if (typeof window.maximizeMode !== 'undefined') {
        return window.maximizeMode === 3;
    }
    if (typeof window.maximized !== 'undefined') {
        return window.maximized === true;
    }
    return false;
}

function constrainGeometryToThreshold(geo) {
    if (!geo) return null;
    var bounds = getThresholdBounds();
    var target = bounds.target;
    var w = Math.min(geo.width, target.width);
    var h = Math.min(geo.height, target.height);
    var x = Math.max(target.x, Math.min(geo.x, bounds.maxX - w));
    var y = Math.max(target.y, Math.min(geo.y, bounds.maxY - h));
    return {
        x: x,
        y: y,
        width: w,
        height: h
    };
}

function isExceedingThreshold(geo) {
    if (!geo) return false;
    var bounds = getThresholdBounds();
    var target = bounds.target;
    if (geo.y < target.y) return true;
    if (geo.y + geo.height > bounds.maxY) return true;
    if (geo.x < target.x) return true;
    if (geo.x + geo.width > bounds.maxX) return true;
    if (geo.height > target.height) return true;
    if (geo.width > target.width) return true;
    return false;
}

function applyTargetGeometry(window) {
    if (!window || !window.normalWindow) return;

    var target = getTargetGeometry();

    // Unmaximize natively so KWin compositor doesn't lock geometry to full screen
    if (typeof window.setMaximize === 'function') {
        window.setMaximize(false, false);
    } else {
        window.maximized = false;
    }

    // Apply frameGeometry immediately and across multiple frames
    window.frameGeometry = target;

    var delays = [50, 150, 300, 500];
    for (var i = 0; i < delays.length; i++) {
        (function (d) {
            runDelayed(d, function () {
                if (window && window.normalWindow && !window.interactiveMoveResize) {
                    window.frameGeometry = target;
                }
            });
        })(delays[i]);
    }
}

function maximizeWindow(window) {
    if (!isWindowAllowed(window)) return;

    var windowId = getWindowId(window);
    if (!windowId || busyWindows[windowId]) return;

    busyWindows[windowId] = true;

    try {
        var currentGeo = cloneGeometry(window.frameGeometry);
        var targetGeo = getTargetGeometry();

        // Save current floating geometry before maximizing if not already target
        if (currentGeo && !isSameGeometry(currentGeo, targetGeo)) {
            savedGeometries[windowId] = currentGeo;
        } else if (!savedGeometries[windowId]) {
            // Default restore geometry inside threshold
            savedGeometries[windowId] = { x: 160, y: 90, width: 1600, height: 900 };
        }

        applyTargetGeometry(window);
        customMaximized[windowId] = true;
        print("[CustomMaximizedGeometry] Custom maximized window: " + window.caption);
    } catch (err) {
        print("[CustomMaximizedGeometry] Error in maximizeWindow: " + err);
    } finally {
        runDelayed(150, function () {
            delete busyWindows[windowId];
        });
    }
}

function restoreWindow(window) {
    if (!window || !window.normalWindow) return;
    var windowId = getWindowId(window);
    if (!windowId || busyWindows[windowId]) return;

    busyWindows[windowId] = true;
    try {
        print("[CustomMaximizedGeometry] Restoring window: " + window.caption);

        if (typeof window.setMaximize === 'function') {
            window.setMaximize(false, false);
        } else {
            window.maximized = false;
        }

        var restoreGeo = savedGeometries[windowId] || { x: 160, y: 90, width: 1600, height: 900 };
        window.frameGeometry = restoreGeo;
        runDelayed(50, function () {
            if (window && window.normalWindow && !window.interactiveMoveResize) {
                window.frameGeometry = restoreGeo;
            }
        });

        customMaximized[windowId] = false;
        delete savedGeometries[windowId];
    } finally {
        runDelayed(150, function () {
            delete busyWindows[windowId];
        });
    }
}

function handleMaximizeToggle(window) {
    if (!isWindowAllowed(window)) return;

    var windowId = getWindowId(window);
    if (!windowId) return;

    if (customMaximized[windowId]) {
        restoreWindow(window);
    } else {
        maximizeWindow(window);
    }
}

function handleInteractiveMoveResizeStart(window) {
    if (!window) return;
    var windowId = getWindowId(window);
    if (!windowId) return;

    if (customMaximized[windowId]) {
        print("[CustomMaximizedGeometry] User started moving/resizing custom-maximized window: " + window.caption + " -> Releasing custom maximize state");
        customMaximized[windowId] = false;
        busyWindows[windowId] = true;
        try {
            if (typeof window.setMaximize === 'function') {
                window.setMaximize(false, false);
            } else {
                window.maximized = false;
            }
        } finally {
            runDelayed(200, function () {
                delete busyWindows[windowId];
            });
        }
    }
}

function enforceInitialWindowBounds(window) {
    if (!isWindowAllowed(window)) return;

    var enforceInitial = Boolean(getConfig("EnforceInitialBounds", true));
    if (!enforceInitial) return;

    var windowId = getWindowId(window);
    if (!windowId || busyWindows[windowId]) return;

    if (customMaximized[windowId]) return;

    if (isNativeMaximized(window)) {
        print("[CustomMaximizedGeometry] Native maximized window detected on creation: " + window.caption);
        maximizeWindow(window);
        return;
    }

    if (isExceedingThreshold(window.frameGeometry)) {
        var constrained = constrainGeometryToThreshold(window.frameGeometry);
        if (constrained && !isSameGeometry(window.frameGeometry, constrained)) {
            print("[CustomMaximizedGeometry] Clamping initial window geometry within target threshold for: " + window.caption);
            busyWindows[windowId] = true;
            try {
                window.frameGeometry = constrained;
            } finally {
                runDelayed(100, function () {
                    delete busyWindows[windowId];
                });
            }
        }
    }
}

function enforceCustomMaximizedState(window) {
    if (!isWindowAllowed(window)) return;
    if (window.interactiveMoveResize) return;

    var windowId = getWindowId(window);
    if (!windowId || busyWindows[windowId]) return;

    if (customMaximized[windowId]) {
        var target = getTargetGeometry();
        if (!isSameGeometry(window.frameGeometry, target) || isNativeMaximized(window)) {
            print("[CustomMaximizedGeometry] Enforcing target geometry for custom-maximized window: " + window.caption);
            applyTargetGeometry(window);
        }
    }
}

function enforceAllCustomMaximizedWindows() {
    print("[CustomMaximizedGeometry] Re-enforcing custom maximized windows");
    var windows = workspace.windowList();
    for (var i = 0; i < windows.length; i++) {
        var win = windows[i];
        if (!win || !win.normalWindow) continue;
        if (win.skipTaskbar || win.dock || win.desktopWindow) continue;
        if (!isWindowAllowed(win)) continue;

        enforceCustomMaximizedState(win);
    }
}

function registerWindow(window) {
    if (!isWindowAllowed(window)) return;

    var windowId = getWindowId(window);
    if (!windowId) return;

    // Immediately check & enforce threshold for newly added window
    enforceInitialWindowBounds(window);

    // Multi-pass delayed check for newly added window geometry as it settles
    var delays = [50, 150, 300, 500];
    for (var i = 0; i < delays.length; i++) {
        (function (d) {
            runDelayed(d, function () {
                if (window && window.normalWindow && isWindowAllowed(window) && !customMaximized[windowId] && !window.interactiveMoveResize) {
                    enforceInitialWindowBounds(window);
                }
            });
        })(delays[i]);
    }

    if (window.interactiveMoveResizeStarted) {
        window.interactiveMoveResizeStarted.connect(function () {
            handleInteractiveMoveResizeStart(window);
        });
    }

    if (window.moveResizedChanged) {
        window.moveResizedChanged.connect(function () {
            if (window.interactiveMoveResize) {
                handleInteractiveMoveResizeStart(window);
            }
        });
    }

    if (window.maximizedAboutToChange) {
        window.maximizedAboutToChange.connect(function (mode) {
            if (mode === 3) {
                handleMaximizeToggle(window);
            }
        });
    }

    if (window.maximizedChanged) {
        window.maximizedChanged.connect(function () {
            if (!isWindowAllowed(window)) return;
            if (isNativeMaximized(window) && !customMaximized[windowId]) {
                maximizeWindow(window);
            } else if (!isNativeMaximized(window) && customMaximized[windowId]) {
                restoreWindow(window);
            }
        });
    }

    if (window.frameGeometryChanged) {
        window.frameGeometryChanged.connect(function () {
            if (window.interactiveMoveResize) {
                if (customMaximized[windowId]) {
                    handleInteractiveMoveResizeStart(window);
                }
                return;
            }

            if (!busyWindows[windowId] && customMaximized[windowId]) {
                runDelayed(50, function () {
                    if (!busyWindows[windowId] && customMaximized[windowId] && !window.interactiveMoveResize) {
                        enforceCustomMaximizedState(window);
                    }
                });
            }
        });
    }

    if (window.closed) {
        window.closed.connect(function () {
            delete savedGeometries[windowId];
            delete customMaximized[windowId];
            delete busyWindows[windowId];
        });
    }
}

workspace.windowAdded.connect(registerWindow);

if (workspace.windowActivated) {
    workspace.windowActivated.connect(function (window) {
        if (window && !window.interactiveMoveResize && isWindowAllowed(window)) {
            enforceCustomMaximizedState(window);
        }
    });
}

if (workspace.desktopResized) {
    workspace.desktopResized.connect(function () {
        enforceAllCustomMaximizedWindows();
        runDelayed(100, enforceAllCustomMaximizedWindows);
    });
}

if (workspace.screensChanged) {
    workspace.screensChanged.connect(function () {
        enforceAllCustomMaximizedWindows();
        runDelayed(100, enforceAllCustomMaximizedWindows);
    });
}

var existingWindows = workspace.windowList();
for (var i = 0; i < existingWindows.length; i++) {
    registerWindow(existingWindows[i]);
}

print("[CustomMaximizedGeometry] Script active with blacklist/whitelist configuration support");
