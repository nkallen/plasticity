# Plasticity

<em>[TODO.md spec & Kanban Board](https://bit.ly/3fCwKfM)</em>

### Backlog

- [ ] showPhantoms() in ModifyContourPointFactory needs implementation  
- [ ] Nearpointprojection needs to be errorbool  
- [ ] Trim command should allow splitting segments  
- [ ] Trim command should allow points  
- [ ] Move/Translate allows face selection #bug  
- [ ] Box select during active command allows selecting faces that will be deleted #bug  
- [ ] Some gizmos should abort on interrupt (move xyz) and others should confirm (extrude)  
- [ ] Viewport: save state  
- [ ] PointPicker: Restrictions are ignored with choice -  

### Todo

- [ ] Deleting points in a contour should work  
- [ ] Scale to flatten curve  
- [ ] Make control points themselves d&d able (no circle)  
- [ ] Review if the high performance control point implementation is the best way to do it  
- [ ] Point picker restrict to line not working great with scale freestyle command (xyz axes seem available) #bug  
- [ ] Can't remove fillet using modify contour command #bug  

### In Progress

- [ ] Freestyle rotate control point  
- [ ] once you do a freestyle scale, left clicking doesn't exit for some reason #bug  

### Done ✓

- [x] Freestyle move control point  
- [x] Freestyle scale control point  
- [x] Remove consolidate freestyle/basic factories and let the commands use direct guys  
- [x] Make control points work with rotate  
- [x] Consolidate rotate command  
- [x] Scale control points  
- [x] Selecting control point should unselect curve #bug  
- [x] Make control points work with move  

