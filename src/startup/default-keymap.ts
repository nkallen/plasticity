export default {
    "[command='center-circle'] plasticity-viewport": {
        "v": "gizmo:circle:mode",
    },

    "[command='corner-rectangle'] plasticity-viewport, [command='center-rectangle'] plasticity-viewport": {
        "^alt": "keyboard:rectangle:mode",
    },

    "[command='polygon'] plasticity-viewport": {
        "ctrl-wheel+up": "gizmo:polygon:add-vertex",
        "ctrl-wheel+down": "gizmo:polygon:subtract-vertex",
        "v": "gizmo:polygon:mode",
    },

    "[command='radial-array'] plasticity-viewport, [command='rectangular-array'] plasticity-viewport": {
        "ctrl-wheel+up": "gizmo:array:add",
        "ctrl-wheel+down": "gizmo:array:subtract",
    },

    "[command='rebuild'] plasticity-viewport": {
        "ctrl-wheel+up": "gizmo:rebuild:forward",
        "ctrl-wheel+down": "gizmo:rebuild:backward",
    },

    "[command='spiral'] plasticity-viewport": {
        "a": "gizmo:spiral:angle",
        "d": "gizmo:spiral:length",
        "r": "gizmo:spiral:radius",
    },

    "[command='revolution'] plasticity-viewport": {
        "a": "gizmo:revolution:angle",
        "t": "gizmo:revolution:thickness",
    },

    "[command='evolution'] plasticity-viewport": {
        "a": "gizmo:revolution:angle",
        "t": "gizmo:revolution:thickness",
    },

    "[command='pipe'] plasticity-viewport": {
        "d": "gizmo:pipe:section-size",
        "t": "gizmo:pipe:thickness",
        "a": "gizmo:pipe:angle",

        "q": "keyboard:pipe:union",
        "w": "keyboard:pipe:difference",
        "e": "keyboard:pipe:intersect",
        "r": "keyboard:pipe:new-body",
    },

    "[command='boolean'] plasticity-viewport": {
        "q": "gizmo:boolean:union",
        "w": "gizmo:boolean:difference",
        "e": "gizmo:boolean:intersect",

        "x": "gizmo:move:x",
        "y": "gizmo:move:y",
        "z": "gizmo:move:z",
        "shift-z": "gizmo:move:xy",
        "shift-x": "gizmo:move:yz",
        "shift-y": "gizmo:move:xz",
        "g": "gizmo:move:screen",
    },

    "[command='center-box'] plasticity-viewport, [command='corner-box'] plasticity-viewport, [command='three-point-box'] plasticity-viewport": {
        "q": "keyboard:box:union",
        "w": "keyboard:box:difference",
        "e": "keyboard:box:intersect",
        "r": "keyboard:box:new-body",
    },

    "[command='cylinder'] plasticity-viewport": {
        "q": "keyboard:cylinder:union",
        "w": "keyboard:cylinder:difference",
        "e": "keyboard:cylinder:intersect",
        "r": "keyboard:cylinder:new-body",

        "d": "gizmo:cylinder:height",
        "f": "gizmo:cylinder:radius",
    },

    "[command='sphere'] plasticity-viewport": {
        "q": "keyboard:sphere:union",
        "w": "keyboard:sphere:difference",
        "e": "keyboard:sphere:intersect",
        "r": "keyboard:sphere:new-body",
    },

    "[command='extrude'] plasticity-viewport": {
        "a": "gizmo:extrude:race1",
        "s": "gizmo:extrude:race2",
        "d": "gizmo:extrude:distance1",
        "f": "gizmo:extrude:distance2",
        "t": "gizmo:extrude:thickness",

        "q": "keyboard:extrude:union",
        "w": "keyboard:extrude:difference",
        "e": "keyboard:extrude:intersect",
        "r": "keyboard:extrude:new-body",
    },

    "[command='offset-face'] plasticity-viewport": {
        "d": "gizmo:offset-face:distance",
        "a": "gizmo:offset-face:angle",
        "q": "gizmo:offset-face:toggle",
    },

    "[command='refillet-face'] plasticity-viewport": {
        "d": "gizmo:refillet-face:distance",
    },

    "[command='offset-curve'] plasticity-viewport": {
        "d": "gizmo:offset-curve:distance",
    },

    "[command='move'] plasticity-viewport, [command='move-item'] plasticity-viewport, [command='duplicate'] plasticity-viewport, [command='move-control-point'] plasticity-viewport, [command='action-face'] plasticity-viewport": {
        "x": "gizmo:move:x",
        "y": "gizmo:move:y",
        "z": "gizmo:move:z",
        "shift-z": "gizmo:move:xy",
        "shift-x": "gizmo:move:yz",
        "shift-y": "gizmo:move:xz",
        "g": "gizmo:move:screen",

        "f": "keyboard:move:free",
        "w": "keyboard:move:pivot"
    },

    "[command='scale'] plasticity-viewport, [command='scale-item'] plasticity-viewport, [command='scale-control-point'] plasticity-viewport": {
        "x": "gizmo:scale:x",
        "y": "gizmo:scale:y",
        "z": "gizmo:scale:z",
        "shift-z": "gizmo:scale:xy",
        "shift-x": "gizmo:scale:yz",
        "shift-y": "gizmo:scale:xz",
        "s": "gizmo:scale:xyz",
        "f": "keyboard:scale:free",
        "w": "keyboard:scale:pivot"
    },

    "[command='fillet-solid'] plasticity-viewport": {
        "v": "gizmo:fillet-solid:add",
        "f": "gizmo:fillet-solid:distance",
        "d": "gizmo:fillet-solid:fillet",
        "c": "gizmo:fillet-solid:chamfer",
        "a": "gizmo:fillet-solid:angle",
    },

    "[command='modify-contour'] plasticity-viewport": {
        "d": "gizmo:modify-contour:fillet-all",
    },

    "[command='rotate'] plasticity-viewport, [command='rotate-item'] plasticity-viewport, [command='rotate-control-point'] plasticity-viewport, [command='draft-solid'] plasticity-viewport": {
        "x": "gizmo:rotate:x",
        "y": "gizmo:rotate:y",
        "z": "gizmo:rotate:z",
        "r": "gizmo:rotate:screen",
        "f": "keyboard:rotate:free",
        "w": "keyboard:rotate:pivot"
    },

    "[command='curve'] plasticity-viewport": {
        "1": "gizmo:curve:hermite",
        "2": "gizmo:curve:bezier",
        "3": "gizmo:curve:nurbs",
        "4": "gizmo:curve:cubic-spline",
        "cmd-z": "gizmo:curve:undo",
        "ctrl-z": "gizmo:curve:undo",
    },

    "[command='line'] plasticity-viewport": {
        "cmd-z": "gizmo:line:undo",
        "ctrl-z": "gizmo:line:undo",
    },

    "[command='mirror'] plasticity-viewport": {
        "x": "gizmo:mirror:x",
        "y": "gizmo:mirror:y",
        "z": "gizmo:mirror:z",
        "shift-x": "gizmo:mirror:-x",
        "shift-y": "gizmo:mirror:-y",
        "shift-z": "gizmo:mirror:-z",
        "f": "gizmo:mirror:free",
        "w": "gizmo:mirror:pivot",
    },

    "[command='thin-solid'] plasticity-viewport": {
        "d": "gizmo:thin-solid:thickness",
    },

    "[command='place'] plasticity-viewport": {
        "f": "gizmo:place:flip",
        "a": "gizmo:place:angle",
        "s": "gizmo:place:scale",
    },

    "plasticity-viewport": {
        "numpad1": "viewport:navigate:front",
        "numpad3": "viewport:navigate:right",
        "numpad7": "viewport:navigate:top",

        "shift-numpad1": "viewport:navigate:back",
        "shift-numpad3": "viewport:navigate:left",
        "shift-numpad7": "viewport:navigate:bottom",

        "numpad5": "viewport:toggle-orthographic",

        "space": "viewport:navigate:face",

        "alt-z": "viewport:toggle-x-ray",
        "shift-alt-z": "viewport:toggle-overlays",
    },

    "body:not([gizmo])": {
        "1": "selection:mode:set:control-point",
        "2": "selection:mode:set:edge",
        "3": "selection:mode:set:face",
        "4": "selection:mode:set:solid",
        "tab": "selection:mode:set:all",

        "ctrl-1": "selection:convert:control-point",
        "ctrl-2": "selection:convert:edge",
        "ctrl-3": "selection:convert:face",
        "ctrl-4": "selection:convert:solid",

        "shift-1": "selection:mode:toggle:control-point",
        "shift-2": "selection:mode:toggle:edge",
        "shift-3": "selection:mode:toggle:face",
        "shift-4": "selection:mode:toggle:solid",

        "c": "command:cut",
        "j": "command:join-curves",
        "g": "command:move",
        "r": "command:rotate",
        "s": "command:scale",
        "shift-P": "command:evolution",
        "p": "command:pipe",
        "b": "command:fillet-solid",
        "e": "command:extrude",
        "t": "command:trim",
        "o": "command:offset-curve",
        "alt-x": "command:mirror",
        "x": "command:delete",
        "delete": "command:delete",
        "backspace": "command:delete",
        "l": "command:loft",

        "alt-q": "command:rebuild",
        "shift-d": "command:duplicate",
        "ctrl-d": "command:place",

        "shift-a": "command:line",
        "shift-s": "command:curve",

        "shift-z": "command:sphere",
        "shift-x": "command:cylinder",
        "shift-c": "command:corner-box",
        "shift-v": "command:center-box",

        "shift-q": "command:corner-rectangle",
        "shift-w": "command:center-rectangle",

        "q": "command:boolean",

        "h": "command:hide-selected",
        "shift-h": "command:hide-unselected",
        "alt-h": "command:unhide-all",
        "ctrl-h": "command:invert-hidden",

        "shift-r": "repeat-last-command",
        "cmd-z": "edit:undo",
        "cmd-shift-z": "edit:redo",
        "ctrl-z": "edit:undo",
        "ctrl-shift-z": "edit:redo",

        "ctrl-c": "edit:copy",
        "cmd-c": "edit:copy",
        "ctrl-v": "edit:paste",
        "cmd-v": "edit:paste",

        "cmd-n": "file:new",
        "ctrl-n": "file:new",
        "cmd-shift-s": "file:save-as",
        "ctrl-shift-s": "file:save-as",
        "cmd-o": "file:open",
        "ctrl-o": "file:open",

        "alt-A": "command:deselect-all",
        "escape": "command:deselect-all",
    },

    "body:not([gizmo]) plasticity-viewport": {
        "/": "viewport:focus",
    },

    "orbit-controls": {
        "mouse1": "orbit:rotate",
        "mouse2": "orbit:pan",
    },

    "viewport-selector": {
        "mouse0": "selection:replace",
        "shift-mouse0": "selection:add",
        "ctrl-mouse0": "selection:remove",

        "cmd": "selection:option:ignore-mode",
        // "alt": "selection:option:extend",
    },

    "viewport-selector[quasimode]": {
        "mouse0": "selection:replace",
        "shift-mouse0": "selection:add",
        "ctrl-mouse0": "selection:remove",
    },

    "body[gizmo=point-picker]": {
        "n": "snaps:set-normal",
        "b": "snaps:set-binormal",
        "t": "snaps:set-tangent",
        "x": "snaps:set-x",
        "y": "snaps:set-y",
        "z": "snaps:set-z",
        "s": "snaps:set-square",

        "mouse2": "point-picker:finish",

        "ctrl": "snaps:temporarily-disable",
        "^ctrl": "snaps:temporarily-enable",
    },

    "body": {
        "alt": "noop",
    },

    "body[command] plasticity-viewport": {
        "escape": "command:abort",
    },

    "body[command]:not([gizmo]) plasticity-viewport": {
        "enter": "command:finish",
        "mouse2": "command:finish",

        "tab": "command:quasimode:start",
        "^tab": "command:quasimode:stop",
    },

    "body[command][gizmo] plasticity-viewport": {
        "enter": "gizmo:finish",
    }
}