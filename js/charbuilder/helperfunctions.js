class HelperFunctions{

    /**
     * Will set the modal to only have the sources provided enabled (all others will be set to 0)
     * @param {ModalFilter} modalFilter
     * @param {String[]} sourcesToUse example: ["PHB", "XGE", "TCE"]
     */
    static setModalFilterSourcesStrings(modalFilter, sourcesToUse){
        let sources = {};
        for(let src of sourcesToUse){
            sources[src] = 1;
        }
        modalFilter.pageFilter.filterBox.setFromValues({Source: sources});
    }
    static getClassFromData(myData, className, classSrc){
        className = className.toLowerCase();
        classSrc = classSrc.toLowerCase();
        return myData.class.filter(cls => !!cls && cls.name.toLowerCase() == className && cls.source.toLowerCase() == classSrc);
    }
    static getClassFeaturesFromClassInData(myData, cls){
        return myData.classFeature.filter(f => !!f && f.className == cls.name && f.classSource == cls.source);
    }

    static async loadJSONFile(localURL){
        //const localURL = "data/class/index.json";
        const result = await DataUtil.loadRawJSON(localURL);
        return result;
    }

    /**
   * Searches through an object and returns a value by using a string path to dig through the object and it's hierarchy.
   * Can return a value from an array if one of the words in the path is an index of the array.
   * @param {object} object The object we will search through for the property
   * @param {string} path The search path. Example: "system.type.value" returns object[system][type][value]
   * @return {any} The value of the found property
   */
    static getProperty(object, path) {
        if (!path) {return undefined;}
        let target = object;
        for (let word of path.split('.')) {
          const t = this.getType(target);
          //Object must be an Object type or Array type for us to assign a value inside it
          if (!((t === "Object") || (t === "Array"))){return undefined;}
          if (word in target) {target = target[word];} //Then repeat the process
          else {return undefined;}
        }
        return target;
        }
    
        /**
     * Searches through an object's hierarchy to assign a value using a string key
     * @param {object} object The target object to update
     * @param {string} path The string path. Example: "system.type.value" would become object[system][type][value]
     * @param {any} value The value to assign
     * @return {boolean} Returns a boolean which indicates if the value was successfully changed from its previous value
     */
    static setProperty(object, path, value) {
        let target = object;
        let wasChanged = false;
    
        //If the path contains dots, this means it's a path to a grandchild
        if (path.indexOf('.') !== -1) {
            let words = path.split('.');
            path = words.pop();
            target = words.reduce((o, i) => {
                if (!o.hasOwnProperty(i) ){o[i] = {};}
                return o[i];
            }, object);
        }
    
        //Set the target
        if (target[path] !== value) {wasChanged = true; target[path] = value;}
    
        //Return boolean if change was successful or not
        return wasChanged;
    }
      
        /**
       * Get the data type of an object. Supported types include:
       * undefined, null, number, string, boolean, function, Array, Set, Map, Promise, Error,
       * HTMLElement (client side only), Object (catchall for other object types)
       * @param {any} obj  Object to get the type from
       * @return {string}
       */
    static getType(obj) {

        // Primitive types, handled with simple typeof check
        const typeOf = typeof obj;
        if ( typeOf !== "object" ) return typeOf;

        // Special cases of object
        if ( obj === null ) return "null";
        if ( !obj.constructor ) return "Object"; // Object with the null prototype.
        if ( obj.constructor.name === "Object" ) return "Object";  // simple objects

        // Match prototype instances
        const prototypes = [
        [Array, "Array"],
        [Set, "Set"],
        [Map, "Map"],
        [Promise, "Promise"],
        [Error, "Error"],
        [Color, "number"]
        ];
        if ( "HTMLElement" in globalThis ) prototypes.push([globalThis.HTMLElement, "HTMLElement"]);
        for ( const [cls, type] of prototypes ) {
        if ( obj instanceof cls ) return type;
        }

        // Unknown Object type
        return "Object";
    }

        /**
     * Quickly clone a simple piece of data, returning a copy which can be mutated safely.
     * This method DOES support recursive data structures containing inner objects or arrays.
     * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
     * @param {*} original                     Some sort of data
     * @param {object} [options]               Options to configure the behaviour of deepClone
     * @param {boolean} [options.strict=false] Throw an Error if deepClone is unable to clone something instead of returning the original
     * @return {*}                             The clone of that data
     */
    static deepClone(original, {strict=false}={}) {

        // Simple types
        if ( (typeof original !== "object") || (original === null) ) return original;
    
        // Arrays
        if ( original instanceof Array ) return original.map(HelperFunctions.deepClone);
    
        // Dates
        if ( original instanceof Date ) return new Date(original);
    
        // Unsupported advanced objects
        if ( original.constructor && (original.constructor !== Object) ) {
            if ( strict ) throw new Error("deepClone cannot clone advanced objects");
            return original;
        }
    
        // Other objects
        const clone = {};
        for ( let k of Object.keys(original) ) {
            clone[k] = HelperFunctions.deepClone(original[k]);
        }
        return clone;
    }
    static mergeObject(target, ...sources){return Object.assign(target, ...sources);}
    static flattenObject(obj, _d=0) {
        const flat = {};
        if ( _d > 100 ) {
          throw new Error("Maximum depth exceeded");
        }
        for ( let [k, v] of Object.entries(obj) ) {
          let t = getType(v);
          if ( t === "Object" ) {
            if ( isEmpty(v) ) flat[k] = v;
            let inner = flattenObject(v, _d+1);
            for ( let [ik, iv] of Object.entries(inner) ) {
              flat[`${k}.${ik}`] = iv;
            }
          }
          else flat[k] = v;
        }
        return flat;
    }
    /**
     * Sort the provided object by its values or by an inner sortKey.
     * @param {object} obj                 The object to sort.
     * @param {string|Function} [sortKey]  An inner key upon which to sort or sorting function.
     * @returns {object}                   A copy of the original object that has been sorted.
     */
    /* static sortObjectEntries(obj, sortKey) {
        let sorted = Object.entries(obj);
        const sort = (lhs, rhs) => HelperFunctions.getType(lhs) === "string" ? lhs.localeCompare(rhs, game.i18n.lang) : lhs - rhs;
        if (HelperFunctions.getType(sortKey) === "function" ) sorted = sorted.sort((lhs, rhs) => sortKey(lhs[1], rhs[1]));
        else if ( sortKey ) sorted = sorted.sort((lhs, rhs) => sort(lhs[1][sortKey], rhs[1][sortKey]));
        else sorted = sorted.sort((lhs, rhs) => sort(lhs[1], rhs[1]));
        return Object.fromEntries(sorted);
    } */

    /**
     * Get the references to the parent classes of the provided class
     * @param {Function} cls
     * @returns {Function[]}
     */
    static getParentClasses(cls) {
        if (typeof cls !== "function") {
            throw new Error("The provided class is not a type of Function");
        }
        const parents = [];
        let parent = Object.getPrototypeOf(cls);
        while (parent) {
            parents.push(parent);
            parent = Object.getPrototypeOf(parent);
        }
        return parents.slice(0, -2)
    }

    static _lang;
    static setLocalizationLanguage(jsonObj){HelperFunctions._lang = jsonObj;}
    static localize(stringId){
        if(!HelperFunctions._lang){return stringId;}

        const recursiveSearch = (start, _path) => {
            if(start == null){return null;}
            const properties = _path.split('.');
            let current = start;
            for (let i = 0; i < properties.length; i++) {
                //If this is the final word
                if(i+1>=properties.length){return current[properties[i]];}
                if(current[properties[i]] != null){
                    current = current[properties[i]];
                }
            }
            return null; //failed
        }

        let subwords = stringId.split(".");
        if(subwords.length > 2){
            let firstPath = `${subwords[0]}.${subwords[1]}`;
            let subPath = stringId.substring(`${firstPath}.`.length);
            let target = recursiveSearch(HelperFunctions._lang[firstPath], subPath);
            if(target != null && typeof target === "string"){return target;}
        }

        let v = HelperFunctions._lang[stringId];
        //let v = HelperFunctions.getProperty(langJson, stringId);
        if ( typeof v === "string" ) return v;
        return stringId; //Failure
        /* v = HelperFunctions.getProperty(this._fallback, stringId);
        return typeof v === "string" ? v : stringId; */
    }

    /**
     * Bound a number between some minimum and maximum value, inclusively.
     * @param {number} num    The current value
     * @param {number} min    The minimum allowed value
     * @param {number} max    The maximum allowed value
     * @return {number}       The clamped number
     */
    static mathClamped(num, min, max) {
    return Math.min(max, Math.max(num, min));
  }
}