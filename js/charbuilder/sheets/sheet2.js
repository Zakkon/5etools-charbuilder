class ActorCharactermancerSheet2 extends ActorCharactermancerSheet {
    $sheet;
    instance;
    _inv;
    actor;
    element;
    activeTab = "inventory";

    constructor(main){
        super(main);

        this.actor = new Actor5e();
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

        System5e.addHookBase("item_update", (p, collectionId) => {
            console.log("hook fired");
            this.render();
        });
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

            this.navigation_switchTab(this.activeTab); //Go to a tab
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

        this.activeTab = activeTabName;
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

    async getItem(collectionId){
        return this.actor.getItemByCollectionId(collectionId);
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
        const item = itemId != null? await this.getItem(itemId) : null; //item-id is the collectionId, unique per item in the inventory
        switch(action){
            case "create":
                //TODO: Make sure we are not a container also
                return this._onCreate(target);
            case "edit":
                //Get the ui object for the entire item
                C5e_Inventory.tryOpenEditWindow(this.actor, item, item.itemUid, "item", item.collectionId);
                return;
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
            type,
            system: structuredClone({...dataset})//foundry.utils.expandObject({ ...dataset })
        };
        delete itemData.system.type;
        //return this.actor.createEmbeddedDocuments("Item", [itemData]);
        return this.actor.createEmbeddedDocuments("item", [itemData]);
    }
}

class Actor5e {
    
    constructor(){
        this._createFakeCharacterData();
        this.owner = true;
    }
    
    _createFakeCharacterData(){

        const template = new CharacterTemplate();
        const schema = template.create();
        this.system = schema;
        console.log("schema:", this.system);

        this.system.abilities = {};
        this.proficiencyModifier = 2;

        
        
        const addAbility = (label, abbr, value=10, baseProf=0) => {
            //baseProf is either 0, 1, or 2 (none, proficient, expertise)
            const icon = baseProf == 0? "far fa-circle" : "fas fa-check";

            this.system.abilities[abbr] = {label, abbreviation:abbr, value, mod:System5e.calcAttrMod(value),
                save:System5e.calcAttrSave(value, baseProf, this.proficiencyModifier), baseProf, icon};
        }
        addAbility("Strength", "str");
        addAbility("Dexterity", "dex");
        addAbility("Constitution", "con");
        addAbility("Intelligence", "int");
        addAbility("Wisdom", "wis");
        addAbility("Charisma", "cha");

        console.log(CONFIG.DND5E);

        this.skills = {};
        let configSkills = [];
        const addSkill = (label, abbr, abilAbbr, baseProf=0) => {
            const icon = baseProf == 0? "far fa-circle" : baseProf == 1? "fas fa-check" : baseProf == 2? "fas fa-adjust" : "fas fa-check-double";
            const hover = baseProf == 0? "Not Proficient" : baseProf == 1? "Proficient" : baseProf == 2? "Half Proficient" : "Expertise";
            const baseValue = System5e.proficiencyMult(baseProf);
            const ability = this.system.abilities[abilAbbr];
            const value = baseValue >= 1;
            const {mod, passive} = System5e.calcSkillMod(ability.value, baseProf, this.proficiencyModifier);
            this.skills[label.toLowerCase()] = {label, value, ability:abilAbbr, baseValue, hover, icon, abbreviation:abilAbbr, total:mod, passive};
            configSkills.push(label.toLowerCase());
        }
        for(const [key, value] of Object.entries(CONFIG.DND5E.skills)){
            addSkill(value.label, key, value.ability);
        }
        

        

        this.hp = {
            value: 10,
            max: 20,
        };

        this.inventory = {
            weapon: {
                label: "Weapons",
                items: [], //item5e[]
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
                spells:[] //spell5e[]
            }
        }

        this.features = {
            race: {
                label: "Race",
                dataset: {type: "race"},
                items: [],
            },
            background: {
                label: "Background",
                dataset: {type: "background"},
                items: [],
            },
            class:{
                label: "Classes",
                dataset: {type: "class"},
                items: [],
            }
        }

        this.elements = {inventory: "dnd5e-inventory"};
        this.config = {skills:configSkills};

        
        this._prepareArmorClass();
    }
    
    createEmbeddedDocuments(embeddedName, data=[], context={}){

        console.log(data);
        let collection = [];
        if(embeddedName == "item"){
            //create item5e
            for(let d of data){
                let entity;
                let identified = false;
                switch(d.type){
                    case "spell":
                        entity = new Spell5e(null, null, true);
                        entity.properties = {verbal:{selected:true, label:"Verbal"}};
                        break;
                    default:
                        entity = new Item5e(null, 1, null, true);
                        d.system.identified = true;
                        break;
                }
                entity.system = d.system;
                entity.name = d.name;
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
            switch(it.type){
                case "spell":
                    if(it.system.preparationMode=="innate"){this.spellbook[it.system.preparationMode].spells.push(it);}
                    else{this.spellbook[it.system.level].spells.push(it);}
                    break;

                case "class":
                case "background":
                case "race":
                    this.features[it.type].items.push(it);
                    break;
                default:
                    this.inventory[it.type].items.push(it);
                    break;
            }
        }
    }

    async getItemByCollectionId(collectionId){
        let matches = [];
        const runMatching = (searchIn) => {
            matches = matches.concat(searchIn.filter(f => {return f.collectionId == collectionId;}));
        }
        //Search item inventory
        for(let section in this.inventory){ runMatching(this.inventory[section].items);}
        //Search features
        for(let section in this.features){ runMatching(this.features[section].items);}
        //Search spells
        for(let section in this.spellbook){ runMatching(this.spellbook[section].spells);}
       
        if(matches.length > 1){throw new Error("Not supposed to return more than one result", collectionId, this);}
        else if(matches.length < 1){
            console.error("Could not find a match to collection id", collectionId, this);
        }
        return matches[0];
    }
    get itemTypes(){
        let types = {};
        for(let [name, section] of Object.entries(this.inventory)){ types[name] = section.items; }
        for(let [name, section] of Object.entries(this.features)){ types[name] = section.items; }
        for(let [name, section] of Object.entries(this.spellbook)){ types[name] = section.spells; }
        return types;
    }
    /**
     * Prepare a data object which defines the data schema used by dice roll commands against this Actor
     * @param {object} [options]
     * @param {boolean} [options.deterministic] Whether to force deterministic values for data properties that could be
     *                                          either a die term or a flat term.
     */
    getRollData({ deterministic=false }={}) {
        let data;
        if ( this.system.getRollData ) data = this.system.getRollData({ deterministic });
        else data = this.system;//{...super.getRollData()};
        //data.flags = {...this.flags};
        //data.name = this.name;
        /* data.statuses = {};
        for ( const status of this.statuses ) {
        data.statuses[status] = status === "exhaustion" ? this.system.attributes?.exhaustion ?? 1 : 1;
        } */
        return data;
    }

    /**
   * Prepare a character's AC value from their equipped armor and shield.
   * Mutates the value of the `system.attributes.ac` object.
   */
    _prepareArmorClass() {
        const ac = this.system.attributes.ac;

        // Apply automatic migrations for older data structures
        let cfg = CONFIG.DND5E.armorClasses[ac.calc];
        if ( !cfg ) {
            ac.calc = "flat";
            if ( Number.isNumeric(ac.value) ) ac.flat = Number(ac.value);
            cfg = CONFIG.DND5E.armorClasses.flat;
        }

        // Identify Equipped Items
        const armorTypes = new Set(Object.keys(CONFIG.DND5E.armorTypes));
        const {armors, shields} = this.itemTypes.equipment.reduce((obj, equip) => {
            if ( !equip.system.equipped || !armorTypes.has(equip.system.type.value) ) return obj;
            if ( equip.system.type.value === "shield" ) obj.shields.push(equip);
            else obj.armors.push(equip);
            return obj;
        }, {armors: [], shields: []});
        const rollData = this.getRollData({ deterministic: true });

        console.log("AC", ac);
        // Determine base AC
        switch ( ac.calc ) {

            // Flat AC (no additional bonuses)
            case "flat":
                ac.value = Number(ac.flat);
                return;

            // Natural AC (includes bonuses)
            case "natural":
                ac.base = Number(ac.flat);
                break;

            default:
                let formula = ac.calc === "custom" ? ac.formula : cfg.formula;
                if ( armors.length ) {
                    if ( armors.length > 1 ) this._preparationWarnings.push({
                        message: "You are wearing multiple armors!", type: "warning"
                    });
                    const armorData = armors[0].system.armor;
                    const isHeavy = armors[0].system.type.value === "heavy";
                    ac.armor = armorData.value ?? ac.armor;
                    ac.dex = isHeavy ? 0 : Math.min(armorData.dex ?? Infinity, this.system.abilities.dex?.mod ?? 0);
                    ac.equippedArmor = armors[0];
                }
                else ac.dex = this.system.abilities.dex?.mod ?? 0;
                ac.armor = ac.armor ?? 0;

                rollData.attributes.ac = ac;
                console.log(rollData.attributes.ac);
                try {
                    const replaced = Roll.replaceFormulaData(formula, rollData, {
                        actor: this, missing: null, property: "ac",//game.i18n.localize("DND5E.ArmorClass")
                    });
                    ac.base = replaced ? new Roll(replaced).evaluateSync()/* .total */ : 0;
                    console.log("BASE", ac.base, replaced);
                } catch(err) {
                    /* this._preparationWarnings.push({
                        message: game.i18n.format("DND5E.WarnBadACFormula", { formula }), link: "armor", type: "error"
                    }); */
                    console.error("bad formula", formula, err);
                    const replaced = Roll.replaceFormulaData(CONFIG.DND5E.armorClasses.default.formula, rollData);
                    ac.base = new Roll(replaced).evaluateSync().total;
                }
                break;
        }

        // Equipped Shield
        if ( shields.length ) {
            if ( shields.length > 1 ) this._preparationWarnings.push({
                message: game.i18n.localize("DND5E.WarnMultipleShields"), type: "warning"
            });
            ac.shield = shields[0].system.armor.value ?? 0;
            ac.equippedShield = shields[0];
        }

        // Compute total AC and return
        ac.min = Roll.simplifyBonus(ac.min, rollData);
        ac.bonus = Roll.simplifyBonus(ac.bonus, rollData);
        ac.value = Math.max(ac.min, ac.base + (ac.shield??0) + ac.bonus + (ac.cover??0));
        console.log("RESULT AC:", ac);
    }
    
    static getProperty(data, term){

    }
}

class CommonTemplate {

    constructor(){}
     /**
   * Merge two schema definitions together as well as possible.
   * @param {DataSchema} a  First schema that forms the basis for the merge. *Will be mutated.*
   * @param {DataSchema} b  Second schema that will be merged in, overwriting any non-mergeable properties.
   * @returns {DataSchema}  Fully merged schema.
   */
  static mergeSchema(a, b) {
    Object.assign(a, b);
    return a;
  }

  static defineSchema(){
    return {};
  }
}
class CharacterTemplate extends CommonTemplate {
    constructor(){
        super();
    }

    create(){
        return {
            attributes: {
                ac: {
                    label: "Armor Class",
                    flat: 0,
                    calc: "default",
                    formula: {
                        deterministic:true,
                        label: "AC Formula"
                    }
                }
            }
        }
    }

    static defineSchema(){
        return this.mergeSchema(super.defineSchema(), {
            attributes: new SchemaField({
                ac: new SchemaField({
                    flat: new NumberField({integer: true, min: 0, label: "AC Flat"}),
                    calc: new StringField({ initial: "default", label: "DND5E.ArmorClassCalculation" }),
                    formula: new FormulaField({ deterministic: true, label: "DND5E.ArmorClassFormula" }),
                })
            })
        });
    }
}

/**
 * An abstract class that defines the base pattern for a data field within a data schema.
 * @abstract
 *
 * @property {string} name                The name of this data field within the schema that contains it
 *
 * @property {boolean} required=false     Is this field required to be populated?
 * @property {boolean} nullable=false     Can this field have null values?
 * @property {Function|*} initial         The initial value of a field, or a function which assigns that initial value.
 * @property {Function} validate          A data validation function which accepts one argument with the current value.
 * @property {boolean} [readonly=false]   Should the prepared value of the field be read-only, preventing it from being
 *                                        changed unless a change to the _source data is applied.
 * @property {string} label               A localizable label displayed on forms which render this field.
 * @property {string} hint                Localizable help text displayed on forms which render this field.
 * @property {string} validationError     A custom validation error string. When displayed will be prepended with the
 *                                        document name, field name, and candidate value.
 */
class DataField {
/**
 * @param {DataFieldOptions} options    Options which configure the behavior of the field
 */
constructor(options={}) {
    /**
     * The initially provided options which configure the data field
     * @type {DataFieldOptions}
     */
    this.options = options;
    for ( let k in this.constructor._defaults ) {
    this[k] = k in this.options ? this.options[k] : this.constructor._defaults[k];
    }
}
static mergeObject(a, b){
    Object.assign(a, b);
    return a;
}

/**
 * The field name of this DataField instance.
 * This is assigned by SchemaField#initialize.
 * @internal
 */
name;

/**
 * A reference to the parent schema to which this DataField belongs.
 * This is assigned by SchemaField#initialize.
 * @internal
 */
parent;

/**
 * Whether this field defines part of a Document/Embedded Document hierarchy.
 * @type {boolean}
 */
static hierarchical = false;

/**
 * Does this field type contain other fields in a recursive structure?
 * Examples of recursive fields are SchemaField, ArrayField, or TypeDataField
 * Examples of non-recursive fields are StringField, NumberField, or ObjectField
 * @type {boolean}
 */
static recursive = false;

/**
 * Default parameters for this field type
 * @return {DataFieldOptions}
 * @protected
 */
static get _defaults() {
    return {
    required: false,
    nullable: false,
    initial: undefined,
    readonly: false,
    label: "",
    hint: "",
    validationError: "is not a valid value"
    }
}

/**
 * A dot-separated string representation of the field path within the parent schema.
 * @type {string}
 */
get fieldPath() {
    return [this.parent?.fieldPath, this.name].filterJoin(".");
}

/**
 * Apply a function to this DataField which propagates through recursively to any contained data schema.
 * @param {string|function} fn          The function to apply
 * @param {*} value                     The current value of this field
 * @param {object} [options={}]         Additional options passed to the applied function
 * @returns {object}                    The results object
 */
apply(fn, value, options={}) {
    if ( typeof fn === "string" ) fn = this[fn];
    return fn.call(this, value, options);
}

/* -------------------------------------------- */
/*  Field Cleaning                              */
/* -------------------------------------------- */

/**
 * Coerce source data to ensure that it conforms to the correct data type for the field.
 * Data coercion operations should be simple and synchronous as these are applied whenever a DataModel is constructed.
 * For one-off cleaning of user-provided input the sanitize method should be used.
 * @param {*} value           The initial value
 * @param {object} [options]  Additional options for how the field is cleaned
 * @param {boolean} [options.partial]   Whether to perform partial cleaning?
 * @param {object} [options.source]     The root data model being cleaned
 * @returns {*}               The cast value
 */
clean(value, options) {

    // Permit explicitly null values for nullable fields
    if ( value === null ) {
    if ( this.nullable ) return value;
    value = undefined;
    }

    // Get an initial value for the field
    if ( value === undefined ) return this.getInitialValue(options.source);

    // Cast a provided value to the correct type
    value = this._cast(value);

    // Cleaning logic specific to the DataField.
    return this._cleanType(value, options);
}

/* -------------------------------------------- */

/**
 * Apply any cleaning logic specific to this DataField type.
 * @param {*} value           The appropriately coerced value.
 * @param {object} [options]  Additional options for how the field is cleaned.
 * @returns {*}               The cleaned value.
 * @protected
 */
_cleanType(value, options) {
    return value;
}

/* -------------------------------------------- */

/**
 * Cast a non-default value to ensure it is the correct type for the field
 * @param {*} value       The provided non-default value
 * @returns {*}           The standardized value
 * @protected
 */
_cast(value) {
    throw new Error(`Subclasses of DataField must implement the _cast method`);
}

/* -------------------------------------------- */

/**
 * Attempt to retrieve a valid initial value for the DataField.
 * @param {object} data   The source data object for which an initial value is required
 * @returns {*}           A valid initial value
 * @throws                An error if there is no valid initial value defined
 */
getInitialValue(data) {
    return this.initial instanceof Function ? this.initial(data) : this.initial;
}

/* -------------------------------------------- */
/*  Field Validation                            */
/* -------------------------------------------- */

/**
 * Validate a candidate input for this field, ensuring it meets the field requirements.
 * A validation failure can be provided as a raised Error (with a string message), by returning false, or by returning
 * a DataModelValidationFailure instance.
 * A validator which returns true denotes that the result is certainly valid and further validations are unnecessary.
 * @param {*} value                                  The initial value
 * @param {DataFieldValidationOptions} [options={}]  Options which affect validation behavior
 * @returns {DataModelValidationFailure}             Returns a DataModelValidationFailure if a validation failure
 *                                                   occurred.
 */
validate(value, options={}) {
    const validators = [this._validateSpecial, this._validateType];
    if ( this.options.validate ) validators.push(this.options.validate);
    try {
    for ( const validator of validators ) {
        const isValid = validator.call(this, value, options);
        if ( isValid === true ) return undefined;
        if ( isValid === false ) {
        return new DataModelValidationFailure({
            invalidValue: value,
            message: this.validationError
        });
        }
        if ( isValid instanceof DataModelValidationFailure ) return isValid;
    }
    } catch(err) {
    return new DataModelValidationFailure({invalidValue: value, message: err.message, unresolved: true});
    }
}

/* -------------------------------------------- */

/**
 * Special validation rules which supersede regular field validation.
 * This validator screens for certain values which are otherwise incompatible with this field like null or undefined.
 * @param {*} value               The candidate value
 * @returns {boolean|void}        A boolean to indicate with certainty whether the value is valid.
 *                                Otherwise, return void.
 * @throws                        May throw a specific error if the value is not valid
 * @protected
 */
_validateSpecial(value) {

    // Allow null values for explicitly nullable fields
    if ( value === null ) {
    if ( this.nullable ) return true;
    else throw new Error("may not be null");
    }

    // Allow undefined if the field is not required
    if ( value === undefined ) {
    if ( this.required ) throw new Error("may not be undefined");
    else return true;
    }
}

/* -------------------------------------------- */

/**
 * A default type-specific validator that can be overridden by child classes
 * @param {*} value                                    The candidate value
 * @param {DataFieldValidationOptions} [options={}]    Options which affect validation behavior
 * @returns {boolean|DataModelValidationFailure|void}  A boolean to indicate with certainty whether the value is
 *                                                     valid, or specific DataModelValidationFailure information,
 *                                                     otherwise void.
 * @throws                                             May throw a specific error if the value is not valid
 * @protected
 */
_validateType(value, options={}) {}

/* -------------------------------------------- */

/**
 * Certain fields may declare joint data validation criteria.
 * This method will only be called if the field is designated as recursive.
 * @param {object} data       Candidate data for joint model validation
 * @param {object} options    Options which modify joint model validation
 * @throws  An error if joint model validation fails
 * @internal
 */
_validateModel(data, options={}) {}

/* -------------------------------------------- */
/*  Initialization and Serialization            */
/* -------------------------------------------- */

/**
 * Initialize the original source data into a mutable copy for the DataModel instance.
 * @param {*} value                   The source value of the field
 * @param {Object} model              The DataModel instance that this field belongs to
 * @param {object} [options]          Initialization options
 * @returns {*}                       An initialized copy of the source data
 */
initialize(value, model, options={}) {
    return value;
}

/**
 * Export the current value of the field into a serializable object.
 * @param {*} value                   The initialized value of the field
 * @returns {*}                       An exported representation of the field
 */
toObject(value) {
    return value;
}

/**
 * Recursively traverse a schema and retrieve a field specification by a given path
 * @param {string[]} path             The field path as an array of strings
 * @protected
 */
_getField(path) {
    return path.length ? undefined : this;
}
}
/**
 * A special class of {@link DataField} which defines a data schema.
 */
class SchemaField extends DataField {
    /**
     * @param {DataSchema} fields                 The contained field definitions
     * @param {DataFieldOptions} options          Options which configure the behavior of the field
     */
    constructor(fields, options={}) {
        super(options);
        this.fields = this._initialize(fields);
        if ( !("initial" in options) ) this.initial = () => this.clean({});
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    static get _defaults() {
        return DataField.mergeObject(super._defaults, {
        required: true,
        nullable: false,
        initial: {}
        });
    }

    /** @override */
    static recursive = true;

    /* -------------------------------------------- */

    /**
     * The contained field definitions.
     * @type {DataSchema}
     */
    fields;

    /* -------------------------------------------- */

    /**
     * Initialize and validate the structure of the provided field definitions.
     * @param {DataSchema} fields     The provided field definitions
     * @returns {DataSchema}          The validated schema
     * @protected
     */
    _initialize(fields) {
        if ( (typeof fields !== "object") ) {
        throw new Error("A DataFields must be an object with string keys and DataField values.");
        }
        for ( const [name, field] of Object.entries(fields) ) {
        if ( !(field instanceof DataField) ) {
            throw new Error(`The "${name}" field is not an instance of the DataField class.`);
        }
        if ( field.parent !== undefined ) {
            throw new Error(`The "${field.fieldPath}" field already belongs to some other parent and may not be reused.`);
        }
        field.name = name;
        field.parent = this;
        }
        return fields;
    }

    /* -------------------------------------------- */
    /*  Schema Iteration                            */
    /* -------------------------------------------- */

    /**
     * Iterate over a SchemaField by iterating over its fields.
     * @type {Iterable<DataField>}
     */
    *[Symbol.iterator]() {
        for ( const field of Object.values(this.fields) ) {
        yield field;
        }
    }

    /**
     * An array of field names which are present in the schema.
     * @returns {string[]}
     */
    keys() {
        return Object.keys(this.fields);
    }

    /**
     * An array of DataField instances which are present in the schema.
     * @returns {DataField[]}
     */
    values() {
        return Object.values(this.fields);
    }

    /**
     * An array of [name, DataField] tuples which define the schema.
     * @returns {Array<[string, DataField]>}
     */
    entries() {
        return Object.entries(this.fields);
    }

    /**
     * Test whether a certain field name belongs to this schema definition.
     * @param {string} fieldName    The field name
     * @returns {boolean}           Does the named field exist in this schema?
     */
    has(fieldName) {
        return fieldName in this.fields;
    }

    /**
     * Get a DataField instance from the schema by name
     * @param {string} fieldName    The field name
     * @returns {DataField}         The DataField instance or undefined
     */
    get(fieldName) {
        return this.fields[fieldName];
    }

    /**
     * Traverse the schema, obtaining the DataField definition for a particular field.
     * @param {string[]|string} fieldName       A field path like ["abilities", "strength"] or "abilities.strength"
     * @returns {SchemaField|DataField}         The corresponding DataField definition for that field, or undefined
     */
    getField(fieldName) {
        let path;
        if ( typeof fieldName === "string" ) path = fieldName.split(".");
        else if ( Array.isArray(fieldName) ) path = fieldName;
        else throw new Error("A field path must be an array of strings or a dot-delimited string");
        return this._getField(path);
    }

    /** @override */
    _getField(path) {
        if ( !path.length ) return this;
        const field = this.get(path.shift());
        return field?._getField(path);
    }

    /* -------------------------------------------- */
    /*  Data Field Methods                          */
    /* -------------------------------------------- */

    /** @override */
    _cast(value) {
        return typeof value === "object" ? value : {};
    }

    /* -------------------------------------------- */

    /** @inheritdoc */
    _cleanType(data, options={}) {
        options.source = options.source || data;

        // Clean each field which belongs to the schema
        for ( const [name, field] of this.entries() ) {
        if ( !(name in data) && options.partial ) continue;
        data[name] = field.clean(data[name], options);
        }

        // Delete any keys which do not
        for ( const k of Object.keys(data) ) {
        if ( !this.has(k) ) delete data[k];
        }
        return data;
    }

    /* -------------------------------------------- */

    /** @override */
    initialize(value, model, options={}) {
        if ( !value ) return value;
        const data = {};
        for ( let [name, field] of this.entries() ) {
        const v = field.initialize(value[name], model, options);

        // Readonly fields
        if ( field.readonly ) {
            Object.defineProperty(data, name, {value: v, writable: false});
        }

        // Getter fields
        else if ( (typeof v === "function") && !v.prototype ) {
            Object.defineProperty(data, name, {get: v, set() {}, configurable: true});
        }

        // Writable fields
        else data[name] = v;
        }
        return data;
    }

    /* -------------------------------------------- */

    /** @override */
    _validateType(data, options={}) {
        if ( !(data instanceof Object) ) throw new Error("must be an object");
        options.source = options.source || data;
        const schemaFailure = new DataModelValidationFailure();
        for ( const [key, field] of this.entries() ) {
        if ( options.partial && !(key in data) ) continue;

        // Validate the field's current value
        const value = data[key];
        const failure = field.validate(value, options);

        // Failure may be permitted if fallback replacement is allowed
        if ( failure ) {
            schemaFailure.fields[field.name] = failure;

            // If the field internally applied fallback logic
            if ( !failure.unresolved ) continue;

            // If fallback is allowed at the schema level
            if ( options.fallback ) {
            const initial = field.getInitialValue(options.source);
            if ( field.validate(initial, {source: options.source}) === undefined ) {  // Ensure initial is valid
                data[key] = initial;
                failure.fallback = initial;
                failure.unresolved = false;
            }
            else failure.unresolved = schemaFailure.unresolved = true;
            }

            // Otherwise the field-level failure is unresolved
            else failure.unresolved = schemaFailure.unresolved = true;
        }
        }
        if ( !isEmpty(schemaFailure.fields) ) return schemaFailure;
    }

    /* ---------------------------------------- */

    /** @override */
    _validateModel(changes, options={}) {
        options.source = options.source || changes;
        if ( !changes ) return;
        for ( const [name, field] of this.entries() ) {
        const change = changes[name];  // May be nullish
        if ( change && field.constructor.recursive ) field._validateModel(change, options);
        }
    }

    /* -------------------------------------------- */

    /** @override */
    toObject(value) {
        if ( (value === undefined) || (value === null) ) return value;
        const data = {};
        for ( const [name, field] of this.entries() ) {
        data[name] = field.toObject(value[name]);
        }
        return data;
    }

    /* -------------------------------------------- */

    /** @override */
    apply(fn, data={}, options={}) {
        const results = {};
        for ( const [key, field] of this.entries() ) {
        if ( options.partial && !(key in data) ) continue;
        const r = field.apply(fn, data[key], options);
        if ( !options.filter || !isEmpty(r) ) results[key] = r;
        }
        return results;
    }

    /* -------------------------------------------- */

    /**
     * Migrate this field's candidate source data.
     * @param {object} sourceData   Candidate source data of the root model
     * @param {any} fieldData       The value of this field within the source data
     */
    migrateSource(sourceData, fieldData) {
        for ( const [key, field] of this.entries() ) {
        const canMigrate = field.migrateSource instanceof Function;
        if ( canMigrate && fieldData[key] ) field.migrateSource(sourceData, fieldData[key]);
        }
    }
}
    
/* -------------------------------------------- */
/*  Basic Field Types                           */
/* -------------------------------------------- */

/**
 * A subclass of [DataField]{@link DataField} which deals with boolean-typed data.
 */
class BooleanField extends DataField {

/** @inheritdoc */
static get _defaults() {
    return DataField.mergeObject(super._defaults, {
    required: true,
    nullable: false,
    initial: false
    });
}

/** @override */
_cast(value) {
    if ( typeof value === "string" ) return value === "true";
    if ( typeof value === "object" ) return false;
    return Boolean(value);
}

/** @override */
_validateType(value) {
    if (typeof value !== "boolean") throw new Error("must be a boolean");
}
}
/**
 * A subclass of [DataField]{@link DataField} which deals with number-typed data.
 *
 * @property {number} min                 A minimum allowed value
 * @property {number} max                 A maximum allowed value
 * @property {number} step                A permitted step size
 * @property {boolean} integer=false      Must the number be an integer?
 * @property {number} positive=false      Must the number be positive?
 * @property {number[]|object|function} [choices]  An array of values or an object of values/labels which represent
 *                                        allowed choices for the field. A function may be provided which dynamically
 *                                        returns the array of choices.
 */
class NumberField extends DataField {
/**
 * @param {NumberFieldOptions} options  Options which configure the behavior of the field
 */
constructor(options={}) {
    super(options);
    // If choices are provided, the field should not be null by default
    if ( this.choices ) {
    this.nullable = options.nullable ?? false;
    }
}

/** @inheritdoc */
static get _defaults() {
    return DataField.mergeObject(super._defaults, {
    initial: null,
    nullable: true,
    min: undefined,
    max: undefined,
    step: undefined,
    integer: false,
    positive: false,
    choices: undefined
    });
}

/** @override */
_cast(value) {
    return Number(value);
}

/** @inheritdoc */
_cleanType(value, options) {
    value = super._cleanType(value, options);
    if ( typeof value !== "number" ) return value;
    if ( this.integer ) value = Math.round(value);
    if ( this.positive ) value = Math.abs(value);
    if ( Number.isFinite(this.min) ) value = Math.max(value, this.min);
    if ( Number.isFinite(this.max) ) value = Math.min(value, this.max);
    if ( Number.isFinite(this.step) ) value = value.toNearest(this.step);
    return value;
}

/** @override */
_validateType(value) {
    if ( typeof value !== "number" ) throw new Error("must be a number");
    if ( this.positive && (value <= 0) ) throw new Error("must be a positive number");
    if ( Number.isFinite(this.min) && (value < this.min) ) throw new Error(`must be at least ${this.min}`);
    if ( Number.isFinite(this.max) && (value > this.max) ) throw new Error(`must be at most ${this.max}`);
    if ( Number.isFinite(this.step) && (value.toNearest(this.step) !== value) ) {
    throw new Error(`must be an increment of ${this.step}`);
    }
    if ( this.choices && !this.#isValidChoice(value) ) throw new Error(`${value} is not a valid choice`);
    if ( this.integer ) {
    if ( !Number.isInteger(value) ) throw new Error("must be an integer");
    }
    else if ( !Number.isFinite(value) ) throw new Error("must be a finite number");
}

/**
 * Test whether a provided value is a valid choice from the allowed choice set
 * @param {number} value      The provided value
 * @returns {boolean}         Is the choice valid?
 */
#isValidChoice(value) {
    let choices = this.choices;
    if ( choices instanceof Function ) choices = choices();
    if ( choices instanceof Array ) return choices.includes(value);
    return String(value) in choices;
}
}
/**
   * A subclass of [DataField]{@link DataField} which deals with string-typed data.
   *
   * @property {boolean} blank=true         Is the string allowed to be blank (empty)?
   * @property {boolean} trim=true          Should any provided string be trimmed as part of cleaning?
   * @property {string[]|object|function} [choices]  An array of values or an object of values/labels which represent
   *                                        allowed choices for the field. A function may be provided which dynamically
   *                                        returns the array of choices.
   */
class StringField extends DataField {
    /**
     * @param {StringFieldOptions} options  Options which configure the behavior of the field
     */
    constructor(options={}) {
      super(options);

      // If choices are provided, the field should not be null or blank by default
      if ( this.choices ) {
        this.nullable = options.nullable ?? false;
        this.blank = options.blank ?? false;
      }

      // Adjust the default initial value depending on field configuration
      if ( !("initial" in options) ) {
        if ( !this.required ) this.initial = undefined;
        else if ( this.blank ) this.initial = "";
        else if ( this.nullable ) this.initial = null;
      }
    }

    /** @inheritdoc */
    static get _defaults() {
      return DataField.mergeObject(super._defaults, {
        blank: true,
        trim: true,
        nullable: false,
        choices: undefined,
        textSearch: false
      });
    }

    /** @inheritdoc */
    clean(value, options) {
      if ( (typeof value === "string") && this.trim ) value = value.trim(); // Trim input strings
      if ( value === "" ) {  // Permit empty strings for blank fields
        if ( this.blank ) return value;
        value = undefined;
      }
      return super.clean(value, options);
    }

    /** @override */
    _cast(value) {
      return String(value);
    }

    /** @inheritdoc */
    _validateSpecial(value) {
      if ( value === "" ) {
        if ( this.blank ) return true;
        else throw new Error("may not be a blank string");
      }
      return super._validateSpecial(value);
    }

    /** @override */
    _validateType(value) {
      if ( typeof value !== "string" ) throw new Error("must be a string");
      else if ( this.choices ) {
        if ( this._isValidChoice(value) ) return true;
        else throw new Error(`${value} is not a valid choice`);
      }
    }

    /**
     * Test whether a provided value is a valid choice from the allowed choice set
     * @param {string} value      The provided value
     * @returns {boolean}         Is the choice valid?
     * @protected
     */
    _isValidChoice(value) {
      let choices = this.choices;
      if ( choices instanceof Function ) choices = choices();
      if ( choices instanceof Array ) return choices.includes(value);
      return String(value) in choices;
    }
}
/**
 * Special case StringField which represents a formula.
 *
 * @param {FormulaFieldOptions} [options={}]  Options which configure the behavior of the field.
 * @property {boolean} deterministic=false    Is this formula not allowed to have dice values?
 */
class FormulaField extends StringField {

    /** @inheritDoc */
    static get _defaults() {
      return DataField.mergeObject(super._defaults, {
        deterministic: false
      });
    }
  
    /* -------------------------------------------- */
  
    /** @inheritDoc */
    _validateType(value) {
      Roll.validate(value);
      if ( this.options.deterministic ) {
        const roll = new Roll(value);
        if ( !roll.isDeterministic ) throw new Error("must not contain dice terms");
      }
      super._validateType(value);
    }
  
    /* -------------------------------------------- */
    /*  Active Effect Integration                   */
    /* -------------------------------------------- */
  
    /** @override */
    _castChangeDelta(delta) {
      return this._cast(delta).trim();
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _applyChangeAdd(value, delta, model, change) {
      if ( !value ) return delta;
      const operator = delta.startsWith("-") ? "-" : "+";
      delta = delta.replace(/^[+-]/, "").trim();
      return `${value} ${operator} ${delta}`;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _applyChangeMultiply(value, delta, model, change) {
      if ( !value ) return delta;
      const terms = new Roll(value).terms;
      if ( terms.length > 1 ) return `(${value}) * ${delta}`;
      return `${value} * ${delta}`;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _applyChangeUpgrade(value, delta, model, change) {
      if ( !value ) return delta;
      const terms = new Roll(value).terms;
      if ( (terms.length === 1) && (terms[0].fn === "max") ) return current.replace(/\)$/, `, ${delta})`);
      return `max(${value}, ${delta})`;
    }
  
    /* -------------------------------------------- */
  
    /** @override */
    _applyChangeDowngrade(value, delta, model, change) {
      if ( !value ) return delta;
      const terms = new Roll(value).terms;
      if ( (terms.length === 1) && (terms[0].fn === "min") ) return current.replace(/\)$/, `, ${delta})`);
      return `min(${value}, ${delta})`;
    }
  }