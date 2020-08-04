/**
 * Copyright (c) 2018-2020 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 */

import { NtcBallsProvider } from './property';
import { NtcBallsUtil } from './util';
import { NtcBallsTypes as CBT } from './types';
import { DnatcoCommon as DC } from '../common';
import { Interval } from '../../../mol-data/int';
import { Mesh } from '../../../mol-geo/geometry/mesh/mesh';
import { addSphere } from '../../../mol-geo/geometry/mesh/builder/sphere';
import { MeshBuilder } from '../../../mol-geo/geometry/mesh/mesh-builder';
import { PickingId } from '../../../mol-geo/geometry/picking';
import { LocationIterator } from '../../../mol-geo/util/location-iterator';
import { EmptyLoci, Loci } from '../../../mol-model/loci';
import { Structure, StructureElement, StructureProperties, Unit } from '../../../mol-model/structure';
import { CustomProperty } from '../../../mol-model-props/common/custom-property';
import { Representation, RepresentationContext, RepresentationParamsGetter } from '../../../mol-repr/representation';
import { StructureRepresentation, StructureRepresentationProvider, StructureRepresentationStateBuilder, UnitsRepresentation } from '../../../mol-repr/structure/representation';
import { StructureGroup, UnitsMeshParams, UnitsMeshVisual, UnitsVisual } from '../../../mol-repr/structure/units-visual';
import { VisualUpdateState } from '../../../mol-repr/util';
import { VisualContext } from '../../../mol-repr/visual';
import { getAltResidueLociFromId } from '../../../mol-repr/structure/visual/util/common';
import { ParamDefinition as PD } from '../../../mol-util/param-definition';
import { Theme, ThemeRegistryContext } from '../../../mol-theme/theme';

const NtcBallsMeshParams = {
    ...UnitsMeshParams,
    // AA
    AA00U: PD.Boolean(true),
    AA00L: PD.Boolean(true),

    AA01U: PD.Boolean(true),
    AA01L: PD.Boolean(true),

    AA02U: PD.Boolean(true),
    AA02L: PD.Boolean(true),

    AA03U: PD.Boolean(true),
    AA03L: PD.Boolean(true),

    AA04U: PD.Boolean(true),
    AA04L: PD.Boolean(true),

    AA05U: PD.Boolean(true),
    AA05L: PD.Boolean(true),

    AA06U: PD.Boolean(true),
    AA06L: PD.Boolean(true),

    AA07U: PD.Boolean(true),
    AA07L: PD.Boolean(true),

    AA08U: PD.Boolean(true),
    AA08L: PD.Boolean(true),

    AA09U: PD.Boolean(true),
    AA09L: PD.Boolean(true),

    AA10U: PD.Boolean(true),
    AA10L: PD.Boolean(true),

    AA11U: PD.Boolean(true),
    AA11L: PD.Boolean(true),

    AA12U: PD.Boolean(true),
    AA12L: PD.Boolean(true),

    AA13U: PD.Boolean(true),
    AA13L: PD.Boolean(true),

    // AB
    AB01U: PD.Boolean(true),
    AB01L: PD.Boolean(true),

    AB02U: PD.Boolean(true),
    AB02L: PD.Boolean(true),

    AB03U: PD.Boolean(true),
    AB03L: PD.Boolean(true),

    AB04U: PD.Boolean(true),
    AB04L: PD.Boolean(true),

    AB05U: PD.Boolean(true),
    AB05L: PD.Boolean(true),

    // BA
    BA01U: PD.Boolean(true),
    BA01L: PD.Boolean(true),

    BA05U: PD.Boolean(true),
    BA05L: PD.Boolean(true),

    BA08U: PD.Boolean(true),
    BA08L: PD.Boolean(true),

    BA09U: PD.Boolean(true),
    BA09L: PD.Boolean(true),

    BA10U: PD.Boolean(true),
    BA10L: PD.Boolean(true),

    BA13U: PD.Boolean(true),
    BA13L: PD.Boolean(true),

    BA16U: PD.Boolean(true),
    BA16L: PD.Boolean(true),

    BA17U: PD.Boolean(true),
    BA17L: PD.Boolean(true),

    // BB
    BB00U: PD.Boolean(true),
    BB00L: PD.Boolean(true),

    BB01U: PD.Boolean(true),
    BB01L: PD.Boolean(true),

    BB02U: PD.Boolean(true),
    BB02L: PD.Boolean(true),

    BB03U: PD.Boolean(true),
    BB03L: PD.Boolean(true),

    BB04U: PD.Boolean(true),
    BB04L: PD.Boolean(true),

    BB05U: PD.Boolean(true),
    BB05L: PD.Boolean(true),

    BB07U: PD.Boolean(true),
    BB07L: PD.Boolean(true),

    BB08U: PD.Boolean(true),

    BB10U: PD.Boolean(true),
    BB10L: PD.Boolean(true),

    BB11U: PD.Boolean(true),
    BB11L: PD.Boolean(true),

    BB12U: PD.Boolean(true),
    BB12L: PD.Boolean(true),

    BB13U: PD.Boolean(true),
    BB13L: PD.Boolean(true),

    BB16U: PD.Boolean(true),
    BB16L: PD.Boolean(true),

    BB14U: PD.Boolean(true),
    BB14L: PD.Boolean(true),

    BB15U: PD.Boolean(true),
    BB15L: PD.Boolean(true),

    BB17U: PD.Boolean(true),
    BB17L: PD.Boolean(true),

    BB20U: PD.Boolean(true),
    BB20L: PD.Boolean(true),

    // IC
    IC01U: PD.Boolean(true),
    IC01L: PD.Boolean(true),

    IC02U: PD.Boolean(true),
    IC02L: PD.Boolean(true),

    IC03U: PD.Boolean(true),
    IC03L: PD.Boolean(true),

    IC04U: PD.Boolean(true),
    IC04L: PD.Boolean(true),

    IC05U: PD.Boolean(true),
    IC05L: PD.Boolean(true),

    IC06U: PD.Boolean(true),
    IC06L: PD.Boolean(true),

    IC07U: PD.Boolean(true),
    IC07L: PD.Boolean(true),

    // OP
    OP01U: PD.Boolean(true),
    OP01L: PD.Boolean(true),

    OP02U: PD.Boolean(true),
    OP02L: PD.Boolean(true),

    OP03U: PD.Boolean(true),
    OP03L: PD.Boolean(true),

    OP04U: PD.Boolean(true),
    OP04L: PD.Boolean(true),

    OP05U: PD.Boolean(true),
    OP05L: PD.Boolean(true),

    OP06U: PD.Boolean(true),
    OP06L: PD.Boolean(true),

    OP07U: PD.Boolean(true),
    OP07L: PD.Boolean(true),

    OP08U: PD.Boolean(true),
    OP08L: PD.Boolean(true),

    OP09U: PD.Boolean(true),
    OP09L: PD.Boolean(true),

    OP10U: PD.Boolean(true),
    OP10L: PD.Boolean(true),

    OP11U: PD.Boolean(true),
    OP11L: PD.Boolean(true),

    OP12U: PD.Boolean(true),
    OP12L: PD.Boolean(true),

    OP13U: PD.Boolean(true),
    OP13L: PD.Boolean(true),

    OP14U: PD.Boolean(true),
    OP14L: PD.Boolean(true),

    OP15U: PD.Boolean(true),
    OP15L: PD.Boolean(true),

    OP16U: PD.Boolean(true),
    OP16L: PD.Boolean(true),

    OP17U: PD.Boolean(true),
    OP17L: PD.Boolean(true),

    OP18U: PD.Boolean(true),
    OP18L: PD.Boolean(true),

    OP19U: PD.Boolean(true),
    OP19L: PD.Boolean(true),

    OP20U: PD.Boolean(true),
    OP20L: PD.Boolean(true),

    OP21U: PD.Boolean(true),
    OP21L: PD.Boolean(true),

    OP22U: PD.Boolean(true),
    OP22L: PD.Boolean(true),

    OP23U: PD.Boolean(true),
    OP23L: PD.Boolean(true),

    OP24U: PD.Boolean(true),
    OP24L: PD.Boolean(true),

    OP25U: PD.Boolean(true),
    OP25L: PD.Boolean(true),

    OP26U: PD.Boolean(true),
    OP26L: PD.Boolean(true),

    OP27U: PD.Boolean(true),
    OP27L: PD.Boolean(true),

    OP28U: PD.Boolean(true),
    OP28L: PD.Boolean(true),

    OP29U: PD.Boolean(true),
    OP29L: PD.Boolean(true),

    OP30U: PD.Boolean(true),
    OP30L: PD.Boolean(true),

    OP31U: PD.Boolean(true),
    OP31L: PD.Boolean(true),

    // SYN
    OPS1U: PD.Boolean(true),
    OPS1L: PD.Boolean(true),

    OP1SU: PD.Boolean(true),
    OP1SL: PD.Boolean(true),

    AAS1U: PD.Boolean(true),
    AAS1L: PD.Boolean(true),

    AB1SU: PD.Boolean(true),
    AB1SL: PD.Boolean(true),

    AB2SU: PD.Boolean(true),
    AB2SL: PD.Boolean(true),

    BB1SU: PD.Boolean(true),
    BB1SL: PD.Boolean(true),

    BB2SU: PD.Boolean(true),
    BB2SL: PD.Boolean(true),

    BBS1U: PD.Boolean(true),
    BBS1L: PD.Boolean(true),

    ZZ1SU: PD.Boolean(true),
    ZZ1SL: PD.Boolean(true),

    ZZ2SU: PD.Boolean(true),
    ZZ2SL: PD.Boolean(true),

    ZZS1U: PD.Boolean(true),
    ZZS1L: PD.Boolean(true),

    ZZS2U: PD.Boolean(true),
    ZZS2L: PD.Boolean(true),

    // ZZ
    ZZ01U: PD.Boolean(true),
    ZZ01L: PD.Boolean(true),

    ZZ02U: PD.Boolean(true),
    ZZ02L: PD.Boolean(true),

    // N
    NANTU: PD.Boolean(true),
    NANTL: PD.Boolean(true),
};
type NtcBallsMeshParams = typeof NtcBallsMeshParams;

function createNtcBallsIterator(structureGroup: StructureGroup): LocationIterator {
    const { structure, group } = structureGroup;
    const instanceCount = group.units.length;
    const defaultUnit = group.units[0];
    const empty = StructureElement.Location.create(structure, defaultUnit); // Dummy empty location

    const prop = NtcBallsProvider.get(structure.model).value;
    if (prop === undefined || prop.data === undefined) {
        return LocationIterator(0, 1, (groupIndex: number, instanceIndex: number) => {
            return empty;
        });
    }

    const { locations } = prop.data;

    const getLocation = (groupIndex: number, instanceIndex: number) => {
        if (locations.length <= groupIndex) return empty;
        return locations[groupIndex];
    };
    return LocationIterator(locations.length, instanceCount, getLocation);
}

function createNtcBallsMesh(ctx: VisualContext, unit: Unit, structure: Structure, theme: Theme, props: PD.Values<NtcBallsMeshParams>, mesh?: Mesh) {
    if (!Unit.isAtomic(unit)) return Mesh.createEmpty(mesh);

    const prop = NtcBallsProvider.get(structure.model).value;
    if (prop === undefined || prop.data === undefined) return Mesh.createEmpty(mesh);

    const { doubleBalls } = prop.data;
    if (doubleBalls.length === 0) return Mesh.createEmpty(mesh);

    const mb = MeshBuilder.createState(512, 512, mesh);

    const handler = (doubleBall: CBT.DoubleBall, O3: NtcBallsUtil.AtomInfo, C5: NtcBallsUtil.AtomInfo, firsLocIndex: number, secondLocIndex: number) => {
        if (firsLocIndex === -1 || secondLocIndex === -1)
            throw new Error('Invalid location index');

        const O3key = doubleBall.NtC + 'U';
        const C5key = doubleBall.NtC + 'L';

        /* O3 ball */
        if (props[O3key as keyof NtcBallsMeshParams] === true) {
            mb.currentGroup = firsLocIndex;
            addSphere(mb, O3.pos, 1.95, 2);
        }

        /* C5 ball */
        if (props[C5key as keyof NtcBallsMeshParams] === true) {
            mb.currentGroup = secondLocIndex;
            addSphere(mb, C5.pos, 1.95, 2);
        }
    };

    const walker = new NtcBallsUtil.UnitWalker(structure, unit, handler);
    walker.walk();

    return MeshBuilder.getMesh(mb);
}

function getNtcBallLoci(pickingId: PickingId, structureGroup: StructureGroup, id: number) {
    const { groupId, objectId, instanceId } = pickingId;
    if (objectId !== id) return EmptyLoci;

    const { structure } = structureGroup;

    const unit = structureGroup.group.units[instanceId];
    if (!Unit.isAtomic(unit)) return EmptyLoci;

    const prop = NtcBallsProvider.get(structure.model).value;
    if (prop === undefined || prop.data === undefined) return EmptyLoci;

    const { locations } = prop.data;

    if (locations.length <= groupId) return EmptyLoci;
    const altId = StructureProperties.atom.label_alt_id(CBT.toElementLocation(locations[groupId]));
    const rI = unit.residueIndex[locations[groupId].element.element];

    return getAltResidueLociFromId(structure, unit, rI, altId);
}

function eachNtcBall(loci: Loci, structureGroup: StructureGroup, apply: (interval: Interval) => boolean) {
    return false; // TODO: Implement me
}

function NtcBallsVisual(materialId: number): UnitsVisual<NtcBallsMeshParams> {
    return UnitsMeshVisual<NtcBallsMeshParams>({
        defaultProps: PD.getDefaultValues(NtcBallsMeshParams),
        createGeometry: createNtcBallsMesh,
        createLocationIterator: createNtcBallsIterator,
        getLoci: getNtcBallLoci,
        eachLocation: eachNtcBall,
        setUpdateState: (state: VisualUpdateState, newProps: PD.Values<NtcBallsMeshParams>, currentProps: PD.Values<NtcBallsMeshParams>) => {
        }
    }, materialId);
}
const NtcBallsVisuals = {
    'ntc-balls-symbol': (ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, NtcBallsMeshParams>) => UnitsRepresentation('NtC Balls Symbol Mesh', ctx, getParams, NtcBallsVisual),
};

export const NtcBallsRepresentationParams = {
    ...NtcBallsMeshParams,
};
export type NtcBallsRepresentationParams = typeof NtcBallsRepresentationParams;
export function getNtcBallsParams(ctx: ThemeRegistryContext, structure: Structure) {
    return PD.clone(NtcBallsRepresentationParams);
}

export type NtcBallsRepresentation = StructureRepresentation<NtcBallsRepresentationParams>;
export function NtcBallsRepresentation(ctx: RepresentationContext, getParams: RepresentationParamsGetter<Structure, NtcBallsRepresentationParams>): NtcBallsRepresentation {
    const repr = Representation.createMulti('NtC Balls', ctx, getParams, StructureRepresentationStateBuilder, NtcBallsVisuals as unknown as Representation.Def<Structure, NtcBallsRepresentationParams>);
    return repr;
}

export const NtcBallsRepresentationProvider = StructureRepresentationProvider({
    name: 'ntc-balls',
    label: 'NtC Balls',
    description: 'Non-standard representation of nulecic acids including NtC',
    factory: NtcBallsRepresentation,
    getParams: getNtcBallsParams,
    defaultValues: PD.getDefaultValues(NtcBallsRepresentationParams),
    defaultColorTheme: { name: 'ntc-balls' },
    defaultSizeTheme: { name: 'uniform' },
    isApplicable: (structure: Structure) => structure.models.some(m => DC.isApplicable(m)),
    ensureCustomProperties: {
        attach: (ctx: CustomProperty.Context, structure: Structure) => NtcBallsProvider.attach(ctx, structure.model, void 0, true),
        detach: (data) => NtcBallsProvider.ref(data.model, false),
    }
});
