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
}
