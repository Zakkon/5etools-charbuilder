/**
 * A simple event framework used throughout Foundry Virtual Tabletop.
 * When key actions or events occur, a "hook" is defined where user-defined callback functions can execute.
 * This class manages the registration and execution of hooked callback functions.
 */
class Hooks {
    static DEBUG_HOOKS = true;
    /**
     * A mapping of hook events which have functions registered to them.
     * @type {Object<HookedFunction[]>}
     */
    static get events() {
      return this.#events;
    }
  
    /**
     * @type {Object<HookedFunction[]>}
     * @private
     * @ignore
     */
    static #events = {};
  
    /**
     * A mapping of hooked functions by their assigned ID
     * @type {Map<number, HookedFunction>}
     */
    static #ids = new Map();
  
    /**
     * An incrementing counter for assigned hooked function IDs
     * @type {number}
     */
    static #id = 1;
  
    /* -------------------------------------------- */
  
    /**
     * Register a callback handler which should be triggered when a hook is triggered.
     * @param {string} hook     The unique name of the hooked event
     * @param {Function} fn     The callback function which should be triggered when the hook event occurs
     * @param {object} options  Options which customize hook registration
     * @param {boolean} options.once  Only trigger the hooked function once
     * @returns {number}      An ID number of the hooked function which can be used to turn off the hook later
     */
    static on(hook, fn, {once=false}={}) {
      console.debug(`Registered callback for ${hook} hook`);
      const id = this.#id++;
      if (!(hook in this.#events)) {
        Object.defineProperty(this.#events, hook, {value: [], writable: false});
      }
      const entry = {hook, id, fn, once};
      this.#events[hook].push(entry);
      this.#ids.set(id, entry);
      return id;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Register a callback handler for an event which is only triggered once the first time the event occurs.
     * An alias for Hooks.on with {once: true}
     * @param {string} hook   The unique name of the hooked event
     * @param {Function} fn   The callback function which should be triggered when the hook event occurs
     * @returns {number}      An ID number of the hooked function which can be used to turn off the hook later
     */
    static once(hook, fn) {
      return this.on(hook, fn, {once: true});
    }
  
    /* -------------------------------------------- */
  
    /**
     * Unregister a callback handler for a particular hook event
     * @param {string} hook           The unique name of the hooked event
     * @param {Function|number} fn    The function, or ID number for the function, that should be turned off
     */
    static off(hook, fn) {
      let entry;
  
      // Provided an ID
      if (typeof fn === "number") {
        const id = fn;
        entry = this.#ids.get(id);
        if (!entry) return;
        this.#ids.delete(id);
        const event = this.#events[entry.hook];
        event.findSplice(h => h.id === id);
      }
  
      // Provided a Function
      else {
        const event = this.#events[hook];
        const entry = event.findSplice(h => h.fn === fn);
        if (!entry) return;
        this.#ids.delete(entry.id);
      }
      console.debug(`Unregistered callback for ${hook} hook`);
    }
  
    /* -------------------------------------------- */
  
    /**
     * Call all hook listeners in the order in which they were registered
     * Hooks called this way can not be handled by returning false and will always trigger every hook callback.
     *
     * @param {string} hook   The hook being triggered
     * @param {...*} args     Arguments passed to the hook callback functions
     * @returns {boolean}     Were all hooks called without execution being prevented?
     */
    static callAll(hook, ...args) {
      if (Hooks.DEBUG_HOOKS) {
        console.log(`DEBUG | Calling ${hook} hook with args:`);
        console.log(args);
      }
      if (!(hook in this.#events)) return true;
      for (const entry of Array.from(this.#events[hook])) {
        this.#call(entry, args);
      }
      return true;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Call hook listeners in the order in which they were registered.
     * Continue calling hooks until either all have been called or one returns false.
     *
     * Hook listeners which return false denote that the original event has been adequately handled and no further
     * hooks should be called.
     *
     * @param {string} hook   The hook being triggered
     * @param {...*} args     Arguments passed to the hook callback functions
     * @returns {boolean}     Were all hooks called without execution being prevented?
     */
    static call(hook, ...args) {
      if (Hooks.DEBUG_HOOKS) {
        console.log(`DEBUG | Calling ${hook} hook with args:`);
        console.log(args);
      }
      if (!(hook in this.#events)) return true;
      for (const entry of Array.from(this.#events[hook])) {
        let callAdditional = this.#call(entry, args);
        if (callAdditional === false) return false;
      }
      return true;
    }
  
    /* -------------------------------------------- */
  
    /**
     * Call a hooked function using provided arguments and perhaps unregister it.
     * @param {HookedFunction} entry    The hooked function entry
     * @param {any[]} args              Arguments to be passed
     * @private
     */
    static #call(entry, args) {
      const {hook, id, fn, once} = entry;
      if (once) this.off(hook, id);
      try {
        return entry.fn(...args);
      } catch(err) {
        const msg = `Error thrown in hooked function '${fn?.name}' for hook '${hook}'`;
        console.warn(`${vtt} | ${msg}`);
        if (hook !== "error") this.onError("Hooks.#call", err, {msg, hook, fn, log: "error"});
      }
    }
  
    /* --------------------------------------------- */
  
    /**
     * Notify subscribers that an error has occurred within foundry.
     * @param {string} location                The method where the error was caught.
     * @param {Error} error                    The error.
     * @param {object} [options={}]            Additional options to configure behaviour.
     * @param {string} [options.msg=""]        A message which should prefix the resulting error or notification.
     * @param {?string} [options.log=null]     The level at which to log the error to console (if at all).
     * @param {?string} [options.notify=null]  The level at which to spawn a notification in the UI (if at all).
     * @param {object} [options.data={}]       Additional data to pass to the hook subscribers.
     */
    static onError(location, error, {msg="", notify=null, log=null, ...data}={}) {
      if (!(error instanceof Error)) return;
      if (msg) error.message = `${msg}. ${error.message}`;
      if (log) console[log]?.(error);
      if (notify) ui.notifications[notify]?.(msg || error.message);
  
      /**
       * A hook event that fires whenever foundry experiences an error.
       *
       * @function error
       * @memberof hookEvents
       * @param {string} location      The method where the error was caught.
       * @param {Error} err            The error.
       * @param {object} [data={}]     Additional data that might be provided, based on the nature of the error.
       */
      Hooks.callAll("error", location, error, data);
    }
  }
  