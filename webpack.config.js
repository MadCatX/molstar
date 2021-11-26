const { createApp2, createExample, createBrowserTest, sharedConfig } = require('./webpack.config.common.js');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const examples = ['proteopedia-wrapper', 'basic-wrapper', 'lighting', 'alpha-orbitals'];
const tests = [
    'font-atlas',
    'marching-cubes',
    'render-lines', 'render-mesh', 'render-shape', 'render-spheres', 'render-structure', 'render-text',
    'parse-xtc'
];

module.exports = [
    createApp2('watna-viewer', 'molstar',
        {
            ...sharedConfig,
            plugins: [
                ...sharedConfig.plugins,
                new CopyPlugin({
                    patterns: [
                        {
                            from: path.resolve(__dirname, 'src/apps/watlas-common/watlas-viewer-common.css'),
                            to: path.resolve(__dirname, 'build/watna-viewer/watlas-viewer-common.css'),
                        },
                        {
                            from: path.resolve(__dirname, 'src/apps/watna-viewer/watna-viewer.css'),
                            to: path.resolve(__dirname, 'build/watna-viewer/watna-viewer.css'),
                        },
                        {
                            from: path.resolve(__dirname, 'src/apps/watna-viewer/molstar.css'),
                            to: path.resolve(__dirname, 'build/watna-viewer/molstar.css'),
                        },
                    ]
                })
            ]
        }
    ),
    createApp2('wataa-viewer', 'molstar',
        {
            ...sharedConfig,
            plugins: [
                ...sharedConfig.plugins,
                new CopyPlugin({
                    patterns: [
                        {
                            from: path.resolve(__dirname, 'src/apps/wataa-viewer/index.html'),
                            to: path.resolve(__dirname, 'build/wataa-viewer/index.html'),
                        },
                        {
                            from: path.resolve(__dirname, 'src/apps/watlas-common/watlas-viewer-common.css'),
                            to: path.resolve(__dirname, 'build/wataa-viewer/watlas-viewer-common.css'),
                        },
                        {
                            from: path.resolve(__dirname, 'src/apps/wataa-viewer/wataa-viewer.css'),
                            to: path.resolve(__dirname, 'build/wataa-viewer/wataa-viewer.css'),
                        },
                        {
                            from: path.resolve(__dirname, 'src/apps/wataa-viewer/molstar.css'),
                            to: path.resolve(__dirname, 'build/wataa-viewer/molstar.css'),
                        },
                    ]
                })
            ]
        }
    ),
    ...examples.map(createExample),
    ...tests.map(createBrowserTest)
];
