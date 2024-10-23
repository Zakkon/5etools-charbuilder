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
        const c = this.getCategory(categoryId);
        let e = this.createItemElement(item, quantity, collectionId);
        e.addTo(c);
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
            {{#if ctx.hasUses }}
                <input type="text" value="{{item.system.uses.value}}" placeholder="0" />
                / {{item.system.uses.max}}
            {{/if}}
        </div>`;
        const itemAction = `
        <div class="item-detail item-action">
            {{#if item.system.activation.type }}
                {{item.labels.activation}}
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
     * @param {Item} item
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
                let w = new C5e_EditWindow(this.itemUid, this.collectionId);
                w.render();
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
}
class C5e_InventoryItemSummary {
    element;
    attachedItemUi;
    constructor(parent){}
    adaptTo(itemUi){
        if(this.element){this.close();}
        let item = this.getItemByID(itemUi.itemUid);
        if(!item){console.error("could not find item with itemUid", itemUi.itemUid); return;}
        this.element = $$`<div class="item-summary"></div>`;
        for(let e of item.entries){
            let entry = $$`<p>${e}</p>`;
            this.element.append(entry);
        }
        //const properties = $$`<div class="item-properties"></div>`;
        let item5e = System5e.getItemByCollectionId(CharacterBuilder.instance.actor, itemUi.collectionId);
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
    constructor(itemUid, collectionId){
        
        this.collectionId = collectionId;
        this.itemUid = itemUid;
    }
    static weapon_types = [
        {value:"simpleM", label:"Simple Melee"},
        {value:"simpleR", label:"Simple Ranged"},
        {value:"martialM", label:"Martial Melee"},
        {value:"martialR", label:"Martial Ranged"},
        {value:"natural", label:"Natural"},
        {value:"improv", label:"Improvised"},
        {value:"siege", label:"Siege Weapon"},
    ];
    form_group(label, selectName, values, selectedIx){
        const s = $$`<select name="${selectName}"></select>`;
        for(let i = 0; i < values.length; ++i){
            let v = values[i];
            let isSelected = (selectedIx==i)? "selected" : "";
            $$`<option value="${v.value}" ${isSelected}>${v.label}</option>`.appendTo(s);
        }

        //Put an onvaluechanged event here, so that we can detect when value is changed
        s.on("change", (e) => {
            let val = e.target.value;
            //Set the value to the item's override
            let item5e = this.getCollectionByID(this.collectionId);
            item5e.setProp(selectName, val);
            console.log(item5e);
        });
        return $$`<div class="frm-grp">
        <label>${label}</label>
        ${s}
        </div>`;
    }
    template_weapon(){
        const pattern = `
        {{ formField fields.type.fields.value value=source.type.value label="DND5E.ItemWeaponType" localize=true
                 choices=config.weaponTypes }}
        `;
        return Handlebars.compile(pattern);
    }
    tab_details(){
        const tab_details = $$`<div class="tab details active" data-tab="details">
            ${this.form_group("Weapon Type", "system.type.value", C5e_EditWindow.weapon_types, 0)}
        </div>`;
        return tab_details;
    }
    render(){
        const item = this.getItemByID(this.itemUid);
        //let template = this.template_weapon();

        const window = $$`<div class="c5e app window-app" style="z-index: 110; width: 500px; height: 500px; left: 400px; top: 50px;">
        <section class="window-content">
            <form class="editable flexcol" autocomplete="off">
                <section class="sheet-body">
                ${this.tab_details()}
                </section>
            </form>
        </section>
        </div>`;
        $("body").append(window);
    }
    getItemByID(itemUid){
        const itemDatas = CharacterBuilder.instance._data.item;
        const foundItem = ActorCharactermancerEquipment.findItemByUID(itemUid, itemDatas);
        return foundItem;
    }
    getCollectionByID(collectionId){
        return System5e.getItemByCollectionId(CharacterBuilder.instance._actor, collectionId);
    }
}