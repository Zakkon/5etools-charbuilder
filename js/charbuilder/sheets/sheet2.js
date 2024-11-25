class ActorCharactermancerSheet2 extends ActorCharactermancerSheet {
    $sheet;
    instance;
    _inv;
    actor;
    element;
    activeTab = "features";

    constructor(main){
        super(main);
        ActorCharactermancerSheet2.instance = this;

        //Let's give the actor some items
        //System5e.tryAddToInventory_Item(this.actor, null, "dagger|phb", 1, "weapon");

        //Let's try adding a class feature to the actor
        //First, let's get a class
        /* let cls = new Class5e("barbarian_phb");
        //Let's try to add the class to the sheet as well
        System5e.tryAddToInventory(this._actor, cls, "class", {doNotRender:true});
        //Let's get the first class feature
        let f = cls.classFeatures[0];
        ClassFeature5e.verifySystemData(f.hash, cls.name, cls.source).then(() => {
            let featureItem = new ClassFeature5e(f.hash, cls.name, cls.source, null, false);
            System5e.tryAddToInventory(this._actor, featureItem, "active", {doNotRender:true});
        }); */
        //let ent = CharacterBuilder.getEntityByUid("optionalfeature", {uid:"archery_phb"});
        //console.log("ARCHERY:", ent);
        this.setup(main._actor);
    }
    setup(actor){
        this.actor = actor; //Create a new actor
        /* let hash = "archery_phb";
        OptionalFeature5e.verifySystemData(hash).then(() => {
            let featureItem = new OptionalFeature5e(hash, null, false);
            console.log(featureItem);
            
            System5e.tryAddToInventory(actor, featureItem, "passive", {doNotRender:true});
        }); */
        /* let hash = UrlUtil.URL_TO_HASH_GENERIC({name:"acid (vial)", source:"phb"});
        Item5e.verifySystemData(hash).then(() => {
            let item = new Item5e(hash, 1, null, false);
            System5e.tryAddToInventory(actor, item, "weapon", {doNotRender:true});
        }); */

        let inv = new TestInventoryElement(this.actor);
        this._inv = inv;
    }
    preRender(){
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
        System5e.addHookBase("actor_update", (p, collectionId) => {
            console.log("actor hook fired");
            this.render();
        });
    }

    render(){
        
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

            this._postRender();

            this.navigation_switchTab(this.activeTab); //Go to a tab
            this.activateListeners();
            this._inv.activateListeners(parentElement);
        });
    }

    _postRender(){
        //Find spell slot markers
        const markers = this.element.find(".spellSlotMarker");
        
        //Insert spell slots
        for(let markerDiv of markers){
            //get grandparent
            let grandparent = markerDiv.parentNode.parentNode;
            //Get some data from the parent
            const dataset = grandparent.dataset;
            //lets say lvl 1 has 2 spell slots
            let contents = "";
            if(dataset.preparationMode != "innate" || dataset.level < 1){
                //We now have to get the actual category of the inventory, and from there get max & current spell slots
                const sectionInfo = this.actor.spellbook[dataset.level];
                const maxSpellSlots = isNumeric(sectionInfo.slots)? sectionInfo.slots : 0;
                const spellSlotsRemaining = isNumeric(sectionInfo.uses)? sectionInfo.uses : 0;
                for (let i = 1; i <= maxSpellSlots; i++) {
                    if (i <= spellSlotsRemaining) {
                        contents += `<span class="dot"></span>`;
                    }
                    else {
                        contents += `<span class="dot empty"></span>`;
                    }
                }
            }
            $(markerDiv).html(contents);
        }
    }

    loadFromState(stateMeta){
        if(stateMeta==null){return;}
        this._meta = stateMeta;
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
        this._inv._onLeaveTab(this.$sheet.find(".sheet-body > .tab.active"));
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
    _expanded = [];
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
                C5e_Inventory.tryOpenEditWindow(this.actor, item, item.uid, item.entityType, item.collectionId);
                return;
            case "equip":
                return item.update({"system.equipped": !item.system.equipped});
            case "expand":
                return this._onExpand(target, item);
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

    _isExpanded(collectionId){return this._expanded.includes(collectionId);}
    _unsetExpanded(collectionId){this._expanded.splice(this._expanded.indexOf(collectionId), 1);}
    _setExpanded(collectionId){this._expanded.push(collectionId);}
    async _onExpand(target, item){
        const li = target.closest("[data-item-id]");
        //First, check if this item is already expanded
        if ( this._isExpanded(item.collectionId) ) {
            const summary = $(li.querySelector(".item-summary"));
            summary.slideUp(200, () => summary.remove());
            this._unsetExpanded(item.collectionId);
        } else {
            const chatData = {description: JSON.stringify(item)
                //item.system.description.value
            };
            let template = new LoadTemplate(null, "parts/item-summary", chatData);
            template.createAndCompile((innerHTML)=>{
                const summary = $$`${innerHTML}`;
                $(li).append(summary.hide());
                summary.slideDown(200);
                this._setExpanded(item.collectionId);
            });
        }
    }

    async _onLeaveTab(tab){
        tab.find(".item-summary").remove(); //Remove all active summaries
        this._expanded = []; //Clear expanded
    }
}

