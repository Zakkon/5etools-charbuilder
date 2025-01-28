class C5e_Inventory{
    rootElement;
    summary;
    constructor(){

    }
    init(){
        this.categories = {};
        this.rootElement = $$`<ol class="items-list inventory-list"></ol>`;
        this.summary = new C5e_InventoryItemSummary(this);
    }
    static quickRenderHbs(text, data){
        var template = Handlebars.compile(text);
        return template(data);
    }
    createItemElement(item, quantity, collectionId, category){
        this.elementsInCreation++;
        console.log("start creating", item.name);
        if(quantity == null){quantity = 1;}
        let element = new C5e_InventoryItem(this, item, quantity, collectionId, category);
        element.render().then(el=>{element.addTo(category); this.elementsInCreation--; console.log("end creating", item.name);});
    }
    static setupListeners(){
        $(`.item-controls .item-action`).on("click", function(e) {
            e.preventDefault();
            let targ = e.currentTarget;
            //Get ID
            let gp = targ.parentElement.parentElement;
            //Get the property
            let action = targ.getAttribute("data-action");
            let itemID = gp.getAttribute("data-item-id");
            if(action == "itemDelete"){
                C5e_Inventory.deleteItem(itemID);
            }
            //console.log("Button clicked", action, itemID, targ);
        });
    }
    static deleteItem(id){
        $(`.item-list .item[data-item-id=${id}]`).remove();
    }
    
    elementsInCreation = 0;
    getCategory(categoryId){
        return this.categories[categoryId];
    }
    clearCategories(){
        console.error("clear categories");
        for(let c in this.categories){
            this.getCategory(c).clear();
        }
    }

    expandSummaryOn(itemUi){
        this.summary.adaptTo(itemUi);
    }

    activateListeners(){
    }

    //#region Editing
    static _editedCollectionUids = [];
    /**
     * Opens an edit window for the specified entity (must be in the actor's inventory)
     * @param {Actor5e} actor
     * @param {Entity5e} entity=null
     * @param {string} uid uid of the entity. Found in entity.uid
     * @param {string} type Entity type. Found in entity.entityType
     * @param {string} collectionId unique item collection id for this specific entity, given when added to the inventory of the actor. Found in entity.collectionId
     */
    static openEditWindow(actor, entity=null, uid, type, collectionId){
        if(C5e_Inventory._editedCollectionUids.includes(collectionId)){ return;} //We are already editing this item!
        C5e_Inventory._editedCollectionUids.push(collectionId);
        if(!entity){entity = actor.getItemByCollectionId(collectionId);}
        let window = new EntitySheet5e(actor, uid, entity, type, collectionId);
        window.render();
    }
    static closeEditWindow(window, collectionId){
        if(!C5e_Inventory._editedCollectionUids.includes(collectionId)){return;}
        C5e_Inventory._editedCollectionUids.splice(C5e_Inventory._editedCollectionUids.indexOf(collectionId), 1);
        window.close();
    }
    //#endregion

    //#region Classes
    _myClasses = [];
    addClass(info){
        if(info.targetLevel == undefined){info.targetLevel = 1;} //Not sure why this appears to be undefined upon first time user picks a class
        this._myClasses.push(info);
        console.log("Added class", info.cls.name);
        this._handleClassLevelChange(info, 0, info.targetLevel);
    }
    removeClass(info){
        //This is not really secure, as one may in theory have multiple instances of the same class on oneself, but it will do for now
        //TODO: compare index of classes to make sure they are the same one
        const hash = `${info.cls.name}|${info.cls.source}`.toLowerCase();
        let loopBreaker = false;
        let toRemove = null;
        for(let i = 0; i < this._myClasses.length && !loopBreaker; ++i){
            const c = this._myClasses[i];
            const hash2 = `${c.cls.name}|${c.cls.source}`.toLowerCase();
            if(hash == hash2){
                loopBreaker = true; //End loop
                toRemove = c;
                this._myClasses.splice(i, 1); //Remove this from the array
            }
        }
        this._handleClassLevelChange(toRemove, toRemove.targetLevel, 0);
    }
    getActiveClasses(){

    }
     /**
     * @param {{cls:Class, targetLevel:number, propIxClass:string, propIxSubclass:string, isPrimary:boolean, isDeleted}[]} newClasses
     */
    matchClassChanges(newClasses){
        let removed = [];
        let added = [];
        let common = [];
        const oldClasses = this._myClasses;
        //Check to see if there are missing classes in the new ones
        for(let old of oldClasses){
            const hash = `${old.cls.name}|${old.cls.source}`.toLowerCase();
            const matches = newClasses.filter(c => {
                const hash2 = `${c.cls.name}|${c.cls.source}`.toLowerCase();
                return hash == hash2 || c.isDeleted;
            });
            if(matches.length < 1){removed.push(old);} //Mark this existing class as being missing in the new ones (it was removed)
            else{common.push({old: old, new:matches[0]});} //Add this to the common pile, they will be compared later
        }
        //Check to see if there are any new classes added
        for(let newClass of newClasses){
            const hash = `${newClass.cls.name}|${newClass.cls.source}`.toLowerCase();
            const matches = oldClasses.filter(c => {
                const hash2 = `${c.cls.name}|${c.cls.source}`.toLowerCase();
                return hash == hash2;
            });
            if(matches.length < 1 && !newClass.isDeleted){added.push(newClass);} //Mark this existing class as being missing in the new ones (it was removed)
        }

        //Check to see which of the common classes have been altered by the new one
        let altered = [];

        return {removed:removed, added:added, altered:altered};
    }
    /**
     * @param {{cls:Class, targetLevel:number, propIxClass:string, propIxSubclass:string, isPrimary:boolean, isDeleted}[]} newClasses
     */
    handleClassChanges(newClasses){
        const {removed, added, altered} = this.matchClassChanges(newClasses);

        //Handle removing classes
        console.log("classes to remove", removed);
        for(let c of removed){
            this.removeClass(c);
        }

        //Handle adding classes
        for(let c of added){
            //For now, just make a new collectionId
            const colId = System5e.createUniqueID();
            c.collectionId = colId;
            this.addClass(c);
        }
        
    }
    /**
     * @param {{cls:Class}} info
     * @param {number} from
     * @param {number} to
     */
    _handleClassLevelChange(info, from, to){
        if(to == from){return;}
        const upgrade = to > from;
        if(upgrade){
            let itemsToVerify = [];
            for(let i = from+1; i <= to; ++i){
                //Get unverified class features, combine them into an array, then verify them later
                itemsToVerify = itemsToVerify.concat(this._getUnverifiedClassFeaturesForLevel(info, i, true));
            }
            
            //Quickly create collecitonIds for the items we are verifying. Those ids will be given to the items
            for(let i = 0; i < itemsToVerify.length; ++i){itemsToVerify[i].collectionId = System5e.createUniqueID();}

            //Once we have a list of all the items to verify, begin verifying them
            this._awaitClassFeatureVerification(itemsToVerify).then(()=>{
                //Now we need to go in and make sure the features that were created are tied to our class
                //We can find the features using the collectionIds we created earlier
                for(let fItem of itemsToVerify){
                    //Find the class feature in our inventory
                    let matches = System5e.getEntitiesByProps([{property: "collectionId", value: fItem.collectionId}]);
                    //There should be only one match
                    let m = matches[0];
                    //Now we can give that feature some info tying it to our class
                    m.setDependency("class", C5e_Inventory.dependencyKey_ClassFeature(info.cls, fItem.entity.level));
                }
                ActorCharactermancerSheet.c5e_inventory.rebuildUi();
            });
        }
        else{
            for(let i = from; i > to; --i){
                this._removeClassFeaturesForLevel(info, i);
            }
        }
    }
    /**
     * Returns unverified class features from the class and level provided
     * @param {{cls:{classFeatures:{level:number, hash:string, name:string}}}} info
     * @param {number} level
     */
    _getUnverifiedClassFeaturesForLevel(info, level){
        let itemsToVerify = [];
        for(let f of info.cls.classFeatures){
            if(f.level != level){continue;}
            //Try adding this class feature to the inventory
            //Check if inventory already has an object with this hash
            if(System5e.getEntitiesByProp("hash", f.hash).length > 0){ console.log(`item ${f.name} already exists`); continue;}
            //Instead of verifying features async right now, store the features in an array and verify them together as a promise
            itemsToVerify.push({entity:f, cls:info.cls});
        }
        return itemsToVerify;
    }
    _removeClassFeaturesForLevel(info, level){
        
        let matches = System5e.getEntitiesByProps([{property: "dependsOnType", value: "class"},
            {property: "dependsOn", value: C5e_Inventory.dependencyKey_ClassFeature(info.cls, level)}]);
        for(let m of matches){
            System5e.removeFromInventory(CharacterBuilder.instance._actor, m.collectionId);
        }
    }
    static dependencyKey_ClassFeature(cls, level){
        return `${cls.name}_${cls.source}_${level}`.toLowerCase();
    }
    /**
     * Verifies the existance of the .system data for the class feature, and imports it if it does not. It then creates a ClassFeature5e and adds it to the inventory
     * @param {{entity:{hash:string}, cls:{name:string, source:string}, collectionId:string}[]} itemsToVerify
     */
    async _awaitClassFeatureVerification(itemsToVerify){
        return new Promise(async (resolve, reject) => {
            for(let fItem of itemsToVerify){
                //Check if we already have entities with that class feature's hash in our inventory
                //If so, no need to add it to our inventory, that would be a duplicate
              if(System5e.getEntitiesByProp("hash", fItem.entity.hash).length > 0){ continue; }
              //Check if the class feature in our database with that hash has had the .system property imported
              //If not, it will do the importing
              await ClassFeature5e.verifySystemData(fItem.entity.hash, fItem.cls.name, fItem.cls.source);
              //Create a new feature item ana add it to the inventory. It will set its .system property using the database
              let featureItem = new ClassFeature5e(fItem.entity.hash, fItem.cls.name, fItem.cls.source, fItem.collectionId);
              System5e.tryAddToInventory(CharacterBuilder.instance._actor, featureItem);
            }
            resolve();
        });
    }
    //#endregion

    //#region Items
    //#endregion

    //#region Spellbook
    //#endregion
}
class C5e_InventoryItem {
    parent;
    element;
    _template;
    collectionId;
    itemUid;
    summary;
    summaryOn;
    static _weightUnit = "lbs.";
    constructor(parent, item, quantity, collectionId, category){
        this.parent = parent;
        this.category = category;
        this.item = item;
        this.quantity = quantity;
        this.collectionId = collectionId;
        this.itemUid = collectionId.split("__")[0];

        System5e.addHookBase("item_update", (p, collectionId) => {
            if(collectionId != this.collectionId){return;}
            let item5e = System5e.getEntityByCollectionId(this.collectionId);
            //this.element.find(`.item-name > h4`).text(item5e.prop("name"));
            this.render(true);
        });
    }
    async render(isRefresh=false){
        if(!isRefresh){console.error("Create Item Element", this.item.name);}
        return new Promise((resolve, reject) => {
            //Create context
            let totalWeight = this.item.weight * this.quantity;
            let ctx = {totalWeight:totalWeight};
            let tmp = new LoadTemplate(null, "inventory-item", {item:this.item, collectionId: this.collectionId, ctx:ctx, weightUnit:C5e_InventoryItem._weightUnit});
            tmp.createAndCompile((html) => {
                if(isRefresh){
                    //Instead of re-creating this element, just overwrite the inner html with the inner html of a brand new temporary element
                    const tempEl = $$`${html}`;
                    this.element.html(tempEl.html());
                }  
                else{this.element = $$`${html}`;}

                if(this.item.type == "classFeature"){this.element.find(`[data-action="equip"]`).css("display", "none");}
                resolve();
            });
        });
    }
    addTo(category){
        this.element.appendTo(category.itemList);
        this.createEventListeners();
    }
    createEventListeners(){
        //Clicking on one of the action buttons
        this.element.find(".item-action").on("click", (e) => {
            e.preventDefault();
            let targ = e.currentTarget;
            //Get ID
            let gp = targ.parentElement.parentElement;
            //Get the property
            let action = targ.getAttribute("data-action");
            //let itemID = gp.getAttribute("data-item-id");
            if(action == "itemDelete"){
                this.element.remove();
            }
            else if(action == "itemEdit"){
                C5e_Inventory.openEditWindow(this.itemUid, this.type, this.collectionId);
            }
            else if(action == "equip"){
                $(gp).removeClass("equipped");
                //If equip, add class again
                let item = this.getItem();
                item.equipped = !item.equipped;
                if(item.equipped){$(gp).addClass("equipped");}
            }
            //console.log("Button clicked", action, itemID, targ);
        });
        this.element.find(".item-name").on("click", (e) => {
            e.preventDefault();
            //Enable summary on us
            if(!this.summaryActive){ this.parent.expandSummaryOn(this);}
            else { this.parent.summary.close(); }

        });
    }
    toggleSummary(active){
        this.summaryActive = active;
    }
    getItem(){
        return System5e.getEntityByCollectionId(this.collectionId);
    }

    
}
class C5e_InventoryItemSummary {
    element;
    attachedItemUi;
    constructor(parent){}
    adaptTo(itemUi){
        if(this.element){this.close();}
        let item = //this.getItemByID(itemUi.itemUid);
        System5e.getEntityByCollectionId(itemUi.collectionId);
        if(!item){console.error("could not find item with itemUid", itemUi.itemUid); return;}
        this.element = $$`<div class="item-summary"></div>`;
        for(let e of item.entries){
            let entry = $$`<p>${e}</p>`;
            this.element.append(entry);
        }
        console.log("item", item);
        //const properties = $$`<div class="item-properties"></div>`;
        let item5e = System5e.getEntityByCollectionId(itemUi.collectionId);
        //item5e.setProp("system.type.value", "simpleR");
        let overwriteVal = item5e.prop("system.type.value");
        console.log("PROP", overwriteVal);
        $$`<span>${overwriteVal}</span>`.appendTo(this.element);
        this.element.appendTo(itemUi.element);
        itemUi.toggleSummary(true);
        this.attachedItemUi = itemUi;
    }
    close(){
        this.attachedItemUi.toggleSummary(false); this.element.remove(); this.element = null; this.attachedItemUi = null;
    }
    getItemByID(itemUid){
        const itemDatas = CharacterBuilder.instance._data.item;
        const foundItem = ActorCharactermancerEquipment.findItemByUID(itemUid, itemDatas);
        return foundItem;
    }
}

class BaseSheet {

    constructor(object){
        /**
        * The object target which we are using this form to modify
        * @type {*}
        */
        this.object = object;
    }

    
    /**
     * Calls this.object.update and passes along formData
     * @param {any} event
     * @param {object} formData
     */
    async _updateObject(event, formData) {
        //if (!this.object.id){return;}
        return this.object.update(formData);
    }

    _getSubmitData(updateData={}){

    }

    //#region Event Listeners
    /**
     * Handle changes to an input element, submitting the form if options.submitOnChange is true.
     * Do not preventDefault in this handler as other interactions on the form may also be occurring.
     * @param {Event} event  The initial change event
     * @protected
     */
    async _onChangeInput(event) {
        // Do not fire change listeners for form inputs inside text editors.
        if (event.currentTarget.closest(".editor")) return;

        // Handle changes to specific input types
        const el = event.target;
        if ((el.type === "color") && el.dataset.edit) this._onChangeColorPicker(event);
        else if (el.type === "range") this._onChangeRange(event);

        // Maybe submit the form
        if (this.options.submitOnChange) {return this._onSubmit(event);}
    }
    //#endregion
}

class EntitySheet5e extends BaseSheet {
    collectionId;
    itemUid;
    type;
    element;
    _entity;
    editable = true;
    contentElement;
    tab_details;
    rectWidth = 550;
    rectHeight = 500;
    zIndex = 110;
    rectLeft = 400;
    rectTop = 50;
    startX;
    startY;
    startW;
    startH;
    itemType; //Used to know what category of item this is
    /**
     * The entity being edited
     * @returns {Entity5e}
     */
    get entity(){return this._entity;}
    set entity(value){this._entity = value;}
    get system(){return this._entity.system;}
    get config(){return CONFIG.DND5E;}
    get isCostlessAction(){return this.system?.activation?.type in DND5E.staticAbilityActivationTypes;}
    get isCrewed(){return this.system.activation?.type === "crew";}
    get isFormulaRecharge(){ !!DND5E.limitedUsePeriods[this.system.uses?.per]?.formula;}
    get isPhysical(){return this.system.quantity != null;}
    get hasScalarRange(){return this.system.range?.units in CONFIG.DND5E.movementUnits;}
    get hasScalarDuration(){return this.system.duration?.units in CONFIG.DND5E.scalarTimePeriods;}
    get hasScalarTarget(){return this.system.target?.template?.type || ![null, "", "self"].includes(this.system.target?.affects?.type);}
    get labels(){return this.entity.labels;} //Lazy shortcut before we move all labels rendering code to this class
    /**
     * @param {Actor5e} actor
     * @param {string} uid
     * @param {Entity5e} item
     * @param {string} type
     * @param {string} collectionId
     * @returns {EntitySheet5e}
     */
    constructor(actor, uid, item, type, collectionId){
        super(item);
        this.actor = actor;
        this.collectionId = collectionId;
        this.itemUid = uid;
        this.type = type;
        this.activeTab = "details";
        this._entity = item;
        if(type == "item"){this.itemType = this.system.type.value;}
        this.boundUpdateFunc = this._onItemUpdate.bind(this);
        this.user = {isGM:true};

        System5e.addHookBase("item_update", this.boundUpdateFunc);
    }
    _onItemUpdate(p, collectionId){
        this._renderUpdate();
    }

    /**
     * Renders the edit window on screen
     */
    render(){
        console.log("to edit: ", this.entity);
        const windowHeader = this.windowHeader();
        this.contentElement = $$`<div></div>`;
        let window_content = $$`<section class="window-content">${this.contentElement}</section>`;
        let handle = this.windowDragHandle();
        let window = $$`<div class="c5e app window-app sheet item" style="z-index: 110; width: 550px; height: 700px; left: 400px; top: 50px;">${windowHeader}${window_content}${handle}</div>`;
        this.element = window;
        $("body").append(this.element);

        let templateName = this.type;
        switch(this.type){
            case "feature":
                templateName = "feat";
                if(this.entity.featureType == "class"){templateName = "class";}
                else if(this.entity.featureType == "subclass"){templateName = "subclass";}
                else if(this.entity.featureType == "race"){templateName = "race";}
                else if(this.entity.featureType == "background"){templateName = "background";}
                break;
            case "item":
                templateName = this.itemType;
                break;
            default: break;
        }

        this.templateName = templateName;
        this.cssClass = "editable";
        this.concealDetails = false;//!game.user.isGM && (this.document.system.identified === false)
        this._renderUpdate();
    }
    _renderUpdate(){
        let contentTemplate = new LoadTemplate(this.contentElement, "parts/edit/" + this.templateName, this); //Important to set this sheet, not entity, as the context

        const enrichmentOptions = {
            relativeTo: this.entity, //rollData: this.rollData
        }
        /* TextEditor.enrichHTML(item.system.description?.value ?? "", enrichmentOptions).then(result => {
            this.enriched = {description: result};
        }) */
        this.enriched = {
            description: TextEditor.enrichHTML(this.entity.system.description?.value ?? "", enrichmentOptions),
        }

        contentTemplate.createAndCompile((innerHTML)=>{
            let innerElement = $$`${innerHTML}`;
            this._replaceHTML(this.contentElement, innerElement);
            this.contentElement = innerElement;
            this.navigation_switchTab(this.activeTab);
            this.setupListeners(this.contentElement);
        });
    }
    close(){
        //Remove hooks
        System5e.removeHookBase("item_update", this.boundUpdateFunc);
        //Fire one last item_update? (incase we clicked on close instead of clicking elsewhere, which normally triggers input fields "change" events)
        this.element.remove(); this.element = null;
    }
    navigation_switchTab(activeTabName=null){

        //Choose an open tab name if none was specified
        if(activeTabName==null){
            const nav_tabs = this.element.find(".sheet-navigation.tabs > [data-tab]");
            activeTabName = nav_tabs.eq(0).attr("data-tab");
        }

        //Disable all tabs
        let nav_tabs = this.element.find(".sheet-navigation.tabs > [data-tab]");
        let tabDivs = this.element.find(".sheet-body > .tab");
        nav_tabs.toggleClass("active", false);
        tabDivs.toggleClass("active", false);
        //Enable the specific tab we want open
        nav_tabs = this.element.find(`.sheet-navigation.tabs > [data-tab="${activeTabName}"]`);
        tabDivs = this.element.find(`.sheet-body > .tab[data-tab="${activeTabName}"]`);
        nav_tabs.toggleClass("active", true);
        tabDivs.toggleClass("active", true);

        this.activeTab = activeTabName;
    }
    windowHeader(){
        const closeBtn = $$`<a class="header-button control"><i class="fas fa-times"></i>Close </a>`;
        closeBtn.on("click", (e) => {
            //Close window
            C5e_Inventory.closeEditWindow(this, this.collectionId);
        });
        const header = $$`<header class="window-header flexrow draggable resizable">
        <h4 class="window-title">Edit Item</h4>
        ${closeBtn}</header>`;
        return header;
    }
    windowDragHandle(){
        let handle = $$`<div class="window-resizable-handle"><i class="fas fa-arrows-alt-h"></i></div>`;

        handle.on("mousedown", (e)=>{
            this.resizeDragStart(e);
            $("body").on("mousemove", (e)=>{this.resizeDragMove(e)});
        });
        $("body").on("mouseup", (e)=>{
            $("body").off("mousemove");
        });

        return handle;
    }
    resizeDragStart(e){
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startW = Number.parseInt((this.element.css("width")).replace(/\D/g,''));
        this.startH = Number.parseInt((this.element.css("height")).replace(/\D/g,''));
    }
    resizeDragMove(e){
        let x = e.clientX;
        let y = e.clientY;
        let dx = x - this.startX;
        let dy = y - this.startY;
        this.element.css("width", `${dx+this.startW}px`);
        this.element.css("height", `${dy+this.startH}px`);
    }
    setRectSize(width, height){
        this.element.css("width", `${width}px`);
        this.element.css("height", `${height}px`);
    }
    setStyle(){
        let str = `z-index:${this.zIndex} width:${this.rectWidth} height:${this.rectHeight} left:${this.rectLeft} top:${this.rectTop}`;
        this.element.css(str);
    }
    
    setupListeners(html){

        //if ( !this.isEditable ) return;
        //html.on("change", "input,select,textarea", this._onChangeInput.bind(this));

        //Inside .editor-content, find child objects (of which only get created once the edit button has been clicked)
        html.find(".editor-content[data-edit]").each((i, div) => this._activateEditor(div));

        //Make navigation respond to being clicked
        html.find(".sheet-navigation.tabs").click(evt=>{
            const targetTab = evt.target.getAttribute("data-tab");
            this.navigation_switchTab(targetTab);
        });

        html.find(".damage-control").click(this._onDamageControl.bind(this));

        //Input
        for(let el of html.find("input")){
            //Make sure the element has a "name" attribute. This is needed to know what prop to send the value to
            if(!el.name){continue;}
            $(el).on("change", (e) => {
                console.log("setprop", el.name, e.target.value);
                this.setProp(el.name, e.target.value);
            });
            //Setting the name manually seems neccesary due to some strange bug
            if(el.name == "name"){el.value = this.entity.name;}
        }
        //Select
        for(let el of html.find("select")){
            //Make sure it has a "name" attribute
            if(!el.name){continue;}
            $(el).on("change", (e) => {
                console.log("setprop", el.name, e.target.value);
                this.setProp(el.name, e.target.value);
            });
        }

        html.find(".description-edit").click(event => {
            this.editingDescriptionTarget = event.currentTarget.dataset.target;
            this._renderUpdate();
        });
    }

    /**
     * Sets the prop of the entity, then fires item update, then fires render update
     * @param {string} prop example: "system.activation.type"
     * @param {string} value If "none", set value to null
     */
    setProp(prop, value){
        //Set the value to the item's override
        let entity = this.entity;
        if(typeof(value) == "string" && (value).toLowerCase() === "none"){value = null;}
        entity.setProp(prop, value);
        //Fire a hook to alert other UI that this item has changed
        System5e.hkItemUpdated(this.collectionId);
        //Update this UI and re-render things
        this._renderUpdate();
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

    /** @inheritDoc */
    async _onSubmit(...args) {
        //if (this._tabs[0].active === "details") this.position.height = "auto";
        //await super._onSubmit(...args);
    }
    /** @inheritDoc */
    _getSubmitData(updateData={}) {
        const formData = HelperFunctions.expandObject(super._getSubmitData(updateData));

        // Handle Damage array
        const damage = formData.system?.damage;
        if (damage && !HelperFunctions.getProperty(this.entity.overrides, "system.damage.parts")) {
        damage.parts = Object.values(damage?.parts || {}).map(d => [d[0] || "", d[1] || ""]);
        }

        // Handle properties
        if (HelperFunctions.hasProperty(formData, "system.properties")) {
        const keys = new Set(Object.keys(formData.system.properties));
        const preserve = new Set(this.entity._source.system.properties ?? []).difference(keys);
        formData.system.properties = [...filteredKeys(formData.system.properties), ...preserve];
        }

        // Check max uses formula
        const uses = formData.system?.uses;
        if ( uses?.max ) {
        const maxRoll = new Roll(uses.max);
        if ( !maxRoll.isDeterministic ) {
            uses.max = this.entity._source.system.uses.max;
            this.form.querySelector("input[name='system.uses.max']").value = uses.max;
            ui.notifications.error(game.i18n.format("DND5E.FormulaCannotContainDiceError", {
            name: game.i18n.localize("DND5E.LimitedUses")
            }));
            return null;
        }
        }

        // Check duration value formula
        const duration = formData.system?.duration;
        if ( duration?.value ) {
        const durationRoll = new Roll(duration.value);
        if ( !durationRoll.isDeterministic ) {
            duration.value = this.entity._source.system.duration.value;
            this.form.querySelector("input[name='system.duration.value']").value = duration.value;
            ui.notifications.error(game.i18n.format("DND5E.FormulaCannotContainDiceError", {
            name: game.i18n.localize("DND5E.Duration")
            }));
            return null;
        }
        }

        // Check class identifier
        if ( formData.system?.identifier && !dnd5e.utils.validators.isValidIdentifier(formData.system.identifier) ) {
        formData.system.identifier = this.entity._source.system.identifier;
        this.form.querySelector("input[name='system.identifier']").value = formData.system.identifier;
        ui.notifications.error("DND5E.IdentifierError", {localize: true});
        return null;
        }

        // Return the flattened submission data
        return foundry.utils.flattenObject(formData);
    }

    /**
   * Add or remove a damage part from the damage formula.
   * @param {Event} event             The original click event.
   * @returns {Promise<Item5e>|null}  Item with updates applied.
   * @private
   */
  async _onDamageControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if (a.classList.contains("add-damage")) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const damage = this.entity.system.damage ?? {parts:[]}; //Create parts if they don't exist yet
      return this.entity.update({"system.damage.parts": damage.parts.concat([["", ""]])});
    }

    // Remove a damage component
    if (a.classList.contains("delete-damage")) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");
      const damage = HelperFunctions.deepClone(this.entity.system.damage);
      damage.parts.splice(Number(li.dataset.damagePart), 1);
      return this.entity.update({"system.damage.parts": damage.parts});
    }
  }

  

  //#region Text Editor
  /**
   * Activate an editor instance present within the form
   * @param {HTMLElement} div  The element which contains the editor
   * @protected
   */
  _activateEditor(div) {

    // Get the editor content div
    const name = div.dataset.edit;
    const engine = "pell"; //div.dataset.engine || "tinymce";
    const collaborate = div.dataset.collaborate === "true";
    const button = div.previousElementSibling;
    const hasButton = button && button.classList.contains("editor-edit");
    const wrap = div.parentElement.parentElement;
    const wc = div.closest(".window-content");

    // Determine the preferred editor height
    const heights = [wrap.offsetHeight, wc ? wc.offsetHeight : null];
    if ( div.offsetHeight > 0 ) heights.push(div.offsetHeight);
    const height = Math.min(...heights.filter(h => Number.isFinite(h)));

    // Get initial content
    const options = {
      target: div,
      fieldName: name,
      save_onsavecallback: () => this.saveEditor(name),
      height, engine, collaborate
    };

    //if ( engine === "prosemirror" ) options.plugins = this._configureProseMirrorPlugins(name, {remove: hasButton});

    const data = this.object;

    this.editors = this.editors ?? {};
    // Define the editor configuration
    const editor = this.editors[name] = {
      options,
      target: name,
      button: button,
      hasButton: hasButton,
      mce: null,
      instance: null,
      active: !hasButton,
      changed: false,
      initial: HelperFunctions.getProperty(data, name)
    };

    // Activate the editor immediately, or upon button click
    const activate = () => {
      editor.initial = HelperFunctions.getProperty(data, name);
      this.activateEditor(name, {}, editor.initial);
    };

    if (hasButton){button.onclick = activate;}
    else {activate();}
  }
  /**
   * Creates a text editor instance, specified by a string name
   * @param {string} name
   * @param {object} options={}
   * @param {string} initialContent=""
   * @returns {EditorInstance}
   */
  async activateEditor(name, options={}, initialContent="") {
    const editor = this.editors[name];
    if ( !editor ) throw new Error(`${name} is not a registered editor name!`);
    options = HelperFunctions.mergeObject(editor.options, options);
    if ( !options.fitToSize ) options.height = options.target.offsetHeight;
    if ( editor.hasButton ) editor.button.style.display = "none";
    //Create the editor
    const instance = editor.instance = editor.mce = await TextEditor.create(options, initialContent || editor.initial);
    options.target.closest(".editor")?.classList.add(options.engine ?? "tinymce");
    editor.changed = false;
    editor.active = true;

    //Configure extensions to the editor
    if(options.engine === "pell"){
        instance.onSave = (html) => {
            let update = {}; update[name] = html; //Usually "system.description.value"
            this.entity.update(update);
            //If description was changed, make item also create a rendered version of the text (with hotlinks)
            if(name == "system.description.value"){this.entity.prepareRenderedDescription();}
            this.saveEditor(name, {remove: true});
            this.editingDescriptionTarget = null;
        }
    }

    return instance;
  }
  /**
   * Handle saving the content of a specific editor by name
   * @param {string} name           The named editor to save
   * @param {boolean} [remove]      Remove the editor after saving its content
   * @returns {Promise<void>}
   */
  async saveEditor(name, {remove=true}={}) {
    const editor = this.editors[name];
    if (!editor || !editor.instance) throw new Error(`${name} is not an active editor name!`);
    editor.active = false;
    const instance = editor.instance;
    await this._onSubmit(new Event("submit"));

    // Remove the editor
    if (remove) {
      //instance.destroy();
      editor.instance = editor.mce = null;
      if (editor.hasButton) editor.button.style.display = "block";
      //this._renderUpdate(); //Disabling this for now, to avoid double updates
    }
    editor.changed = false;
  }
  //#endregion
}

let _maxZ = 100;
let _appId = 0;
const MIN_WINDOW_WIDTH = 200;
const MIN_WINDOW_HEIGHT = 50;
class Application {
    constructor(options={}){
        this.options = HelperFunctions.mergeObject(this.constructor.defaultOptions, options);
        //Unique to every application window
        this.appId = _appId += 1;
        this._element = null;
        //Create our position
        this.position = {
            width: this.options.width,
            height: this.options.height,
            left: this.options.left,
            top: this.options.top,
            scale: this.options.scale,
            zIndex: 0
        };
        this._minimized = false;
        this._state = Application.RENDER_STATES.NONE;
        this._priorState = this._state;
    }
    static RENDER_STATES = Object.freeze({
        CLOSING: -2,
        CLOSED: -1,
        NONE: 0,
        RENDERING: 1,
        RENDERED: 2,
        ERROR: 3
      });
    static get defaultOptions(){
        return {
            title: "",
            id: "",
            classes: [],
            template:null,
        }
    }
    get id(){return this.options.id ? this.options.id : `app-${this.appId}`;};
    get template(){return this.options.template;}
    get element(){
        if(this._element){return this._element;}
        return $(`#${this.id}`);
    }
    get popOut(){return this.options.popOut??true;}
    getData(options={}){return {};}
    get title(){return this.options.title;}
    render(force=false, options={}){
        this._render(force, options).catch(err => {
            console.error(err);
        });
        return this;
    }
    async _render(force=false, options={}){
        this.options = HelperFunctions.mergeObject(this.options, options, {insertKeys: false});
        const element = this.element;
        const data = await this.getData(this.options);
        const inner = await this._renderInner(data);
        console.log("InnerHTML", inner);
        let html = inner;
        if(element.length){this._replaceHTML(element, data);}
        else{
            if(this.popOut){
                html = await this._renderOuter();
                html.find(".window-content").append(inner);
                ui.windows[this.appId] = this;
            }
            // Add the HTML to the DOM and record the element
            this._injectHTML(html);
        }
        
        if (!this.popOut && this.options.resizable) new Draggable(this, html, false, this.options.resizable);

        // Activate event listeners on the inner HTML
        this._activateCoreListeners(inner);
        //this.activateListeners(inner);
    }
    async _renderInner(data){
        let html = await this.renderTemplate(this.template, data);
        if ( html === "" ) throw new Error(`No data was returned from template ${this.template}`);
        return $(html);
    }
    /**
     * Creates an outer jquery div for the form, and makes it draggable.
     * @returns {jQuery}
     */
    async _renderOuter(){
        const classes = this.options.classes;
        const windowData = {
            id: this.id,
            classes: classes.join(" "),
            title: this.title,
            appId: this.appId,
            headerButtons: this._getHeaderButtons(),
        }
        let html = await this.renderTemplate("app/app-window", windowData);
        html = $(html);

        // Make the outer window draggable
        const header = html.find("header")[0];
        new Draggable(this, html, header, this.options.resizable);

        // Set the outer frame z-index
        if (Object.keys(ui.windows).length === 0) _maxZ = 100 - 1;
        this.position.zIndex = Math.min(++_maxZ, 9999);
        html.css({zIndex: this.position.zIndex});
        ui.activeWindow = this;

        return html;
    }
    /**
     * Add a Jquery element to the DOM's 'body' element. Can be overridden.
     * @param {jQuery} html Jquery element to add to the DOM's 'body' element
     * @private
     */
    _injectHTML(html) {
        $("body").append(html);
        this._element = html;
        html.hide().fadeIn(200);
    }
    /**
     * Replace HTML within an existing jQuery element with new content. Can be overridden.
     * @param {jQuery} element the original element
     * @param {jQuery} html the updated element
     * @private
     */
    _replaceHTML(element, html) {
        if (!element.length) return;
    
        // For pop-out windows update the inner content and the window title
        if (this.popOut) {
          element.find(".window-content").html(html);
          let t = element.find(".window-title")[0];
          if (t.hasChildNodes()) t = t.childNodes[0];
          t.textContent = this.title;
        }
    
        // For regular applications, replace the whole thing
        else {element.replaceWith(html); this._element = html;}
    }
    async renderTemplate(template, data){
        let contentTemplate = new LoadTemplate(null, template, data); //Important to set this sheet, not entity, as the context

        let promise = new Promise((resolve, reject) => {

            contentTemplate.createAndCompile((innerHTML)=>{
                //let innerElement = $$`${innerHTML}`;
                resolve(innerHTML);
            });
        });
        return promise;
    }
    async close(options={}) {
        const states = Application.RENDER_STATES;
        if (!options.force && ![states.RENDERED, states.ERROR].includes(this._state)) return;
        this._state = states.CLOSING;
    
        // Get the element
        let el = this.element;
        if (!el) return this._state = states.CLOSED;
        el.css({minHeight: 0});
    
        // Dispatch Hooks for closing the base and subclass applications
        for (let cls of this.constructor._getInheritanceChain()) {
    
          /**
           * A hook event that fires whenever this Application is closed.
           * @function closeApplication
           * @memberof hookEvents
           * @param {Application} app                     The Application instance being closed
           * @param {jQuery[]} html                       The application HTML when it is closed
           */
          Hooks.call(`close${cls.name}`, this, el); //send a hook using the name of our topmost class
        }
    
        // Animate closing the element
        return new Promise(resolve => {
          el.slideUp(200, () => {
            el.remove();
    
            // Clean up data
            this._element = null;
            delete ui.windows[this.appId];
            this._minimized = false;
            this._scrollPositions = null;
            this._state = states.CLOSED;
            resolve();
          });
        });
    }
    bringToTop() {
        const element = this.element[0];
        const z = document.defaultView.getComputedStyle(element).zIndex;
        if ( z < _maxZ ) {
          this.position.zIndex = Math.min(++_maxZ, 99999);
          element.style.zIndex = this.position.zIndex;
          ui.activeWindow = this;
        }
    }
    setPosition({left, top, width, height, scale}={}) {
        if (!this.popOut && !this.options.resizable) return; // Only configure position for popout or resizable apps.
        const el = this.element[0];
        const currentPosition = this.position;
        const pop = this.popOut;
        const styles = window.getComputedStyle(el);
        if ( scale === null ) scale = 1;
        scale = scale ?? currentPosition.scale ?? 1;
    
        // If Height is "auto" unset current preference
        if ( (height === "auto") || (this.options.height === "auto") ) {
          el.style.height = "";
          height = null;
        }
    
        // Update width if an explicit value is passed, or if no width value is set on the element
        if ( !el.style.width || width ) {
          const tarW = width || el.offsetWidth;
          const minW = parseInt(styles.minWidth) || (pop ? MIN_WINDOW_WIDTH : 0);
          const maxW = el.style.maxWidth || (window.innerWidth / scale);
          currentPosition.width = width = HelperFunctions.mathClamped(tarW, minW, maxW);
          el.style.width = `${width}px`;
          if ( ((width * scale) + currentPosition.left) > window.innerWidth ) left = currentPosition.left;
        }
        width = el.offsetWidth;
    
        // Update height if an explicit value is passed, or if no height value is set on the element
        if ( !el.style.height || height ) {
          const tarH = height || (el.offsetHeight + 1);
          const minH = parseInt(styles.minHeight) || (pop ? MIN_WINDOW_HEIGHT : 0);
          const maxH = el.style.maxHeight || (window.innerHeight / scale);
          currentPosition.height = height = HelperFunctions.mathClamped(tarH, minH, maxH);
          el.style.height = `${height}px`;
          if ( ((height * scale) + currentPosition.top) > window.innerHeight + 1 ) top = currentPosition.top - 1;
        }
        height = el.offsetHeight;
    
        // Update Left
        if ( (pop && !el.style.left) || Number.isFinite(left) ) {
          const scaledWidth = width * scale;
          const tarL = Number.isFinite(left) ? left : (window.innerWidth - scaledWidth) / 2;
          const maxL = Math.max(window.innerWidth - scaledWidth, 0);
          currentPosition.left = left = HelperFunctions.mathClamped(tarL, 0, maxL);
          el.style.left = `${left}px`;
        }
    
        // Update Top
        if ( (pop && !el.style.top) || Number.isFinite(top) ) {
          const scaledHeight = height * scale;
          const tarT = Number.isFinite(top) ? top : (window.innerHeight - scaledHeight) / 2;
          const maxT = Math.max(window.innerHeight - scaledHeight, 0);
          currentPosition.top = HelperFunctions.mathClamped(tarT, 0, maxT);
          el.style.top = `${currentPosition.top}px`;
        }
    
        // Update Scale
        if ( scale ) {
          currentPosition.scale = Math.max(scale, 0);
          if ( scale === 1 ) el.style.transform = "";
          else el.style.transform = `scale(${scale})`;
        }
    
        // Return the updated position object
        return currentPosition;
    }
    _getHeaderButtons() {
        const buttons = [
          {
            label: "Close",
            class: "close",
            icon: "fas fa-times",
            onclick: () => this.close()
          }
        ];
        for (let cls of this.constructor._getInheritanceChain()) {
    
          /**
           * A hook event that fires whenever this Application is first rendered to add buttons to its header.
           * @function getApplicationHeaderButtons
           * @memberof hookEvents
           * @param {Application} app                     The Application instance being rendered
           * @param {ApplicationHeaderButton[]} buttons   The array of header buttons which will be displayed
           */
          Hooks.call(`get${cls.name}HeaderButtons`, this, buttons);
        }
        return buttons;
    }
    static _getInheritanceChain() {
        const parents = HelperFunctions.getParentClasses(this);
        const base = this.defaultOptions.baseApplication;
        const chain = [this];
        for (let cls of parents) {
          chain.push(cls);
          if (cls.name === base) break;
        }
        return chain;
    }

    _activateCoreListeners(html) {
       /*  const el = html[0];
        this._tabs.forEach(t => t.bind(el));
        this._dragDrop.forEach(d => d.bind(el));
        this._searchFilters.forEach(f => f.bind(el)); */
    }
}
class FormApplication extends Application {
    constructor(object={}, options={}){
        super(options);
        /** The target object this form is manipulating 
        */
        this.object = object;
        this.form = null;
        this.filepickers = [];
        this.editors = [];
    }
    async _render(force, options) {

        // Identify the focused element
        let focus = this.element.find(":focus");
        focus = focus.length ? focus[0] : null;
    
        // Render the application and restore focus
        await super._render(force, options);
        if (focus && focus.name) {
          const input = this.form[focus.name];
          if (input && (input.focus instanceof Function)) input.focus();
        }
    }
    async _renderInner(...args){
        const html = await super._renderInner(...args);
        //Try to grab the form from our own element
        this.form = html.filter((i, el) => el instanceof HTMLFormElement)[0];
        if (!this.form) this.form = html.find("form")[0];
        return html;
    }
    async close(options={}) {
        const states = Application.RENDER_STATES;
        if ( !options.force && ![states.RENDERED, states.ERROR].includes(this._state) ) return;
    
        // Trigger saving of the form
        const submit = options.submit ?? this.options.submitOnClose;
        if (submit) await this.submit({preventClose: true, preventRender: true});
    
        // Close any open FilePicker instances
        for (let fp of this.filepickers) {
          fp.close();
        }
        this.filepickers = [];
    
        // Close any open MCE editors
        for ( let ed of Object.values(this.editors) ) {
          if ( ed.mce ) ed.mce.destroy();
        }
        this.editors = {};
    
        // Close the application itself
        return super.close(options);
      }

    _activateCoreListeners(html){
        super._activateCoreListeners(html);
        if(!this.form){return;}
        //if(!this.isEditable){return this._disableFields(this.form);}
        this.form.onsubmit = this._onSubmit.bind(this);
    }

    async _onSubmit(event, {updateData=null, preventClose=false, preventRender=false}={}){
        event.preventDefault();
        const states = Application.RENDER_STATES;
        //TODO MORE
        console.log("onsubmit");
        const formData = this._getSubmitData(updateData);
        //See if we should close the form
        let closeForm = this.options.closeOnSubmit && !preventClose;
        const priorState = this._state;
        if (preventRender) this._state = states.RENDERING;
        if (closeForm) this._state = states.CLOSING;

         // Trigger the object update
        try {
            await this._updateObject(event, formData);
        }
        catch(err) {
            console.error(err);
            closeForm = false;
            this._state = priorState;
        }
        this._submitting = false;
        if (preventRender) this._state = priorState;
        if(closeForm){await this.close({submit:false, force:true});}
        //Return the form data
        return formData;
    }
    _getSubmitData(updateData={}) {
        if (!this.form) throw new Error("The FormApplication subclass has no registered form element");
        const fd = new FormDataExtended(this.form, {editors: this.editors});
        let data = fd.object;
        if (updateData) data = HelperFunctions.flattenObject(HelperFunctions.mergeObject(data, updateData));
        return data;
    }
    /**
   * Submit the contents of a Form Application, processing its content as defined by the Application
   * @param {object} [options]        Options passed to the _onSubmit event handler
   * @returns {FormApplication}       Return a self-reference for convenient method chaining
   */
    async submit(options={}) {
        if ( this._submitting ) return;
        const submitEvent = new Event("submit");
        await this._onSubmit(submitEvent, options);
        return this;
    }
    /**
   * This method is called upon form submission after form data is validated
   * @param {Event} event       The initial triggering submission event
   * @param {object} formData   The object of validated form data with which to update the object
   * @returns {Promise}         A Promise which resolves once the update operation has completed
   * @abstract
   */
    async _updateObject(event, formData) {
        throw new Error("A subclass of the FormApplication must implement the _updateObject method.");
    }
    static get defaultOptions(){
        return HelperFunctions.mergeObject(super.defaultOptions, {
            closeOnSubmit: true
        });
    }
}
class FormDataExtended extends FormData {
    constructor(form, {editors={}, dtypes={}}={}) {
      super();
  
      /**
       * A mapping of data types requested for each form field.
       * @type {{string, string}}
       */
      this.dtypes = dtypes;
  
      /**
       * A record of TinyMCE editors which are linked to this form.
       * @type {Object<string, object>}
       */
      this.editors = editors;
  
      /**
       * The object representation of the form data, available once processed.
       * @type {object}
       */
      Object.defineProperty(this, "object", {value: {}, writable: false, enumerable: false});
  
      // Process the provided form
      this.process(form);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Process the HTML form element to populate the FormData instance.
     * @param {HTMLFormElement} form    The HTML form being processed
     */
    process(form) {
      this.#processFormFields(form);
      this.#processEditableHTML(form);
      this.#processEditors();
    }
  
    /* -------------------------------------------- */
  
    /**
     * Assign a value to the FormData instance which always contains JSON strings.
     * Also assign the cast value in its preferred data type to the parsed object representation of the form data.
     * @param {string} name     The field name
     * @param {any} value       The raw extracted value from the field
     * @private
     */
    #set(name, value) {
      this.object[name] = value;
      if ( value instanceof Array ) value = JSON.stringify(value);
      this.set(name, value);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Process all standard HTML form field elements from the form.
     * @param {HTMLFormElement} form    The form being processed
     * @private
     */
    #processFormFields(form) {
      if ( form.hasAttribute("disabled") ) return;
      const mceEditorIds = Object.values(this.editors).map(e => e.mce?.id);
      for ( const element of form.elements ) {
        const name = element.name;
  
        // Skip fields which are unnamed or already handled
        if ( !name || this.has(name) ) continue;
  
        // Skip buttons and editors
        if ( (element.tagName === "BUTTON") || mceEditorIds.includes(name) ) continue;
  
        // Skip disabled or read-only fields
        if ( element.disabled || element.readOnly || element.closest("fieldset")?.disabled ) continue;
  
        // Extract and process the value of the field
        const field = form.elements[name];
        const value = this.#getFieldValue(name, field);
        this.#set(name, value);
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Process editable HTML elements (ones with a [data-edit] attribute).
     * @param {HTMLFormElement} form    The form being processed
     * @private
     */
    #processEditableHTML(form) {
      const editableElements = form.querySelectorAll("[data-edit]");
      for ( const element of editableElements ) {
        const name = element.dataset.edit;
        if ( this.has(name) || element.disabled || element.readOnly || (name in this.editors) ) continue;
        let value;
        if (element.tagName === "IMG") value = element.getAttribute("src");
        else value = element.innerHTML.trim();
        this.#set(name, value);
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Process TinyMCE editor instances which are present in the form.
     * @private
     */
    #processEditors() {
      for ( const [name, editor] of Object.entries(this.editors) ) {
        if ( !editor.instance ) continue;
        if ( editor.options.engine === "tinymce" ) {
          const content = editor.instance.getContent();
          this.delete(editor.mce.id); // Delete hidden MCE inputs
          this.#set(name, content);
        } else if ( editor.options.engine === "prosemirror" ) {
          this.#set(name, ProseMirror.dom.serializeString(editor.instance.view.state.doc.content));
        }
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Obtain the parsed value of a field conditional on its element type and requested data type.
     * @param {string} name                       The field name being processed
     * @param {HTMLElement|RadioNodeList} field   The HTML field or a RadioNodeList of multiple fields
     * @returns {*}                               The processed field value
     * @private
     */
    #getFieldValue(name, field) {
  
      // Multiple elements with the same name
      if ( field instanceof RadioNodeList ) {
        const fields = Array.from(field);
        if ( fields.every(f => f.type === "radio") ) {
          const chosen = fields.find(f => f.checked);
          return chosen ? this.#getFieldValue(name, chosen) : undefined;
        }
        return Array.from(field).map(f => this.#getFieldValue(name, f));
      }
  
      // Record requested data type
      const dataType = field.dataset.dtype || this.dtypes[name];
  
      // Disabled fields
      if ( field.disabled ) return null;
  
      // Checkbox
      if ( field.type === "checkbox" ) {
  
        // Non-boolean checkboxes with an explicit value attribute yield that value or null
        if ( field.hasAttribute("value") && (dataType !== "Boolean") ) {
          return this.#castType(field.checked ? field.value : null, dataType);
        }
  
        // Otherwise, true or false based on the checkbox checked state
        return this.#castType(field.checked, dataType);
      }
  
      // Number and Range
      if ( ["number", "range"].includes(field.type) ) {
        if ( field.value === "" ) return null;
        else return this.#castType(field.value, dataType || "Number");
      }
  
      // Multi-Select
      if ( field.type === "select-multiple" ) {
        return Array.from(field.options).reduce((chosen, opt) => {
          if ( opt.selected ) chosen.push(this.#castType(opt.value, dataType));
          return chosen;
        }, []);
      }
  
      // Radio Select
      if ( field.type === "radio" ) {
        return field.checked ? this.#castType(field.value, dataType) : null;
      }
  
      // Other field types
      return this.#castType(field.value, dataType);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Cast a processed value to a desired data type.
     * @param {any} value         The raw field value
     * @param {string} dataType   The desired data type
     * @returns {any}             The resulting data type
     * @private
     */
    #castType(value, dataType) {
      if ( value instanceof Array ) return value.map(v => this.#castType(v, dataType));
      if ( [undefined, null].includes(value) || (dataType === "String") ) return value;
  
      // Boolean
      if ( dataType === "Boolean" ) {
        if ( value === "false" ) return false;
        return Boolean(value);
      }
  
      // Number
      else if ( dataType === "Number" ) {
        if ( (value === "") || (value === "null") ) return null;
        return Number(value);
      }
  
      // Serialized JSON
      else if ( dataType === "JSON" ) {
        return JSON.parse(value);
      }
  
      // Other data types
      if ( window[dataType] instanceof Function ) {
        try {
          return window[dataType](value);
        } catch(err) {
          console.warn(`The form field value "${value}" was not able to be cast to the requested data type ${dataType}`);
        }
      }
      return value;
    }
  
    /* -------------------------------------------- */
    /*  Deprecations and Compatibility              */
    /* -------------------------------------------- */
  
    /**
     * @deprecated since v10
     * @ignore
     */
    toObject() {
      foundry.utils.logCompatibilityWarning("You are using FormDataExtended#toObject which is deprecated in favor of"
        + " FormDataExtended#object", {since: 10, until: 12});
      return this.object;
    }
}
  
class DocumentSheet extends FormApplication {
    constructor(object, options={}){
        super(object, options);
    }
    /**Shorthand ref to the target object*/
    get document(){return this.object;}
    async close(options={}) {
        await super.close(options);
        delete this.object.apps?.[this.appId];
    }
    async _updateObject(event, formData) {
        //if (!this.object.id) return; //Our object must have an id
        return this.object.update(formData);
    }
}
class ConfigSheet extends DocumentSheet {
    /**
     * @param {Actor5e} actor
     * @param {object} options
     */
    constructor(actor, options){
        super(actor, options);
    }
    /**
     * The actor this config sheet is working with
     * @returns {Actor5e}
     */
    get actor(){return this.document;}
    getData(options={}){return options;}
    static get defaultOptions(){
        return HelperFunctions.mergeObject(super.defaultOptions, {
            title: "Config Sheet",
            classes: ["c5e"],
            template:"app/proficiency-config",
            popOut: true,
            resizable: true,
        });
    }
    async _render(force=false, options={}){
        await super._render(force, options);
        this.setPosition(this.position); //Set the position once, so it's placed where we want it
    }
}
class ProficiencyConfig extends ConfigSheet {
    static get defaultOptions(){
        return HelperFunctions.mergeObject(super.defaultOptions, {
            template: "app/proficiency-config",
            width: 500,
            height: "auto"
        });
    }
    get title(){
        const skillName = CONFIG.DND5E.skills[this.options.key].label;
        return `Configure ${skillName}`;
    }
    getData(options={}) {
        return {
          abilities: CONFIG.DND5E.abilities,
          proficiencyLevels: CONFIG.DND5E.proficiencyLevels,
          entry: this.actor.system[this.options.property]?.[this.options.key],
          isTool: this.isTool,
          isSkill: this.isSkill,
          key: this.options.key,
          property: this.options.property
        };
    }

    async _updateObject(event, formData) {
        //if (this.isTool) return super._updateObject(event, formData);
        console.log("config skill form", formData);
        const passive = formData[`system.skills.${this.options.key}.bonuses.passive`];
        /* const passiveRoll = new Roll(passive);
        if (!passiveRoll.isDeterministic) {
          const message = game.i18n.format("DND5E.FormulaCannotContainDiceError", {
            name: game.i18n.localize("DND5E.SkillBonusPassive")
          });
          ui.notifications.error(message);
          throw new Error(message);
        } */
        return super._updateObject(event, formData);
      }
}