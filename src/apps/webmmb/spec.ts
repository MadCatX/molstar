import { DefaultPluginSpec, PluginSpec } from '../../mol-plugin/spec';

export interface WebMmbViewerPluginSpec extends PluginSpec {
}

export const WebMmbViewerPluginSpec: WebMmbViewerPluginSpec = {
    ...DefaultPluginSpec()
};
