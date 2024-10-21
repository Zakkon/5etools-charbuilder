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

    static extendSchema_Character(character, state=null){
        let system = {
            inventory: {
                items:[],
                currency:{}
            },
            override: {
            },
        }
        if(state != null){ //Just load from existing state
            Object.assign(system, System5e.loadSchemaExtension(character, state));
        }
        character.system = system;
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
        schema.system = state;
        return schema;
    }
    static serializeSchemaExtension(schema){
        return JSON.stringify(schema.system);
    }

    static async addToInventory(actor, item){

        //Do a conversion here
        const tester = new ImportTester();
        const result = await tester.runTest(item);
        actor.character.system.inventory.items.push(item);
        console.log("num items", actor.character.system.inventory.items.length);
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
    prop(path){
    
        const recursiveSearch = (start, _path) => {
            const properties = _path.split('.');
            let current = start;
            for (let i = 0; i < properties.length; i++) {
                if (current[properties[i]] === undefined) {
                    return undefined;
                } else {
                    current = current[properties[i]];
                }
            }
            return current;
        }
        let result = recursiveSearch(this, path);
       
    
        //Try to get an override (if present)
        const override = recursiveSearch(this.override, path);
        if(override != null && override != undefined){return override;}
        return result;
    }
    loadItem(fromData){

    }
}