class System5e{
    
    static applyClassChoiceData(actor, choiceData){
        let updatePool = {};
        for(let cls of choiceData.classes){
            //Apply skill proficiencies
            for(let [skillName, profValue] of Object.entries(cls.skillProficiencies)){
                console.log(skillName, profValue);
                let skill = actor.skills[skillName];
                skill.baseProf = profValue;
                const newSkill = System5e.calcSkillEmbed(skill, actor.system.abilities, actor.system.attributes.prof);
                updatePool[`skills.${skillName}`] = newSkill;
            }
        }
        if(Object.entries(updatePool).length > 0){actor.update(updatePool);}
    }

    /**
     * @param {string} formula
     * * @param {{formula:string}[]} alterations
     * @returns {number}
     */
    static calculateFormula(formula, parent){
        //Calculate the formula

        const pattern = /@\w+(\.\w+)*/g;

        // Replace object references with random numbers
        const result = formula.replace(pattern, (match) => {
            //calculate the object reference
            //split the string by periods
            //remove @
            let words = (match.startsWith('@') ? match.slice(1) : match).split(".");
            console.log(words);
            if(words[0] == "scale"){
                const val = this.calculateClassScale(words[1], words[2], parent);
                return val.toString();
            }
            return "4";
        });
        return eval(result);
    }
    static calculateClassScale(className, identifier, parent){
        const activeClassData = ActorCharactermancerSheet.getClassData(parent.compClass);
        console.log("classData", activeClassData);
        const classLevel = System5e.getClassLevel(className, activeClassData);
        //const scale = this._getClassScales(className)[identifier];
        //return scale.scale[classLevel.toString()].value;
        return this._getTableColumnValue(this._getClassTable(className, parent.compClass._data.class), identifier, (classLevel-1).toString());
    }
    static _getTableColumnValue(table, columnName, rowValue){
        columnName = columnName.toLowerCase();
        let colIx = 0;
        for(let i = 0; i < table.colLabels.length; ++i){if(table.colLabels[i].toLowerCase() == columnName){colIx = i;}}
        return table.rows[rowValue][colIx];
    }
    static _getClassTable(className, classDatas){
        console.log(classDatas);
        for(let cls of classDatas){
            if(cls.name.toLowerCase() == className){
                return cls.classTableGroups[0];
            }
        }
    }
    static _getClassScales(className){
        const data = this.getClassData(className);
        //Get scales
        //in advancements
        let scales = {};
        for(let ad of data.advancement){
            switch (ad.type.toLowerCase()){
                case "scalevalue": scales[ad.configuration.identifier] = ad; break;
                default: break;
            }
        }
        return scales;
    }
    static getClassData(className){
        //not implemented
    }
    static getClassLevel(className, activeClassData){
        for(let cls of activeClassData){
            if(cls.cls.name.toLowerCase() == className){
                return cls.targetLevel;}
        }
        return 0;
    }
    static replaceFormulaData(formula, data){
        const dataRgx = new RegExp(/@([a-z.0-9_-]+)/gi);
        console.log("input", formula);
        const missingReferences = new Set();
        console.log(formula);
        formula = formula.replace(dataRgx, (match, term) => {
       /*  let value = foundry.utils.getProperty(data, term);
        if ( value == null ) {
            missingReferences.add(match);
            return "0";
        }
        return String(value).trim(); */
            let words = (match.startsWith('@') ? match.slice(1) : match).split(".");
            console.log(words);
            if(words[0] == "scale"){
                const val = this.calculateClassScale(words[1], words[2], data);
                return val.toString();
            }
            return "4";

        });
        console.log(formula);
    }

    /**
     * @param {Character} character
     * @param {System} system
     * @returns {Character}
     */
    static extendSchema_Character(character, system=null){
        let newSystem = {
            inventory: {
                items:[],
                currency:{}
            },
            override: {
            },
        }
        if(system != null){ //Just load from existing system if one was specified
            newSystem = System5e.loadSchemaExtension(character, system);
            newSystem.inventory.items ??= []; //Make sure items isnt null
            for(let i = 0; i < newSystem.inventory.items.length; ++i){
                newSystem.inventory.items[i] = Item5e.recast(newSystem.inventory.items[i]);
            }
            newSystem.inventory.currency ??= {};
            newSystem.override ??= {};
        }
        character.system = newSystem;
        return character;
    }
    static extendSchema_Item(item, state=null){
        if(state != null){ //Just load from existing state
            return System5e.loadSchemaExtension(item, state);
        }
        item.system = {
            isEquipped: false,
            identified: true,
            quantity: 1,
            uses: {
                max: "",
                spent: 0,
                recovery: [],
            },
            container: null,
            override: {},
        }
        return item;
    }
    static ensureProperties(obj, template) {



        properties.forEach(prop => {
            if (!(prop.name in obj)) {
                obj[prop.name] = {};
            }
            if (prop.children) {
                ensureProperties(obj[prop.name], prop.children);
            }
        });
    }
    static loadSchemaExtension(schema, state){
        if(typeof(state) === "String"){state = JSON.parse(state);}
        console.log("LOADED STATE", state);
        return state;
        //schema.system = state;
        //return schema;
    }
    static serializeSchemaExtension(schema){
        return JSON.stringify(schema.system);
    }

    static async tryAddToInventory_Item(actor, collectionId, itemUid, quantity, itemType="weapon"){
        //Try to see if this item already exists in the character inventory
        let item5e = await actor.getItemByCollectionId(collectionId);
        if(!item5e){
            //If it doesnt, create a new item5e, import system data, then add to inventory
            item5e = new Item5e(itemUid, quantity, collectionId);
            await item5e.importSystemData();
            item5e.type = itemType;
            actor._addEntities([item5e]);
            return item5e;
        }
        else{
            //If it does, just verify & import system data, no need to re-add it to the inventory
            await item5e.importSystemData();
            return item5e;
        }
    }
    static async tryAddToInventory_Spell(actor, collectionId, itemUid, quantity){
        //Try to see if this item already exists in the character inventory
        let spell5e = System5e.getEntityByCollectionId(collectionId);
        if(!spell5e){
            //If it doesnt, create a new item5e, import system data, then add to inventory
            spell5e = new Spell5e(itemUid, collectionId);
            await spell5e.importSystemData();
            await System5e.tryAddToInventory(actor, spell5e);
            await ActorCharactermancerSheet.c5e_inventory.rebuildUi();
            return spell5e;
        }
        else{
            //If it does, just verify & import system data, no need to re-add it to the inventory
            await spell5e.importSystemData();
            return spell5e;
        }
    }
    /**
     * Shorthand for adding an already created entity5e to the actor inventory
     * @param {Actor5e} actor
     * @param {Entity5e} entity5e
     * @param {string} itemType
     * @returns {Entity5e}
     */
    static async tryAddToInventory(actor, entity5e, itemType, options={}){
        console.error("Add item", entity5e.name, entity5e.collectionId);
        entity5e.type = itemType;
        actor.createEmbeddedDocuments("item", [], [entity5e], options);
        return entity5e;
    }
    static async removeFromInventory(actor, collectionId){
        console.error("Remove item", collectionId);
        const index = actor.character.system.inventory.items.map(e => e.collectionId).indexOf(collectionId);
        actor.character.system.inventory.items.splice(index, 1);
    }
    /**
     * Try to get an existing entiy from the inventory
     * @param {Actor} actor
     * @param {string} itemType
     * @param {string} matchData should match the uid of the entity
     * @param {string} collectionId If this is provided, it will be used during matching instead of matchData
     * @returns {Entity5e}
     */
    static getFromInventory(itemType, matchData, collectionId, actor=null){
        if(!actor){actor = CharacterBuilder.instance._actor;}
        for(let it of actor.character.system.inventory.items){
            //To get the functions on the Item5e object, we need to recast it
            if(!it.type != itemType){continue;}
            if(collectionId!= null){if(it.collectionId == collectionId){return it;}continue;}
            if(ent.uid == matchData){return it;}
        }
        return null;
    }
    static getInventoryEntities(actor=null){
        if(!actor){actor = CharacterBuilder.instance._actor;}
        return actor.character.system.inventory.items;
    }
    static __hooks = {};
    static hkItemUpdated(collectionID){
       //Fire hook
       System5e._fireHook("state", "item_update", collectionID);
    }
    static hkActorUpdated(){
        //Fire hook
        System5e._fireHook("state", "actor_update", true);
     }
    static _fireHook(hookProp, prop, value){
        if (this.__hooks[hookProp] && this.__hooks[hookProp][prop]) this.__hooks[hookProp][prop].forEach(hook => hook(prop, value, value/* prevValue */));
    }
    static addHookBase(prop, hook){
        ProxyBase._addHook_to(System5e.__hooks, "state", prop, hook);
    }
    static removeHookBase(prop, hook){

    }

    /**
     * Get an Entity5e using the collection id. Item must already be in actor's inventory
     * @param {string} collectionId
     * @param {Actor} actor
     * @returns {Entity5e}
     */
    static getEntityByCollectionId(collectionId, actor=null){
        if(!actor){actor = CharacterBuilder.instance._actor;}
        for(let it of actor.character.system.inventory.items){
            if(it == null){ console.warn("Null entity found in inventory", actor.character.system.inventory.items); continue;}
            if(it.collectionId == collectionId){return it;}
        }
        return null;
    }
    /**
     * Returns any items in the inventory matching the value of property
     * @param {string} property
     * @param {any} value
     * @param {Actor} actor=null
     * @returns {Entity5e[]}
     */
    static getEntitiesByProp(property, value, actor=null){
        return System5e.getEntitiesByProps([{property:property, value:value}], actor);
    }
    /**
     * Returns any items in the inventory matching the value of property
     * @param {{property:string, value:any}[]} propPairs
     * @param {Actor} actor=null
     * @returns {Entity5e[]}
     */
    static getEntitiesByProps(propPairs, actor=null){
        if(!actor){actor = CharacterBuilder.instance._actor;}
        let ar = [];
        for(let it of actor.character.system.inventory.items){
            //To get the functions on the Item5e object, we need to recast it
            let match = true;
            for(let i = 0; i < propPairs.length && match; ++i){
                let pv = propPairs[i];
                if(it[pv.property] != pv.value){match = false;}
            }
            if(match){ar.push(it);}
        }
        return ar;
    }
    static createUniqueID(){
        return Math.random().toString(16).slice(2);
    }

    //#region Game Rules
    static proficiencyMult(baseProf){
        return baseProf == 0? 0 : baseProf == 1? 1 : baseProf == 2? 0.5 : 2;
    }
    static calcAttrMod(abilityScore){
        let mod = Math.floor((abilityScore-10)/2);
        return mod;
    }
    static calcAttrSave(abilityScore, baseProf, profMod){
        let mod = System5e.calcAttrMod(abilityScore);
        mod += profMod * System5e.proficiencyMult(baseProf); //proficiency/expertise bonus
        return mod;
    }
    static calcSkillMod(abilityScore, baseProf, profMod){
        let mod = System5e.calcAttrMod(abilityScore);
        mod += profMod * System5e.proficiencyMult(baseProf); //proficiency/expertise bonus
        return {mod: mod, passive:(10+mod)};
    }
    /**
     * @param {object} data
     * @param {number} [data.baseProf]
     * @param {string} [data.ability]
     * @param {object} [abilities]
     * @param {number} [proficiencyModifier]
     * @returns {any}
     */
    static calcSkillEmbed(data, abilities, proficiencyModifier) {
        data.icon = data.baseProf == 0? "far fa-circle" : data.baseProf == 1? "fas fa-check" : data.baseProf == 2? "fas fa-adjust" : "fas fa-check-double";
        data.hover = data.baseProf == 0? "Not Proficient" : data.baseProf == 1? "Proficient" : data.baseProf == 2? "Half Proficient" : "Expertise";
        data.baseValue = System5e.proficiencyMult(data.baseProf);
        data.value = data.baseProf >= 1;
        data.abbreviation = data.ability;
        const {mod, passive} = System5e.calcSkillMod(abilities[data.ability].value, data.baseProf, proficiencyModifier);
        data.total = mod;
        data.passive = passive;
        return data;
        return {label, value, ability:abilAbbr, baseValue, hover, icon, abbreviation:abilAbbr, total:mod, passive};
    }
    //#endregion
}

class Entity5e {
    static use_overrides = false;
    override;
    constructor(itemUid, collectionId, isCustom){
        this.uid = itemUid;
        this.collectionId = collectionId? collectionId : System5e.createUniqueID();
        this.isCustom = isCustom;
        this.override = {};
    }
    
    get config(){return DND5E;}
    prop(path){return Entity5e.getp(this, path);}
    _createProxy(){
        return new Proxy(this, {
            get: (target, prop) => {
                if (prop === 'system') {
                    return new Proxy(target.system, {
                        get: (systemTarget, systemProp) => {
                            const overrideValue = target.override[systemProp];//target.getNestedProperty(target.override, systemProp);
                            const systemValue = systemTarget[systemProp];
                            //console.log(systemProp, systemValue,">", overrideValue);
                            return overrideValue !== null && overrideValue !== undefined ? overrideValue : systemValue;
                        }
                    });
                }
                return target[prop];
            }
        });
    }
    _tryCloneOriginal(original){
        if(original == null){return;}
        this.name = original.name;
        this.system = structuredClone(original.system);
        this.entries = structuredClone(original.entries);
    }
    setDependency(type, key){
        this.dependsOnType = type.toLowerCase();
        this.dependsOn = key.toLowerCase();
    }
    setProp(path, value, toOverride=Entity5e.use_overrides){
        Entity5e.setp(this, path, value, toOverride);
    }
    static setp(obj, path, value, toOverride=Entity5e.use_overrides, defaultSystem="system", overrideSystem="override"){ //DEBUG: turning off overrides for now
        const recursiveSearch = (start, _path, value) => {
            const properties = _path.split('.');
            let current = start;
            for (let i = 0; i < properties.length; i++) {
                if(i+1>=properties.length){current[properties[i]] = value; return value;}
                if (current[properties[i]] === undefined) { current[properties[i]] = {}; current = current[properties[i]];}
                else { current = current[properties[i]]; }
            }
            return current;
        }
        if(toOverride){
            //Cut away the "system." part of the path (since we don't want system *inside* overwrite)
            let path2 = path;
            const firstProp = defaultSystem + ".";
            if(path2.startsWith(firstProp)){path2 = path.slice((firstProp).length);}
            recursiveSearch(obj[overrideSystem], path2, value);
        }
        else{recursiveSearch(obj, path, value);}
    }
    /**
     * @param {Item|Item5e} obj
     * @param {string} path
     * @returns {any}
     */
    static getp(obj, path, defaultSystem = "system", overrideSystem="override"){
        const recursiveSearch = (start, _path) => {
            const properties = _path.split('.');
            let current = start;
            if(current == undefined){return undefined;}
            for (let i = 0; i < properties.length; i++) {
                if (current[properties[i]] === undefined) {
                    return undefined;
                } else {
                    current = current[properties[i]];
                }
            }
            return current;
        }
        
       
        //Try to get an override (if present)
        //Cut away the "system." part of the path (since we don't want system *inside* overwrite)
        let path2 = path;
        const firstProp = defaultSystem + ".";
        if(path2.startsWith(firstProp)){path2 = path.slice((firstProp).length);}
        const override = Entity5e.use_overrides? recursiveSearch(obj[overrideSystem], path2, value) : null;
        
        return override != null? override : recursiveSearch(obj, path);
    }
    update(data){
        for(let [key, value] of Object.entries(data)){
            this.setProp(key, value);
        }
        //Fire item update
        System5e.hkItemUpdated(this.collectionId);
    }

    get isMancerCreated(){
        return this.mancerDependency != null;
    }
    markMancerDependency(dependency){
        this.mancerDependency = dependency;
    }
    isMancerDependencyMatch(creationKey){return this.isMancerCreated && this.mancerDependency.creationKey == creationKey;}

    stringifyEntries(){
        for(let i = 0; i < this.entries.length; ++i){
            
        }
    }

    
    get hasAttack() {
        return ["mwak", "rwak", "msak", "rsak"].includes(this.system.actionType);
    }
    get hasDamage() {
        return this.system.actionType && (this.system.damage.parts.length > 0);
    }
    get isHealing() {
        return (this.system.actionType === "heal") && this.hasDamage;
    }
    
}
class Item5e extends Entity5e{
    constructor(itemUid, quantity=1, collectionId=null, isCustom=false){
        super(itemUid, collectionId, isCustom);
        this.entityType = "item";
        this.quantity = quantity;
        if(!this.isCustom){this._tryCloneOriginal(CharacterBuilder.getItemByUid(this.uid));}
        this.properties = {};

        if(!Entity5e.use_overrides){return this;}
        return this._createProxy();
    }
    static recast(inputObj){
        let item5e = new Item5e(inputObj.uid, inputObj.quantity, inputObj.collectionId, inputObj.isCustom);
        inputObj && Object.assign(item5e, inputObj);
        return item5e;
    }
    get itemData(){return CharacterBuilder.getItemByUid(this.uid);}
    /* DND 5E BOOLEANS */
    get isCostlessAction(){return false;/* this.system.activation?.type in DND5E.staticAbilityActivationTypes; */}
    get isCrewed(){return this.system.activation?.type === "crew";}
    get isFormulaRecharge(){ !!DND5E.limitedUsePeriods[this.system.uses?.per]?.formula;}
    async importSystemData(){
        //First, check if system data isn't already imported
        //TODO: after system data is imported, cache the UID in character builder, and just do string matching instead
        let existingData = CharacterBuilder.getItemByUid(this.uid);
        if(existingData.system){return;}
        //No system data exists, go ahead and import
        let imported = await SourceManager.plutoniumConvertData(existingData, "item");
        existingData.system = imported.system;
        this.system = imported.system; //TEMPFIX
    }
    
    //Runtime label calculations
    get labels(){
        let system = this.system;
        const activation = `${system.activation.cost ?? 0} ${system.activation.type}`;

        return {
            activation
        };
    }
    get canToggle(){
        switch(this.type){
            case "weapon":
            case "equipment":
            return true;

            default: return false;
        }
    }
    get toggleClass(){
        return this.system.equipped? "active" : "";
    }
    get toggleTitle(){
        return this.system.equipped? "Equipped" : "Not Equipped";
    }
}

class Feature5e extends Entity5e{
    constructor(hash, collectionId=null, isCustom){
        super(hash, collectionId, isCustom);
        this.entityType = "feature";
    }
}
class Class5e extends Feature5e{
    constructor(itemUid, collectionId=null, isCustom=false){
        super(itemUid, collectionId, isCustom);
        this.type = "class";
        if(!this.isCustom){this._tryCloneOriginal(CharacterBuilder.getEntityByUid("class", {uid: this.uid}));}

        if(!Entity5e.use_overrides){return this;}
        return this._createProxy();
    }
    _tryCloneOriginal(original){
        super._tryCloneOriginal(original);
        if(original == null){return;}
        this.source = original.source;
        this.classFeatures = original.classFeatures;
    }
}
class Race5e extends Feature5e{
    constructor(itemUid, collectionId=null, isCustom=false){
        super(itemUid, collectionId, isCustom);
        this.type = "race";
        if(!this.isCustom){this._tryCloneOriginal(CharacterBuilder.getEntityByUid("race", {uid: this.uid}));}

        if(!Entity5e.use_overrides){return this;}
        return this._createProxy();
    }
}
class Background5e extends Feature5e{
    constructor(itemUid, collectionId=null, isCustom=false){
        super(itemUid, collectionId, isCustom);
        this.type = "background";
        if(!this.isCustom){this._tryCloneOriginal(CharacterBuilder.getEntityByUid("background", {uid: this.uid}));}

        if(!Entity5e.use_overrides){return this;}
        return this._createProxy();
    }
}
class OptionalFeature5e extends Feature5e{
    constructor(hash, collectionId=null, isCustom){
        super(hash, collectionId, isCustom);
        //if(!this.isCustom){this._tryCloneOriginal(CharacterBuilder.getClassFeatureByUid(hash, className, classSource));}
        const original = CharacterBuilder.getEntityByUid("optionalfeature", {uid:hash});
        if(!original){console.error("Failed to load feature using hash", hash);}
        this.name = original.name;
        this.system = structuredClone(original.system);
        //this.entries = structuredClone(CharacterBuilder.getClassFeatureEntries(original.name, original.source));
        /* let entr = []; for(let l of original.loadeds){for(let e of l.entity.entries){entr.push(e);}} this.entries = entr;
        const classDatas = CharacterBuilder.instance._data;
        this.properties = {concentration:{label:"Concentration", selected:true}}; */

        if(!Entity5e.use_overrides){return this;}
        return this._createProxy();
    }
    get itemData(){return this;}
    get hash(){return this.uid;}

    static async verifySystemData(hash){
        const existingData = CharacterBuilder.getEntityByUid("optionalfeature", {uid:hash});
        if(existingData == null){console.error("No existing data found for optionalfeature", hash);}
        if(existingData.system){return;}
        //No system data exists, go ahead and import
        let imported = await SourceManager.plutoniumConvertData(existingData, "optionalfeature");
        existingData.system = imported.system;
    }
}
class ClassFeature5e extends Feature5e{
    constructor(hash, className, classSource, collectionId=null, isCustom){
        super(hash, collectionId, isCustom);
        
        this.className = className;
        this.classSource = classSource;
        //if(!this.isCustom){this._tryCloneOriginal(CharacterBuilder.getClassFeatureByUid(hash, className, classSource));}
        const original = CharacterBuilder.getClassFeatureByUid(hash, className, classSource);
        if(!original){console.error("Failed to load feature using hash", hash, className, classSource);}
        this.name = original.name;
        this.system = structuredClone(original.system);
        //this.entries = structuredClone(CharacterBuilder.getClassFeatureEntries(original.name, original.source));
        let entr = []; for(let l of original.loadeds){for(let e of l.entity.entries){entr.push(e);}} this.entries = entr;
        const classDatas = CharacterBuilder.instance._data;
        this.properties = {concentration:{label:"Concentration", selected:true}};

        if(!Entity5e.use_overrides){return this;}
        return this._createProxy();
    }
    get itemData(){return this;}
    get hash(){return this.uid;}

    async importSystemData(){
        //First, check if system data isn't already imported
        //TODO: after system data is imported, cache the UID in character builder, and just do string matching instead
        let existingData = CharacterBuilder.getClassFeatureByUid(this.hash, this.className, this.classSource);
        if(existingData.system){this.system = existingData.system; return;}
        //No system data exists, go ahead and import
        let imported = await SourceManager.plutoniumConvertData(existingData, "classFeature");
        existingData.system = imported.system;
        this.system = imported.system; //TEMPFIX
    }
    static async verifySystemData(hash, className, classSource){
        console.assert(className != null, "Class name is null!");
        console.assert(classSource != null, "Class source is null!");
        console.assert(hash != null, "Class Feature hash is null!");
        const existingData = CharacterBuilder.getClassFeatureByUid(hash, className, classSource);
        if(existingData.system){return;}
        //No system data exists, go ahead and import
        let imported = await SourceManager.plutoniumConvertData(existingData, "classFeature");
        existingData.system = imported.system;
    }
}
class Spell5e extends Entity5e{
    constructor(itemUid, collectionId=null, isCustom=false){
        super(itemUid, collectionId, isCustom);
        this.entityType = "spell";
        if(!this.isCustom){this._tryCloneOriginal(CharacterBuilder.getSpellByUid(this.uid));}

        if(!Entity5e.use_overrides){return this;}
        return this._createProxy();
    }

    static recast(inputObj){
        let spell5e = new Spell5e(inputObj.uid, inputObj.collectionId, inputObj.isCustom);
        inputObj && Object.assign(spell5e, inputObj);
        return spell5e;
    }
    async importSystemData(){
        //First, check if system data isn't already imported
        //TODO: after system data is imported, cache the UID in character builder, and just do string matching instead
        let existingData = CharacterBuilder.getSpellByUid(this.uid);
        if(existingData.system){this.system = existingData.system; return;}
        //No system data exists, go ahead and import
        let imported = await SourceManager.plutoniumConvertData(existingData, "spell");
        existingData.system = imported.system;
        this.system = imported.system; //TEMPFIX
    }
    /* static async verifySystemData(hash, className, classSource){
        let existingData = CharacterBuilder.getSpellByUid(hash, className, classSource);
        if(existingData.system){return;}
        //No system data exists, go ahead and import
        let imported = await SourceManager.plutoniumConvertData(existingData, "spell");
        existingData.system = imported.system;
    } */

    //Getter for static config
    get config(){
        //return Spell5e._defaultConfig();
        return CONFIG.DND5E;
    }
    static _defaultConfig(){
        return {
            spellLevels: [
                "Cantrip",
                "1st Level",
                "2nd Level",
                "3rd Level",
                "4th Level",
                "5th Level",
                "6th Level",
                "7th Level",
                "8th Level",
                "9th Level",
            ]
        }
    }
}

class Actor5e {
    
    constructor(saveData=null){
        this._mancerDependencies = {};
        if(saveData != null){this._loadFromSaveData(saveData);}
        else{this._createFakeCharacterData();}
        this.owner = SETTINGS.SHEET_ISEDITABLE;
        this.isCharacter = true;
    }

    _loadFromSaveData(data){
        for(let [key, value] of Object.entries(data)){
            this[key] = value;
        }
        //Recast object types
        //Recast items
        for(let [key, value] of Object.entries(this.inventory)){
            for(let i = 0; i < this.inventory[key].items.length; ++i){
                this.inventory[key].items[i] = Item5e.recast(this.inventory[key].items[i]);
            }
        }
        //recast spells
        for(let [key, value] of Object.entries(this.spellbook)){
            for(let i = 0; i < this.spellbook[key].spells.length; ++i){
                this.spellbook[key].spells[i] = Spell5e.recast(this.spellbook[key].spells[i]);
            }
        }
    }
    
    update(data, options){
        if(data != null){
            for(let [key, value] of Object.entries(data)){
                this.setProp(key, value);
            }
        }
        if(options?.doNotFireUpdate){return;}
        //Fire item update
        System5e.hkActorUpdated(this.collectionId);
    }
    setProp(path, value, toOverride=Entity5e.use_overrides){
        Entity5e.setp(this, path, value, toOverride);

    }
    _createFakeCharacterData(){

        const template = new CharacterTemplate();
        const schema = template.create();
        this.system = schema;

        this.system.abilities = {};
        
        const addAbility = (label, abbr, value=10, baseProf=0) => {
            //baseProf is either 0, 1, or 2 (none, proficient, expertise)
            const icon = baseProf == 0? "far fa-circle" : "fas fa-check";

            this.system.abilities[abbr] = {label, abbreviation:abbr, value, mod:System5e.calcAttrMod(value),
                save:System5e.calcAttrSave(value, baseProf, this.system.attributes.prof), baseProf, icon};
        }
        addAbility("Strength", "str");
        addAbility("Dexterity", "dex");
        addAbility("Constitution", "con");
        addAbility("Intelligence", "int");
        addAbility("Wisdom", "wis");
        addAbility("Charisma", "cha");

        //SKILLS
        this.skills = {};
        let configSkills = [];
        for(const [key, value] of Object.entries(CONFIG.DND5E.skills)){
            this.skills[value.label.toLowerCase()] = System5e.calcSkillEmbed({
                label: value.label,
                ability: value.ability,
                baseProf: 0},
                this.system.abilities, this.system.attributes.prof);
            configSkills.push(value.label.toLowerCase());
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
            },
            active: {
                label: "Active Abilities",
                dataset: {type: "active"},
                items: [],
            },
            passive: {
                label: "Passive Abilities",
                dataset: {type: "passive"},
                items: [],
            }
        }
        this.traits = {
            traits: {
                languages:{

                }
            }
        }

        this.elements = {inventory: "dnd5e-inventory"};
        this.config = {skills:configSkills};


        let rollData = this.getRollData({deterministic:true});
        this._prepareAbilities({rollData});
        this._prepareArmorClass();
        this._prepareInitiative();
        this._prepareSpellcasting();
        this.movement = this._getMovementSpeed(this.system, false);
    }
    
    /**
     * Create new, blank items, which are automatically added to the inventory
     * @param {any} embeddedName
     * @param {{type:string, quantity:number, identified:boolean}[]} data=[] js objects containing type of item (spell/class/item/race etc etc). This should match the item category you're trying to place them in
     * @param {Entity5e[]} entities=[] pre-created Entity5e objects containing type of item (spell/class/item/race etc etc). This should match the item category you're trying to place them in
     */
    createEmbeddedDocuments(embeddedName="item", data=[], entities=[], options={}){
        let collection = [];
        if(embeddedName == "item"){
            //create item5e
            for(let d of data){
                let entity;
                switch(d.type){
                    case "spell":
                        entity = new Spell5e(null, null, true);
                        entity.properties = {verbal:{selected:true, label:"Verbal"}}; //TEST
                        break;
                    case "class":
                        entity = new Class5e(null, null, true);
                        break;
                    case "race":
                        entity = new Race5e(null, null, true);
                        break;
                    case "background":
                        entity = new Race5e(null, null, true);
                        break;
                    default:
                        entity = new Item5e(null, d.quantity ?? 1, null, true);
                        d.system.identified = d.identified ?? true;
                        break;
                }
                entity.system = d.system;
                entity.name = d.name;
                entity.type = d.type; //weapon/spell/equipment/etc/etc
                collection.push(entity);
            }
            for(let e of entities){
                collection.push(e);
            }
            //Add them to the character
            this._addEntities(collection, options);
        }
        
        //then fire events
        this._onCreateDescendantDocuments(embeddedName, collection, options);
    }
    removeEmbeddedDocuments(embeddedName, data=[]){
        if(embeddedName == "item"){
            this._removeEntities(data);
        }

        //Then fire events
        this._onRemoveDescendantDocuments(embeddedName, data);
    }
    _onCreateDescendantDocuments(collectionName, documents, options={}){
        if(collectionName == "items"){} //update encumberance
        //re-render
        if(!options || !options?.doNotRender){ActorCharactermancerSheet2.instance.render();}
    }
    _onRemoveDescendantDocuments(collectionName, documents){
        if(collectionName == "items"){} //update encumberance
        //re-render
        ActorCharactermancerSheet2.instance.render();
    }
    _addEntities(items){
        for(let it of items){
            switch(it.entityType){
                case "spell":
                    if(it.system.preparationMode=="innate"){this.spellbook[it.system.preparationMode].spells.push(it);}
                    else{this.spellbook[it.system.level].spells.push(it);}
                    break;
                case "feature":
                case "background":
                case "race":
                case "class":
                    this.features[it.type].items.push(it);
                    break;
                case "item":
                    this.inventory[it.type].items.push(it);
                    break;
                default:
                    console.error("Could not add entity of entityType", it.entityType, ", not sure where to put it");
                    break;
            }
        }
    }
    _removeEntities(items){
        for(let it of items){
            switch(it.entityType){
                case "spell":
                    if(it.system.preparationMode=="innate"){this.spellbook[it.system.preparationMode].spells
                        = this.spellbook[it.system.preparationMode].spells.filter(obj => obj.collectionId !== it.collectionId);}
                    else{this.spellbook[it.system.level].spells = this.spellbook[it.system.level].spells.filter(obj => obj.collectionId !== it.collectionId);}
                    break;
                case "feature":
                    this.features[it.type].items = this.features[it.type].items.filter(obj => obj.collectionId !== it.collectionId);
                    break;
                default:
                    this.inventory[it.type].items = this.inventory[it.type].items.filter(obj => obj.collectionId !== it.collectionId);
                    break;
            }
        }
    }

    _runInventoryFunc(func){
        //Search item inventory
        for(let section in this.inventory){ func(this.inventory[section].items);}
        //Search features
        for(let section in this.features){ func(this.features[section].items);}
        //Search spells
        for(let section in this.spellbook){ func(this.spellbook[section].spells);}
    }
    async getItemByCollectionId(collectionId, errorIfNotFound=false){
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
        else if(matches.length < 1 && errorIfNotFound){
            console.error("Could not find a match to collection id", collectionId, this);
            return null;
        }
        return matches[0];
    }
    getItemsByUid(uid, errorIfNotFound=false){
        let matches = [];
        const runMatching = (searchIn) => {
            matches = matches.concat(searchIn.filter(f => {return !f.isCustom && (f.uid == uid || uid == "*");}));
        }
       this._runInventoryFunc(runMatching);
       
        if(matches.length < 1 && errorIfNotFound){
            console.error("Could not find a match to uid", uid, this);
            return null;
        }
        return matches;
    }
    getFlag(flagCategory, flagName){
        return false;
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
     * Prepare modifiers and other values for abilities.
     * @param {object} [options={}]
     * @param {object} [options.rollData={}]    Roll data used to calculate bonuses.
     * @param {object} [options.originalSaves]  Original ability data for transformed actors.
     */
    _prepareAbilities({ rollData={}, originalSaves }={}) {
        //const flags = this.parent.flags.dnd5e ?? {};
        const prof = this.system.attributes?.prof ?? 0;
        const checkBonus = Roll.simplifyBonus(this.system.bonuses?.abilities?.check, rollData);
        const saveBonus = Roll.simplifyBonus(this.system.bonuses?.abilities?.save, rollData);
        const dcBonus = Roll.simplifyBonus(this.system.bonuses?.spell?.dc, rollData);
        for ( const [id, abl] of Object.entries(this.system.abilities) ) {
            if ( this.getFlag("dnd5e", "diamondSoul") ) abl.proficient = 1;  // Diamond Soul is proficient in all saves
            abl.mod = Math.floor((abl.value - 10) / 2);

            const isRA = this._isRemarkableAthlete(id);
            abl.checkProf = new Proficiency(prof, (isRA || this.getFlag("dnd5e", "jackOfAllTrades")) ? 0.5 : 0, !isRA);
            const saveBonusAbl = Roll.simplifyBonus(abl.bonuses?.save, rollData);
            abl.saveBonus = saveBonusAbl + saveBonus;

            abl.saveProf = new Proficiency(prof, abl.proficient);
            const checkBonusAbl = Roll.simplifyBonus(abl.bonuses?.check, rollData);
            abl.checkBonus = checkBonusAbl + checkBonus;

            abl.save = abl.mod + abl.saveBonus;
            if ( Number.isNumeric(abl.saveProf.term) ) abl.save += abl.saveProf.flat;
            abl.dc = 8 + abl.mod + prof + dcBonus;

            if ( !Number.isFinite(abl.max) ) abl.max = CONFIG.DND5E.maxAbilityScore;

            // If we merged saves when transforming, take the highest bonus here.
            /* if ( originalSaves && abl.proficient ) abl.save = Math.max(abl.save, originalSaves[id].save); */
        }
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
                ac.armor = ac.armor ?? CONFIG.DND5E.baseArmorClass;

                rollData.attributes.ac = ac;
                try {
                    const replaced = Roll.replaceFormulaData(formula, rollData, {
                        actor: this, missing: null, property: "ac",//game.i18n.localize("DND5E.ArmorClass")
                    });
                    ac.base = replaced ? new Roll(replaced).evaluateSync()/* .total */ : 0;
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
    }
    /**
   * Prepare the initiative data for an actor.
   * Mutates the value of the system.attributes.init object.
   * @param {object} bonusData         Data produced by getRollData to be applied to bonus formulas
   * @param {number} globalCheckBonus  Global ability check bonus
   * @protected
   */
    _prepareInitiative(bonusData, globalCheckBonus=0) {
        const init = this.system.attributes.init ??= {};
        //const flags = this.flags.dnd5e || {};

        // Compute initiative modifier
        const abilityId = init.ability || CONFIG.DND5E.defaultAbilities.initiative;
        const ability = this.system.abilities?.[abilityId] || {};
        init.mod = ability.mod ?? 0;

        // Initiative proficiency
        const prof = this.system.attributes.prof ?? 0;
        const joat = this.getFlag("dnd5e", "jackOfAllTrades") && (CONFIG.DND5E.rulesVersion === "legacy");
        const ra = this._isRemarkableAthlete(abilityId);
        init.prof = new Proficiency(prof, (joat || ra) ? 0.5 : 0, !ra);

        // Total initiative includes all numeric terms
        const initBonus = Roll.simplifyBonus(init.bonus, bonusData);
        const abilityBonus = Roll.simplifyBonus(ability.bonuses?.check, bonusData);
        init.total = init.mod + initBonus + abilityBonus + globalCheckBonus
        + (this.getFlag("dnd5e", "initiativeAlert") ? 5 : 0)
        + (Number.isNumeric(init.prof.term) ? init.prof.flat : 0);

        this.system.attributes.init = init;
    }
    /**
   * Prepare a movement breakdown.
   * @returns {string}
   * @protected
   */
    _prepareMovementAttribution() {
        const { movement } = this.system.attributes;
        const units = movement.units || Object.keys(CONFIG.DND5E.movementUnits)[0];
        return Object.entries(CONFIG.DND5E.movementTypes).reduce((html, [k, label]) => {
        const value = movement[k];
        if ( value || (k === "walk") ) html += `
            <div class="row">
            <i class="fas ${k}"></i>
            <span class="value">${value ?? 0} <span class="units">${units}</span></span>
            <span class="label">${label}</span>
            </div>`;
            return html;
        }, "");
    }
        /**
     * Prepare data related to the spell-casting capabilities of the Actor.
     * Mutates the value of the system.spells object.
     * @protected
     */
    _prepareSpellcasting() {

        // Spellcasting DC and modifier
        const spellcastingAbility = this.system.abilities[this.system.attributes.spellcasting];
        this.system.attributes.spelldc = spellcastingAbility ? spellcastingAbility.dc : 8 + this.system.attributes.prof;
        this.system.attributes.spellmod = spellcastingAbility ? spellcastingAbility.mod : 0;
        if ( !this.system.spells ) return;

        // Translate the list of classes into spellcasting progression
        const progression = { slot: 0, pact: 0 };
        const types = {};

        // Grab all classes with spellcasting
        const classes = this.itemTypes.class.filter(cls => {
            const type = cls.spellcasting.type;
            if ( !type ) return false;
            types[type] ??= 0;
            types[type] += 1;
            return true;
        });

        for ( const cls of classes ) this.constructor.computeClassProgression(
            progression, cls, { actor: this, count: types[cls.spellcasting.type] }
        );

        if ( this.type === "npc" ) {
            if ( progression.slot || progression.pact ) this.system.details.spellLevel = progression.slot || progression.pact;
            else progression.slot = this.system.details.spellLevel ?? 0;
        }

        for ( const type of Object.keys(CONFIG.DND5E.spellcastingTypes) ) {
            this.constructor.prepareSpellcastingSlots(this.system.spells, type, progression, { actor: this });
        }
    }

    /**
   * Determine whether the provided ability is usable for remarkable athlete.
   * @param {string} ability  Ability type to check.
   * @returns {boolean}       Whether the actor has the remarkable athlete flag and the ability is physical.
   * @private
   */
    _isRemarkableAthlete(ability) {
        return (CONFIG.DND5E.rulesVersion === "legacy") && this.getFlag("dnd5e", "remarkableAthlete")
          && CONFIG.DND5E.characterFlags.remarkableAthlete.abilities.includes(ability);
    }
    /**
   * Prepare the display of movement speed data for the Actor.
   * @param {object} systemData               System data for the Actor being prepared.
   * @param {boolean} [largestPrimary=false]  Show the largest movement speed as "primary", otherwise show "walk".
   * @returns {{primary: string, special: string}}
   * @protected
   */
    _getMovementSpeed(systemData, largestPrimary=false) {
        const movement = systemData.attributes.movement ?? {};

        // Prepare an array of available movement speeds
        let speeds = [
            [movement.burrow, `${"Burrow"} ${movement.burrow}`],
            [movement.climb, `${"Climb"} ${movement.climb}`],
            [movement.fly, `${"Fly"} ${movement.fly}${movement.hover ? ` (${"Hover"})` : ""}`],
            [movement.swim, `${"Swim"} ${movement.swim}`]
        ];
        if ( largestPrimary ) {
            speeds.push([movement.walk, `${"Walk"} ${movement.walk}`]);
        }

        // Filter and sort speeds on their values
        speeds = speeds.filter(s => s[0]).sort((a, b) => b[0] - a[0]);

        // Case 1: Largest as primary
        if ( largestPrimary ) {
        let primary = speeds.shift();
        return {
            primary: `${primary ? primary[1] : "0"} ${movement.units || Object.keys(CONFIG.DND5E.movementUnits)[0]}`,
            special: speeds.map(s => s[1]).join(", ")
        };
        }

        // Case 2: Walk as primary
        else {
        return {
            primary: `${movement.walk || 0} ${movement.units || Object.keys(CONFIG.DND5E.movementUnits)[0]}`,
            special: speeds.length ? speeds.map(s => s[1]).join(", ") : ""
        };
        }
    }
    
    //Runtime label calculation
    get labels(){
        return {
            proficiency: `+${this.system.attributes.prof}`
        };
    }

    _mancerDependencies;
    setMancerDependency(path, value){
        if(value == null){delete this._mancerDependencies[path]; return;}
        this._mancerDependencies[path] = value;
    }
    getMarkerDependency(path){
        return this._mancerDependencies[path];
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

  create(){
    return {};
  }
}
class CharacterTemplate extends CommonTemplate {
    constructor(){
        super();
    }

    create(){
        return CommonTemplate.mergeSchema(super.create(), {
            attributes: {
                prof: 2,
                ac: {
                    flat: 0,
                    calc: "default",
                    formula: ""
                },
                movement: {

                },
                spellcasting: "cha",
            }
        })
    }
}

/**
 * Object describing the proficiency for a specific ability or skill.
 *
 * @param {number} proficiency   Actor's flat proficiency bonus based on their current level.
 * @param {number} multiplier    Value by which to multiply the actor's base proficiency value.
 * @param {boolean} [roundDown]  Should half-values be rounded up or down?
 */
class Proficiency {
    constructor(proficiency, multiplier, roundDown=true) {
  
      /**
       * Base proficiency value of the actor.
       * @type {number}
       * @private
       */
      this._baseProficiency = Number(proficiency ?? 0);
  
      /**
       * Value by which to multiply the actor's base proficiency value.
       * @type {number}
       */
      this.multiplier = Number(multiplier ?? 0);
  
      /**
       * Direction decimal results should be rounded ("up" or "down").
       * @type {string}
       */
      this.rounding = roundDown ? "down" : "up";
    }
  
    /* -------------------------------------------- */
  
    /**
     * Should only deterministic proficiency be returned, regardless of system settings?
     * @type {boolean}
     */
    deterministic = false;
  
    /* -------------------------------------------- */
  
    /**
     * Calculate an actor's proficiency modifier based on level or CR.
     * @param {number} level  Level or CR To use for calculating proficiency modifier.
     * @returns {number}      Proficiency modifier.
     */
    static calculateMod(level) {
      return Math.floor((level + 7) / 4);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Flat proficiency value regardless of proficiency mode.
     * @type {number}
     */
    get flat() {
      const roundMethod = (this.rounding === "down") ? Math.floor : Math.ceil;
      return roundMethod(this.multiplier * this._baseProficiency);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Dice-based proficiency value regardless of proficiency mode.
     * @type {string}
     */
    get dice() {
      if ( (this._baseProficiency === 0) || (this.multiplier === 0) ) return "0";
      const roundTerm = (this.rounding === "down") ? "floor" : "ceil";
      if ( this.multiplier === 0.5 ) {
        return `${roundTerm}(1d${this._baseProficiency * 2} / 2)`;
      } else {
        return `${this.multiplier}d${this._baseProficiency * 2}`;
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Either flat or dice proficiency term based on configured setting.
     * @type {string}
     */
    get term() {
        //TODO: support for proficiency dice, a variant rule from the DMG
      return /* (game.settings.get("dnd5e", "proficiencyModifier") === "dice") && !this.deterministic
        ? this.dice : */ String(this.flat);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Whether the proficiency is greater than zero.
     * @type {boolean}
     */
    get hasProficiency() {
      return (this._baseProficiency > 0) && (this.multiplier > 0);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Override the default `toString` method to return flat proficiency for backwards compatibility in formula.
     * @returns {string}  Flat proficiency value.
     */
    toString() {
      return this.term;
    }
}

//This object contains info about other sources it needs to exist
class DependencyLink {

    creationKey;
    constructor(){

    }
    isSatisfied(){
        return true;
    }
}
class EntityDependenceLink extends DependencyLink{

}
class MancerDependencyLink extends DependencyLink{
    constructor(creationKey){
        super();
        this.creationKey = creationKey;
    }

    isMatch(creationKey, itemUid){
        return this.creationKey == creationKey;
    }

}
//This object contains info about sub-features that we grant to the sheet
class ChildLink {

}
  