class ActorCharactermancerSheet2 extends ActorCharactermancerSheet {
    $sheet;
    instance;
    _inv;
    actor;
    element;
    activeTab = "inventory";

    constructor(main){
        super(main);

        this.actor = new Actor5e(); //Create a new actor
        //Let's give the actor some items
        System5e.tryAddToInventory_Item(this.actor, null, "dagger|phb", 1, "weapon");
        let inv = new TestInventoryElement(this.actor);
        this._inv = inv;
    }
    preRender(){
        ActorCharactermancerSheet2.instance = this;
        ActorCharactermancerSheet.characterName = null;
        //if(!!charInfo?.character?.about?.name?.length){ActorCharactermancerSheet.characterName = charInfo.character.about.name;}
        const tabSheet = this._tabSheet?.$wrpTab;
        if (!tabSheet) { return; }
        tabSheet.empty();

        const wrapper = $$`<div class="ve-flex-col w-100 h-100 px-1 pt-1 overflow-y-auto ve-grow veapp__bg-foundry"></div>`;
        wrapper.appendTo(tabSheet);
        const sheet = $$`<div class="c5e dnd5e sheet actor character" ></div>`;
        sheet.appendTo(wrapper);
        this.$sheet = sheet;
        C5e_Inventory.setupListeners();

        System5e.addHookBase("item_update", (p, collectionId) => {
            console.log("hook fired");
            this.render();
        });
    }

    render(charInfo){
        
        if(!this.$sheet){this.preRender();}
        let parentElement = this.$sheet; //Should be a jquery object

        const data = this.actor;
        let template = new LoadTemplate(parentElement, "character-sheet", data);
        template.createAndCompile((innerHTML)=>{
            let innerElement = $$`${innerHTML}`;
            if(this.element){ //If we have rendered the sheet once already
                //this.removeAllListeners();
                
                this._replaceHTML(this.element, innerElement);
                this.element = innerElement;
            }
            else { //First render
                
                this.element = innerElement;
                this.element.appendTo(parentElement);
            }

            this.navigation_switchTab(this.activeTab); //Go to a tab
            this.activateListeners();
            this._inv.activateListeners(parentElement);
        });
    }

    activateCoreListeners(){
        this.activateTabNavigation("inventory");
    }
    activateListeners(){
        //Make navigation respond to being clicked
        const nav = this.$sheet.find(".sheet-navigation.tabs");
        nav.click(evt=>{
            const targetTab = evt.target.getAttribute("data-tab");
            this.navigation_switchTab(targetTab);
        });
    }

    navigation_switchTab(activeTabName=null){

        //Choose an open tab name if none was specified
        if(activeTabName==null){
            const nav_tabs = this.$sheet.find(".sheet-navigation.tabs > [data-tab]");
            activeTabName = nav_tabs.eq(0).attr("data-tab");
        }

        //Disable all tabs
        let nav_tabs = this.$sheet.find(".sheet-navigation.tabs > [data-tab]");
        let tabDivs = this.$sheet.find(".sheet-body > .tab");
        nav_tabs.toggleClass("active", false);
        tabDivs.toggleClass("active", false);
        //Enable the specific tab we want open
        nav_tabs = this.$sheet.find(`.sheet-navigation.tabs > [data-tab="${activeTabName}"]`);
        tabDivs = this.$sheet.find(`.sheet-body > .tab[data-tab="${activeTabName}"]`);
        nav_tabs.toggleClass("active", true);
        tabDivs.toggleClass("active", true);

        this.activeTab = activeTabName;
    }

    async _renderOuter(){

    }
    /**
   * Render the inner application content
   * @param {object} data         The data used to render the inner template
   * @returns {Promise<jQuery>}   A promise resolving to the constructed jQuery object
   * @private
   */
    async _renderInner(data){
        
    }
    /**
   * Customize how inner HTML is replaced when the application is refreshed
   * @param {jQuery} element      The original HTML processed as a jQuery object
   * @param {jQuery} html         New updated HTML as a jQuery object
   * @private
   */
    _replaceHTML(element, html){
        return element.replaceWith(html);
    }
    _injectHTML(html){

    }
}

class TestInventoryElement {
    actor;
    constructor(actor, rootDiv){
        this.actor = actor;
    }

    async getItem(collectionId){
        return this.actor.getItemByCollectionId(collectionId);
    }

    activateListeners(rootDiv){
        //We have to delete the previous click listener, if it exists
        rootDiv.find(".item-action[data-action]").off("click").on("click", event => {
            this._onAction(event.currentTarget, event.currentTarget.dataset.action, { event });
        });
    }

    async _onAction(target, action, {event} = {}){
        event.stopPropagation();
        event.preventDefault();
        const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
        const item = itemId != null? await this.getItem(itemId) : null; //item-id is the collectionId, unique per item in the inventory
        switch(action){
            case "create":
                //TODO: Make sure we are not a container also
                return this._onCreate(target);
            case "delete":
                this._onDelete(item, {shouldRemoveAdvancements:true});
                return;
            case "edit":
                //Get the ui object for the entire item
                C5e_Inventory.tryOpenEditWindow(this.actor, item, item.itemUid, "item", item.collectionId);
                return;
            case "equip":
                return item.update({"system.equipped": !item.system.equipped});
            default: break;
        }
    }

     /**
   * Create a new item.
   * @param {HTMLElement} target  Button or context menu entry that triggered this action.
   * @returns {Promise<Item5e>}
   */
    async _onCreate(target){
        const {type, ...dataset} = (target.closest(".spellbook-header") ?? target).dataset;
        delete dataset.action;
        delete dataset.tooltip;

        if(type == null){console.error("Type is null! Did you forget to create a dataset?");}
        // Check to make sure the newly created class doesn't take player over level cap
        /* if ( type === "class" && (this.actor.system.details.level + 1 > CONFIG.DND5E.maxLevel) ) {
            const err = game.i18n.format("DND5E.MaxCharacterLevelExceededWarn", {max: CONFIG.DND5E.maxLevel});
            ui.notifications.error(err);
            return null;
        } */
  
        const itemData = {
            name: `New ${type.capitalizeEachWord()}`,//game.i18n.format("DND5E.ItemNew", {type: game.i18n.localize(CONFIG.Item.typeLabels[type])}),
            type,
            system: structuredClone({...dataset})//foundry.utils.expandObject({ ...dataset })
        };
        delete itemData.system.type;
        //return this.actor.createEmbeddedDocuments("Item", [itemData]);
        return this.actor.createEmbeddedDocuments("item", [itemData]);
    }

    async _onDelete(item, options={}){
        //Remove the item from the actor's inventory
        this.actor.removeEmbeddedDocuments("item", [item]);
    }
}

