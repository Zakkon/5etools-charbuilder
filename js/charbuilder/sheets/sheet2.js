class ActorCharactermancerSheet2 extends ActorCharactermancerBaseComponent {
    $sheet;
    _inv;
    /**
    * The displayed actor object
    * @type {Actor5e}
    */
    actor;
    element;
    activeTab = "features";

    constructor(main){
        super(main);
        this._actor = main.actor;
        this._data = main.data; //data is an object containing information about all classes, subclasses, feats, etc
        this._parent = main.parent;
        this._tabSheet = main.tabSheet;
        this._meta = {attributes:[], equipped:{}};
        this.setup(main._actor);
    }
    setup(actor){
        ActorCharactermancerSheet2.instance = this;
        this.actor = actor;
        let inv = new InventoryElement(this.actor);
        this._inv = inv;
    }
    preRender(){
        ActorCharactermancerSheet2.characterName = null;
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
            console.log("Item Update hook fired");
            //Recalculate derived data in the actor
            this.actor.prepareDerivedData();
            this.render();
        });
        System5e.addHookBase("actor_update", (p, collectionId) => {
            console.log("Actor update hook fired");
            //Recalculate derived data in the actor
            this.actor.prepareDerivedData();
            //Then render the ui
            this.render();
        });
    }

    render(){
        
        if(!this.$sheet){this.preRender();}
        let parentElement = this.$sheet; //Should be a jquery object

        this.actor.prepareDerivedData();
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
            if(dataset == null || Object.entries(dataset).length < 1){continue;}
            let contents = "";

            if(dataset.preparationMode == "innate" || dataset.level < 1){continue;}
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

            $(markerDiv).html(contents);

            for(let i = 0; i < markerDiv.children.length; ++i){
                let dot = markerDiv.children[i];
                $(dot).click(evt=>{
                    const sectionInfo = this.actor.spellbook[dataset.level];
                    const slotsRemaining = isNumeric(sectionInfo.uses)? sectionInfo.uses : 0;
                    const isAlreadyFilled = (i+1) <= slotsRemaining;
                    //this._setSpellMarkersRemaining(dataset.level, isAlreadyFilled? i:i+1);
                    this.actor.spellbook[dataset.level].uses = isAlreadyFilled? i:i+1;
                    this.actor.update(); //Forces render
                });
            }

            this._setSpellMarkersRemaining(dataset.level, spellSlotsRemaining);
        }

        const imgUrl = this.actor.profileImgSrc ?? "";
        this.$sheet.find("img.portrait").attr("src", imgUrl);
    }

    _setSpellMarkersRemaining(level, slotsRemaining){
        const sectionInfo = this.actor.spellbook[level];
        //const maxSpellSlots = isNumeric(sectionInfo.slots)? sectionInfo.slots : 0;
        //const slotsRemainingOld = isNumeric(sectionInfo.uses)? sectionInfo.uses : 0;
        //this.actor.spellbook[level].uses = slotsRemaining;


        const markers = this.element.find(".spellSlotMarker");
        for(let m of markers){
            //get grandparent
            let grandparent = m.parentNode.parentNode;
            //Get some data from the parent
            const dataset = grandparent.dataset;
            if(dataset == null || Object.entries(dataset).length < 1){continue;}
            if(dataset.preparationMode == "innate" || dataset.level != level){continue;}
            let slotsTextValueInput = $(grandparent).find(".spell-slots > .spell-uses");
            slotsTextValueInput[0].value = slotsRemaining;
            return;

            for(let i = 0; i < m.children.length; ++i){
                let dot = $(m.children[i]);
                let ix = i+1;
                if(ix <= slotsRemaining){
                    if(dot.hasClass("empty")){dot.toggleClass("empty");} //mark as filled
                }
                else
                {
                    if(!dot.hasClass("empty")){dot.toggleClass("empty");} //mark as empty
                }
            }
            
            break;
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

        //Make "Manage Spells" button respond to being clicked
        const mng = this.$sheet.find(".btn.manage-spells");
        mng.click(evt=>{
            if(evt.detail == 0){return;} //Make enter key not trigger this event
            evt.stopPropagation();
            evt.preventDefault();
            CharacterBuilder.instance.e_switchTab("spells");
        });

        //Make currency input fields respond to input value chaning
        this.$sheet.find(".inventory-header .currency input").on("change", evt => {
            let val = evt.target.value;
            //Validate input. if failed, return without removing focus from the input field
            //this.parseInputDelta(evt.target, CharacterBuilder.instance._actor); //not sure about this
            evt.stopPropagation();
            evt.preventDefault();
            console.log("Input value changed to:", evt.target.value);
        });
        //Make portrait click open a dialogue to pick an image file
        this.$sheet.find("img.portrait").click(this._onEditProfile.bind(this));

        //Make ability score input fields respond to being edited
        this.$sheet.find("input.ability-score").on("change", evt =>{
            const val = evt.target.value;
            const name = evt.target.name; //"system.abilities.str.value"
            console.log("changed score to ", val);
            //Immediately update the sheet with the new score
            let upd = {}; upd[name] = val;
            this.actor.update(upd);
        });

        //Make config buttons respond to being clicked
        this.$sheet.find(".config-button").on("click", this._onConfigMenu.bind(this));
    }

    /**
     * Handle a delta input for a number value from a form.
     * @param {HTMLInputElement} input  Input that contains the modified value.
     * @param {Document} target         Target document to be updated.
     * @returns {number|void}
     */
    parseInputDelta(input, target) {
        let value = input.value;
        if ( ["+", "-"].includes(value[0]) ) {
            const delta = parseFloat(value);
            value = Number(HelperFunctions.getProperty(target, input.dataset.name ?? input.name)) + delta;
        }
        else if ( value[0] === "=" ) value = Number(value.slice(1));
        if ( Number.isNaN(value) ) return;
        input.value = value;
        return value;
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
    _onConfigMenu(event){
        event.preventDefault();
        event.stopPropagation();
        const button = event.currentTarget;
        console.log("ACTOR", this.actor);
        let app;
        switch(button.dataset.action){
            case "skill":
                const skillAbv = button.closest("[data-key]").dataset.key;
                app = new ProficiencyConfig(this.actor, {property: "skills", key: skillAbv});
                break;
            case "movement":
                app = new ActorMovementConfig(this.actor);
                break;
        }
        app.render(true);
    }

    //#region Profile Image
  _onEditProfile(){
    //Open up image browser
    // Create a hidden file input element
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*"; // Accept only image formats (e.g., jpg, png, gif)

    // Trigger the file picker dialog
    fileInput.click();

    
    // Handle file selection
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0]; // Get the selected file
        const imgUrl = file? URL.createObjectURL(file) : "";
        //this.$sheet.find("img.portrait").attr("src", imgUrl);
        if(file){
            CharacterExportFvtt.imageFileToBase64(file, (base64)=>{
                console.log("Got content?", base64);
                this.$sheet.find("img.portrait").attr("src", base64);
                this.actor.profileImgSrc = base64;
            });
            
        }
    });
  }
  //#endregion
}




class InventoryElement {
    /** @type {Actor5e} */
    actor;
    _expanded = [];
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
        event.stopPropagation();
        event.preventDefault();
        const { itemId } = target.closest("[data-item-id]")?.dataset ?? {};
        const item = itemId != null? await this.actor.getItemByCollectionId(itemId) : null; //item-id is the collectionId, unique per item in the inventory
        switch(action){
            case "create":
                //TODO: Make sure we are not a container also
                return this._onCreate(target);
            case "delete":
                this._onDelete(item, {shouldRemoveAdvancements:true});
                return;
            case "edit":
                //Get the ui object for the entire item
                C5e_Inventory.openEditWindow(this.actor, item, item.uid, item.entityType, item.collectionId);
                return;
            case "duplicate":
                //Get the ui object for the entire item
                System5e.cloneEntity(item, this.actor);
                return;
            case "equip":
                return item.update({"system.equipped": !item.system.equipped});
            case "attune":
                if(item.system.attunement < 1){return;}
                return item.update({"system.attunement": item.system.attunement == 1? 2 : 1});
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
            _category:type, //This will be used by createEmbeddedDocuments to know what kind of entity to create
            system: structuredClone({...dataset})//foundry.utils.expandObject({ ...dataset })
        };
        itemData.system.type = {value: type};
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
            //Get a description out of the item
            const descrHTML = item.system.description?.html;
            //const descr = item.system.description.value;
            console.log(item);
            //We pass along the rendered html as 'description' to the template, which will render it using triple curly brackets
            let template = new LoadTemplate(null, "parts/item-summary", {description: descrHTML});
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

