# Plasticity

<em>[TODO.md spec & Kanban Board](https://bit.ly/3fCwKfM)</em>

### Backlog

- helper for center snap points  
- circle quarter snap points  
- double click to select body  
- move snapmanagergeometrycache to editor  
- Solid cut by face: face cutter offset along normal  
- move mirror gizmo origin  
- select all sketches  
- Convert Face selection to Border Selection:  
- bug: Adding Variable enabled viewport selector, overriding value set in config  
- Napi::Promise::Deferred const &d rename _deferred  
- dialog keybindings  
- [ ] Refactor gizmos and controls event entry code - there should be a single class handling hover and pointerdown to disambiguate  
- copy fillet radius by clicking on another fillet surface  
- bug: box selected, while mouse down, zoom  
- extrude multiple regions at once  
- Fusion-like multigizmo  
- [ ] perf: get rid of traverse in viewport -- use separate pass without overwriting depth  
- [ ] circle angle gizmo when far off from center not facing camera  
- [ ] PointPicker: CHOICE should allow points to be projected even if they don't strictly match the restriction  
- [ ] ProxyCamera/LOD: write custom :: const distance = _v1.distanceTo( _v2 ) / camera.zoom;  
- [ ] Audit re-used icons  
- [ ] moving circle point doesn't work (drag and g)  
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

- Write unit test for snappresenter  
- bug: Alt click focus: issue on windows  
- object with selected face, select body: confusing - should be able to select body  
- cut body: select edge after starting command  
- Add dialog for extrude  
- rr ss gg for screenspace  

### In Progress


### Done ✓

- bug: hover when viewportselector disabled still running for solids  
- Offset edge: - allow distance 0, move lines along normal relative to construction plane  
- Offset curve: It should start offset distance when you press O, without you having to press D.  
- Change gizmo for offset  
- offset face dialog  
- When offsetting face, offset should match snap pt with ctrl  
- Experiment new fillet gizmo  
- ensure all commands have a binding  

