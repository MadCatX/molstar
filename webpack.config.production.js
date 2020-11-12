const { createApp, createExample } = require('./webpack.config.common.js');

const examples = ['proteopedia-wrapper', 'basic-wrapper', 'lighting', 'alpha-orbitals'];

module.exports = [
    createApp('viewer', 'molstar'),
    createApp('docking-viewer', 'molstar'),
    createApp('dnatco', 'molstar'),
    createApp('webmmb', 'molstar'),
    ...examples.map(createExample)
];
