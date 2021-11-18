import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { point2point } from '../../util/Conversion';
import { BooleanFactory, PossiblyBooleanFactory } from "../boolean/BooleanFactory";
import { GeometryFactory } from '../GeometryFactory';

// export default class EvolutionFactory extends GeometryFactory {
//     async calculate() {
//     }
// }