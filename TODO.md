# Plasticity

<em>[TODO.md spec & Kanban Board](https://bit.ly/3fCwKfM)</em>

### Backlog

- [ ] currently FINISH is always available, even at step 1 of 3 points box. #bug - registry.add(command:finish) should maybe not happen in command executor but in await this.finished  
- [ ] making circle on corner box top or side face (needs to stick)  
- [ ] camera near plane sucks with ortho now  
- [ ] crash https://discord.com/channels/893157887847845908/894216409188565012/896502833057243196  
- [ ] line2 raycasting bad in ortho camera  
- [ ] more robust mirror and consolidated with symmetry  
- [ ] performance audit hit testing and snaps - use gpu picking #performance  
- [ ] memoize and discretize calculations like fillet  
- #performance  
- [ ] memoize mesh generation of faces in mesh creator (for the duration of a command). #performance  
- [ ] in moi, once you create a cylinder, you can shift once you lock onto Z axis; however, you can't then snap to match height. what do we want to do?  
- [ ] showPhantoms() in ModifyContourPointFactory needs implementation  
- [ ] Nearpointprojection needs to be errorbool  
- [ ] Trim command should allow splitting segments  
- [ ] Trim command should allow points  
- [ ] Move/Translate allows face selection #bug  
- [ ] Box select during active command allows selecting faces that will be deleted #bug  
- [ ] Some gizmos should abort on interrupt (move xyz) and others should confirm (extrude)  
- [ ] Viewport: save state  
- [ ] PointPicker: Restrictions are ignored with choice -  
- [ ] PointPicker: Restrictions should allow points to be projected even if they don't strictly match the restriction  
- [ ] If there is a solid and two curves. Select solid and SHIFT-H. Get an error like: "touched is not iterable" #bug  
- [ ] ctrl while point picking not working - https://discord.com/channels/893157887847845908/893157887847845913/896493308992421909  
- #bug  
- [ ] rename Id() .id  
- [ ] audit array conversion is reserving and freeing elements:  
- ::AddRefItems( curveArray );  
- ::ReleaseItems( curveArray );  
- and especially check if instantiated RPArray/etc. is freed altogether - convert MbCartPoint3D and Vector to isPOD  
- [ ] fillet face  

### Todo

- [ ] Can't remove fillet using modify contour command #bug  
- [ ] Test trim - and anywhere objectpicker is used  
- [ ] scale freestyle broken on commit #bug  

### In Progress

- [ ] Can't modify endpoint of specific curve #bug  

### Done ✓

- [x] Need to be able to drag and drop point when point selected & fillet I suppose  
- [x] move point twice without moving the mouse inbetween and it doesn't work #bug  
- [x] click on control point to select  
- [x] Make control points themselves d&d able (no circle)  
- [x] Normalize curve should convert planar curves to space curves  
- [x] Scale to flatten freestyle  
- [x] Point picker restrict to line not working great with scale freestyle command (xyz axes seem available) #bug  
- [x] Deleting points in a contour should work  
- [x] Freestyle move control point  
- [x] Freestyle scale control point  
- [x] Remove consolidate freestyle/basic factories and let the commands use direct guys  
- [x] Make control points work with rotate  
- [x] Consolidate rotate command  
- [x] Scale control points  
- [x] Selecting control point should unselect curve #bug  
- [x] Make control points work with move  
- [x] Freestyle rotate control point  
- [x] once you do a freestyle scale, left clicking doesn't exit for some reason #bug  
- [x] Scale to flatten basic curve  

