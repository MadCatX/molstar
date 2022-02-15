const { createApp2, createExample, createBrowserTest, sharedConfig } = require('./webpack.config.common.js');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

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
            module: {
                ...sharedConfig.module,
                rules: [
                    ...sharedConfig.module.rules,
                    {
                        test: /\.svg$/,
                        use: [{
                            loader: 'file-loader',
                            options: {
                                outputPath: 'assets/imgs',
                                name: '[name].[ext]'
                            }
                        }]
                    },
                ]
            },
            plugins: [
                ...sharedConfig.plugins,
                new CssMinimizerPlugin(),
            ],
        }
    ),
    createApp2('wataa-viewer', 'molstar',
        {
            ...sharedConfig,
            module: {
                ...sharedConfig.module,
                rules: [
                    ...sharedConfig.module.rules,
                    {
                        test: /\.svg$/,
                        use: [{
                            loader: 'file-loader',
                            options: {
                                outputPath: 'assets/imgs',
                                name: '[name].[ext]'
                            }
                        }]
                    },
                ]
            },
            plugins: [
                ...sharedConfig.plugins,
                new CssMinimizerPlugin(),
            ],
        }
    ),
    ...examples.map(createExample),
    ...tests.map(createBrowserTest)
];
