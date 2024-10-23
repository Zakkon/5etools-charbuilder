class C5e_Sheet{
    static createNew(){}
}

class C5e_Inventory{
    rootElement;
    constructor(){

    }
    init(){
        this.categories = {};
        this.rootElement = $$`<ol class="items-list inventory-list"></ol>`;
    }
    static quickRenderHbs(text, data){
        var template = Handlebars.compile(text);
        return template(data);
    }
    createItemElements(items){
        let elements = [];

        for(let item of items){
            elements.push(this.createItemElement(item));
        }
        return elements;
    }
    createItemElement(item){
        let element = new C5e_InventoryItem();
        element.render(item);
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


        /* let itemData = {
            ctx: {isStack: false, totalWeight: 10},
            section: {
                label: "Weapons",
                editableName: true,
                items: [
                    {name: "Longsword", id: 0, system:{quantity:1, uses:{max: 1, value: 1}}}
                ]
            }
        }; */

        const items = [
            {name: "Longsword", id: 0, system:{quantity:1, uses:{max: 1, value: 1}}}
        ];

        let category_weapons = new C5e_InventoryCategory();
        this.categories["weapons"] = category_weapons;
        category_weapons.render({label:"Weapons", id:"weapons"});
        category_weapons.addTo(this.rootElement);


        const itemElements = this.createItemElements(items);
        for(let i of itemElements){i.addTo(category_weapons);}
    }
    addItem(categoryId, item, quantity, collectionID){
        const c = this.getCategory(categoryId);
        let e = this.createItemElement(item);
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
    element;
    _template;
    constructor(){
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

        const itemHbs = `
        <li class="item flexrow" data-item-id="{{item.id}}">
            <div class="item-name flexrow">
                <h4 class="item-action" data-action="expand">{{item.name~}}
                {{#if ctx.isStack}} ({{item.system.quantity}}){{/if}}</h4>
            </div>
            ${itemWeight}
            ${itemCharges}
            ${itemAction}
            ${itemControls}
        </li>
        `;
        this._template = Handlebars.compile(itemHbs);
    }
    render(itemData){
        let html = this._template({item:itemData});
        this.element = $$`${html}`;
        return this.element;
    }
    addTo(category){
        this.element.appendTo(category.itemList);
    }
}