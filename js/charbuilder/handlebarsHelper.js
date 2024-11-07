class HandlebarsHelper{
    static getAttributes(options){
        var attributes = [];

        Object.keys(options.hash).forEach(key => {
            var escapedKey = Handlebars.escapeExpression(key);
            var escapedValue = Handlebars.escapeExpression(options.hash[key]);
            //attributes.push(escapedKey + '="' + escapedValue + '"');
            attributes[escapedKey] = escapedValue;
        });
        return attributes;
    }
    
    static registerHelpers(){
        
        Handlebars.registerHelper('loud', function (aString) {
            return aString.toUpperCase()
        });
        Handlebars.registerHelper('not', function (value) {
            var bool = !(value === 'true' || value == true); //inverse it
            return bool.toString();
        });
        Handlebars.registerHelper('and', function (value1, value2) {
            var bool1 = (value1 === 'true' || value1 == true);
            var bool2 = (value2 === 'true' || value2 == true);
            return (bool1 && bool2).toString();
        });
        Handlebars.registerHelper('eq', function (value1, value2) {
            console.log("EQ", value1, value2);
            return value1 === value2;
        });
        Handlebars.registerHelper('checked', function (value) {
            return (value === 'true' || value == true)? `checked` : "";
        });
        Handlebars.registerHelper('localize', function (value) {
            return value;
        });
        Handlebars.registerHelper('numberInput', function (value, options) {
            let wrapper = `<input type="number" value${value != null? `="${value}"` : ""}`;
            let opts = HandlebarsHelper.getAttributes(options);
            for(const [key, val] of Object.entries(opts)){wrapper += ` ${key}="${val}"`;}
            wrapper += "></input>";
            return new Handlebars.SafeString(wrapper);
        });
        Handlebars.registerHelper('select', function (value, options) {
            return options.fn(this)
              .split('\n')
              .map(function (v) {
                var t = 'value="' + value + '"';
                return RegExp(t).test(v) ? v.replace(t, t + ' selected="selected"') : v;
              })
              .join('\n');
        });
        Handlebars.registerHelper('selectOptions', function (choices, options) {
            let str = "";
            let opts = HandlebarsHelper.getAttributes(options);
            //Blank option
            if(opts.blank != null){str += `<option value="${opts.blank}" ${(!opts.selected)?"selected":""}></option>`;}
            if(choices != null){
                for(const [key, value] of Object.entries(choices)){
                    let lbl = typeof(value) == "object"? value.label : value;
                    str += `<option value="${key}"${(!!opts.selected && opts.selected == key)?"selected":""}>${lbl}</option>`;
                }
            }
            
            let result = new Handlebars.SafeString(str);
            return result;
        });
        Handlebars.registerHelper("dnd5e-itemContext", HandlebarsHelper.itemContext);
        Handlebars.registerHelper("dnd5e-dataset", HandlebarsHelper.dataset);
    }

    static registerPartials(){

        const fetch = function(partialName, path){
            const folderPath = 'js/charbuilder/sheets/compact5e/templates/';
            var req = new XMLHttpRequest();
        
            // Define parameters for request.
            req.open('get', folderPath + path + '.hbs', true);
        
            // Wait for request to complete.
            req.onreadystatechange = function(){
                if (req.readyState == 4 && req.status == 200){
                    Handlebars.registerPartial(partialName, req.response);
                }
            };
        
            // Send request.
            req.send();
        };

        fetch("dnd5e.item-activation", "item-activation");
        fetch("dnd5e.item-action", "item-action");
    }
    
    /**
    * A helper that fetch the appropriate item context from root and adds it to the first block parameter.
    * @param {object} context  Current evaluation context.
    * @param {object} options  Handlebars options.
    * @returns {string}
    */
    static itemContext(context, options) {
        if ( arguments.length !== 2 ) throw new Error("#dnd5e-itemContext requires exactly one argument");
        if ( //foundry.utils.getType(context)
            typeof(context)
             === "function" ) {context = context.call(this);}
    
        console.log("OPTS", options);
        const ctx = options.data.root.itemContext?.[context.collectionId];//[context.id];
        console.log("CTX", ctx, context);
        if ( !ctx ) {
            const inverse = options.inverse(this);
            if ( inverse ) return options.inverse(this);
        }
    
        return options.fn(context, { data: options.data, blockParams: [ctx] });
    }

     /**
     * A helper that converts the provided object into a series of `data-` entries.
     * @param {object} object   Object to convert into dataset entries.
     * @param {object} options  Handlebars options.
     * @returns {string}
     */
    static dataset(object, options) {
        const entries = [];
        for ( let [key, value] of Object.entries(object ?? {}) ) {
        if ( value === undefined ) continue;
        key = key.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (a, b) => (b ? "-" : "") + a.toLowerCase());
        entries.push(`data-${key}="${value}"`);
        }
        return new Handlebars.SafeString(entries.join(" "));
    }
}