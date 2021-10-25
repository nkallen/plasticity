# Plasticity

<em>[TODO.md spec & Kanban Board](https://bit.ly/3fCwKfM)</em>

### Backlog

- [ ] Trim command should allow splitting segments  
- [ ] Trim command should allow points  
- [ ] Move/Translate allows face selection #bug  
- [ ] Box select during active command allows selecting faces that will be deleted #bug  
- [ ] Some gizmos should abort on interrupt (move xyz) and others should confirm (extrude)  
- [ ] Viewport: save state  
- [ ] PointPicker: Restrictions are ignored with choice - e.g., freestyle scale. DisableVerticalStraightSnap should disable normal; nearpointprojection needs to be errorbool  

### Todo

- [ ] Deleting points in a contour should work  
- [ ] Freestyle move control point  
- [ ] Freestyle scale control point  
- [ ] Freestyle rotate control point  
- [ ] Scale to flatten curve  
- [ ] Make control points themselves d&d able (no circle)  
- [ ] Review if the high performance control point implementation is the best way to do it  
- [ ] Can't remove fillet using modify contour command #bug  

### In Progress

- [ ] Remove consolidate freestyle/basic factories and let the commands use direct guys  

### Done ✓

- [x] Make control points work with rotate  
- [x] Consolidate rotate command  
- [x] Scale control points  
- [x] Selecting control point should unselect curve #bug  
- [x] Make control points work with move  

