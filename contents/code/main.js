/*
 * Custom Maximized Geometry - KWin Script for KDE Plasma 6
 * Target geometry: x = 0, y = 30, width = 1920, height = 980
 * Threshold bounds: X [0..1920], Y [30..1010]
 */

var TARGET_X = 0;
var TARGET_Y = 30;
var TARGET_WIDTH = 1920;
var TARGET_HEIGHT = 980;

var MAX_X = TARGET_X + TARGET_WIDTH;   // 1920
var MAX_Y = TARGET_Y + TARGET_HEIGHT;  // 1010

var savedGeometries = {};
var customMaximized = {};
var busyWindows = {};

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
    var w = Math.min(geo.width, TARGET_WIDTH);
    var h = Math.min(geo.height, TARGET_HEIGHT);
    var x = Math.max(TARGET_X, Math.min(geo.x, MAX_X - w));
    var y = Math.max(TARGET_Y, Math.min(geo.y, MAX_Y - h));
    return {
        x: x,
        y: y,
        width: w,
        height: h
    };
}

function isExceedingThreshold(geo) {
    if (!geo) return false;
    if (geo.y < TARGET_Y) return true;
    if (geo.y + geo.height > MAX_Y) return true;
    if (geo.x < TARGET_X) return true;
    if (geo.x + geo.width > MAX_X) return true;
    if (geo.height > TARGET_HEIGHT) return true;
    if (geo.width > TARGET_WIDTH) return true;
    return false;
}

function isMaximizedOrFullScreenTarget(window) {
    if (!window || !window.frameGeometry) return false;
    if (isNativeMaximized(window)) return true;
    var geo = window.frameGeometry;
    // Window starts above top bar or ends below dock with near full monitor height/width
    if (geo.y < TARGET_Y && geo.height >= 900) return true;
    if (geo.y + geo.height > MAX_Y && geo.height >= 950) return true;
    if (geo.width >= 1600 && geo.height >= 900) return true;
    return false;
}

function applyTargetGeometry(window) {
    if (!window || !window.normalWindow) return;

    var target = {
        x: TARGET_X,
        y: TARGET_Y,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT
    };

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
                if (window && window.normalWindow) {
                    window.frameGeometry = target;
                }
            });
        })(delays[i]);
    }
}

function maximizeWindow(window) {
    if (!window || !window.normalWindow) return;
    if (window.skipTaskbar || window.dock || window.desktopWindow) return;

    var windowId = getWindowId(window);
    if (!windowId || busyWindows[windowId]) return;

    busyWindows[windowId] = true;

    try {
        var currentGeo = cloneGeometry(window.frameGeometry);
        var targetGeo = { x: TARGET_X, y: TARGET_Y, width: TARGET_WIDTH, height: TARGET_HEIGHT };

        // Save current geometry only if it's a valid floating window geometry
        if (currentGeo && !isSameGeometry(currentGeo, targetGeo) && !isExceedingThreshold(currentGeo)) {
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
            if (window && window.normalWindow) {
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
    if (!window || !window.normalWindow) return;
    if (window.skipTaskbar || window.dock || window.desktopWindow) return;

    var windowId = getWindowId(window);
    if (!windowId) return;

    if (customMaximized[windowId]) {
        restoreWindow(window);
    } else {
        maximizeWindow(window);
    }
}

function enforceWindowThreshold(window) {
    if (!window || !window.normalWindow) return;
    if (window.skipTaskbar || window.dock || window.desktopWindow) return;

    var windowId = getWindowId(window);
    if (!windowId || busyWindows[windowId]) return;

    var target = {
        x: TARGET_X,
        y: TARGET_Y,
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT
    };

    if (customMaximized[windowId]) {
        if (!isSameGeometry(window.frameGeometry, target) || isNativeMaximized(window)) {
            print("[CustomMaximizedGeometry] Enforcing target geometry for custom-maximized window: " + window.caption);
            applyTargetGeometry(window);
        }
        return;
    }

    if (isMaximizedOrFullScreenTarget(window)) {
        print("[CustomMaximizedGeometry] Native maximized or full-screen target detected: " + window.caption);
        maximizeWindow(window);
        return;
    }

    if (isExceedingThreshold(window.frameGeometry)) {
        var constrained = constrainGeometryToThreshold(window.frameGeometry);
        if (constrained && !isSameGeometry(window.frameGeometry, constrained)) {
            print("[CustomMaximizedGeometry] Clamping window geometry within 1920x980 threshold for: " + window.caption);
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

function enforceAllWindowGeometries() {
    print("[CustomMaximizedGeometry] Enforcing all window geometries within 1920x980 threshold");
    var windows = workspace.windowList();
    for (var i = 0; i < windows.length; i++) {
        var win = windows[i];
        if (!win || !win.normalWindow) continue;
        if (win.skipTaskbar || win.dock || win.desktopWindow) continue;

        enforceWindowThreshold(win);
    }
}

function registerWindow(window) {
    if (!window || !window.normalWindow) return;
    if (window.skipTaskbar || window.dock || window.desktopWindow) return;

    var windowId = getWindowId(window);
    if (!windowId) return;

    // Immediately check & enforce threshold for newly added window
    enforceWindowThreshold(window);

    // Multi-pass delayed check because newly added window geometry can settle asynchronously
    var delays = [50, 150, 300, 500];
    for (var i = 0; i < delays.length; i++) {
        (function (d) {
            runDelayed(d, function () {
                if (window && window.normalWindow) {
                    enforceWindowThreshold(window);
                }
            });
        })(delays[i]);
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
            if (isNativeMaximized(window) && !customMaximized[windowId]) {
                maximizeWindow(window);
            }
        });
    }

    if (window.activeChanged) {
        window.activeChanged.connect(function () {
            if (window.active) {
                enforceWindowThreshold(window);
                runDelayed(50, function () {
                    enforceWindowThreshold(window);
                });
            }
        });
    }

    if (window.frameGeometryChanged) {
        window.frameGeometryChanged.connect(function () {
            if (!busyWindows[windowId]) {
                if (customMaximized[windowId] || isExceedingThreshold(window.frameGeometry)) {
                    runDelayed(50, function () {
                        if (!busyWindows[windowId]) {
                            enforceWindowThreshold(window);
                        }
                    });
                }
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
        if (window) {
            enforceWindowThreshold(window);
            runDelayed(50, function () {
                enforceWindowThreshold(window);
            });
            runDelayed(150, function () {
                enforceWindowThreshold(window);
            });
        }
    });
}

if (workspace.desktopResized) {
    workspace.desktopResized.connect(function () {
        enforceAllWindowGeometries();
        runDelayed(100, enforceAllWindowGeometries);
    });
}

if (workspace.screensChanged) {
    workspace.screensChanged.connect(function () {
        enforceAllWindowGeometries();
        runDelayed(100, enforceAllWindowGeometries);
    });
}

var existingWindows = workspace.windowList();
for (var i = 0; i < existingWindows.length; i++) {
    registerWindow(existingWindows[i]);
}

print("[CustomMaximizedGeometry] Script active with threshold clamping & dock overlap prevention (Target: 1920x980 at 0,30)");
