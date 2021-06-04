export default {
    "ispace-viewport[gizmo='move']": {
        "x": "gizmo:move:x",
        "y": "gizmo:move:y",
        "z": "gizmo:move:z",
        "Z": "gizmo:move:xy",
        "X": "gizmo:move:yz",
        "Y": "gizmo:move:xz",
        "s": "gizmo:move:screen",
    },

    "ispace-viewport[gizmo='rotate']": {
        "x": "gizmo:rotate:x",
        "y": "gizmo:rotate:y",
        "z": "gizmo:rotate:z",
        "s": "gizmo:rotate:screen",
    },

    "ispace-viewport[gizmo='curve']": {
        // "1": "gizmo:curve:line-segment",
        "1": "gizmo:curve:polyline",
        "2": "gizmo:curve:bezier",
        "3": "gizmo:curve:nurbs",
        "4": "gizmo:curve:hermite",
        "5": "gizmo:curve:cubic-spline",
        "6": "gizmo:curve:arc",
        "space": "gizmo:curve:add-curve",
        "cmd-z": "gizmo:curve:undo",
    },

    "ispace-viewport": {
        "g": "command:move",
        "r": "command:rotate",
        "s": "command:scale",
        "b": "command:fillet",
        "e": "command:extrude",
        "x": "command:delete",
        "delete": "command:delete",
        "backspace": "command:delete",

        "escape": "command:abort",
        "enter": "command:finish",
    },

    "ispace-workspace": {
        "cmd-z": "undo",
        "cmd-shift-z": "redo",
    }
}