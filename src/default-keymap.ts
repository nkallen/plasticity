export default {
    "[command='center-circle'] ispace-viewport": {
        "v": "gizmo:circle:mode",
    },

    "[command='polygon'] ispace-viewport": {
        "wheel+up": "gizmo:polygon:add-vertex",
        "wheel+down": "gizmo:polygon:subtract-vertex",
        "v": "gizmo:polygon:mode",
    },

    "[command='rebuild'] ispace-viewport": {
        "wheel+up": "gizmo:rebuild:forward",
        "wheel+down": "gizmo:rebuild:backward",
    },

    "[command='spiral'] ispace-viewport": {
        "a": "gizmo:spiral:angle",
        "d": "gizmo:spiral:length",
        "r": "gizmo:spiral:radius",
    },

    "[command='revolution'] ispace-viewport": {
        "a": "gizmo:revolution:angle",
        "t": "gizmo:revolution:thickness",
    },

    "[command='center-box'] ispace-viewport, [command='corner-box'] ispace-viewport, [command='three-point-box'] ispace-viewport": {
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

    "[command='offset-face'] ispace-viewport": {
        "d": "gizmo:offset-face:distance",
        "a": "gizmo:offset-face:angle",
    },

    "[command='offset-curve'] ispace-viewport": {
        "d": "gizmo:offset-curve:distance",
    },

    "[command='move'] ispace-viewport, [command='move-item'] ispace-viewport, [command='duplicate'] ispace-viewport, [command='move-control-point'] ispace-viewport, [command='action-face'] ispace-viewport, [command='difference'] ispace-viewport, [command='union'] ispace-viewport, [command='intersection'] ispace-viewport": {
        "x": "gizmo:move:x",
        "y": "gizmo:move:y",
        "z": "gizmo:move:z",
        "Z": "gizmo:move:xy",
        "X": "gizmo:move:yz",
        "Y": "gizmo:move:xz",
        "s": "gizmo:move:screen",
        "f": "gizmo:move:free",
    },

    "[command='scale'] ispace-viewport, [command='scale-item'] ispace-viewport, [command='scale-control-point'] ispace-viewport": {
        "x": "gizmo:scale:x",
        "y": "gizmo:scale:y",
        "z": "gizmo:scale:z",
        "Z": "gizmo:scale:xy",
        "X": "gizmo:scale:yz",
        "Y": "gizmo:scale:xz",
        "s": "gizmo:scale:xyz",
        "f": "gizmo:scale:free",
    },

    "[command='fillet-solid'] ispace-viewport": {
        "v": "gizmo:fillet-solid:add",
        "d": "gizmo:fillet-solid:distance",
        "a": "gizmo:fillet-solid:angle",
    },

    "[command='modify-contour'] ispace-viewport": {
        "d": "gizmo:modify-contour:fillet-all",
    },

    "[command='rotate'] ispace-viewport, [command='rotate-item'] ispace-viewport, [command='rotate-control-point'] ispace-viewport, [command='draft-solid'] ispace-viewport": {
        "x": "gizmo:rotate:x",
        "y": "gizmo:rotate:y",
        "z": "gizmo:rotate:z",
        "s": "gizmo:rotate:screen",
        "f": "gizmo:rotate:free",
    },

    "[command='curve'] ispace-viewport": {
        "1": "gizmo:curve:hermite",
        "2": "gizmo:curve:bezier",
        "3": "gizmo:curve:nurbs",
        "4": "gizmo:curve:cubic-spline",
        "cmd-z": "gizmo:curve:undo",
        "ctrl-z": "gizmo:curve:undo",
    },

    "[command='line'] ispace-viewport": {
        "cmd-z": "gizmo:line:undo",
        "ctrl-z": "gizmo:line:undo",
    },

    "[command='mirror'] ispace-viewport": {
        "x": "gizmo:mirror:x",
        "y": "gizmo:mirror:y",
        "z": "gizmo:mirror:z",
        "shift-x": "gizmo:mirror:-x",
        "shift-y": "gizmo:mirror:-y",
        "shift-z": "gizmo:mirror:-z",
        "f": "gizmo:mirror:free",
    },

    "[command='thin-solid'] ispace-viewport": {
        "d": "gizmo:thin-solid:thickness",
    },

    "body[command] ispace-viewport": {
        "escape": "command:abort",
        "enter": "command:finish",
        "mouse2": "command:finish",

        "z": "viewport:picker:show",
    },

    "body:not([gizmo]) ispace-viewport": {
        "1": "selection:set-control-point",
        "2": "selection:set-edge",
        "3": "selection:set-face",
        "4": "selection:set-solid",

        "!": "selection:toggle-control-point",
        "@": "selection:toggle-edge",
        "#": "selection:toggle-face",
        "$": "selection:toggle-solid",

        "numpad1": "viewport:front",
        "numpad3": "viewport:right",
        "numpad7": "viewport:top",

        "/": "viewport:focus",

        "alt-z": "viewport:toggle-x-ray",
        "shift-alt-z": "viewport:toggle-overlays",

        "numpad5": "viewport:toggle-orthographic",
    },

    "body:not([gizmo]) ispace-workspace": {
        "c": "command:center-circle",
        "g": "command:move",
        "r": "command:rotate",
        "R": "command:center-rectangle",
        "s": "command:scale",
        "b": "command:fillet",
        "e": "command:extrude",
        "t": "command:trim",
        "i": "command:offset",
        "alt-x": "command:mirror",
        "tab": "command:mode",
        "x": "command:delete",
        "delete": "command:delete",
        "backspace": "command:delete",
        "q": "command:rebuild",

        "h": "command:hide-selected",
        "shift-h": "command:hide-unselected",
        "alt-h": "command:unhide-all",

        "shift-d": "command:duplicate",

        "shift-r": "repeat-last-command",
        "cmd-z": "undo",
        "cmd-shift-z": "redo",
        "ctrl-z": "undo",
        "ctrl-shift-z": "redo",

        "shift-A": "command:deselect-all",
        "alt-A": "command:deselect-all",
    },

    "orbit-controls": {
        "mouse1": "orbit:rotate",
        "mouse2": "orbit:pan",
    },

    "body[gizmo=point-picker]": {
        "n": "snaps:set-normal",
        "b": "snaps:set-binormal",
        "t": "snaps:set-tangent",
        "x": "snaps:set-x",
        "y": "snaps:set-y",
        "z": "snaps:set-z",
    },
}