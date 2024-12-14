class HandlebarsHelper{
    static getAttributes(options){
        var attributes = [];
        if(options == null || options.hash == null){return attributes;}
        Object.keys(options.hash).forEach(key => {
            var escapedKey = Handlebars.escapeExpression(key);
            var escapedValue = Handlebars.escapeExpression(options.hash[key]);
            //attributes.push(escapedKey + '="' + escapedValue + '"');
            attributes[escapedKey] = escapedValue;
        });
        return attributes;
    }
    
    static registerHelpers(){
        
        Handlebars.registerHelper("log", function(...args) {
            console.log(args);
        });
        Handlebars.registerHelper('loud', function (aString) {
            return aString.toUpperCase()
        });
        Handlebars.registerHelper('not', function (value) {
            var bool = !(value === 'true' || value == true); //inverse it
            //return bool.toString();
            return bool;
        });
        Handlebars.registerHelper('and', function (value1, value2) {
            var bool1 = (value1 === 'true' || !!value1);
            var bool2 = (value2 === 'true' || !!value2);
            //return (bool1 && bool2).toString();
            return bool1 && bool2;
        });
        Handlebars.registerHelper('or', function (value1, value2) {
            var bool1 = (value1 === 'true' || value1 == true);
            var bool2 = (value2 === 'true' || value2 == true);
            //return (bool1 || bool2).toString();
            return bool1 || bool2;
        });
        Handlebars.registerHelper('eq', function (value1, value2) {
            return value1 === value2;
        });
        Handlebars.registerHelper('greaterThan', function (value1, value2) {
            return value1 > value2;
        });
        Handlebars.registerHelper('checked', function (value) {
            return (value === 'true' || value == true)? `checked` : "";
        });
        Handlebars.registerHelper('disabled', function (value) {
            return (value === 'true' || value == true)? `disabled` : "";
        });
        Handlebars.registerHelper('localize', function (value) {
            return HelperFunctions.localize(value);
        });
        Handlebars.registerHelper('editor', HandlebarsHelper.editor);
        Handlebars.registerHelper('numberInput', function (value, options) {
            let wrapper = `<input type="number" value${value != null? `="${value}"` : ""}`;
            let opts = HandlebarsHelper.getAttributes(options);
            for(const [key, val] of Object.entries(opts)){wrapper += ` ${key}="${val}"`;}
            wrapper += "></input>";
            return new Handlebars.SafeString(wrapper);
        });
        /**
 * A helper for using Intl.NumberFormat within handlebars.
 * @param {number} value    The value to format.
 * @param {object} options  Options forwarded to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat}
 * @returns {string}
 */
        Handlebars.registerHelper("numberFormat", function (value, options){
            let opts = HandlebarsHelper.getAttributes(options);
            if(opts.sign){opts.signDisplay = "always";}
            if(opts.decimal != null){opts.minimumFractionDigits = opts.decimal;}
            const formatter = new Intl.NumberFormat("en-IN", opts);
            return formatter.format(value);
        });
        Handlebars.registerHelper("stringFormat", function (value, options){
            let opts = HandlebarsHelper.getAttributes(options);
            if(opts.capWords){ return value.capitalizeEachWord();}
            return value;
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
            if(choices == null){return Handlebars.SafeString("");}
            let {blank=null, selected=null, sort=false, labelAttr, nameAttr} = HandlebarsHelper.getAttributes(options);
            selected = selected instanceof Array ? selected.map(String) : [String(selected)];
            let myOptions = [];
            //Blank option
            if(blank != null){myOptions.push({label:blank, name:""});}
            if(choices instanceof Array){
                console.assert(nameAttr != null, "selectOptions requires a nameAttr if choices is an array!");
                for(let c of choices){
                    const label = c[labelAttr];
                    const name = String(c[nameAttr]); //we are going to need a nameAttr variable to 
                    myOptions.push({label, name});
                }
            }
            else{
                for (let [key, value] of Object.entries(choices)) {
                    const label = labelAttr ? value[labelAttr] : value;
                    const name = String(nameAttr ? value[nameAttr] : key);
                    myOptions.push({name, label});
                }
            }
            //Sort the array, if requested
            if (sort==true) {myOptions.sort((left, right) => left.label.localeCompare(right.label));}
            
            //Create the string
            let str = "";
            for(let o of myOptions){
                const isSelected = selected != null && selected.includes(o.name);
                str += `<option value="${o.name}" ${isSelected? "selected":""}>${o.label}</option>`;
            }
            
            return new Handlebars.SafeString(str);
        });
        Handlebars.registerHelper("dnd5e-concealSection", HandlebarsHelper.concealSection);
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

        fetch("dnd5e.item-activation", "parts/edit/item-activation");
        fetch("dnd5e.item-action", "parts/edit/item-action");
        fetch("dnd5e.ability-scores", "parts/ability-scores");
        fetch("dnd5e.item-description", "parts/edit/item-description");
        fetch("dnd5e.item-source", "parts/item-source");
        fetch("dnd5e.inventory", "inventory_dnd5e");
        fetch("dnd5e.actor-spellbook", "parts/actor-spellbook");
        fetch("dnd5e.actor-features", "parts/actor-features");
        fetch("dnd5e.actor-traits", "parts/actor-traits");
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
        const ctx = options.data.root.itemContext(context.collectionId);
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

    /**
 * Conceal a section and display a notice if unidentified.
 * @param {boolean} conceal  Should the section be concealed?
 * @param {object} options   Handlebars options.
 * @returns {string}
 */
 static concealSection(conceal, options) {
    let content = options.fn(this);
    if ( !conceal ) return content;
  
    content = `<div inert>
      ${content}
    </div>
    <div class="unidentified-notice">
        <div>
            <strong>${game.i18n.localize("DND5E.Unidentified.Title")}</strong>
            <p>${game.i18n.localize("DND5E.Unidentified.Notice")}</p>
        </div>
    </div>`;
    return content;
  }

  /**
   * Construct an editor element for rich text editing with TinyMCE or ProseMirror.
   * @param {[string, TextEditorOptions]} args  The content to display and edit, followed by handlebars options.
   * @returns {Handlebars.SafeString}
   *
   * @example
   * ```hbs
   * {{editor world.description target="description" button=false engine="prosemirror" collaborate=false}}
   * ```
   */
  static editor(...args) {
    const options = args.pop();
    let content = args.pop() ?? HelperFunctions.getProperty(options.data.root, options.hash.target) ?? "";
    
    console.log("options", options, "content", content);
    const target = options.hash.target;
    if (!target) throw new Error("You must define the name of a target field.");
    const button = Boolean(options.hash.button);
    const editable = "editable" in options.hash ? Boolean(options.hash.editable) : true;

    // Construct the HTML
    const editorClasses = ["editor-content", options.hash.class ?? null].filterJoin(" ");
    let editorHTML = '<div class="editor">';
    if ( button && editable ) editorHTML += '<a class="editor-edit"><i class="fas fa-edit"></i></a>';
    let dataset = {
      engine: options.hash.engine || "tinymce",
      collaborate: !!options.hash.collaborate
    };
    if (editable) dataset.edit = target;
    dataset = Object.entries(dataset).map(([k, v]) => `data-${k}="${v}"`).join(" ");
    editorHTML += `<div class="${editorClasses}" ${dataset}>${content}</div></div>`;
    console.log("EDITOR HTML", editorHTML, options);
    return new Handlebars.SafeString(editorHTML);
  }
}