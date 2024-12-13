class BaseSheet {
    _entity;
    cssClass; //String
    concealDetails; //boolean
    get entity(){return this._entity;}
    set entity(value){this._entity = value;}

    /**
     * Render the edit window for this sheet
     * @param {boolean} force
     * @param {string} templateName
     */
    render(force, templateName){
        console.log("to edit: ", entity);
        const windowHeader = this.windowHeader();
        let window_content = $$`<section class="window-content"></section>`
        let handle = this.windowDragHandle();
        let window = $$`<div class="c5e app window-app sheet item" style="z-index: 110; width: 550px; height: 500px; left: 400px; top: 50px;">${windowHeader}${window_content}${handle}</div>`;
        this.element = window;
        $("body").append(this.element);

        if(!!templateName){templateName = this.entity.entityType;}

        this.cssClass = "editable";
        this.concealDetails = false;//!game.user.isGM && (this.document.system.identified === false)
        let contentTemplate = new LoadTemplate(window_content, "parts/edit/" + templateName, this.entity);
        contentTemplate.create(()=>{
            this.navigation_switchTab(this.activeTab);
            this.setupListeners(window_content);
        });
    }
}
class ItemSheet extends BaseSheet {
    
    itemType;
    get item(){return this.entity();}
    set item(value){this.entity(value);}


    /**
     * Render the edit window for this sheet
     * @param {boolean} force
     */
    render(force){
        super.render(force, this.itemType);
    }
}