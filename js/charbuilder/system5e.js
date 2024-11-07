class System5e{
    
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

    static async tryAddToInventory_Item(actor, collectionId, itemUid, quantity){
        //Try to see if this item already exists in the character inventory
        let item5e = System5e.getEntityByCollectionId(collectionId);
        if(!item5e){
            //If it doesnt, create a new item5e, import system data, then add to inventory
            item5e = new Item5e(itemUid, quantity, collectionId);
            await item5e.importSystemData();
            await System5e.addToInventory(actor, item5e);
            await ActorCharactermancerSheet.c5e_inventory.rebuildUi();
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
            await System5e.addToInventory(actor, spell5e);
            await ActorCharactermancerSheet.c5e_inventory.rebuildUi();
            return spell5e;
        }
        else{
            //If it does, just verify & import system data, no need to re-add it to the inventory
            await spell5e.importSystemData();
            return spell5e;
        }
    }
    static async addToInventory(actor, entity5e){
        console.error("Add item", entity5e.name, entity5e.collectionId);
        actor.character.system.inventory.items.push(entity5e);
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
}
class Entity5e {
    static use_overrides = false;
    override;
    constructor(){
        this.override = {};
    }
    
    get config(){return DND5E;}
    prop(path){return Entity5e.getp(this, path);}
    setDependency(type, key){
        this.dependsOnType = type.toLowerCase();
        this.dependsOn = key.toLowerCase();
    }
    setProp(path, value, toOverride=Entity5e.use_overrides){
        Entity5e.setp(this, path, value, toOverride);
        if(path == "system.uses.per"){
            Entity5e.setp(this, "system.hasLimitedUses", system.uses.per != null, toOverride);
        }
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
    constructor(itemUid, quantity=1, collectionId=null){
        super();
        this.uid = itemUid;
        this.type = "item";
        this.quantity = quantity;
        this.collectionId = collectionId? collectionId : System5e.createUniqueID();
        const original = CharacterBuilder.getItemByUid(this.uid);
        this.system = structuredClone(original.system);
        this.entries = structuredClone(original.entries);
        this.name = original.name;
        this.properties = {};

        if(!Entity5e.use_overrides){return this;}

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
    static recast(inputObj){
        let entity = null;
        if(inputObj.type == "item"){entity = new Item5e(inputObj.uid, inputObj.quantity, inputObj.collectionId);}
        else if(inputObj.type == "classFeature"){
            entity = new ClassFeature5e(inputObj.uid, inputObj.className, inputObj.classSource, inputObj.collectionId);
        }
        else if(inputObj.type == "spell"){return null;}
        inputObj && Object.assign(entity, inputObj);
        return entity;
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
    
}
class ClassFeature5e extends Entity5e{
    constructor(hash, className, classSource, collectionId=null){
        super();
        this.uid = hash;
        this.type = "classFeature";
        this.className = className;
        this.classSource = classSource;
        this.collectionId = collectionId? collectionId : System5e.createUniqueID();
        const original = CharacterBuilder.getClassFeatureByUid(hash, className, classSource);
        if(!original){console.error("Failed to load feature using hash", hash, className, classSource);}
        this.name = original.name;
        this.system = structuredClone(original.system);
        //this.entries = structuredClone(CharacterBuilder.getClassFeatureEntries(original.name, original.source));
        let entr = []; for(let l of original.loadeds){for(let e of l.entity.entries){entr.push(e);}} this.entries = entr;
        const classDatas = CharacterBuilder.instance._data;
        this.properties = {concentration:{label:"Concentration", selected:true}};

        if(!Entity5e.use_overrides){return this;}

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
        let existingData = CharacterBuilder.getClassFeatureByUid(hash, className, classSource);
        if(existingData.system){return;}
        //No system data exists, go ahead and import
        let imported = await SourceManager.plutoniumConvertData(existingData, "classFeature");
        existingData.system = imported.system;
    }
}
class Spell5e extends Entity5e{
    constructor(spellUid, collectionId=null){
        super();
        this.uid = spellUid;
        this.type = "spell";
        this.collectionId = collectionId? collectionId : System5e.createUniqueID();
        const original = CharacterBuilder.getSpellByUid(this.uid);
        this.name = original.name;
        this.system = structuredClone(original.system);
        this.entries = structuredClone(original.entries);

        if(!Entity5e.use_overrides){return this;}

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
}