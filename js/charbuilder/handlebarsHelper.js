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
            str += `<option value="${opts.blank}" ${(!opts.selected)?"selected":""}></option>`;
            console.log("CHOICES", choices, options);
            for(const [key, value] of Object.entries(choices)){
                str += `<option ${(!!opts.selected && opts.selected == key)?"selected":""}>${value}</option>`;
            }
            let result = new Handlebars.SafeString(str);
            return result;
        });
    }
}