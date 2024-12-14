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
    static tryOpenEditWindow(actor, item=null, itemUid, type, collectionId){
        if(C5e_Inventory._editedCollectionUids.includes(collectionId)){return;}
        C5e_Inventory._editedCollectionUids.push(collectionId);
        if(!item){item = actor.getItemByCollectionId(collectionId);}
        let window = new ItemSheet5e(actor, itemUid, item, type, collectionId);
        window.render(item);
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
                C5e_Inventory.tryOpenEditWindow(this.itemUid, this.type, this.collectionId);
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

class ItemSheet5e extends BaseSheet {
    collectionId;
    itemUid;
    type;
    element;
    _item;
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
    get item(){return this._item;}
    set item(value){this._item = value;}
    get system(){return this._item.system;}
    get config(){return CONFIG.DND5E;}
    get isCostlessAction(){return this.system?.activation?.type in DND5E.staticAbilityActivationTypes;}
    get isCrewed(){return this.system.activation?.type === "crew";}
    get isFormulaRecharge(){ !!DND5E.limitedUsePeriods[this.system.uses?.per]?.formula;}
    get isPhysical(){return this.system.quantity != null;}
    get labels(){return this.item.labels;} //Lazy shortcut before we move all labels rendering code to this class
    constructor(actor, itemUid, item, type, collectionId){
        super(item);
        this.actor = actor;
        this.collectionId = collectionId;
        this.itemUid = itemUid;
        this.type = type;
        this.activeTab = "details";
        this._item = item;
        if(type == "item"){this.itemType = this.system.type.value;}
        this.boundUpdateFunc = this._onItemUpdate.bind(this);

        System5e.addHookBase("item_update", this.boundUpdateFunc);
    }
    _onItemUpdate(p, collectionId){
        this._renderUpdate();
    }

    render(force){
        const entity = this.item;
        console.log("to edit: ", entity);
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
                if(this.item.featureType == "class"){templateName = "class";}
                else if(this.item.featureType == "subclass"){templateName = "subclass";}
                else if(this.item.featureType == "race"){templateName = "race";}
                else if(this.item.featureType == "background"){templateName = "background";}
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
        //Make navigation respond to being clicked
        html.find(".sheet-navigation.tabs").click(evt=>{
            const targetTab = evt.target.getAttribute("data-tab");
            this.navigation_switchTab(targetTab);
        });

        html.find(".damage-control").click(this._onDamageControl.bind(this));

        //Input
        for(let el of html.find("input")){
            //Make sure it has a "name" attribute
            if(!el.name){continue;}
            $(el).on("change", (e) => {
                console.log("setprop", el.name, e.target.value);
                this.setProp(el.name, e.target.value);
            });
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
    }

    

    setProp(prop, value){
        //Set the value to the item's override
        let entity = this.item;//System5e.getEntityByCollectionId(this.collectionId);
        if(typeof(value) == "string" && (value).toLowerCase() === "none"){value = null;}
        entity.setProp(prop, value);
        //Fire a hook to alert other UI that this item has changed
        System5e.hkItemUpdated(this.collectionId);
        //Update this UI and re-render things
        this._renderUpdate();
    }
    
    
    getItemByID(itemUid){
        const itemDatas = CharacterBuilder.instance._data.item;
        const foundItem = ActorCharactermancerEquipment.findItemByUID(itemUid, itemDatas);
        return foundItem;
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
        if (damage && !HelperFunctions.getProperty(this.item.overrides, "system.damage.parts")) {
        damage.parts = Object.values(damage?.parts || {}).map(d => [d[0] || "", d[1] || ""]);
        }

        // Handle properties
        if (HelperFunctions.hasProperty(formData, "system.properties")) {
        const keys = new Set(Object.keys(formData.system.properties));
        const preserve = new Set(this.item._source.system.properties ?? []).difference(keys);
        formData.system.properties = [...filteredKeys(formData.system.properties), ...preserve];
        }

        // Check max uses formula
        const uses = formData.system?.uses;
        if ( uses?.max ) {
        const maxRoll = new Roll(uses.max);
        if ( !maxRoll.isDeterministic ) {
            uses.max = this.item._source.system.uses.max;
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
            duration.value = this.item._source.system.duration.value;
            this.form.querySelector("input[name='system.duration.value']").value = duration.value;
            ui.notifications.error(game.i18n.format("DND5E.FormulaCannotContainDiceError", {
            name: game.i18n.localize("DND5E.Duration")
            }));
            return null;
        }
        }

        // Check class identifier
        if ( formData.system?.identifier && !dnd5e.utils.validators.isValidIdentifier(formData.system.identifier) ) {
        formData.system.identifier = this.item._source.system.identifier;
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
      const damage = this.item.system.damage ?? {parts:[]}; //Create parts if they don't exist yet
      return this.item.update({"system.damage.parts": damage.parts.concat([["", ""]])});
    }

    // Remove a damage component
    if (a.classList.contains("delete-damage")) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");
      const damage = HelperFunctions.deepClone(this.item.system.damage);
      damage.parts.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({"system.damage.parts": damage.parts});
    }
  }
}