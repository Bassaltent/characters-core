<div class="panel">
    <div class="panel-heading">
        <h3>Gestion des modèles de personnages</h3>
    </div>
    <div class="panel-body">
        <button class="btn btn-primary" id="addModel">Ajouter un modèle</button>
        <div id="modelsContainer">
            <!-- Liste des modèles sera remplie dynamiquement -->
        </div>
    </div>
</div>

<script type="text/template" id="modelTemplate">
    <div class="model">
        <h4><%- name %></h4>
        <p>Fields: <%- JSON.stringify(fields) %></p>
    </div>
</script>
