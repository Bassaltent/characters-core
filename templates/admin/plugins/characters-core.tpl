<div class="characters-core-settings">
    <div class="panel">
        <div class="panel-heading">
            <h3>Gestion des modèles de personnages</h3>
        </div>
        <div class="panel-body">
            <button class="btn btn-primary" id="addModel">Ajouter un modèle</button>
            <div id="modelsContainer"></div>
        </div>
    </div>
</div>

<!-- BEGIN model -->
<div class="model" data-id="{model.id}">
    <h4>{model.name}</h4>
    <div class="fields-container">
        <!-- IF model.hasFields -->
            <div class="field-list">
                {model.fieldsDisplay}
            </div>
        <!-- ELSE -->
            <p>Aucun champ défini</p>
        <!-- ENDIF model.hasFields -->
    </div>
    <button class="btn btn-sm btn-primary edit-model" data-id="{model.id}">Modifier</button>
    <button class="btn btn-sm btn-danger delete-model" data-id="{model.id}">Supprimer</button>
</div>
<!-- END model -->