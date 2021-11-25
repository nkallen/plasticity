# Plasticity

<em>[TODO.md spec & Kanban Board](https://bit.ly/3fCwKfM)</em>

### Backlog

- [ ] boxcasting not working with control points, curves, regions  
- [ ] in xray mode, control points not visible  
- [ ] bug: variable fillet broken  
- [ ] move all static buuild() methods to builder, using var ts decl  
- [ ] Refactor curve extension code  
- [ ] bug: control points, when one selected and another hovered, everything unhighlighted  
- [ ] Redesign set resolution of line2 etc  
- [ ] parentId of edge and face should be set directly and not actually in the tree?  
- [ ] make occluded lines/edges use geometry groups  
- [ ] Helper for center (of arc) point snap  
- [ ] See if we can get rid of get child() in visualmodel  
- [ ] get rid of all snappers in snap  
- [ ] optimize hide/unhide in snapman  
- [ ] refactor IntersectableLayers  
- [ ] Snap points should always be before their geometry if they're visible  
- [ ] panning and release mouse outside of window errors #bug  
- [ ] Incorporate parcel https://github.com/parcel-bundler/watcher  
- [ ] Audit re-used icons  
- [ ] Refactor gizmos and controls event entry code - there should be a single class handling hover and pointerdown to disambiguate  
- [ ] outline for e.g., mirror command is strange - only outline visible items  
- [ ] camera near plane sucks with ortho now  
- [ ] Redo titlebar to save space  
- [ ] crash https://discord.com/channels/893157887847845908/894216409188565012/896502833057243196  
- [ ] performance audit hit testing and snaps - use gpu picking #performance  
- [ ] memoize and discretize calculations like fillet #performance  
- [ ] memoize mesh generation of faces in mesh creator (for the duration of a command). #performance  
- [ ] in moi, once you create a cylinder, you can shift once you lock onto Z axis; however, you can't then snap to match height. what do we want to do?  
- [ ] showPhantoms() in ModifyContourPointFactory needs implementation  
- [ ] Nearpointprojection needs to be errorbool  
- [ ] Trim command should allow splitting segments  
- [ ] Trim command should allow points  
- [ ] Trim should allow box selecting  
- [ ] Move/Translate allows face selection #bug  
- [ ] making circle on corner box top or side face (needs to stick)  
- [ ] Box select during active command allows selecting faces that will be deleted #bug  
- [ ] PointPicker: Restrictions are ignored with choice -  
- [ ] PointPicker: Restrictions should allow points to be projected even if they don't strictly match the restriction  
- [ ] currently FINISH is always available, even at step 1 of 3 points box. #bug - registry.add(command:finish) should maybe not happen in command executor but in await this.finished  
- [ ] ctrl while point picking not working - https://discord.com/channels/893157887847845908/893157887847845913/896493308992421909  
- #bug  
- [ ] rename Id() .id  
- [ ] audit array conversion is reserving and freeing elements:  
- ::AddRefItems( curveArray );  
- ::ReleaseItems( curveArray );  
- and especially check if instantiated RPArray/etc. is freed altogether - convert MbCartPoint3D and Vector to isPOD  
- [ ] fillet face  

### Todo

- [ ] make viewport control have a manager that always picks winner so two can't be running simultaneously  

### In Progress


### Done ✓

- [x] boolean needs movement  
- [x] Allow gettings edge selection from creators  
- [x] line2 raycasting bad in ortho camera  
- [x] Minimize draw calls  

