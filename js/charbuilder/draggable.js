/**
 * A UI utility to make an element draggable.
 * @param {Application} app             The Application that is being made draggable.
 * @param {jQuery} element              A JQuery reference to the Application's outer-most element.
 * @param {HTMLElement|boolean} handle  The element that acts as a drag handle. Supply false to disable dragging.
 * @param {boolean|object} resizable    Is the application resizable? Supply an object to configure resizing behaviour
 *                                      or true to have it automatically configured.
 * @param {string} [resizable.selector]       A selector for the resize handle.
 * @param {boolean} [resizable.resizeX=true]  Enable resizing in the X direction.
 * @param {boolean} [resizable.resizeY=true]  Enable resizing in the Y direction.
 * @param {boolean} [resizable.rtl]           Modify the resizing direction to be right-to-left.
 */
class Draggable {
    constructor(app, element, handle, resizable) {
  
      // Setup element data
      this.app = app;
      this.element = element[0];
      this.handle = handle ?? this.element;
      this.resizable = resizable || false;
  
      /**
       * Duplicate the application's starting position to track differences
       * @type {Object}
       */
      this.position = null;
  
      /**
       * Remember event handlers associated with this Draggable class so they may be later unregistered
       * @type {Object}
       */
      this.handlers = {};
  
      /**
       * Throttle mousemove event handling to 60fps
       * @type {number}
       */
      this._moveTime = 0;
  
      // Activate interactivity
      this.activateListeners();
    }
  
    /* ----------------------------------------- */
  
    /**
     * Activate event handling for a Draggable application
     * Attach handlers for floating, dragging, and resizing
     */
    activateListeners() {
      this._activateDragListeners();
      this._activateResizeListeners();
    }
  
    /* ----------------------------------------- */
  
    /**
     * Attach handlers for dragging and floating.
     * @protected
     */
    _activateDragListeners() {
      if ( !this.handle ) return;
  
      // Float to top
      this.handlers["click"] = ["mousedown", ev => this.app.bringToTop(), {capture: true, passive: true}];
      this.element.addEventListener(...this.handlers.click);
  
      // Drag handlers
      this.handlers["dragDown"] = ["mousedown", e => this._onDragMouseDown(e), false];
      this.handlers["dragMove"] = ["mousemove", e => this._onDragMouseMove(e), false];
      this.handlers["dragUp"] = ["mouseup", e => this._onDragMouseUp(e), false];
      this.handle.addEventListener(...this.handlers.dragDown);
      this.handle.classList.add("draggable");
    }
  
    /* ----------------------------------------- */
  
    /**
     * Attach handlers for resizing.
     * @protected
     */
    _activateResizeListeners() {
      if ( !this.resizable ) return;
      let handle = this.element.querySelector(this.resizable.selector);
      if ( !handle ) {
        handle = $('<div class="window-resizable-handle"><i class="fas fa-arrows-alt-h"></i></div>')[0];
        this.element.appendChild(handle);
      }
  
      // Register handlers
      this.handlers["resizeDown"] = ["mousedown", e => this._onResizeMouseDown(e), false];
      this.handlers["resizeMove"] = ["mousemove", e => this._onResizeMouseMove(e), false];
      this.handlers["resizeUp"] = ["mouseup", e => this._onResizeMouseUp(e), false];
  
      // Attach the click handler and CSS class
      handle.addEventListener(...this.handlers.resizeDown);
      if ( this.handle ) this.handle.classList.add("resizable");
    }
  
    /* ----------------------------------------- */
  
    /**
     * Handle the initial mouse click which activates dragging behavior for the application
     * @private
     */
    _onDragMouseDown(event) {
      event.preventDefault();
  
      // Record initial position
      this.position = HelperFunctions.deepClone(this.app.position);
      this._initial = {x: event.clientX, y: event.clientY};
  
      // Add temporary handlers
      window.addEventListener(...this.handlers.dragMove);
      window.addEventListener(...this.handlers.dragUp);
    }
  
    /* ----------------------------------------- */
  
    /**
     * Move the window with the mouse, bounding the movement to ensure the window stays within bounds of the viewport
     * @private
     */
    _onDragMouseMove(event) {
      event.preventDefault();
  
      // Limit dragging to 60 updates per second
      const now = Date.now();
      if ( (now - this._moveTime) < (1000/60) ) return;
      this._moveTime = now;
  
      // Update application position
      this.app.setPosition({
        left: this.position.left + (event.clientX - this._initial.x),
        top: this.position.top + (event.clientY - this._initial.y)
      });
    }
  
    /* ----------------------------------------- */
  
    /**
     * Conclude the dragging behavior when the mouse is release, setting the final position and removing listeners
     * @private
     */
    _onDragMouseUp(event) {
      event.preventDefault();
      window.removeEventListener(...this.handlers.dragMove);
      window.removeEventListener(...this.handlers.dragUp);
    }
  
    /* ----------------------------------------- */
  
    /**
     * Handle the initial mouse click which activates dragging behavior for the application
     * @private
     */
    _onResizeMouseDown(event) {
      event.preventDefault();
  
      // Limit dragging to 60 updates per second
      const now = Date.now();
      if ( (now - this._moveTime) < (1000/60) ) return;
      this._moveTime = now;
  
      // Record initial position
      this.position = HelperFunctions.deepClone(this.app.position);
      if ( this.position.height === "auto" ) this.position.height = this.element.clientHeight;
      if ( this.position.width === "auto" ) this.position.width = this.element.clientWidth;
      this._initial = {x: event.clientX, y: event.clientY};
  
      // Add temporary handlers
      window.addEventListener(...this.handlers.resizeMove);
      window.addEventListener(...this.handlers.resizeUp);
    }
  
    /* ----------------------------------------- */
  
    /**
     * Move the window with the mouse, bounding the movement to ensure the window stays within bounds of the viewport
     * @private
     */
    _onResizeMouseMove(event) {
      event.preventDefault();
      const scale = this.app.position.scale ?? 1;
      let deltaX = (event.clientX - this._initial.x) / scale;
      const deltaY = (event.clientY - this._initial.y) / scale;
      if ( this.resizable.rtl === true ) deltaX *= -1;
      const newPosition = {
        width: this.position.width + deltaX,
        height: this.position.height + deltaY
      };
      if ( this.resizable.resizeX === false ) delete newPosition.width;
      if ( this.resizable.resizeY === false ) delete newPosition.height;
      this.app.setPosition(newPosition);
    }
  
    /* ----------------------------------------- */
  
    /**
     * Conclude the dragging behavior when the mouse is release, setting the final position and removing listeners
     * @private
     */
    _onResizeMouseUp(event) {
      event.preventDefault();
      window.removeEventListener(...this.handlers.resizeMove);
      window.removeEventListener(...this.handlers.resizeUp);
      this.app._onResize(event);
    }
  }
  