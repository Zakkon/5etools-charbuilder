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
        let window = null;
        if(type == "item"){window = new ItemSheet(actor, itemUid, collectionId);}
        else{window = new BaseSheet(actor, itemUid, type, collectionId);}
        //let window = new C5e_EditWindow(actor, itemUid, type, collectionId);
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

    collectionId;
    itemUid;
    type;
    element;
    _entity;
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
    get entity(){return this._entity;}
    set entity(value){this._entity = value;}
    constructor(actor, itemUid, type, collectionId){
        this.actor = actor;
        this.collectionId = collectionId;
        this.itemUid = itemUid;
        this.type = type;
        this.activeTab = "details";
        this._entity = this.actor.getItemByCollectionId(this.collectionId);
    }

    render(force, templateName){
        const entity = this.entity;
        console.log("to edit: ", entity);
        const windowHeader = this.windowHeader();
        let window_content = $$`<section class="window-content"></section>`;
        this.contentElement = window_content;
        let handle = this.windowDragHandle();
        let window = $$`<div class="c5e app window-app sheet item" style="z-index: 110; width: 550px; height: 700px; left: 400px; top: 50px;">${windowHeader}${window_content}${handle}</div>`;
        this.element = window;
        $("body").append(this.element);

        if(!templateName){templateName = entity.entityType;}

        this.templateName = templateName;
        entity.cssClass = "editable";
        entity.concealDetails = false;//!game.user.isGM && (this.document.system.identified === false)
        let contentTemplate = new LoadTemplate(window_content, "parts/edit/" + templateName, entity);
        contentTemplate.create(()=>{
            this.navigation_switchTab(this.activeTab);
            this.setupListeners(this.contentElement);
        });
    }
    _renderUpdate(){
        let contentTemplate = new LoadTemplate(this.contentElement, "parts/edit/" + this.templateName, this.entity);

        contentTemplate.createAndCompile((innerHTML)=>{
            let innerElement = $$`${innerHTML}`;
            this._replaceHTML(this.contentElement, innerElement);
            this.contentElement = innerElement;
            this.navigation_switchTab(this.activeTab);
            this.setupListeners(this.contentElement);
        });
    }
    close(){
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
    
    setupListeners(windowContent){
        //Make navigation respond to being clicked
        const nav = windowContent.find(".sheet-navigation.tabs");
        nav.click(evt=>{
            const targetTab = evt.target.getAttribute("data-tab");
            this.navigation_switchTab(targetTab);
        });

        //Input
        for(let el of windowContent.find("input")){
            //Make sure it has a "name" attribute
            if(!el.name){continue;}
            $(el).on("change", (e) => {
                console.log("setprop", el.name, e.target.value);
                this.setProp(el.name, e.target.value);
            });
        }
        //Select
        for(let el of windowContent.find("select")){
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
        let entity = this.entity;//System5e.getEntityByCollectionId(this.collectionId);
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
}
class ItemSheet extends BaseSheet {
    
    itemType; //Used to know what category of item this is
    get item(){return this.entity;}
    set item(value){this.entity = value;}

    constructor(actor, itemUid, collectionId){
        super(actor, itemUid, "item", collectionId);
        this.itemType = this.item.system.type.value;
    }

    /**
     * Render the edit window for this sheet
     * @param {boolean} force
     */
    render(force){
        super.render(force, this.itemType);
    }
}