const { createApp2, sharedConfig } = require('./webpack.config.common.js');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

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
];
