'use strict';

define('admin/plugins/characters-core', ['settings', 'alerts'], function(settings, alerts) {
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

    function init() {
        // Charger les paramètres existants
        settings.load('characters-core', $('.characters-core-settings'));
        
        // Charger les modèles existants au démarrage
        loadModels();

        // Gestionnaire pour le bouton "Ajouter un modèle"
        $('#addModel').on('click', function() {
            createNewModel();
        });

        // Gestion du clic sur le bouton Modifier pour le MODÈLE
        $('#modelsContainer').on('click', '.edit-model', function() {
            const modelId = $(this).data('id');
            showEditModal(modelId); // Cette fonction gère l'édition du modèle entier
        });

        // Gestion du clic sur le bouton Modifier pour un CHAMP
        $('#modelsContainer').on('click', '.edit-field', function(e) {
            e.stopPropagation(); // Empêcher la propagation vers le modèle parent
            const $fieldRow = $(this).closest('.field-row');
            const field = {
                name: $fieldRow.attr('data-field-name'),
                type: $fieldRow.attr('data-field-type'),
                label: {
                    fr: $fieldRow.attr('data-field-label-fr'),
                    en: $fieldRow.attr('data-field-label-en')
                },
                properties: {
                    required: $fieldRow.attr('data-field-required') === 'true',
                    unique: $fieldRow.attr('data-field-unique') === 'true',
                    ref: $fieldRow.attr('data-field-ref')
                }
            };
            showFieldEditModal(field);
        });

        // Gestion du clic sur le bouton Supprimer
        $('#modelsContainer').on('click', '.delete-model', function() {
            const modelId = $(this).data('id');
            
            require(['bootbox'], function(bootbox) {
                bootbox.confirm({
                    message: "Êtes-vous sûr de vouloir supprimer ce modèle ?",
                    buttons: {
                        confirm: {
                            label: 'Oui',
                            className: 'btn-danger'
                        },
                        cancel: {
                            label: 'Non',
                            className: 'btn-default'
                        }
                    },
                    callback: function (result) {
                        if (result) {
                            deleteModel(modelId);
                        }
                    }
                });
            });
        });

        $('#modelsContainer').on('click', '.toggle-fields', function(e) {
            const $button = $(this);
            const $model = $button.closest('.model');
            
            // Fermer les autres modèles
            $('.model').not($model).removeClass('expanded');
            $('.model').not($model).find('.toggle-fields').removeClass('expanded');
            
            // Toggle l'état du modèle courant
            $model.toggleClass('expanded');
            $button.toggleClass('expanded');
        });

        // Gestionnaire global pour la suppression des champs
        $('#modelsContainer').on('click', '.remove-field', function(e) {
            e.stopPropagation();
            const $fieldRow = $(this).closest('.field-row');
            const modelId = $fieldRow.closest('.model').data('id');
            
            // Supprimer visuellement
            $fieldRow.remove();

            // Obtenir tous les champs restants du modèle
            const fields = [];
            $(`.model[data-id="${modelId}"] .field-row`).each(function() {
                fields.push({
                    name: $(this).attr('data-field-name'),
                    type: $(this).attr('data-field-type'),
                    label: {
                        fr: $(this).attr('data-field-label-fr'),
                        en: $(this).attr('data-field-label-en')
                    },
                    properties: {
                        required: $(this).attr('data-field-required') === 'true',
                        unique: $(this).attr('data-field-unique') === 'true',
                        ref: $(this).attr('data-field-ref') || null
                    }
                });
            });

            // Sauvegarder
            $.ajax({
                url: `/api/characters-core/models/${modelId}`,
                method: 'PUT',
                data: {
                    name: $(`.model[data-id="${modelId}"] h4`).text(),
                    fields: fields
                },
                headers: {
                    'x-csrf-token': config.csrf_token
                },
                success: function() {
                    alerts.alert({
                        type: 'success',
                        alert_id: 'field-deleted',
                        title: 'Succès',
                        message: 'Champ supprimé avec succès',
                        timeout: 2000
                    });
                },
                error: function() {
                    alerts.alert({
                        type: 'error',
                        alert_id: 'field-delete-error',
                        title: 'Erreur',
                        message: 'Erreur lors de la suppression du champ',
                        timeout: 2000
                    });
                    loadModels(); // Recharger en cas d'erreur
                }
            });
        });

        $('#modelsContainer').on('click', '.duplicate-model', function() {
            const modelId = $(this).data('id');
            
            $.ajax({
                url: `/api/characters-core/models/${modelId}/duplicate`,
                method: 'POST',
                headers: {
                    'x-csrf-token': config.csrf_token
                },
                success: function(response) {
                    alerts.alert({
                        type: 'success',
                        alert_id: 'model-duplicated',
                        title: 'Succès',
                        message: 'Modèle dupliqué avec succès',
                        timeout: 2000
                    });
                    loadModels();
                },
                error: function() {
                    alerts.alert({
                        type: 'error',
                        alert_id: 'model-duplicate-error',
                        title: 'Erreur',
                        message: 'Erreur lors de la duplication du modèle',
                        timeout: 2000
                    });
                }
            });
        });
        
        // Handler pour l'import
        $('#importModel').on('click', function() {
            require(['bootbox'], function(bootbox) {
                bootbox.dialog({
                    title: 'Importer un modèle',
                    message: `
                        <div class="form-group">
                            <label>Choisir un fichier JSON</label>
                            <input type="file" class="form-control" id="fileInput" accept=".json">
                        </div>
                        <div class="form-group">
                            <label>Ou coller le contenu JSON</label>
                            <textarea class="form-control" id="jsonInput" rows="10"></textarea>
                        </div>
                    `,
                    buttons: {
                        cancel: {
                            label: 'Annuler',
                            className: 'btn-default'
                        },
                        import: {
                            label: 'Importer',
                            className: 'btn-primary',
                            callback: function() {
                                const fileInput = $('#fileInput')[0];
                                const jsonInput = $('#jsonInput').val();
        
                                if (fileInput.files.length > 0) {
                                    const reader = new FileReader();
                                    reader.onload = function(e) {
                                        try {
                                            const modelData = parseModelInput(e.target.result);
                                            importModel(modelData);
                                        } catch (error) {
                                            alerts.alert({
                                                type: 'error',
                                                alert_id: 'model-import-error',
                                                title: 'Erreur',
                                                message: error.message,
                                                timeout: 2000
                                            });
                                        }
                                    };
                                    reader.readAsText(fileInput.files[0]);
                                } else if (jsonInput) {
                                    try {
                                        const modelData = parseModelInput(jsonInput);
                                        importModel(modelData);
                                    } catch (error) {
                                        alerts.alert({
                                            type: 'error',
                                            alert_id: 'model-import-error',
                                            title: 'Erreur',
                                            message: error.message,
                                            timeout: 2000
                                        });
                                    }
                                }
                            }
                        }
                    }
                });
            });
        });
    }

    function loadModels() {
        $.get('/api/characters-core/models', function(data) {
            const container = $('#modelsContainer');
            
            const modelsArray = Object.values(data).map(model => {
                // Créer une représentation HTML des champs
                const fieldsHtml = Array.isArray(model.fields) ? 
                    `<div class="field-list">
                        ${model.fields.map((field, index) => `
                            <div class="field-row mb-2 ${index >= 3 ? 'collapsed-field' : ''}" 
                                data-field-name="${field.name}"
                                data-field-type="${field.type}"
                                data-field-label-fr="${field.label?.fr || ''}"
                                data-field-label-en="${field.label?.en || ''}"
                                data-field-required="${field.properties?.required || false}"
                                data-field-unique="${field.properties?.unique || false}"
                                data-field-ref="${field.properties?.ref || ''}">
                                <span class="field-info">
                                    ${field.label?.fr || field.name} (${field.type})
                                    ${field.properties?.required ? '*' : ''}
                                    ${field.properties?.unique ? '[U]' : ''}
                                </span>
                                <button type="button" class="btn btn-sm btn-primary edit-field" data-field-id="${field.name}">Éditer</button>
                                <button type="button" class="btn btn-sm btn-danger remove-field" data-field-id="${field.name}">Supprimer</button>
                            </div>
                        `).join('')}
                    </div>` : '';
    
                return {
                    ...model,
                    hasFields: Array.isArray(model.fields) && model.fields.length > 0,
                    fieldsHtml: fieldsHtml
                };
            });
            
            // On parse uniquement les modèles, pas tout le template
            app.parseAndTranslate('admin/plugins/characters-core', 'models', {
                models: modelsArray
            }, function(html) {
                container.empty().html(html);
            });
        });
    }

    function createNewModel() {
        const newModel = {
            name: 'Nouveau modèle',
            fields: []
        };

        $.ajax({
            url: '/api/characters-core/models',
            method: 'POST',
            data: newModel,
            headers: {
                'x-csrf-token': config.csrf_token
            },
            success: function(response) {
                alerts.alert({
                    type: 'success',
                    alert_id: 'model-created',
                    title: 'Succès',
                    message: 'Nouveau modèle créé avec succès',
                    timeout: 2000,
                });
                loadModels();
            },
            error: function(err) {
                alerts.alert({
                    type: 'error',
                    alert_id: 'model-error',
                    title: 'Erreur',
                    message: 'Erreur lors de la création du modèle',
                    timeout: 2000,
                });
            }
        });
    }

    function importModel(modelData) {
        $.ajax({
            url: '/api/characters-core/models/import',
            method: 'POST',
            data: modelData,
            headers: {
                'x-csrf-token': config.csrf_token
            },
            success: function(response) {
                alerts.alert({
                    type: 'success',
                    alert_id: 'model-imported',
                    title: 'Succès',
                    message: 'Modèle importé avec succès',
                    timeout: 2000
                });
                loadModels();
            },
            error: function(err) {
                alerts.alert({
                    type: 'error',
                    alert_id: 'model-import-error',
                    title: 'Erreur',
                    message: 'Erreur lors de l\'import du modèle',
                    timeout: 2000
                });
            }
        });
    }

    function showEditModal(modelId) {
        $.get('/api/characters-core/models', function(models) {
            const model = models[modelId];
            
            if (!model) {
                alerts.alert({
                    type: 'error',
                    alert_id: 'model-not-found',
                    title: 'Erreur',
                    message: 'Modèle non trouvé'
                });
                return;
            }
    
            // S'assurer que fields existe
            model.fields = model.fields || [];
    
            require(['bootbox'], function(bootbox) {
                const dialog = bootbox.dialog({
                    title: 'Modifier le modèle',
                    message: `
                        <form id="editModelForm">
                            <div class="form-group">
                                <label>Nom du modèle</label>
                                <input type="text" class="form-control" name="name" id="modelName" value="${model.name}">
                            </div>
                            <div class="form-group">
                                <label>Champs</label>
                                <div id="fieldsContainer">
                                    ${model.fields.map(field => `
                                        <div class="field-row mb-2" 
                                             data-field-name="${field.name}"
                                             data-field-type="${field.type}"
                                             data-field-label-fr="${field.label?.fr || ''}"
                                             data-field-label-en="${field.label?.en || ''}"
                                             data-field-required="${field.properties?.required || false}"
                                             data-field-unique="${field.properties?.unique || false}"
                                             data-field-ref="${field.properties?.ref || ''}">
                                            <span class="field-info">
                                                ${field.label?.fr || field.name} (${field.type})
                                                ${field.properties?.required ? '*' : ''}
                                                ${field.properties?.unique ? '[U]' : ''}
                                            </span>
                                            <button type="button" class="btn btn-sm btn-primary edit-field">Éditer</button>
                                            <button type="button" class="btn btn-sm btn-danger remove-field">Supprimer</button>
                                        </div>
                                    `).join('')}
                                </div>
                                <button type="button" class="btn btn-sm btn-info mt-2" id="addFieldBtn">Ajouter un champ</button>
                            </div>
                        </form>
                    `,
                    buttons: {
                        cancel: {
                            label: 'Annuler',
                            className: 'btn-default'
                        },
                        save: {
                            label: 'Sauvegarder',
                            className: 'btn-primary',
                            callback: function() {
                                saveModelChanges(modelId);
                            }
                        }
                    }
                });
    
                // Ajouter le gestionnaire pour le bouton "Ajouter un champ" après création de la boîte de dialogue
                dialog.on('shown.bs.modal', function() {
                    $('#addFieldBtn').on('click', function() {
                        showFieldEditModal(null);
                    });
                
                    // Ajouter ceci :
                    $('#fieldsContainer').on('click', '.remove-field', function(e) {
                        e.stopPropagation();
                        $(this).closest('.field-row').remove();
                        
                        // Sauvegarder immédiatement les changements
                        const fields = [];
                        $('#fieldsContainer .field-row').each(function() {
                            fields.push({
                                name: $(this).attr('data-field-name'),
                                type: $(this).attr('data-field-type'),
                                label: {
                                    fr: $(this).attr('data-field-label-fr'),
                                    en: $(this).attr('data-field-label-en')
                                },
                                properties: {
                                    required: $(this).attr('data-field-required') === 'true',
                                    unique: $(this).attr('data-field-unique') === 'true',
                                    ref: $(this).attr('data-field-ref') || null
                                }
                            });
                        });
                    
                        $.ajax({
                            url: `/api/characters-core/models/${modelId}`,
                            method: 'PUT',
                            data: {
                                name: $('#modelName').val(),
                                fields: fields
                            },
                            headers: {
                                'x-csrf-token': config.csrf_token
                            },
                            success: function() {
                                alerts.alert({
                                    type: 'success',
                                    alert_id: 'field-deleted',
                                    title: 'Succès',
                                    message: 'Champ supprimé avec succès',
                                    timeout: 2000
                                });
                                // On ne recharge pas la page pour ne pas fermer la modale
                                // mais on met à jour l'affichage si nécessaire
                            },
                            error: function() {
                                alerts.alert({
                                    type: 'error',
                                    alert_id: 'field-delete-error',
                                    title: 'Erreur',
                                    message: 'Erreur lors de la suppression du champ',
                                    timeout: 2000
                                });
                                // Potentiellement recharger les champs en cas d'erreur
                                loadModels();
                            }
                        });
                    });
                });
            });
        });
    }
    
    function showFieldEditModal(field = null) {
        require(['bootbox'], function(bootbox) {
            bootbox.dialog({
                title: field ? 'Modifier le champ' : 'Ajouter un champ',
                message: `
                    <form id="fieldForm">
                        <div class="form-group">
                            <label>Identifiant technique</label>
                            <input type="text" class="form-control" id="fieldName" value="${field?.name || ''}">
                            <small class="form-text text-muted">Nom utilisé dans le code (ex: name, power, etc.)</small>
                        </div>
                        <div class="form-group">
                            <label>Libellé (FR)</label>
                            <input type="text" class="form-control" id="fieldLabelFr" value="${field?.label?.fr || ''}">
                            <small class="form-text text-muted">Label affiché en français (ex: Nom, Puissance, etc.)</small>
                        </div>
                        <div class="form-group">
                            <label>Label (EN)</label>
                            <input type="text" class="form-control" id="fieldLabelEn" value="${field?.label?.en || ''}">
                            <small class="form-text text-muted">Label displayed in English (ex: Name, Power, etc.)</small>
                        </div>
                        <div class="form-group">
                            <label>Type</label>
                            <select class="form-control" id="fieldType">
                                ${Object.entries(FIELD_TYPES).map(([key, value]) => 
                                    `<option value="${value}" ${field?.type === value ? 'selected' : ''}>${key}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group field-properties">
                            <label>Propriétés</label>
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" id="fieldRequired" ${field?.properties?.required ? 'checked' : ''}>
                                    Requis
                                </label>
                            </div>
                            <div class="checkbox">
                                <label>
                                    <input type="checkbox" id="fieldUnique" ${field?.properties?.unique ? 'checked' : ''}>
                                    Unique
                                </label>
                            </div>
                            <div class="form-group" id="referenceConfig" style="display: none;">
                                <label>Référence au modèle</label>
                                <input type="text" class="form-control" id="fieldRef" value="${field?.properties?.ref || ''}">
                            </div>
                        </div>
                    </form>
                `,
                buttons: {
                    cancel: {
                        label: 'Annuler',
                        className: 'btn-default'
                    },
                    save: {
                        label: 'Sauvegarder',
                        className: 'btn-primary',
                        callback: function() {
                            const newField = {
                                name: $('#fieldName').val(),
                                label: {
                                    fr: $('#fieldLabelFr').val(),
                                    en: $('#fieldLabelEn').val()
                                },
                                type: $('#fieldType').val(),
                                properties: {
                                    required: $('#fieldRequired').prop('checked'),
                                    unique: $('#fieldUnique').prop('checked'),
                                    ref: $('#fieldRef').val() || null
                                }
                            };
    
                            // Si c'est une édition, mettre à jour le champ existant
                            if (field) {
                                const $existingField = $(`.field-row[data-field-name="${field.name}"]`);
                                $existingField.attr({
                                    'data-field-label-fr': newField.label.fr,
                                    'data-field-label-en': newField.label.en,
                                    'data-field-type': newField.type,
                                    'data-field-required': newField.properties.required,
                                    'data-field-unique': newField.properties.unique,
                                    'data-field-ref': newField.properties.ref || ''
                                });
                                $existingField.find('.field-info').html(`
                                    ${newField.label.fr} (${newField.type})
                                    ${newField.properties.required ? '*' : ''}
                                    ${newField.properties.unique ? '[U]' : ''}
                                `);
                            } else {
                                // Sinon ajouter un nouveau champ
                                const fieldHtml = `
                                    <div class="field-row mb-2" 
                                         data-field-name="${newField.name}"
                                         data-field-type="${newField.type}"
                                         data-field-label-fr="${newField.label.fr}"
                                         data-field-label-en="${newField.label.en}"
                                         data-field-required="${newField.properties.required}"
                                         data-field-unique="${newField.properties.unique}"
                                         data-field-ref="${newField.properties.ref || ''}">
                                        <span class="field-info">
                                            ${newField.label.fr} (${newField.type})
                                            ${newField.properties.required ? '*' : ''}
                                            ${newField.properties.unique ? '[U]' : ''}
                                        </span>
                                        <button type="button" class="btn btn-sm btn-primary edit-field">Éditer</button>
                                        <button type="button" class="btn btn-sm btn-danger remove-field">Supprimer</button>
                                    </div>
                                `;
                                $('#fieldsContainer').append(fieldHtml);
                            }
                        }
                    }
                }
            });
    
            // Afficher/masquer les configurations spécifiques selon le type
            $('#fieldType').on('change', function() {
                const type = $(this).val();
                if (type === FIELD_TYPES.REFERENCE) {
                    $('#referenceConfig').show();
                } else {
                    $('#referenceConfig').hide();
                }
            });
    
            // Déclencher le change pour initialiser l'affichage
            $('#fieldType').trigger('change');
        });
    }

    function saveModelChanges(modelId) {
        const name = $('#modelName').val();
        const fields = [];
        
        // Récupérer tous les champs
        $('.field-row').each(function() {
            fields.push({
                name: $(this).data('field-name'),
                type: $(this).data('field-type'),
                label: {
                    fr: $(this).data('field-label-fr'),
                    en: $(this).data('field-label-en')
                },
                properties: {
                    required: $(this).data('field-required') === 'true',
                    unique: $(this).data('field-unique') === 'true',
                    ref: $(this).data('field-ref') || null
                }
            });
        });
    
        $.ajax({
            url: `/api/characters-core/models/${modelId}`,
            method: 'PUT',
            data: {
                name: name,
                fields: fields
            },
            headers: {
                'x-csrf-token': config.csrf_token
            },
            success: function() {
                alerts.alert({
                    type: 'success',
                    alert_id: 'model-updated',
                    title: 'Succès',
                    message: 'Modèle mis à jour avec succès',
                    timeout: 2000
                });
                loadModels();
            },
            error: function() {
                alerts.alert({
                    type: 'error',
                    alert_id: 'model-update-error',
                    title: 'Erreur',
                    message: 'Erreur lors de la mise à jour du modèle',
                    timeout: 2000
                });
            }
        });
    }


    function convertMongooseType(mongooseType) {
        const typeMapping = {
            'String': 'string',
            'Number': 'number',
            'Array': 'array',
            'Object': 'object',
            'mongoose.Schema.Types.ObjectId': 'reference'
        };
        
        return typeMapping[mongooseType] || 'string';
    }
    
    function parseModelInput(input) {
        try {
            // D'abord essayer de parser comme JSON standard
            return JSON.parse(input);
        } catch (e) {
            try {
                // Si ce n'est pas du JSON, essayer de parser comme un schéma Mongoose
                const mongooseSchema = input;
                
                // Convertir le schéma Mongoose en notre format
                const fields = [];
                
                // Regex pour extraire les définitions de champs
                const schemaRegex = /(\w+):\s*{\s*type:\s*(\w+)(?:,\s*required:\s*(true|false))?(?:,\s*unique:\s*(true|false))?/g;
                let match;
                
                while ((match = schemaRegex.exec(mongooseSchema)) !== null) {
                    const [, name, type, required, unique] = match;
                    
                    fields.push({
                        name,
                        label: {
                            fr: name.charAt(0).toUpperCase() + name.slice(1),
                            en: name.charAt(0).toUpperCase() + name.slice(1)
                        },
                        type: convertMongooseType(type),
                        properties: {
                            required: required === 'true',
                            unique: unique === 'true'
                        }
                    });
                }
                
                return {
                    name: 'Imported Model',
                    fields: fields
                };
            } catch (e2) {
                throw new Error('Format non reconnu');
            }
        }
    }

    function deleteModel(modelId) {
        $.ajax({
            url: `/api/characters-core/models/${modelId}`,
            method: 'DELETE',
            headers: {
                'x-csrf-token': config.csrf_token
            },
            success: function() {
                alerts.alert({
                    type: 'success',
                    alert_id: 'model-deleted',
                    title: 'Succès',
                    message: 'Modèle supprimé avec succès',
                    timeout: 2000
                });
                loadModels();
            },
            error: function() {
                alerts.alert({
                    type: 'error',
                    alert_id: 'model-delete-error',
                    title: 'Erreur',
                    message: 'Erreur lors de la suppression du modèle',
                    timeout: 2000
                });
            }
        });
    }

    return {
        init: init
    };
});