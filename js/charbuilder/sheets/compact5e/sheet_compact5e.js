class C5e_Sheet{
    static createNew(){}
}

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
    test_populate(){

        let category_weapons = new C5e_InventoryCategory();
        this.categories["weapons"] = category_weapons;
        category_weapons.render({label:"Weapons", id:"weapons"});
        category_weapons.addTo(this.rootElement);
    }
    addItem(categoryId, item, quantity, collectionId){
        this.rebuildUi();
    }
    elementsInCreation = 0;
    rebuildUi(){
        if(this.elementsInCreation>0){console.log(this.elementsInCreation, "elements still being created"); return;}
        this.clearCategories();
        const c = this.getCategory("weapons");
        for(let entity of System5e.getInventoryItems()){
            this.createItemElement(entity, entity.quantity, entity.collectionId, c);
        }
    }
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

    //#region Editing
    static _editedCollectionUids = [];
    static tryOpenEditWindow(itemUid, type, collectionId){
        if(C5e_Inventory._editedCollectionUids.includes(collectionId)){return;}
        C5e_Inventory._editedCollectionUids.push(collectionId);
        let window = new C5e_EditWindow(itemUid, type, collectionId);
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
        this.handleClassLevelChange(info, 0, info.targetLevel);
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
        console.log("removing class", hash);
        this.handleClassLevelChange(toRemove, toRemove.targetLevel, 0);
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
    handleClassLevelChange(info, from, to){
        if(to == from){return;}
        const upgrade = to > from;
        if(upgrade){
            let itemsToVerify = [];
            for(let i = from+1; i <= to; ++i){
                let items = this.addClassFeaturesForLevel(info, i, true); //Make sure to tell the function to return the list of items to verify
                itemsToVerify = itemsToVerify.concat(items);
            }
            //Once we have a list of all the items to verify, begin verifying them
            //Quickly create collecitonIds for the items we are verifying. Those ids will be given to the items
            for(let i = 0; i < itemsToVerify.length; ++i){itemsToVerify[i].collectionId = System5e.createUniqueID();}
            console.log("Items to verify", itemsToVerify);
            //Verify them, and rebuild the inventory list ui afterwards
            this._awaitClassFeatureVerification(itemsToVerify).then(()=>{
                //Now we need to go in and make sure the features that were created are tied to our class
                //We can find the features using the collectionIds we created earlier
                for(let fItem of itemsToVerify){
                    //Find the class feature in our inventory
                    let matches = System5e.getItemsByProps([{property: "collectionId", value: fItem.collectionId}]);
                    //There should be only one match
                    let m = matches[0];
                    //Now we can give that feature some info tying it to our class
                    m.dependsOnType = "class";
                    m.dependsOn = `${info.cls.name}|${info.cls.source}`.toLowerCase();
                }
                console.log("try rebuild ui");
                ActorCharactermancerSheet.c5e_inventory.rebuildUi();
            });
        }
        else{
            for(let i = from; i > to; --i){
                this.removeClassFeaturesForLevel(info, i);
            }
        }
    }
    addClassFeaturesForLevel(info, level, returnItems = false){
        let itemsToVerify = [];
        for(let f of info.cls.classFeatures){
            if(f.level != level){continue;}
            //Try adding this class feature to the inventory
            //Check if inventory already has an object with this hash
            if(System5e.getItemsByProp("hash", f.hash).length > 0){ console.log(`item ${f.name} already exists`); continue;}
            //Instead of verifying features async right now, store the features in an array and verify them together as a promise
            itemsToVerify.push({entity:f, cls:info.cls});
        }
        if(returnItems){return itemsToVerify;}

        //Verify them, and rebuild the inventory list ui afterwards
        this._awaitClassFeatureVerification(itemsToVerify).then(()=>{
        console.log("try rebuild ui");
        ActorCharactermancerSheet.c5e_inventory.rebuildUi();
        });
    }
    removeClassFeaturesForLevel(info, level){
        
        let matches = System5e.getItemsByProps([{property: "dependsOnType", value: "class"},
            {property: "dependsOn", value: `${info.cls.name}|${info.cls.source}`.toLowerCase()}]);
            
        console.log("removing matches", matches, CharacterBuilder.instance._actor.character.system.inventory.items);
        for(let m of matches){
            console.log("REMOVE CLASS FEATURE", m);
            System5e.removeFromInventory( CharacterBuilder.instance._actor, m.collectionId);
        }
    }
    async _awaitClassFeatureVerification(itemsToVerify){
        return new Promise(async (resolve, reject) => {
            for(let fItem of itemsToVerify){
              if(System5e.getItemsByProp("hash", fItem.entity.hash).length > 0){ continue;}
              await ClassFeature5e.verifySystemData(fItem.entity.hash, fItem.cls.name, fItem.cls.source);
              let featureItem = new ClassFeature5e(fItem.entity.hash, fItem.cls.name, fItem.cls.source, fItem.collectionId);
              System5e.addToInventory(CharacterBuilder.instance._actor, featureItem);
              console.log("Item verified");
            }
            console.log("Resolve");
            resolve();
        });
    }
    
    //#endregion
}
class C5e_InventoryCategory {
    header;
    itemList;
    categoryId;
    constructor(){

    }
    render(categoryData){
        this.categoryId = categoryData.id;
        this.itemList = $$`<ol class="item-list" data-category-id="${categoryData.id}"></ol>`;

        //Create header template
        const header = `
        <li class="items-header flexrow">
            <span class="item-name flexrow">${categoryData.label}</span>
        
            <div class="item-detail item-weight">Weight</div>
        
            <div class="item-detail item-uses">Charges</div>
            <div class="item-detail item-action">Usage</div>
        
            <div class="item-controls">
              <a class="item-control item-action" data-action="create" data-tooltip="itemCreate">
                <i class="fas fa-plus"></i> Add
              </a>
            </div>
          </li>
        `;
        this.header = $$`${header}`;

    }
    clear(){
        $(`.item-list[data-category-id="${this.categoryId}"] > *`).remove();
    }
    addTo(element){
        this.header.appendTo(element);
        this.itemList.appendTo(element);
    }
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
            let item5e = System5e.getItemByCollectionId(this.collectionId);
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
        return System5e.getItemByCollectionId(this.collectionId);
    }
}
class C5e_InventoryItemSummary {
    element;
    attachedItemUi;
    constructor(parent){}
    adaptTo(itemUi){
        if(this.element){this.close();}
        let item = //this.getItemByID(itemUi.itemUid);
        System5e.getItemByCollectionId(itemUi.collectionId);
        if(!item){console.error("could not find item with itemUid", itemUi.itemUid); return;}
        this.element = $$`<div class="item-summary"></div>`;
        for(let e of item.entries){
            let entry = $$`<p>${e}</p>`;
            this.element.append(entry);
        }
        console.log("item", item);
        //const properties = $$`<div class="item-properties"></div>`;
        let item5e = System5e.getItemByCollectionId(itemUi.collectionId);
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
class C5e_EditWindow {
    collectionId;
    itemUid;
    type;
    element;
    tab_details;
    rectWidth = 550;
    rectHeight = 500;
    zIndex = 110;
    rectLeft = 400;
    rectTop = 50;
    constructor(itemUid, type, collectionId){
        
        this.collectionId = collectionId;
        this.itemUid = itemUid;
        this.type = type;
    }

    render(){
        let item5e = System5e.getItemByCollectionId(this.collectionId);
        console.log(item5e);
        const windowHeader = this.windowHeader();
        let window_content = $$`<section class="window-content"></section>`
        let handle = this.windowDragHandle();
        let window = $$`<div class="c5e app window-app sheet item" style="z-index: 110; width: 550px; height: 500px; left: 400px; top: 50px;">${windowHeader}${window_content}${handle}</div>`;
        this.element = window;
        $("body").append(this.element);

        let templateName = "weapon";
        if(item5e.type == "classFeature"){templateName = "feat";}

        item5e.cssClass = "editable";
        item5e.concealDetails = false;//!game.user.isGM && (this.document.system.identified === false)
        let contentTemplate = new LoadTemplate(window_content, templateName, item5e);
        contentTemplate.create(()=>{
            this.setupListeners(window_content);
        });
    }
    close(){
        //Fire one last item_update? (incase we clicked on close instead of clicking elsewhere, which normally triggers input fields "change" events)
        this.element.remove(); this.element = null;
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
    startX;
    startY;
    startW;
    startH;
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
        //this.setStyle();
        //console.log("W", width, height);
        //this.rectWidth = width; this.rectHeight = height;
        this.element.css("width", `${width}px`);
        this.element.css("height", `${height}px`);
        //this.element.css("top", "100px");
    }
    setStyle(){
        let str = `z-index:${this.zIndex} width:${this.rectWidth} height:${this.rectHeight} left:${this.rectLeft} top:${this.rectTop}`;
        this.element.css(str);
    }
    
    setupListeners(windowContent){
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
        let entity = System5e.getItemByCollectionId(this.collectionId);
        if(typeof(value) == "string" && (value).toLowerCase() === "none"){value = null;}
        entity.setProp(prop, value);
        //Fire a hook to alert other UI that this item has changed
        System5e.hkItemUpdated(this.collectionId);
    }
    
    getItemByID(itemUid){
        const itemDatas = CharacterBuilder.instance._data.item;
        const foundItem = ActorCharactermancerEquipment.findItemByUID(itemUid, itemDatas);
        return foundItem;
    }
}