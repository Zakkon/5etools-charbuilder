class HandlebarsHelper{
    static getAttributes(options){
        var attributes = [];

        Object.keys(options.hash).forEach(key => {
            var escapedKey = Handlebars.escapeExpression(key);
            var escapedValue = Handlebars.escapeExpression(options.hash[key]);
            attributes.push(escapedKey + '="' + escapedValue + '"');
        });
        return attributes;
    }
    
    static registerHelpers(){
        
        Handlebars.registerHelper('loud', function (aString) {
            return aString.toUpperCase()
        });
        Handlebars.registerHelper('selectOptions', function (choices, options) {
            let str = "";
            let opts = HandlebarsHelper.getAttributes(options);
            if(!opts.blank){opts.blank = "";}
            str += `<option value="${opts.blank}"></option>`;
            for(const [key, value] of Object.entries(choices)){
                str += `<option>${value}</option>`;
            }
            return new Handlebars.SafeString(str);
        });
    }
}