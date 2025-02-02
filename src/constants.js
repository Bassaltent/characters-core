'use strict';

const FIELD_TYPES = {
    STRING: 'string',
    NUMBER: 'number',
    ARRAY: 'array',
    OBJECT: 'object',
    REFERENCE: 'reference',
    CURRENCY: 'currency',
    INVENTORY: 'inventory'
};

const FIELD_PROPERTIES = {
    REQUIRED: 'required',
    UNIQUE: 'unique',
    DEFAULT: 'default',
    MIN: 'min',
    MAX: 'max'
};

module.exports = {
    FIELD_TYPES,
    FIELD_PROPERTIES
};