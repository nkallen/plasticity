export default {
    "[command='center-circle'] ispace-viewport": {
        "v": "gizmo:circle:mode",
    },

    "[command='polygon'] ispace-viewport": {
        "wheel+up": "gizmo:polygon:add-vertex",
        "wheel+down": "gizmo:polygon:subtract-vertex",
        "v": "gizmo:polygon:mode",
    },

    "[command='spiral'] ispace-viewport": {
        "a": "gizmo:spiral:angle",
        "d": "gizmo:spiral:length",
        "r": "gizmo:spiral:radius",
    },

    "[command='box'] ispace-viewport": {
        "q": "gizmo:box:union",
        "w": "gizmo:box:difference",
        "e": "gizmo:box:intersect",
        "r": "gizmo:box:new-body",
    },

    "[command='cylinder'] ispace-viewport": {
        "q": "gizmo:cylinder:union",
        "w": "gizmo:cylinder:difference",
        "e": "gizmo:cylinder:intersect",
        "r": "gizmo:cylinder:new-body",
    },

    "[command='sphere'] ispace-viewport": {
        "q": "gizmo:sphere:union",
        "w": "gizmo:sphere:difference",
        "e": "gizmo:sphere:intersect",
        "r": "gizmo:sphere:new-body",
    },

    "[command='extrude'] ispace-viewport": {
        "a": "gizmo:extrude:race1",
        "s": "gizmo:extrude:race2",
        "d": "gizmo:extrude:distance1",
        "f": "gizmo:extrude:distance2",
        "t": "gizmo:extrude:thickness",

        "q": "gizmo:extrude:union",
        "w": "gizmo:extrude:difference",
        "e": "gizmo:extrude:intersect",
        "r": "gizmo:extrude:new-body",
    },

    "[command='offset-fa ispace-viewportce']": {
        "d": "gizmo:offset-face:distance",
        "a": "gizmo:offset-face:angle",
    },

    "[command='move'] ispace-viewport, [command='duplicate'] ispace-viewport": {
        "x": "gizmo:move:x",
        "y": "gizmo:move:y",
        "z": "gizmo:move:z",
        "Z": "gizmo:move:xy",
        "X": "gizmo:move:yz",
        "Y": "gizmo:move:xz",
        "s": "gizmo:move:screen",
    },

    "[command='scale'] ispace-viewport": {
        "x": "gizmo:scale:x",
        "y": "gizmo:scale:y",
        "z": "gizmo:scale:z",
        "Z": "gizmo:scale:xy",
        "X": "gizmo:scale:yz",
        "Y": "gizmo:scale:xz",
        "s": "gizmo:scale:xyz",
    },


    "[command='fillet'] ispace-viewport": {
        "v": "gizmo:fillet:add",
        "d": "gizmo:fillet:distance",
        "a": "gizmo:fillet:angle",
    },

    "[command='rotate'] ispace-viewport": {
        "x": "gizmo:rotate:x",
        "y": "gizmo:rotate:y",
        "z": "gizmo:rotate:z",
        "s": "gizmo:rotate:screen",
    },

    "[command='curve'] ispace-viewport": {
        "1": "gizmo:curve:hermite",
        "2": "gizmo:curve:bezier",
        "3": "gizmo:curve:nurbs",
        "4": "gizmo:curve:cubic-spline",
        "cmd-z": "gizmo:curve:undo",
    },

    "[command='line'] ispace-viewport": {
        "cmd-z": "gizmo:line:undo",
    },

    "ispace-viewport": {
        "c": "command:center-circle",
        "g": "command:move",
        "r": "command:rotate",
        "R": "command:center-rectangle",
        "s": "command:scale",
        "f": "command:fillet",
        // "f": "command:fillet-curve",
        "e": "command:extrude",
        "x": "command:delete",
        "t": "command:trim",
        "i": "command:offset",
        "tab": "command:mode",
        "delete": "command:delete",
        "backspace": "command:delete",

        "escape": "command:abort",
        "enter": "command:finish",
        "mouse2": "command:finish",

        "h": "command:hide-selected",
        "shift-h": "command:hide-unselected",
        "alt-h": "command:unhide-all",

        "shift-d": "command:duplicate",
    },

    "ispace-workspace": {
        "cmd-z": "undo",
        "cmd-shift-z": "redo",
    }
}