export default {
    "ispace-viewport[gizmo='circle']": {
        "v": "gizmo:circle:mode",
    },

    "ispace-viewport[gizmo='polygon']": {
        "wheel+up": "gizmo:polygon:add-vertex",
        "wheel+down": "gizmo:polygon:subtract-vertex",
    },

    "ispace-viewport[gizmo='spiral']": {
        "a": "gizmo:spiral:angle",
        "d": "gizmo:spiral:length",
        "r": "gizmo:spiral:radius",
    },

    "ispace-viewport[gizmo='move']": {
        "x": "gizmo:move:x",
        "y": "gizmo:move:y",
        "z": "gizmo:move:z",
        "Z": "gizmo:move:xy",
        "X": "gizmo:move:yz",
        "Y": "gizmo:move:xz",
        "s": "gizmo:move:screen",
    },

    "ispace-viewport[gizmo='fillet']": {
        "a": "gizmo:fillet:add",
        "f": "gizmo:fillet:distance",
    },

    "ispace-viewport[gizmo='rotate']": {
        "x": "gizmo:rotate:x",
        "y": "gizmo:rotate:y",
        "z": "gizmo:rotate:z",
        "s": "gizmo:rotate:screen",
    },

    "ispace-viewport[gizmo='curve']": {
        "1": "gizmo:curve:bezier",
        "2": "gizmo:curve:nurbs",
        "3": "gizmo:curve:hermite",
        "4": "gizmo:curve:cubic-spline",
        "cmd-z": "gizmo:curve:undo",
    },

    "ispace-viewport[gizmo='line']": {
        "cmd-z": "gizmo:line:undo",
    },

    "ispace-viewport": {
        "c": "command:circle",
        "g": "command:move",
        "r": "command:rotate",
        "s": "command:scale",
        "b": "command:fillet",
        "f": "command:fillet-curve",
        "e": "command:extrude",
        "x": "command:delete",
        "t": "command:trim",
        "tab": "command:mode",
        "delete": "command:delete",
        "backspace": "command:delete",

        "escape": "command:abort",
        "enter": "command:finish",
        "mouse2": "command:finish"
    },

    "ispace-workspace": {
        "cmd-z": "undo",
        "cmd-shift-z": "redo",
    }
}