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

    "ispace-viewport[gizmo='extrude']": {
        "a": "gizmo:extrude:race1",
        "s": "gizmo:extrude:race2",
        "d": "gizmo:extrude:distance1",
        "f": "gizmo:extrude:distance2",
        "t": "gizmo:extrude:thickness",
    },

    "ispace-viewport[gizmo='offset-face']": {
        "d": "gizmo:offset-face:distance",
        "s": "gizmo:extrude:race2",
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
        "1": "gizmo:curve:hermite",
        "2": "gizmo:curve:bezier",
        "3": "gizmo:curve:nurbs",
        "4": "gizmo:curve:cubic-spline",
        "cmd-z": "gizmo:curve:undo",
    },

    "ispace-viewport[gizmo='line']": {
        "cmd-z": "gizmo:line:undo",
    },

    "ispace-viewport": {
        "c": "command:center-circle",
        "g": "command:move",
        "r": "command:rotate",
        "R": "command:center-rectangle",
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