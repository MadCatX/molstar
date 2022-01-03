/**
 * Copyright (c) 2018-2021 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Lada Biedermannová <Lada.Biedermannova@ibt.cas.cz>
 * @author Jiří Černý <jiri.cerny@ibt.cas.cz>
 * @author Michal Malý <michal.maly@ibt.cas.cz>
 * @author Bohdan Schneider <Bohdan.Schneider@ibt.cas.cz>
 */

import { Canvas3DProps } from '../../mol-canvas3d/canvas3d';
import { Color } from '../../mol-util/color';

type _PresetPick = Pick<Canvas3DProps, 'renderer' | 'postprocessing'>;
type _Preset = { [K in keyof _PresetPick]: Partial<_PresetPick[K]> };

export type Preset = { canvas3d: _Preset };

export const Presets = {
    'default': {
        canvas3d: <_Preset>{
            postprocessing: {
                occlusion: { name: 'off', params: {} },
                outline: { name: 'off', params: {} },
            },
            renderer: {
                ambientIntensity: 0.4,
                light: [
                    {
                        inclination: 180,
                        azimuth: 0,
                        color: Color.fromNormalizedRgb(1.0, 1.0, 1.0),
                        intensity: 0.6
                    },
                ],
            }
        }
    },
    'occluded': {
        canvas3d: <_Preset>{
            postprocessing: {
                occlusion: { name: 'on', params: { samples: 32, radius: 6, bias: 1.4, blurKernelSize: 15 } },
                outline: { name: 'off', params: { } },
            },
            renderer: {
                ambientIntensity: 0.4,
                light: [
                    {
                        inclination: 180,
                        azimuth: 0,
                        color: Color.fromNormalizedRgb(1.0, 1.0, 1.0),
                        intensity: 0.6
                    },
                ],
            }
        }
    },
    'pandora': {
        canvas3d: <_Preset>{
            postprocessing: {
                occlusion: { name: 'off', params: {} },
                outline: { name: 'on' as 'on', params: { scale: 1, threshold: 0.33, color: Color(0x000000) } }
            },
            renderer: {
                ambientIntensity: 0.85,
                light: []
            }
        }
    },
}
