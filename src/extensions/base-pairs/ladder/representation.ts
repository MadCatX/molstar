import { BasePairsLadderProvider } from './property';
import { BasePairs } from '../property';
import { Interval } from '../../../mol-data/int';
import { Mesh } from '../../../mol-geo/geometry/mesh/mesh';
import { PickingId } from '../../../mol-geo/geometry/picking';
import { LocationIterator } from '../../../mol-geo/util/location-iterator';
import { EmptyLoci, Loci } from '../../../mol-model/loci';
import { NullLocation } from '../../../mol-model/location';
import { Structure, Unit } from '../../../mol-model/structure';
import { CustomProperty } from '../../../mol-model-props/common/custom-property';
import { Representation, RepresentationContext, RepresentationParamsGetter } from '../../../mol-repr/representation';
import { StructureRepresentation, StructureRepresentationProvider, StructureRepresentationStateBuilder, UnitsRepresentation } from '../../../mol-repr/structure/representation';
import { StructureGroup } from '../../../mol-repr/structure/visual/util/common';
import { VisualUpdateState } from '../../../mol-repr/util';
import { VisualContext } from '../../../mol-repr/visual';
import { UnitsMeshParams, UnitsMeshVisual, UnitsVisual } from '../../../mol-repr/structure/units-visual';
import { Theme, ThemeRegistryContext } from '../../../mol-theme/theme';
import { ParamDefinition as PD } from '../../../mol-util/param-definition';

const BasePairsLadderMeshParams = {
    ...UnitsMeshParams
};
type BasePairsLadderMeshParams = typeof BasePairsLadderMeshParams;

function createBasePairsLadderIterator(structureGroup: StructureGroup): LocationIterator {
    const { structure, group } = structureGroup;
    const instanceCount = group.units.length;

    const data = BasePairsLadderProvider.get(structure.model)?.value?.data;
    if (!data) return LocationIterator(0, 1, 1, () => NullLocation);

    const getLocation = (groupIndex: number, instanceIndex: number) => {
        // To be implemented
        return NullLocation;
    };

    return LocationIterator(0, instanceCount, 1, getLocation);
}

function createBasePairsLadderMesh(ctx: VisualContext, unit: Unit, structure: Structure, theme: Theme, props: PD.Values<BasePairsLadderMeshParams>, mesh?: Mesh) {
    if (!Unit.isAtomic(unit)) return Mesh.createEmpty(mesh);

    const data = BasePairsLadderProvider.get(structure.model)?.value?.data;
    if (!data) return Mesh.createEmpty(mesh);

    // To be implemented
    return Mesh.createEmpty(mesh);
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
