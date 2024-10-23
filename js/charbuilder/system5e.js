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
            newSystem.inventory.items ??= [];
            for(let i = 0; i < newSystem.inventory.items.length; ++i){
                newSystem.inventory.items[i] =
                    Item5e.recast(newSystem.inventory.items[i]);
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

    static async addToInventory(actor, item, item5e){
        console.log("Add item", item5e.collectionId);
        actor.character.system.inventory.items.push(item5e);
    }
    /**
     * Get an Item5e using the collection id. Item must already be in actor's inventory
     * @param {string} collectionId
     * @param {Actor} actor
     * @returns {Item5e}
     */
    static getItemByCollectionId(collectionId, actor=null){
        if(!actor){actor = CharacterBuilder.instance._actor;}
        console.log("get item", actor.character.system.inventory.items.length);
        for(let it of actor.character.system.inventory.items){
            console.log("AD", it);
            //To get the functions on the Item5e object, we need to recast it
            if(it.collectionId == collectionId){return it;}
        }
        return null;
    }
    static createUniqueID(){
        return Math.random().toString(16).slice(2);
    }
}
class Item5e {
    override;
    constructor(itemUid, quantity=1, collectionId=null){
        this.uid = itemUid;
        this.type = "item";
        this.quantity = quantity;
        this.collectionId = collectionId? collectionId : System5e.createUniqueID();
        this.override = {};
    }
    static recast(item5e){
        let i = new Item5e();
        item5e && Object.assign(i, item5e);
        return i;
    }
    get itemData(){return CharacterBuilder.getItemByUid(this.uid);}
    prop(path){return Item5e.getp(this, path);}
    setProp(path, value, toOverride=true){
        Item5e.setp(this, path, value, toOverride);
    }
    async importSystemData(){
        //First, check if system data isn't already imported
        //TODO: after system data is imported, cache the UID in character builder, and just do string matching instead
        let existingData = CharacterBuilder.getItemByUid(this.uid);
        if(existingData.system){return;}
        //No system data exists, go ahead and import
        let imported = await SourceManager.plutoniumConvertData(existingData);
        existingData.system = imported.system;
    }
    static setp(item, path, value, toOverride=true){
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
            recursiveSearch(item.override, path, value);
        }
        else{recursiveSearch(item.itemData, path, value);}
    }
    /**
     * @param {Item|Item5e} item
     * @param {string} path
     * @returns {any}
     */
    static getp(item, path){
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
        let result = recursiveSearch(item.itemData, path);
       
    
        //Try to get an override (if present)
        const override = recursiveSearch(item.override, path);
        console.log("it", item.override, override);
        if(override != null && override != undefined){return override;}
        return result;
    }
}