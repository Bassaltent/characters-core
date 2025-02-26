'use strict';

const meta = require.main.require('./src/meta');
const db = require.main.require('./src/database');
const winston = require.main.require('winston');
const { FIELD_TYPES, FIELD_PROPERTIES } = require('./src/constants');
const { createModel } = require('./src/model');

const CharactersCore = {};

// API Publique pour les autres plugins
CharactersCore.getModel = async function(modelId) {
    const models = await db.getObject('characters:models') || {};
    return models[modelId];
};

CharactersCore.getAllModels = async function() {
    return await db.getObject('characters:models') || {};
};

CharactersCore.validateFieldValue = async function(field, value) {
    if (field.properties?.required && (value === null || value === undefined || value === '')) {
        throw new Error(`Le champ ${field.name} est requis`);
    }
    
    switch(field.type) {
        case FIELD_TYPES.NUMBER:
            if (isNaN(value)) {
                throw new Error(`Le champ ${field.name} doit être un nombre`);
            }
            break;
        case FIELD_TYPES.ARRAY:
            if (!Array.isArray(value)) {
                throw new Error(`Le champ ${field.name} doit être un tableau`);
            }
            break;
        case FIELD_TYPES.REFERENCE:
            // Vérifier si la référence existe
            if (field.properties?.ref) {
                const refModel = await this.getModel(field.properties.ref);
                if (!refModel) {
                    throw new Error(`Le modèle référencé ${field.properties.ref} n'existe pas`);
                }
            }
            break;
    }

    return true;
};

CharactersCore.getFieldLabel = function(field, lang = 'fr') {
    if (!field || !field.label) return field?.name || '';
    return field.label[lang] || field.label['en'] || field.name;
};

// Constantes exposées pour les autres plugins
CharactersCore.FIELD_TYPES = FIELD_TYPES;
CharactersCore.FIELD_PROPERTIES = FIELD_PROPERTIES;

CharactersCore.init = async function (params) {
    const { router, middleware, controllers } = params;

    // Routes pour le panneau d'administration
    router.get('/admin/characters-core', middleware.admin.buildHeader, renderAdminPage);
    router.get('/api/admin/characters-core', renderAdminPage);

    // Routes API
    router.get('/api/characters-core/models', getCharacterModels);
    router.get('/api/characters-core/models/:modelId', getCharacterModel);
    router.post('/api/characters-core/models', middleware.applyCSRF, createCharacterModel);
    router.put('/api/characters-core/models/:modelId', middleware.applyCSRF, updateCharacterModel);
    router.delete('/api/characters-core/models/:modelId', middleware.applyCSRF, deleteCharacterModel);

    router.post('/api/characters-core/models/:modelId/duplicate', middleware.applyCSRF, duplicateCharacterModel);

    // Route pour l'import
    router.post('/api/characters-core/models/import', middleware.applyCSRF, importCharacterModel);

    winston.info('[plugin/characters-core] Plugin loaded.');
};

CharactersCore.addAdminNavigation = async function (header) {
    header.plugins.push({
        route: '/characters-core',
        icon: 'fa-users',
        name: 'Characters Core',
    });
    return header;
};

// Rendu de la page d'administration
async function renderAdminPage(req, res) {
    res.render('admin/plugins/characters-core', {});
}

// API : Récupérer les modèles de personnages
async function getCharacterModels(req, res) {
    const models = await db.getObject('characters:models') || {};
    res.json(models);
}

async function getCharacterModel(req, res) {
    const { modelId } = req.params;
    const models = await db.getObject('characters:models');
    
    if (!models || !models[modelId]) {
        return res.status(404).json({ message: 'Model not found' });
    }

    res.json(models[modelId]);
}

// API : Créer un nouveau modèle de personnage
async function createCharacterModel(req, res) {
    const { name, fields } = req.body;
    const modelId = `model:${Date.now()}`;

    const model = createModel(modelId, name);
    model.fields = fields || [];

    await db.setObjectField('characters:models', modelId, model);
    res.json({ message: 'Model created', model });
}

// API : Modifier un modèle existant
async function updateCharacterModel(req, res) {
    const { modelId } = req.params;
    const { name, fields } = req.body;

    const model = {
        id: modelId,
        name,
        fields,
    };

    await db.setObjectField('characters:models', modelId, model);
    res.json({ message: 'Model updated', model });
}

// API : Supprimer un modèle de personnage
async function deleteCharacterModel(req, res) {
    const { modelId } = req.params;

    await db.deleteObjectField('characters:models', modelId);
    res.json({ message: 'Model deleted' });
}

async function duplicateCharacterModel(req, res) {
    const { modelId } = req.params;
    const originalModel = await CharactersCore.getModel(modelId);
    
    if (!originalModel) {
        return res.status(404).json({ message: 'Model not found' });
    }

    const newModelId = `model:${Date.now()}`;
    const duplicatedModel = {
        ...originalModel,
        id: newModelId,
        name: `Copie de ${originalModel.name}`
    };

    await db.setObjectField('characters:models', newModelId, duplicatedModel);
    res.json({ message: 'Model duplicated', model: duplicatedModel });
}

CharactersCore.cleanModelForImport = function(modelData) {
    // Liste des champs autorisés dans un modèle
    const allowedFields = ['name', 'fields'];
    
    // Liste des champs autorisés dans un field
    const allowedFieldProperties = ['name', 'label', 'type', 'properties'];
    
    // Liste des propriétés autorisées dans un field
    const allowedProperties = ['required', 'unique', 'min', 'max'];

    const cleanedModel = {};
    
    // Ne garder que les champs autorisés du modèle
    allowedFields.forEach(field => {
        if (field in modelData) {
            cleanedModel[field] = modelData[field];
        }
    });

    // Nettoyer les fields
    if (Array.isArray(cleanedModel.fields)) {
        cleanedModel.fields = cleanedModel.fields.map(field => {
            const cleanedField = {};
            
            allowedFieldProperties.forEach(prop => {
                if (prop in field) {
                    if (prop === 'properties') {
                        // Ne garder que les propriétés autorisées
                        cleanedField.properties = {};
                        allowedProperties.forEach(p => {
                            if (p in field.properties) {
                                cleanedField.properties[p] = field.properties[p];
                            }
                        });
                    } else {
                        cleanedField[prop] = field[prop];
                    }
                }
            });
            
            return cleanedField;
        });
    }

    return cleanedModel;
};

async function importCharacterModel(req, res) {
    try {
        const modelData = req.body;
        const cleanedModel = CharactersCore.cleanModelForImport(modelData);
        
        const modelId = `model:${Date.now()}`;
        const newModel = {
            ...cleanedModel,
            id: modelId,
            name: `${cleanedModel.name} (importé)`
        };

        await db.setObjectField('characters:models', modelId, newModel);
        res.json({ message: 'Model imported', model: newModel });
    } catch (error) {
        res.status(400).json({ message: 'Import failed', error: error.message });
    }
}

module.exports = CharactersCore;
