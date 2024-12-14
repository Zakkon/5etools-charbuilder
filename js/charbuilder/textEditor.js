/**
 * A collection of helper functions and utility methods related to the rich text editor
 */
class TextEditor {

    /**
     * A singleton text area used for HTML decoding.
     * @type {HTMLTextAreaElement}
     */
    static #decoder = document.createElement("textarea");
  
    /**
     * Create a Rich Text Editor. The current implementation uses TinyMCE
     * @param {object} options                   Configuration options provided to the Editor init
     * @param {string} [options.engine=tinymce]  Which rich text editor engine to use, "tinymce" or "prosemirror". TinyMCE
     *                                           is deprecated and will be removed in a later version.
     * @param {string} content                   Initial HTML or text content to populate the editor with
     * @returns {Promise<TinyMCE.Editor|ProseMirrorEditor|PellEditor>}  The editor instance.
     */
    static async create({engine="tinymce", ...options}={}, content="") {
      if ( engine === "prosemirror" ) {
        const {target, ...rest} = options;
        return ProseMirrorEditor.create(target, content, rest);
      }
      else if(engine === "pell"){
        //Need to grab any existing text inside target element and move it to editor.content instead
        const content = options.target.innerHTML;
        options.target.innerHTML = "";
        const editor = pell.init({
            element: options.target,
            defaultParagraphSeparator: "p",
            onChange: (html) => {
            },
            styleWithCSS: false, // Use inline styles instead of CSS classes
            actions: [
                "bold",
                "italic",
                "underline",
                "strikethrough",
                "heading1",
                "heading2",
                "olist",
                "ulist",
                "link",
                "image",
                {
                    name: "save",
                    icon: '💾',
                    title: "Save",
                    result: () => {
                        const content = editor.content.innerHTML;
                        editor.onSave(content);
                    }
                }
            ] // Customizable toolbar actions
        });
        editor.content.innerHTML = content;
        return editor;
      }
      if ( engine === "tinymce" ) return this._createTinyMCE(options, content);
      throw new Error(`Provided engine '${engine}' is not a valid TextEditor engine.`);
    }
  
    /**
     * A list of elements that are retained when truncating HTML.
     * @type {Set<string>}
     * @private
     */
    static _PARAGRAPH_ELEMENTS = new Set([
      "header", "main", "section", "article", "div", "footer", // Structural Elements
      "h1", "h2", "h3", "h4", "h5", "h6", // Headers
      "p", "blockquote", "summary", "span", "a", "mark", // Text Types
      "strong", "em", "b", "i", "u" // Text Styles
    ]);
  
    /* -------------------------------------------- */
  
    /**
     * Create a TinyMCE editor instance.
     * @param {object} [options]           Configuration options passed to the editor.
     * @param {string} [content=""]        Initial HTML or text content to populate the editor with.
     * @returns {Promise<TinyMCE.Editor>}  The TinyMCE editor instance.
     * @protected
     */
    static async _createTinyMCE(options={}, content="") {
      const mceConfig = foundry.utils.mergeObject(CONFIG.TinyMCE, options, {inplace: false});
      mceConfig.target = options.target;
  
      mceConfig.file_picker_callback = function (pickerCallback, value, meta) {
        let filePicker = new FilePicker({
          type: "image",
          callback: path => {
            pickerCallback(path);
            // Reset our z-index for next open
            $(".tox-tinymce-aux").css({zIndex: ''});
          },
        });
        filePicker.render();
        // Set the TinyMCE dialog to be below the FilePicker
        $(".tox-tinymce-aux").css({zIndex: Math.min(++_maxZ, 9999)});
      };
      if ( mceConfig.content_css instanceof Array ) {
        mceConfig.content_css = mceConfig.content_css.map(c => foundry.utils.getRoute(c)).join(",");
      }
      mceConfig.init_instance_callback = editor => {
        const window = editor.getWin();
        editor.focus();
        if ( content ) editor.resetContent(content);
        editor.selection.setCursorLocation(editor.getBody(), editor.getBody().childElementCount);
        window.addEventListener("wheel", event => {
          if ( event.ctrlKey ) event.preventDefault();
        }, {passive: false});
        editor.off("drop dragover"); // Remove the default TinyMCE dragdrop handlers.
        editor.on("drop", event => this._onDropEditorData(event, editor));
      };
      const [editor] = await tinyMCE.init(mceConfig);
      editor.document = options.document;
      return editor;
    }
  
    /* -------------------------------------------- */
    /*  HTML Manipulation Helpers
    /* -------------------------------------------- */
  
    /**
     * Safely decode an HTML string, removing invalid tags and converting entities back to unicode characters.
     * @param {string} html     The original encoded HTML string
     * @returns {string}        The decoded unicode string
     */
    static decodeHTML(html) {
      const d = TextEditor.#decoder;
      d.innerHTML = html;
      const decoded = d.value;
      d.innerHTML = "";
      return decoded;
    }
  
    /* -------------------------------------------- */
  
    /**
     * @typedef {object} EnrichmentOptions
     * @property {boolean} [secrets=false]      Include unrevealed secret tags in the final HTML? If false, unrevealed
     *                                          secret blocks will be removed.
     * @property {boolean} [documents=true]     Replace dynamic document links?
     * @property {boolean} [links=true]         Replace hyperlink content?
     * @property {boolean} [rolls=true]         Replace inline dice rolls?
     * @property {object|Function} [rollData]   The data object providing context for inline rolls, or a function that
     *                                          produces it.
     * @property {boolean} [async=true]         Perform the operation asynchronously returning a Promise
     * @property {ClientDocument} [relativeTo]  A document to resolve relative UUIDs against.
     */
  
    /**
     * Enrich HTML content by replacing or augmenting components of it
     * @param {string} content        The original HTML content (as a string)
     * @param {EnrichmentOptions} [options={}]       Additional options which configure how HTML is enriched
     * @returns {string|Promise<string>}             The enriched HTML content
     */
    static enrichHTML(content, options={}) {
      let {secrets=false, documents=true, links=true, rolls=true, rollData} = options;
      if (!content?.length) return ""; //return Promise.resolve("");
  
      // Create the HTML element
      const html = document.createElement("div");
      html.innerHTML = String(content || "");
  
      // Remove unrevealed secret blocks
      if ( !secrets ) html.querySelectorAll("section.secret:not(.revealed)").forEach(secret => secret.remove());
  
      // Plan text content replacements
      let updateTextArray = true;
      let text = [];
      const fns = [];
  
      if (documents) fns.push(this._enrichContentLinks.bind(this));
      if (links) fns.push(this._enrichHyperlinks.bind(this));
      if (rolls) fns.push(this._enrichInlineRolls.bind(this, rollData));
      /* for (const config of CONFIG.TextEditor.enrichers) {
        fns.push(this._applyCustomEnrichers.bind(this, config.pattern, config.enricher));
      } */
  
      const enrich = (fn, update) => {
        if ( update ) text = this._getTextNodes(html);
        return fn(text, options);
      };
  
     /*  for ( const fn of fns ) {
        if ( updateTextArray instanceof Promise ) updateTextArray = updateTextArray.then(update => enrich(fn, update));
        else updateTextArray = enrich(fn, updateTextArray);
      } */
  
      if (updateTextArray instanceof Promise) return updateTextArray.then(() => html.innerHTML);
      return html.innerHTML;//Promise.resolve(html.innerHTML);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Convert text of the form @UUID[uuid]{name} to anchor elements.
     * @param {Text[]} text                          The existing text content
     * @param {EnrichmentOptions} [options]          Options provided to customize text enrichment
     * @param {boolean} [options.async]              Whether to resolve UUIDs asynchronously
     * @param {ClientDocument} [options.relativeTo]  A document to resolve relative UUIDs against.
     * @returns {Promise<boolean>|boolean}           Whether any content links were replaced and the text nodes need to be
     *                                               updated.
     * @protected
     */
    static _enrichContentLinks(text, {async, relativeTo}={}) {
      const documentTypes = CONST.DOCUMENT_LINK_TYPES.concat(["Compendium", "UUID"]);
      const rgx = new RegExp(`@(${documentTypes.join("|")})\\[([^#\\]]+)(?:#([^\\]]+))?](?:{([^}]+)})?`, "g");
      return this._replaceTextContent(text, rgx, match => this._createContentLink(match, {async, relativeTo}));
    }
  
    /* -------------------------------------------- */
  
    /**
     * Convert URLs into anchor elements.
     * @param {Text[]} text                 The existing text content
     * @param {EnrichmentOptions} [options] Options provided to customize text enrichment
     * @returns {boolean}                   Whether any hyperlinks were replaced and the text nodes need to be updated
     * @protected
     */
    static _enrichHyperlinks(text, options={}) {
      const rgx = /(https?:\/\/)(www\.)?([^\s<]+)/gi;
      return this._replaceTextContent(text, rgx, this._createHyperlink);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Convert text of the form [[roll]] to anchor elements.
     * @param {object|Function} rollData    The data object providing context for inline rolls.
     * @param {Text[]} text                 The existing text content.
     * @param {EnrichmentOptions} [options] Options provided to customize text enrichment
     * @param {boolean} [options.async]     Whether to resolve immediate inline rolls asynchronously.
     * @returns {Promise<boolean>|boolean}  Whether any inline rolls were replaced and the text nodes need to be updated.
     * @protected
     */
    static _enrichInlineRolls(rollData, text, {async}={}) {
      rollData = rollData instanceof Function ? rollData() : (rollData || {});
      const rgx = /\[\[(\/[a-zA-Z]+\s)?(.*?)(]{2,3})(?:{([^}]+)})?/gi;
      return this._replaceTextContent(text, rgx, match => this._createInlineRoll(match, rollData, {async}));
    }
  
    /* -------------------------------------------- */
  
    /**
     * Match any custom registered regex patterns and apply their replacements.
     * @param {RegExp} pattern               The pattern to match against.
     * @param {TextEditorEnricher} enricher  The function that will be run for each match.
     * @param {Text[]} text                  The existing text content.
     * @param {EnrichmentOptions} [options]  Options provided to customize text enrichment
     * @returns {Promise<boolean>}           Whether any replacements were made, requiring the text nodes to be updated.
     * @protected
     */
    static _applyCustomEnrichers(pattern, enricher, text, options) {
      return this._replaceTextContent(text, pattern, match => enricher(match, options));
    }
  
    /* -------------------------------------------- */
  
    /**
     * Preview an HTML fragment by constructing a substring of a given length from its inner text.
     * @param {string} content    The raw HTML to preview
     * @param {number} length     The desired length
     * @returns {string}          The previewed HTML
     */
    static previewHTML(content, length=250) {
      let div = document.createElement("div");
      div.innerHTML = content;
      div = this.truncateHTML(div);
      div.innerText = this.truncateText(div.innerText, {maxLength: length});
      return div.innerHTML;
    }
  
    /* --------------------------------------------- */
  
    /**
     * Sanitises an HTML fragment and removes any non-paragraph-style text.
     * @param {HTMLElement} html       The root HTML element.
     * @returns {HTMLElement}
     */
    static truncateHTML(html) {
      const truncate = root => {
        for ( const node of root.childNodes ) {
          if ( [Node.COMMENT_NODE, Node.TEXT_NODE].includes(node.nodeType) ) continue;
          if ( node.nodeType === Node.ELEMENT_NODE ) {
            if ( this._PARAGRAPH_ELEMENTS.has(node.tagName.toLowerCase()) ) truncate(node);
            else node.remove();
          }
        }
      };
  
      const clone = html.cloneNode(true);
      truncate(clone);
      return clone;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Truncate a fragment of text to a maximum number of characters.
     * @param {string} text           The original text fragment that should be truncated to a maximum length
     * @param {object} [options]      Options which affect the behavior of text truncation
     * @param {number} [options.maxLength]    The maximum allowed length of the truncated string.
     * @param {boolean} [options.splitWords]  Whether to truncate by splitting on white space (if true) or breaking words.
     * @param {string|null} [options.suffix]  A suffix string to append to denote that the text was truncated.
     * @returns {string}              The truncated text string
     */
    static truncateText(text, {maxLength=50, splitWords=true, suffix="…"}={}) {
      if ( text.length <= maxLength ) return text;
  
      // Split the string (on words if desired)
      let short;
      if ( splitWords ) {
        short = text.slice(0, maxLength + 10);
        while ( short.length > maxLength ) {
          if ( /\s/.test(short) ) short = short.replace(/[\s]+([\S]+)?$/, "");
          else short = short.slice(0, maxLength);
        }
      } else {
        short = text.slice(0, maxLength);
      }
  
      // Add a suffix and return
      suffix = suffix ?? "";
      return short + suffix;
    }
  
    /* -------------------------------------------- */
    /*  Text Node Manipulation
    /* -------------------------------------------- */
  
    /**
     * Recursively identify the text nodes within a parent HTML node for potential content replacement.
     * @param {HTMLElement} parent    The parent HTML Element
     * @returns {Text[]}              An array of contained Text nodes
     * @private
     */
    static _getTextNodes(parent) {
      const text = [];
      const walk = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
      while ( walk.nextNode() ) text.push(walk.currentNode);
      return text;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Facilitate the replacement of text node content using a matching regex rule and a provided replacement function.
     * @param {Text} text             The target text to replace
     * @param {RegExp} rgx            The provided regular expression for matching and replacement
     * @param {function(RegExpMatchArray): HTMLElement|Promise<HTMLElement>} func   The replacement function
     * @private
     */
    static _replaceTextContent(text, rgx, func) {
      let replaced = false;
      const promises = [];
      for ( let t of text ) {
        const matches = t.textContent.matchAll(rgx);
        for ( let match of Array.from(matches).reverse() ) {
          let result;
          try {
            result = func(match);
          } catch ( err ) {
            Hooks.onError("TextEditor.enrichHTML", err, { log: "error" });
          }
          // TODO: This logic can be simplified/replaced entirely with await once enrichHTML becomes fully async.
          // We can't mix promises and non-promises.
          if ( promises.length && !(result instanceof Promise) ) result = Promise.resolve(result);
          if ( result instanceof Promise ) promises.push(result.then(r => [t, match, r]));
          else if ( result ) {
            this._replaceTextNode(t, match, result);
            replaced = true;
          }
        }
      }
      if ( promises.length ) {
        return Promise.allSettled(promises).then(results => results.reduce((replaced, settled) => {
          if ( settled.status === "rejected" ) Hooks.onError("TextEditor.enrichHTML", settled.reason, { log: "error" });
          if ( !settled.value ) return replaced;
          const [text, match, result] = settled.value;
          if ( result ) {
            this._replaceTextNode(text, match, result);
            return true;
          }
          return replaced;
        }, replaced));
      }
      return replaced;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Replace a matched portion of a Text node with a replacement Node
     * @param {Text} text
     * @param {RegExpMatchArray} match
     * @param {Node} replacement
     * @private
     */
    static _replaceTextNode(text, match, replacement) {
      let target = text;
      if ( match.index > 0 ) {
        target = text.splitText(match.index);
      }
      if ( match[0].length < target.length ) {
        target.splitText(match[0].length);
      }
      target.replaceWith(replacement);
    }
  
    /* -------------------------------------------- */
    /*  Text Replacement Functions
    /* -------------------------------------------- */
  
    /**
     * Create a dynamic document link from a regular expression match
     * @param {RegExpMatchArray} match                          The regular expression match
     * @param {object} [options]                                Additional options to configure enrichment behaviour
     * @param {boolean} [options.async=false]                   If asynchronous evaluation is enabled, fromUuid will be
     *                                                          called, allowing comprehensive UUID lookup, otherwise
     *                                                          fromUuidSync will be used.
     * @param {ClientDocument} [options.relativeTo]             A document to resolve relative UUIDs against.
     * @returns {HTMLAnchorElement|Promise<HTMLAnchorElement>}  An HTML element for the document link, returned as a
     *                                                          Promise if async was true and the message contained a
     *                                                          UUID link.
     * @protected
     */
    static _createContentLink(match, {async=false, relativeTo}={}) {
      let [type, target, hash, name] = match.slice(1, 5);
  
      // Prepare replacement data
      const data = {
        cls: ["content-link"],
        icon: null,
        dataset: {},
        name
      };
  
      let doc;
      let broken = false;
      if ( type === "UUID" ) {
        data.dataset = {id: null, uuid: target};
        if ( async ) doc = fromUuid(target, {relative: relativeTo});
        else {
          try {
            doc = fromUuidSync(target, {relative: relativeTo});
          } catch(err) {
            [type, ...target] = target.split(".");
            broken = TextEditor._createLegacyContentLink(type, target.join("."), name, data);
          }
        }
      }
      else broken = TextEditor._createLegacyContentLink(type, target, name, data);
  
      // Flag a link as broken
      if ( broken ) {
        data.icon = "fas fa-unlink";
        data.cls.push("broken");
      }
  
      const constructAnchor = doc => {
        if ( doc ) {
          if ( doc.documentName ) {
            const attrs = {draggable: true};
            if ( hash ) attrs["data-hash"] = hash;
            return doc.toAnchor({attrs, classes: data.cls, name: data.name});
          }
          data.name = data.name || doc.name || target;
          const type = game.packs.get(doc.pack)?.documentName;
          data.dataset.type = type;
          data.dataset.id = doc._id;
          data.dataset.pack = doc.pack;
          if ( hash ) data.dataset.hash = hash;
          data.icon = CONFIG[type].sidebarIcon;
        } else if ( type === "UUID" ) {
          // The UUID lookup failed so this is a broken link.
          data.icon = "fas fa-unlink";
          data.cls.push("broken");
        }
  
        const a = document.createElement("a");
        a.classList.add(...data.cls);
        a.draggable = true;
        for ( let [k, v] of Object.entries(data.dataset) ) {
          a.dataset[k] = v;
        }
        a.innerHTML = `<i class="${data.icon}"></i>${data.name}`;
        return a;
      };
  
      if ( doc instanceof Promise ) return doc.then(constructAnchor);
      return constructAnchor(doc);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Create a dynamic document link from an old-form document link expression.
     * @param {string} type    The matched document type, or "Compendium".
     * @param {string} target  The requested match target (_id or name).
     * @param {string} name    A customized or overridden display name for the link.
     * @param {object} data    Data containing the properties of the resulting link element.
     * @returns {boolean}      Whether the resulting link is broken or not.
     * @private
     */
    static _createLegacyContentLink(type, target, name, data) {
      let broken = false;
  
      // Get a matched World document
      if ( CONST.DOCUMENT_TYPES.includes(type) ) {
  
        // Get the linked Document
        const config = CONFIG[type];
        const collection = game.collections.get(type);
        const document = foundry.data.validators.isValidId(target) ? collection.get(target) : collection.getName(target);
        if ( !document ) broken = true;
  
        // Update link data
        data.name = data.name || (broken ? target : document.name);
        data.icon = config.sidebarIcon;
        data.dataset = {type, uuid: document?.uuid};
      }
  
      // Get a matched PlaylistSound
      else if ( type === "PlaylistSound" ) {
        const [, playlistId, , soundId] = target.split(".");
        const playlist = game.playlists.get(playlistId);
        const sound = playlist?.sounds.get(soundId);
        if ( !playlist || !sound ) broken = true;
  
        data.name = data.name || (broken ? target : sound.name);
        data.icon = CONFIG.Playlist.sidebarIcon;
        data.dataset = {type, uuid: sound?.uuid};
        if ( sound?.playing ) data.cls.push("playing");
        if ( !game.user.isGM ) data.cls.push("disabled");
      }
  
      // Get a matched Compendium document
      else if ( type === "Compendium" ) {
  
        // Get the linked Document
        let [scope, packName, id] = target.split(".");
        const pack = game.packs.get(`${scope}.${packName}`);
        if ( pack ) {
          data.dataset = {pack: pack.collection, uuid: pack.getUuid(id)};
          data.icon = CONFIG[pack.documentName].sidebarIcon;
  
          // If the pack is indexed, retrieve the data
          if ( pack.index.size ) {
            const index = pack.index.find(i => (i._id === id) || (i.name === id));
            if ( index ) {
              if ( !data.name ) data.name = index.name;
              data.dataset.id = index._id;
              data.dataset.uuid = index.uuid;
            }
            else broken = true;
          }
  
          // Otherwise assume the link may be valid, since the pack has not been indexed yet
          if ( !data.name ) data.name = data.dataset.lookup = id;
        }
        else broken = true;
      }
      return broken;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Replace a hyperlink-like string with an actual HTML &lt;a> tag
     * @param {RegExpMatchArray} match  The regular expression match
     * @param {object} [options]        Additional options to configure enrichment behaviour
     * @returns {HTMLAnchorElement}     An HTML element for the document link
     * @private
     */
    static _createHyperlink(match, options) {
      const href = match[0];
      const a = document.createElement("a");
      a.classList.add("hyperlink");
      a.href = a.textContent = href;
      a.target = "_blank";
      a.rel = "nofollow noopener";
      return a;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Replace an inline roll formula with a rollable &lt;a> element or an eagerly evaluated roll result
     * @param {RegExpMatchArray} match      The regular expression match array
     * @param {object} rollData             Provided roll data for use in roll evaluation
     * @param {object} [options]            Additional options to configure enrichment behaviour
     * @returns {HTMLAnchorElement|null|Promise<HTMLAnchorElement|null>}  The replaced match, returned as a Promise if
     *                                                                    async was true and the message contained an
     *                                                                    immediate inline roll.
     */
    static _createInlineRoll(match, rollData, options) {
      let [command, formula, closing, label] = match.slice(1, 5);
      const isDeferred = !!command;
      let roll;
  
      // Define default inline data
      const data = {
        cls: ["inline-roll"],
        dataset: {}
      };
  
      // Handle the possibility of closing brackets
      if ( closing.length === 3 ) formula += "]";
  
      // Extract roll data as a parsed chat command
      if ( isDeferred ) {
        const chatCommand = `${command}${formula}`;
        let parsedCommand = null;
        try {
          parsedCommand = ChatLog.parse(chatCommand);
        }
        catch(err) { return null; }
        const [cmd, matches] = parsedCommand;
        if ( ["invalid", "none"].includes(cmd) ) return null;
        const match = ChatLog.MULTILINE_COMMANDS.has(cmd) ? matches.pop() : matches;
        const [raw, rollType, fml, flv] = match;
  
        // Set roll data
        data.cls.push(parsedCommand[0]);
        data.dataset.mode = parsedCommand[0];
        data.dataset.flavor = flv?.trim() ?? label ?? "";
        data.dataset.formula = Roll.defaultImplementation.replaceFormulaData(fml.trim(), rollData || {});
  
        const a = document.createElement("a");
        a.classList.add(...data.cls);
        for ( const [k, v] of Object.entries(data.dataset) ) {
          a.dataset[k] = v;
        }
        const title = label || data.dataset.formula;
        a.innerHTML = `<i class="fas fa-dice-d20"></i>${title}`;
        if ( label ) a.dataset.tooltip = data.dataset.formula;
        return a;
      }
  
      // Perform the roll immediately
      try {
        data.cls.push("inline-result");
        const anchorOptions = {classes: data.cls, label};
        roll = Roll.create(formula, rollData).roll(options);
        if ( roll instanceof Promise ) return roll.then(r => r.toAnchor(anchorOptions)).catch(() => null);
        return roll.toAnchor(anchorOptions);
      }
      catch(err) { return null; }
    }
  
    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */
  
    /**
     * Activate interaction listeners for the interior content of the editor frame.
     */
    static activateListeners() {
      const body = $("body");
      body.on("click", "a.content-link", this._onClickContentLink);
      body.on("dragstart", "a.content-link", this._onDragContentLink);
      body.on("click", "a.inline-roll", this._onClickInlineRoll);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle click events on Document Links
     * @param {Event} event
     * @private
     */
    static async _onClickContentLink(event) {
      event.preventDefault();
      const doc = await fromUuid(event.currentTarget.dataset.uuid);
      return doc?._onClickDocumentLink(event);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle left-mouse clicks on an inline roll, dispatching the formula or displaying the tooltip
     * @param {MouseEvent} event    The initiating click event
     * @private
     */
    static async _onClickInlineRoll(event) {
      event.preventDefault();
      const a = event.currentTarget;
  
      // For inline results expand or collapse the roll details
      if ( a.classList.contains("inline-result") ) {
        if ( a.classList.contains("expanded") ) {
          return Roll.defaultImplementation.collapseInlineResult(a);
        } else {
          return Roll.defaultImplementation.expandInlineResult(a);
        }
      }
  
      // Get the current speaker
      const cls = ChatMessage.implementation;
      const speaker = cls.getSpeaker();
      let actor = cls.getSpeakerActor(speaker);
      let rollData = actor ? actor.getRollData() : {};
  
      // Obtain roll data from the contained sheet, if the inline roll is within an Actor or Item sheet
      const sheet = a.closest(".sheet");
      if ( sheet ) {
        const app = ui.windows[sheet.dataset.appid];
        if ( ["Actor", "Item"].includes(app?.object?.documentName) ) rollData = app.object.getRollData();
      }
  
      // Execute a deferred roll
      const roll = Roll.create(a.dataset.formula, rollData);
      return roll.toMessage({flavor: a.dataset.flavor, speaker}, {rollMode: a.dataset.mode});
    }
  
    /* -------------------------------------------- */
  
    /**
     * Begin a Drag+Drop workflow for a dynamic content link
     * @param {Event} event   The originating drag event
     * @private
     */
    static _onDragContentLink(event) {
      event.stopPropagation();
      const a = event.currentTarget;
      let dragData = null;
  
      // Case 1 - Compendium Link
      if ( a.dataset.pack ) {
        const pack = game.packs.get(a.dataset.pack);
        let id = a.dataset.id;
        if ( a.dataset.lookup && pack.index.size ) {
          const entry = pack.index.find(i => (i._id === a.dataset.lookup) || (i.name === a.dataset.lookup));
          if ( entry ) id = entry._id;
        }
        if ( !a.dataset.uuid && !id ) return false;
        const uuid = a.dataset.uuid || pack.getUuid(id);
        dragData = { type: a.dataset.type || pack.documentName, uuid };
      }
  
      // Case 2 - World Document Link
      else {
        const doc = fromUuidSync(a.dataset.uuid);
        dragData = doc.toDragData();
      }
  
      event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }
  
    /* -------------------------------------------- */
  
    /**
     * Handle dropping of transferred data onto the active rich text editor
     * @param {DragEvent} event     The originating drop event which triggered the data transfer
     * @param {TinyMCE} editor      The TinyMCE editor instance being dropped on
     * @private
     */
    static async _onDropEditorData(event, editor) {
      event.preventDefault();
      const eventData = this.getDragEventData(event);
      const link = await TextEditor.getContentLink(eventData, {relativeTo: editor.document});
      if ( link ) editor.insertContent(link);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Extract JSON data from a drag/drop event.
     * @param {DragEvent} event       The drag event which contains JSON data.
     * @returns {object}              The extracted JSON data. The object will be empty if the DragEvent did not contain
     *                                JSON-parseable data.
     */
    static getDragEventData(event) {
      if ( !("dataTransfer" in event) ) {  // Clumsy because (event instanceof DragEvent) doesn't work
        console.warn("Incorrectly attempted to process drag event data for an event which was not a DragEvent.");
        return {};
      }
      try {
        return JSON.parse(event.dataTransfer.getData("text/plain"));
      } catch(err) {
        return {};
      }
    }
  
    /* -------------------------------------------- */
  
    /**
     * Given a Drop event, returns a Content link if possible such as @Actor[ABC123], else null
     * @param {object} eventData                     The parsed object of data provided by the transfer event
     * @param {object} [options]                     Additional options to configure link creation.
     * @param {ClientDocument} [options.relativeTo]  A document to generate the link relative to.
     * @param {string} [options.label]               A custom label to use instead of the document's name.
     * @returns {Promise<string|null>}
     */
    static async getContentLink(eventData, options={}) {
      const cls = getDocumentClass(eventData.type);
      if ( !cls ) return null;
      const document = await cls.fromDropData(eventData);
      if ( !document ) return null;
      return document._createDocumentLink(eventData, options);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Upload an image to a document's asset path.
     * @param {string} uuid        The document's UUID.
     * @param {File} file          The image file to upload.
     * @returns {Promise<string>}  The path to the uploaded image.
     * @internal
     */
    static async _uploadImage(uuid, file) {
      if ( !game.user.hasPermission("FILES_UPLOAD") ) {
        ui.notifications.error("EDITOR.NoUploadPermission", {localize: true});
        return;
      }
  
      ui.notifications.info("EDITOR.UploadingFile", {localize: true});
      const response = await FilePicker.upload(null, null, file, {uuid});
      return response?.path;
    }
  }