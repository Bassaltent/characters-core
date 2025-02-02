// model.js
'use strict';

const createModel = (modelId, name) => ({
    id: modelId,
    name: name,
    fields: [],
    methods: []
});

const createField = (name, type) => ({
    name: name,
    label: {
        fr: '',
        en: ''
    },
    type: type,
    properties: {
        required: false,
        unique: false,
        default: null,
        min: null,
        max: null,
        ref: null
    },
    subFields: []
});

module.exports = {
    createModel,
    createField
};