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
    /**
     * @param {{item:Item, quantity:number, collectionId:string}[]} items
     * @returns {any}
     */
    createItemElements(items){
        let elements = [];

        for(let item of items){
            elements.push(this.createItemElement(item.item, item.quantity, item.collectionId));
        }
        return elements;
    }
    createItemElement(item, quantity, collectionId){
        if(quantity == null){quantity = 1;}
        let element = new C5e_InventoryItem(this);
        element.render(item, quantity, collectionId);
        return element;
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
    rebuildUi(){
        this.clearCategories();
        const c = this.getCategory("weapons");
        for(let entity of System5e.getInventoryItems()){
            let e = this.createItemElement(entity, entity.quantity, entity.collectionId);
            e.addTo(c);
        }
    }
    getCategory(categoryId){
        return this.categories[categoryId];
    }
    clearCategories(){
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
    constructor(parent){
        this.parent = parent;
        //Create inventory item template
        const itemWeight = `
        <div class="item-detail item-weight">
            {{#if ctx.totalWeight}}
                <div class="item-detail">
                {{ ctx.totalWeight }} {{ @root.weightUnit }}
                </div>
            {{/if}}
        </div>`;
        const itemCharges = `
        <div class="item-detail item-uses">
            {{#if item.system.uses.per }}
                <input type="text" value="{{item.system.uses.value}}" placeholder="0" />
                / {{item.system.uses.max}}
            {{/if}}
        </div>`;
        const itemAction = `
        <div class="item-detail item-action">
            {{#if item.system.activation.type }}
                {{item.system.activation.type}}
            {{/if}}
        </div>`;
        const itemControls = `
        <div class="item-controls">
        
            <a class="item-control item-action" data-action="equip" title="Equip">
                <i class="fas fa-shield-alt"></i>
            </a>
            <a class="item-control item-action" data-action="itemEdit">
                <i class="fas fa-edit"></i>
            </a>
            <a class="item-control item-action" data-action="itemDelete">
                <i class="fas fa-trash"></i>
            </a>
        </div>`;

        const itemElement = `
        <li class="item flexrow" data-item-id="{{collectionId}}">
            <div class="item-name flexrow">
                <h4 class="item-action" data-action="expand">{{item.name~}}
                {{#if ctx.isStack}} ({{item.system.quantity}}){{/if}}</h4>
            </div>
            ${itemWeight}
            ${itemCharges}
            ${itemAction}
            ${itemControls}
        </li>`;
        this._template = Handlebars.compile(itemElement);
    }
    /**
     * @param {Item5e} item
     * @param {number} quantity
     * @param {string} collectionID
     * @returns {any}
     */
    render(item, quantity, collectionId){
        
        this.collectionId = collectionId;
        this.itemUid = collectionId.split("__")[0];
        //Create context
        let totalWeight = item.weight * quantity;
        
        let ctx = {totalWeight:totalWeight};
        let html = this._template({item:item, collectionId: collectionId, ctx:ctx, weightUnit:C5e_InventoryItem._weightUnit});
        this.element = $$`${html}`;
        if(item.type == "classFeature"){this.element.find(`[data-action="equip"]`).css("display", "none");}

        System5e.addHookBase("item_update", (p, collectionId) => {
            if(collectionId != this.collectionId){return;}
            let item5e = System5e.getItemByCollectionId(this.collectionId);
            this.element.find(`.item-name > h4`).text(item5e.prop("name"));
        });

        return this.element;
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