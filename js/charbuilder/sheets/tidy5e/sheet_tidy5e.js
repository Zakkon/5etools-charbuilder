class Tidy5e_Inventory{
    static createEl_tab_inventory(){
        return C5e_Inventory.handlebarInventory();
        const searchbar = null;
  
        const scrollContainer = $$`<div class="scroll-container flex-column small-gap" data-tidy-sheet-part="items-container"></div>`;
  
        //Create one per category (weapons, equipment, consumables, tools, containers, loot)
        this.itemTableCategory("Weapons").appendTo(scrollContainer);
  
        const footer = null;
  
        let tab = $$`<div class="tidy5e tidy-tab inventory" data-tab-contents-for="inventory">
        ${searchbar}
        ${scrollContainer}
        </div>`;
        return tab;
    }
    static createEl_inventory_list_section(){
    const header = $$`<header class="item-table-header-row svelte-1x4fy16 toggleable" data-tidy-sheet-part="table-expansion-toggle">
            <i class="expand-indicator fas fa-angle-right svelte-1x4fy16 expanded"></i>
            <div class="item-table-column null svelte-14w3uu6 primary">Weapons (3)</div>
            <div class="item-table-column null svelte-14w3uu6" title="Weight (lbs.)" style="flex-basis: 4rem;">
            <i class="fas fa-weight-hanging"></i>
            </div>
            <div class="item-table-column null svelte-14w3uu6" title="Charges" style="flex-basis: 3.125rem;">
            <i class="fas fa-bolt"></i>
            </div>
            <div class="item-table-column null svelte-14w3uu6" style="flex-basis: 7.5rem;">Usage</div>
            <div class="item-table-column null svelte-14w3uu6" style="flex-basis: 7.5rem;"></div>
            </header>`;

    
    //This cell has an icon, and the name for the item. Clicking the icon should roll it. Clicking the name should expand the object.
    const cell_primary = $$`
    <div class="item-table-cell primary" title="Unarmed Strike">
        <div class="item-image" style="background-image: url(&quot;icons/skills/melee/unarmed-punch-fist-yellow-red.webp&quot;);">
        <div role="presentation" aria-hidden="true" class="unidentified-glyph no-transition">
            <i class="fas fa-question"></i>
        </div>
        <button type="button" class="item-use-button icon-button" data-tidy-sheet-part="item-use-command" tabindex="-1">
            <i class="fa fa-dice-d20"></i>
        </button>
        </div>

        <span role="button" tabindex="-1" class="item-name truncate extra-small-gap has-children">
        <span class="truncate" data-tidy-item-name="Unarmed Strike" data-tidy-sheet-part="item-name">Unarmed Strike</span>
        <span class="item-quantity">(
            <input type="text" placeholder="0" class="item-count" data-tidy-field="system.quantity">)
        </span>
        </span>
    </div>`;
    
    const content = $$`
    <div class="expandable svelte-wjp1ys expanded" role="presentation">
        <div class="item-table-body">
        <div class="item-table-row-container show-item-count-on-hover" aria-hidden="false" data-context-menu="items" data-context-menu-entity-id="QFcYNtYSysYlZPJn"
            draggable="true" data-item-id="QFcYNtYSysYlZPJn" data-tidy-item-table-row="" data-tidy-sheet-part="item-table-row" data-tidy-item-type="weapon">
            <div class="item-table-row equipped">
            ${cell_primary}
            </div>
        </div>
        </div>
    </div>`;
    const section = $$`<section class="inventory-list-section">
        <section class="item-table" data-tidy-sheet-part="item-table">
        ${header}
        ${content}
        </section>
    </section>`;

    return section;
    }

    static itemTableCategory(category){
        let section = $$`<section class="item-table"></section>`;

        //Create header
        let header = $$`<header class="item-table-header-row"></header>`;
        $$`<i class="expand-indicator fas fa.angle-right expanded"></i>`.appendTo(header);
        $$`<div class="item-table-column primary">${category}</div>`.appendTo(header);
        $$`<div class="item-table-column" title="Weight (lbs.)" style="flex-basis: 4rem;">
            <i class="fas fa-weight-hanging"></i>
        </div>`.appendTo(header);
        $$`<div class="item-table-column" title="Charges" style="flex-basis: 4rem;">
            <i class="fas fa-bolt"></i>
        </div>`.appendTo(header);
        $$`<div class="item-table-column" style="flex-basis: 7.5rem;" >Usage</div>`.appendTo(header);
        $$`<div class="item-table-column" style="flex-basis: 7.5rem;"></div>`.appendTo(header);

        header.appendTo(section);

        //Create expandable item list
        let expandable = $$`<div class="expandable expanded"></div>`;
        let list = $$`<div class="item-table-body"></div>`;

        const items = ["Mason's Tools", "Dagger", "Longsword"];
        for(let it of items){list.append(this.createItemBody(it));}

        list.appendTo(expandable);
        expandable.appendTo(section);
        return section;
    }
    
    static createItemBody(item){

        const itemActionButton = (title, iconClass) => {
            const btn = $$`<button type="button" class="item-list-button" title="${title}" tabindex="-1">
                <i class="${iconClass}"></i>
            </button>`;
            return btn;
        }
        let container = $$`<div class="item-table-row-container show-item-count-on-hover"></div>`;
        let row = $$`<div class="item-table-row">

            <div class="item-table-cell primary" title="${item}">
                <div class="item-image">
                    <div role="presentation" aria-hidden="true" class="unidentified-glyph no-transition">
                        <i class="fas fa-question"></i>
                    </div>
                    <button type="button" class="item-use-button icon-button">
                        <i class="fas fa-dice-d20"></i>
                    </button>
                </div>
                <span role="button" class="item-name truncate extra-small-gap has-children">
                    <span class="truncate">${item}</span>
                    <span class="item-quantity">
                        <input type="text" placeholder="0" class="item-count"></input>
                    </span>
                </span>
            </div>

            <div class="item-table-cell no-border"></div>

            <div class="item-table-cell" title="Weight" style="flex-basis: 4rem;">
                <span class="truncate">0 lbs.</span>
            </div>

            <div class="item-table-cell" title="Uses" style="flex-basis: 4rem;">
                <button type="button" class="item-add-uses item-list-button">Add</button>
            </div>

            <div class="item-table-cell" title="Usage" style="flex-basis: 7.5rem;"></div>

            <div class="item-table-cell" style="flex-basis: 7.5rem;">
                <div class="tidy5e-item-controls">
                    <span role="presentation"></span>
                    ${itemActionButton("Equipped", "fas fa-user-alt")}
                    ${itemActionButton("Add Favourite", "fas fa-bookmark")}
                    ${itemActionButton("Edit Item", "fas fa-edit fa-fw")}
                    ${itemActionButton("Duplicate", "fas fa-copy fa-fw")}
                    ${itemActionButton("Delete Item", "fas fa-trash fa-fw")}
                </div>
            </div>
        </div>`;
        row.appendTo(container);
        return container;
    }

    static handlebarInventory(){
        //var template = Handlebars.compile("Handlebars <b>{{doesWhat}}</b>");
        // execute the compiled template and print the output to the console
        //console.log(template({ doesWhat: "rocks!" }));

        let itemData = {
            item: {name: "Rock"},
            section: {
                editableName: true
            }
        };

        //Create inventory item
        const itemHbs = `
        <h4 class="item-action" data-action="expand"></h4>
        `;
        var template = Handlebars.compile(itemHbs);
        return template(itemData);

        return "";
    }
}