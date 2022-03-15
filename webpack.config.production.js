const { createApp, createExample } = require('./webpack.config.common.js');

const examples = ['proteopedia-wrapper', 'basic-wrapper', 'lighting', 'alpha-orbitals'];

module.exports = [
    createApp('rednatco', 'molstar'),
    ...examples.map(createExample)
];
