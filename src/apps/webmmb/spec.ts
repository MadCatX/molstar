import { DefaultPluginSpec } from '../../mol-plugin';
import { PluginSpec } from '../../mol-plugin/spec';

export interface WebMmbViewerPluginSpec extends PluginSpec {
}

export const WebMmbViewerPluginSpec: WebMmbViewerPluginSpec = {
    ...DefaultPluginSpec
};
