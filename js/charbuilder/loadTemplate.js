var LoadTemplate = function(element, template, data){
    // Check if parenet element is defined as string or object.
    if(typeof element == 'string'){
        this.el = document.getElementById(element);
    } else {
        this.el = element;
    }

    // Store template name and data.
    this.tempName = template;
    this.data = data || null;

    // You can change this to path of your template folder.
    this.folderPath = 'js/charbuilder/sheets/compact5e/templates/';
};

LoadTemplate.prototype.create = function(callback){
    var req = new XMLHttpRequest();
    var that = this;

    // Define parameters for request.
    req.open('get', this.folderPath + this.tempName + '.hbs', true);

    // Wait for request to complete.
    req.onreadystatechange = function(){
        if (req.readyState == 4 && req.status == 200){
            //Compile HB template, add data (if defined) and place in parent element.
            var compiled = Handlebars.compile(req.response);
            var html = compiled(that.data, {allowProtoPropertiesByDefault:true,
                allowedProtoMethodsByDefault:true});
            //that.el.innerHTML = text;
            that.el.html(html);

            // Execute callback function
            if(callback){callback();}
        }
    };

    // Send request.
    req.send();
};

LoadTemplate.prototype.createAndWait = function(callback){
    var req = new XMLHttpRequest();
    var that = this;

    // Define parameters for request.
    req.open('get', this.folderPath + this.tempName + '.hbs', true);

    // Wait for request to complete.
    req.onreadystatechange = function(){
        if (req.readyState == 4 && req.status == 200){
            //Compile HB template, but wait..
            var compiled = Handlebars.compile(req.response);

            // Execute callback function and parse variables.
            callback(compiled, that.el);
        }
    };

    // Send request.
    req.send();
};

LoadTemplate.prototype.createAndCompile = function(callback){
    var req = new XMLHttpRequest();
    var that = this;

    // Define parameters for request.
    req.open('get', this.folderPath + this.tempName + '.hbs', true);

    // Wait for request to complete.
    req.onreadystatechange = function(){
        if (req.readyState == 4 && req.status == 200){
           //Compile HB template, add data (if defined) and place in parent element.
           var compiled = Handlebars.compile(req.response);
           var text = compiled(that.data, {allowProtoPropertiesByDefault:true,
               allowedProtoMethodsByDefault:true});

           // Execute callback function
           if(callback){callback(text);}
        }
    };

    // Send request.
    req.send();
};

LoadTemplate.prototype.createAsync = async function(){

    var req = new XMLHttpRequest();
    var that = this;

    // Define parameters for request.
    req.open('get', this.folderPath + this.tempName + '.hbs', true);

    // Wait for request to complete.
    req.onreadystatechange = function(){
        if (req.readyState == 4 && req.status == 200){
           //Compile HB template, add data (if defined) and place in parent element.
           var compiled = Handlebars.compile(req.response);
           var html = compiled(that.data, {allowProtoPropertiesByDefault:true,
               allowedProtoMethodsByDefault:true});

           // Execute callback function
           resolve(html);
        }
        else{
            return reject(new Error(req.error));
        }
    };

    // Send request.
    req.send();

    await new Promise((resolve, reject) => {
        game.socket.emit("template", path, resp => {
            if ( resp.error ) return reject(new Error(resp.error));
            const compiled = Handlebars.compile(resp.html);
            Handlebars.registerPartial(id ?? path, compiled);
            _templateCache[path] = compiled;
            console.log(`Foundry VTT | Retrieved and compiled template ${path}`);
            resolve(compiled);
        });
    });
}

