import { BasePairsLadderProvider } from './property';
import { BasePairs } from '../property';
import { BasePairsTypes } from '../types';
import { Interval, Segmentation } from '../../../mol-data/int';
import { Mesh } from '../../../mol-geo/geometry/mesh/mesh';
import { PickingId } from '../../../mol-geo/geometry/picking';
//import { Sphere3D } from '../../../mol-math/geometry/primitives/sphere3d';
import { LocationIterator } from '../../../mol-geo/util/location-iterator';
import { EmptyLoci, Loci } from '../../../mol-model/loci';
import { NullLocation } from '../../../mol-model/location';
import { ElementIndex, Structure, StructureElement, StructureProperties, Unit } from '../../../mol-model/structure';
import { CustomProperty } from '../../../mol-model-props/common/custom-property';
import { Representation, RepresentationContext, RepresentationParamsGetter } from '../../../mol-repr/representation';
import { StructureRepresentation, StructureRepresentationProvider, StructureRepresentationStateBuilder, UnitsRepresentation } from '../../../mol-repr/structure/representation';
import { StructureGroup } from '../../../mol-repr/structure/visual/util/common';
import { VisualUpdateState } from '../../../mol-repr/util';
import { VisualContext } from '../../../mol-repr/visual';
import { UnitsMeshParams, UnitsMeshVisual, UnitsVisual } from '../../../mol-repr/structure/units-visual';
import { Theme, ThemeRegistryContext } from '../../../mol-theme/theme';
import { ParamDefinition as PD } from '../../../mol-util/param-definition';
import { MeshBuilder } from '../../../mol-geo/geometry/mesh/mesh-builder';
import { getNucleotideBaseType } from '../../../mol-repr/structure/visual/util/nucleotide';
import { Vec3 } from '../../../mol-math/linear-algebra';
import { addCylinder } from '../../../mol-geo/geometry/mesh/builder/cylinder';
import { BasePairsLadderTypes } from './types';
import { addSphere } from '../../../mol-geo/geometry/mesh/builder/sphere';

const BasePairsLadderMeshParams = {
    ...UnitsMeshParams
};
type BasePairsLadderMeshParams = typeof BasePairsLadderMeshParams;


function calcMidpoint(mp: Vec3, v: Vec3, w: Vec3) {
    Vec3.sub(mp, v, w);
    Vec3.scale(mp, mp, 0.5);
    Vec3.add(mp, mp, w);
}

function findAtomInRange(name: string, start: number, end: number, structure: Structure, unit: Unit) {
    const loc = StructureElement.Location.create(structure, unit, -1 as ElementIndex);

    for (let eI = start; eI < end; eI++) {
        loc.element = loc.unit.elements[eI];
        const elName = StructureProperties.atom.label_atom_id(loc);

        if (elName === name) return loc.element;
    }

    return -1 as ElementIndex;
}

function findResidue(asymId: string, seqId: number, insCode: string, structure: Structure) {
    for (const unit of structure.units) {
        if (!Unit.isAtomic(unit)) continue;

        const r = findResidueInUnit(asymId, seqId, insCode, structure, unit);
        if (r) return r;
    }

    return void 0;
}

function findResidueInUnit(asymId: string, seqId: number, insCode: string, structure: Structure, unit: Unit.Atomic) {
    const loc = StructureElement.Location.create(structure, unit, -1 as ElementIndex);

    const chainIt = Segmentation.transientSegments(structure.model.atomicHierarchy.chainAtomSegments, unit.elements);
    const residueIt = Segmentation.transientSegments(structure.model.atomicHierarchy.residueAtomSegments, unit.elements);

    while (chainIt.hasNext) {
        residueIt.setSegment(chainIt.move());
        while (residueIt.hasNext) {
            const residue = residueIt.move();

            loc.element = loc.unit.elements[residue.start];

            const rAsymId = StructureProperties.chain.label_asym_id(loc);
            const rSeqId = StructureProperties.residue.label_seq_id(loc);
            const rInsCode = StructureProperties.residue.pdbx_PDB_ins_code(loc);

            if (rAsymId !== asymId) break;
            if (rSeqId === seqId && rInsCode === insCode) return { residue, unit };
        }
    }

    return void 0;
}

function findResidueToRender(bp: BasePairsTypes.BasePair, structure: Structure, unit: Unit.Atomic) {
    let r = findResidueInUnit(bp.a.asym_id, bp.a.seq_id, bp.a.PDB_ins_code, structure, unit);
    if (r) return { r, isSecond: false };

    r = findResidueInUnit(bp.b.asym_id, bp.b.seq_id, bp.b.PDB_ins_code, structure, unit);
    if (r) return { r, isSecond: true };
}

function isUsableBaseType(bt: { isPurine: boolean, isPyrimidine: boolean }) {
    return bt.isPurine !== bt.isPyrimidine;
}

const firstAnchorPos = Vec3();
const secondAnchorPos = Vec3();
const midpoint = Vec3();

function getAnchorAtoms(bp: BasePairsTypes.BasePair, structure: Structure, unit: Unit.Atomic) {
    const renderedResidueInfo = findResidueToRender(bp, structure, unit);
    if (!renderedResidueInfo) {
        console.log('no RR');
        return void 0;
    }
    const opposingResidue = renderedResidueInfo.isSecond
        ? findResidue(bp.a.asym_id, bp.a.seq_id, bp.a.PDB_ins_code, structure)
        : findResidue(bp.b.asym_id, bp.b.seq_id, bp.b.PDB_ins_code, structure);
    if (!opposingResidue) {
        console.log('no OR');
        return void 0;
    }

    const { r: renderedResidue } = renderedResidueInfo;

    const firstBaseType = getNucleotideBaseType(renderedResidue.unit, renderedResidue.residue.index);
    const secondBaseType = getNucleotideBaseType(opposingResidue.unit, opposingResidue.residue.index);
    if (!isUsableBaseType(firstBaseType) || !isUsableBaseType(secondBaseType)) return void 0;

    const firstAnchorAtomName = firstBaseType.isPyrimidine ? 'N1' : 'N9';
    const secondAnchorAtomName = secondBaseType.isPyrimidine ? 'N1' : 'N9';

    const firstAtom = findAtomInRange(firstAnchorAtomName, renderedResidue.residue.start, renderedResidue.residue.end, structure, renderedResidue.unit);
    const secondAtom = findAtomInRange(secondAnchorAtomName, opposingResidue.residue.start, opposingResidue.residue.end, structure, opposingResidue.unit);

    if (firstAtom === -1 || secondAtom === -1) return void 0;

    renderedResidue.unit.conformation.invariantPosition(firstAtom, firstAnchorPos);
    opposingResidue.unit.conformation.invariantPosition(secondAtom, secondAnchorPos);

    return {
        firstAtom: firstAnchorPos,
        secondAtom: secondAnchorPos,
        renderOpposing: bp.a.asym_id === bp.b.asym_id,
        isSecond: renderedResidueInfo.isSecond,
    };
}

function createBasePairsLadderIterator(structureGroup: StructureGroup): LocationIterator {
    const { structure, group } = structureGroup;
    const instanceCount = group.units.length;

    const data = BasePairsLadderProvider.get(structure.model)?.value?.data;
    if (!data) return LocationIterator(0, 1, 1, () => NullLocation);

    const no = 3 * data.basePairs.length;

    const getLocation = (groupIndex: number, instanceIndex: number) => {
        const pair = data.basePairs[Math.floor(groupIndex / 3)];
        if (!pair) return NullLocation;

        const part = groupIndex % 3;
        if (part === 0) {
            return BasePairsLadderTypes.Location({ kind: 'base', base: pair.a }, pair);
        } else if (part === 1) {
            return BasePairsLadderTypes.Location({ kind: 'base', base: pair.b }, pair);
        } else {
            return BasePairsLadderTypes.Location({ kind: 'ball' }, pair);
        }
    };

    return LocationIterator(no, instanceCount, 1, getLocation);
}

function createBasePairsLadderMesh(ctx: VisualContext, unit: Unit, structure: Structure, theme: Theme, props: PD.Values<BasePairsLadderMeshParams>, mesh?: Mesh) {
    if (!Unit.isAtomic(unit)) return Mesh.createEmpty(mesh);

    const data = BasePairsLadderProvider.get(structure.model)?.value?.data;
    if (!data) return Mesh.createEmpty(mesh);

    const { basePairs } = data;

    const cylinderProps = { topCap: true, bottomCap: true, radiusTop: 0.5, radiusBottom: 0.5, radialSegments: 8 };
    const mb = MeshBuilder.createState(basePairs.length * 8, basePairs.length * 8 / structure.models.length, mesh);

    for (let idx = 0; idx < basePairs.length; idx++) {
        const bp = basePairs[idx];
        if (bp.PDB_model_number !== structure.model.modelNum) continue;

        const anchors = getAnchorAtoms(bp, structure, unit);
        if (!anchors) {
            console.log('no anchors');
            continue;
        }
        const { firstAtom, secondAtom, renderOpposing, isSecond } = anchors;

        calcMidpoint(midpoint, firstAtom, secondAtom);

        mb.currentGroup = 3 * idx + (isSecond ? 1 : 0);
        addCylinder(mb, firstAtom, midpoint, 1.0, cylinderProps);
        if (renderOpposing) {
            mb.currentGroup = 3 * idx + (isSecond ? 0 : 1);
            addCylinder(mb, midpoint, anchors.secondAtom, 1.0, cylinderProps);
        }
        if (!isSecond) {
            mb.currentGroup = 3 * idx + 2;
            addSphere(mb, midpoint, 1.3, 4);
        }
    }

    return MeshBuilder.getMesh(mb);
}

function getBasePairsLadderLoci(pickingId: PickingId, structureGroup: StructureGroup, id: number) {
    const { objectId, instanceId } = pickingId;
    if (objectId !== id) return EmptyLoci;

    const { structure } = structureGroup;

    const unit = structureGroup.group.units[instanceId];
    if (!Unit.isAtomic(unit)) return EmptyLoci;

    const data = BasePairsLadderProvider.get(structure.model)?.value?.data;
    if (!data) return EmptyLoci;

    // To be implemented
    return EmptyLoci;
}

function eachBasePairsLadderStep(loci: Loci, structureGroup: StructureGroup, apply: (interval: Interval) => boolean) {
    // To be implemented
    return false;
}

function BasePairsLadderVisual(materialId: number): UnitsVisual<BasePairsLadderMeshParams> {
    return UnitsMeshVisual<BasePairsLadderMeshParams>({
        defaultProps: PD.getDefaultValues(BasePairsLadderMeshParams),
        createGeometry: createBasePairsLadderMesh,
        createLocationIterator: createBasePairsLadderIterator,
        getLoci: getBasePairsLadderLoci,
        eachLocation: eachBasePairsLadderStep,
        setUpdateState: (state: VisualUpdateState, newProps: PD.Values<BasePairsLadderMeshParams>, currentProps: PD.Values<BasePairsLadderMeshParams>) => {},
    }, materialId);
}
const BasePairsLadderVisuals = {
    'base-pairs-ladder-symbol': (ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, UnitsMeshParams>) => UnitsRepresentation('Base Pairs Ladder Symbol Mesh', ctx, getParams, BasePairsLadderVisual),
} as const;

const BasePairsLadderParams = {
    ...UnitsMeshParams
};
type BasePairsLadderParams = typeof BasePairsLadderMeshParams;

export type BasePairsLadderRepresentation = StructureRepresentation<BasePairsLadderParams>;
export function BasePairsLadderRepresentation(ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, BasePairsLadderParams>): BasePairsLadderRepresentation {
    return Representation.createMulti('Base Pairs Ladder', ctx, getParams, StructureRepresentationStateBuilder, BasePairsLadderVisuals);
}
function getBasePairsLadderParams(ctx: ThemeRegistryContext, structure: Structure) {
    return PD.clone(BasePairsLadderParams);
}

export const BasePairsLadderRepresentationProvider = StructureRepresentationProvider({
    name: 'base-pairs-ladder',
    label: 'Base Pairs Ladder',
    description: 'Base Pairs geometry in simplified ladder representation',
    factory: BasePairsLadderRepresentation,
    getParams: getBasePairsLadderParams,
    defaultValues: PD.getDefaultValues(BasePairsLadderParams),
    defaultColorTheme: { name: 'base-pairs-ladder' },
    defaultSizeTheme: { name: 'uniform' },
    isApplicable: (structure: Structure) => structure.models.some(m => BasePairs.isApplicable(m)),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, structure: Structure) => BasePairsLadderProvider.attach(ctx, structure.model, void 0, true),
        detach: (data) => BasePairsLadderProvider.ref(data.model, false),
    },
});
