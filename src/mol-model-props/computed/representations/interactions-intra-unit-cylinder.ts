/**
 * Copyright (c) 2019 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

import { Unit, Link, Structure } from 'mol-model/structure';
import { Vec3 } from 'mol-math/linear-algebra';
import { Loci, EmptyLoci } from 'mol-model/loci';
import { Interval } from 'mol-data/int';
import { ParamDefinition as PD } from 'mol-util/param-definition';
import { Mesh } from 'mol-geo/geometry/mesh/mesh';
import { PickingId } from 'mol-geo/geometry/picking';
import { VisualContext } from 'mol-repr/visual';
import { Theme } from 'mol-theme/theme';
import { LinkType } from 'mol-model/structure/model/types';
import { ComputedInteractions } from 'mol-model-props/computed/interactions';
import { createLinkCylinderMesh, LinkCylinderParams } from 'mol-repr/structure/visual/util/link';
import { UnitsMeshParams, UnitsVisual, UnitsMeshVisual, StructureGroup } from 'mol-repr/structure/units-visual';
import { VisualUpdateState } from 'mol-repr/util';
import { LocationIterator } from 'mol-geo/util/location-iterator';

function createIntraUnitInteractionsCylinderMesh(ctx: VisualContext, unit: Unit, structure: Structure, theme: Theme, props: PD.Values<InteractionsIntraUnitParams>, mesh?: Mesh) {
    if (!Unit.isAtomic(unit)) return Mesh.createEmpty(mesh)

    const interactions = ComputedInteractions.get(structure)!
    const { features, links } = interactions.map.get(unit.id)!

    const { x, y, z } = features
    const { edgeCount, a, b } = links
    const { sizeFactor } = props

    if (!edgeCount) return Mesh.createEmpty(mesh)

    const builderProps = {
        linkCount: edgeCount * 2,
        referencePosition: () => null,
        position: (posA: Vec3, posB: Vec3, edgeIndex: number) => {
            Vec3.set(posA, x[a[edgeIndex]], y[a[edgeIndex]], z[a[edgeIndex]])
            Vec3.set(posB, x[b[edgeIndex]], y[b[edgeIndex]], z[b[edgeIndex]])
        },
        order: (edgeIndex: number) => 1,
        flags: (edgeIndex: number) => LinkType.Flag.MetallicCoordination, // TODO
        radius: (edgeIndex: number) => {
            return 1 * sizeFactor // TODO
        }
    }

    return createLinkCylinderMesh(ctx, builderProps, props, mesh)
}

export const InteractionsIntraUnitParams = {
    ...UnitsMeshParams,
    ...LinkCylinderParams,
    sizeFactor: PD.Numeric(0.3, { min: 0, max: 10, step: 0.01 }),
}
export type InteractionsIntraUnitParams = typeof InteractionsIntraUnitParams

export function InteractionsIntraUnitVisual(materialId: number): UnitsVisual<InteractionsIntraUnitParams> {
    return UnitsMeshVisual<InteractionsIntraUnitParams>({
        defaultProps: PD.getDefaultValues(InteractionsIntraUnitParams),
        createGeometry: createIntraUnitInteractionsCylinderMesh,
        createLocationIterator: createInteractionsIterator,
        getLoci: getLinkLoci,
        eachLocation: eachInteraction,
        setUpdateState: (state: VisualUpdateState, newProps: PD.Values<InteractionsIntraUnitParams>, currentProps: PD.Values<InteractionsIntraUnitParams>) => {
            state.createGeometry = (
                newProps.sizeFactor !== currentProps.sizeFactor ||
                newProps.radialSegments !== currentProps.radialSegments ||
                newProps.linkScale !== currentProps.linkScale ||
                newProps.linkSpacing !== currentProps.linkSpacing
            )
        }
    }, materialId)
}

function getLinkLoci(pickingId: PickingId, structureGroup: StructureGroup, id: number) {
    const { objectId, instanceId, groupId } = pickingId
    if (id === objectId) {
        const { structure, group } = structureGroup
        const unit = group.units[instanceId]
        if (Unit.isAtomic(unit)) {
            const interactions = ComputedInteractions.get(structure)!
            const { features, links } = interactions.map.get(unit.id)!
            const { members, offsets } = features
            // TODO this uses the first member elements of the features of an interaction as a representative
            return Link.Loci(structure, [
                Link.Location(
                    unit, members[offsets[links.a[groupId]]],
                    unit, members[offsets[links.b[groupId]]]
                ),
                Link.Location(
                    unit, members[offsets[links.b[groupId]]],
                    unit, members[offsets[links.a[groupId]]]
                )
            ])
        }
    }
    return EmptyLoci
}

function eachInteraction(loci: Loci, structureGroup: StructureGroup, apply: (interval: Interval) => boolean) {
    let changed = false
    if (Link.isLoci(loci)) {
        const { structure, group } = structureGroup
        if (!Structure.areEquivalent(loci.structure, structure)) return false
        const unit = group.units[0]
        if (!Unit.isAtomic(unit)) return false
        const interactions = ComputedInteractions.get(structure)!
        const { links, getLinkIndex } = interactions.map.get(unit.id)!
        const groupCount = links.edgeCount * 2
        for (const b of loci.links) {
            const unitIdx = group.unitIndexMap.get(b.aUnit.id)
            if (unitIdx !== undefined) {
                const idx = getLinkIndex(b.aIndex, b.bIndex)
                if (idx !== -1) {
                    if (apply(Interval.ofSingleton(unitIdx * groupCount + idx))) changed = true
                }
            }
        }
    }
    return changed
}

function createInteractionsIterator(structureGroup: StructureGroup): LocationIterator {
    const { structure, group } = structureGroup
    const unit = group.units[0]
    const interactions = ComputedInteractions.get(structure)!
    const { links, features } = interactions.map.get(unit.id)!
    const { members, offsets } = features
    const groupCount = links.edgeCount * 2
    const instanceCount = group.units.length
    const location = Link.Location()
    const getLocation = (groupIndex: number, instanceIndex: number) => {
        const fA = links.a[groupIndex]
        const fB = links.b[groupIndex]
        const instanceUnit = group.units[instanceIndex]
        location.aUnit = instanceUnit
        location.aIndex = members[offsets[fA]]
        location.bUnit = instanceUnit
        location.bIndex = members[offsets[fB]]
        return location
    }
    return LocationIterator(groupCount, instanceCount, getLocation)
}