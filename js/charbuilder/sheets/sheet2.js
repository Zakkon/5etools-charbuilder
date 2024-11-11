class ActorCharactermancerSheet2 extends ActorCharactermancerSheet {
    $sheet;
    instance;
    _inv;
    actor;
    element;

    constructor(main){
        super(main);

        this.actor = new TestActor();
        let inv = new TestInventoryElement(this.actor); this._inv = inv;
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
        const sheet = $$`<div class="c5e dnd5e sheet actor" ></div>`;
        sheet.appendTo(wrapper);
        this.$sheet = sheet;
        C5e_Inventory.setupListeners();
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

            this.navigation_switchTab("spellbook"); //Go to a tab
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

    activateListeners(rootDiv){
        //We have to delete the previous click listener, if it exists
        rootDiv.find(".item-action[data-action]").off("click").on("click", event => {
            this._onAction(event.currentTarget, event.currentTarget.dataset.action, { event });
        });
    }

    async _onAction(target, action, {event} = {}){

        switch(action){
            case "create":
                //TODO: Make sure we are not a container also
                return this._onCreate(target);
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
        if ( type === "class" && (this.actor.system.details.level + 1 > CONFIG.DND5E.maxLevel) ) {
            const err = game.i18n.format("DND5E.MaxCharacterLevelExceededWarn", {max: CONFIG.DND5E.maxLevel});
            ui.notifications.error(err);
            return null;
        }
  
        const itemData = {
            name: `New ${type.capitalizeEachWord()}`,//game.i18n.format("DND5E.ItemNew", {type: game.i18n.localize(CONFIG.Item.typeLabels[type])}),
            type,
            system: structuredClone({...dataset})//foundry.utils.expandObject({ ...dataset })
        };
        delete itemData.system.type;
        //return this.actor.createEmbeddedDocuments("Item", [itemData]);
        return this.actor.createEmbeddedDocuments("item", [itemData]);
    }
}

class TestActor {
    
    constructor(){
        this._createFakeCharacterData();
        this.owner = true;
    }
    
    _createFakeCharacterData(){

        this.abilities = [];
        const addAbility = (label, value, mod, save, baseProf, icon) => {
            this.abilities.push({label, value, mod, save, baseProf, icon});
        }
        addAbility("Strength", 10, 0, 0, 0, null);
        addAbility("Dexterity", 10, 0, 0, 0, null);

        this.skills = {};
        let configSkills = [];
        const addSkill = (label, value, ability, baseValue, hover, icon, abbreviation, total, passive) => {
            this.skills[label.toLowerCase()] = {label, value, ability, baseValue, hover, icon, abbreviation, total, passive};
            configSkills.push(label.toLowerCase());
        }
        addSkill("Investigation", 10, "int", null, null, "Inv", 10, 12);

        this.system = {
            attributes: {
                
            }
        };

        this.hp = {
            value: 10,
            max: 20,
        };

        this.inventory = {
            weapon: {
                label: "Weapons",
                items: [
                    { //Make this be an Item5e
                        name: "ItemName123",
                        type: "weapon",
                        system: {
                            quantity: 1,

                        },
                        id:"123"
                    }
                ],
                dataset: {
                    type: "weapon",
                }
            },
            equipment: {
                label: "Equipment",
                dataset: {type:"equipment"},
                items: []
            }
            
        };


        this.spellbook = {
            innate: {
                label:"Innate Spellcasting",
                canCreate:true,
                level: 1,
                dataset: {
                    level: 1,
                    preparationMode: "innate",
                    type: "spell",
                },
                usesSlots:false,
                uses:"-", slots:"-",
                spells:[]
            }
        }

        this.elements = {inventory: "dnd5e-inventory"};
        this.config = {skills:configSkills};
    }
    
    createEmbeddedDocuments(embeddedName, data=[], context={}){

        console.log(data);
        let collection = [];
        if(embeddedName == "item"){
            //create item5e
            for(let d of data){
                let entity;
                switch(d.type){
                    case "spell":
                        entity = new Spell5e(null, null, true);
                        break;
                    default:
                        entity = new Item5e(null, 1, null, true);
                        break;
                }
                entity.system = d.system;
                entity.name = d.name;
                entity.id = System5e.createUniqueID();
                entity.type = d.type; //weapon/spell/equipment/etc/etc
                collection.push(entity);
            }
            //Add them to the character
            this._addEntities(collection);
        }
        
        //then fire events
        this._onCreateDescendantDocuments(embeddedName, collection);
    }
    _onCreateDescendantDocuments(collectionName, documents){
        if(collectionName == "items"){} //update encumberance
        //re-render
        ActorCharactermancerSheet2.instance.render();
    }
    _addEntities(items){
        //just pretend its always the weapons category
        for(let it of items){
            console.log(it);
            if(it.type == "spell"){
                if(it.system.preparationMode=="innate"){this.spellbook[it.system.preparationMode].spells.push(it);}
                else{this.spellbook[it.system.level].spells.push(it);}
            }
            else{
                this.inventory[it.type].items.push(it);
            }
        }
    }
}