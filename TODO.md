# Plasticity

<em>[TODO.md spec & Kanban Board](https://bit.ly/3fCwKfM)</em>

### Backlog

- trim should allow deleting a line  
- toggle boolean diff which is + and which is - while running command  
- ortho cube goes to ortho mode  
- matcap shinier  
- redo max fillet  
- fillet: span keybinding  
- fillet: prolong keybinding  
- fillet two corners of a curve, not all  
- turn on/off visual display of edges  
- autodelete coplanar faces  
- redo fillet gizmo  
- angle snaps (5deg)  
- drawing on face -- boundary edges need to be extendable as snaps  
- cutting contour needs to extend to infinitiy  
- autojoin curves at same endpoint  
- boolean keep tool  
- draw curve to offset (multiline) flow  
- cut body: select edge after starting command  
- upper-left box select of straight lines is too eager  
- another mirror bug  
- focus topology  
- move snapmanagergeometrycache to editor  
- when you shift a helper leave it visible  
- select all of type  
- bug: select face, change mode to solid, shift select solid. face is still selected but shouldn't be  
- separate floor from grid  
- orbit above top  
- ctrl in object select should temporarily enable everything (point solid etc)  
- popup quickmenu a la fusion  
- [ ] Refactor gizmos and controls event entry code - there should be a single class handling hover and pointerdown to disambiguate  
- colored helpers for basic axis snaps  
- move mirror gizmo origin  
- Napi::Promise::Deferred const &d rename _deferred  
- dialog keybindings  
- copy fillet radius by clicking on another fillet surface  
- bug: box selected, while mouse down, zoom  
- Fusion-like multigizmo  
- Solid cut by face: face cutter offset along normal  
- [ ] perf: get rid of traverse in viewport -- use separate pass without overwriting depth  
- picture in viewport  
- [ ] PointPicker: CHOICE should allow points to be projected even if they don't strictly match the restriction  
- [ ] ProxyCamera/LOD: write custom :: const distance = _v1.distanceTo( _v2 ) / camera.zoom;  
- [ ] Audit re-used icons  
- [ ] in xray mode, control points not visible  
- [ ] currently FINISH is always available, even at step 1 of 3 points box. #bug - registry.add(command:finish) should maybe not happen in command executor but in await this.finished  
- [ ] PointSnap resolution for nearby seems wrong  
- [ ] move all static buuild() methods to builder, using var ts decl  
- [ ] Refactor curve extension code  
- [ ] bug: control points, when one selected and another hovered, everything unhighlighted  
- [ ] PointPicker: Restrictions are ignored with choice -  
- [ ] Redesign set resolution of line2 etc  
- [ ] parentId of edge and face should be set directly and not actually in the tree?  
- [ ] fillet face  
- [ ] Helper for center (of arc) point snap  
- [ ] See if we can get rid of get child() in visualmodel  
- [ ] Move/Translate allows face selection #bug  
- [ ] get rid of all snappers in snap  
- [ ] refactor IntersectableLayers  
- [ ] Snap points should always be before their geometry if they're visible  
- [ ] panning and release mouse outside of window errors #bug  
- [ ] Incorporate parcel https://github.com/parcel-bundler/watcher  
- [ ] outline for e.g., mirror command is strange - only outline visible items  
- [ ] Redo titlebar to save space  
- [ ] crash https://discord.com/channels/893157887847845908/894216409188565012/896502833057243196  
- [ ] Add settings for loft  
- [ ] memoize and discretize calculations like fillet #performance  
- [ ] memoize mesh generation of faces in mesh creator (for the duration of a command). #performance  
- [ ] showPhantoms() in ModifyContourPointFactory needs implementation  
- [ ] Nearpointprojection needs to be errorbool  
- [ ] Trim command should allow splitting segments  
- [ ] Trim command should allow points  
- [ ] Trim should allow box selecting  
- [ ] Box select during active command allows selecting faces that will be deleted #bug  
- [ ] rename Id() .id  
- [ ] audit array conversion is reserving and freeing elements:  
- ::AddRefItems( curveArray );  
- ::ReleaseItems( curveArray );  
- and especially check if instantiated RPArray/etc. is freed altogether - convert MbCartPoint3D and Vector to isPOD  

### Todo

- start fillet a priori  
- bug: dialogs sometimes incorrectly cache previous value (e.g., mirror checkbox for union) - run mirror twice changing value  
- escape out of fillet command to restart  
- gizmos for elementary solids  

### In Progress

- ctrl to add to a command - offset  
- open ticket for huge fillet on box  

### Done ✓

- redo rotate gizmo  
- ctrl to add to selection whilst in command (a la fusion) - fillet  
- lookat disableselection and see if it should be used for rotate command, etc  
- drawing on negative x side of crate is wrong  
- set pivot of rotate gizmo  
- grenade case foot but, can't fillet all sides  
- disable fillet dialog while in gizmo  
- holding cmd/window turns on all selection modes  
- fillet gizmo handle is not scaling  
- fillet multiple at once  
- shift-added "additional helpers" are now persistently visible  
- extrude multiple regions at once  
- offset multiple at once  
- extrude performance bug params post  
- [x] circle angle gizmo when far off from center not facing camera  
- cut gizmo  
- raycasting at bottom of a box still annoying  
- floor needs fog  
- mirror bugs  
- shift/choice for faces  
- gizmo for fillet and extrude have objective sizes  
- orbit: pan vertical mushinesss  
- Cut multiple objects simultaneously  
- [x] moving circle point doesn't work (drag and g)  
- Viewport selection: use mousewheel to flip through all items under cursor  
- DblClick selects solids  

