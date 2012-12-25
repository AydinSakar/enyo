/**
_enyo.Object_ implements the Enyo framework's property publishing system, as
well as providing several utility functions for its subkinds.

Published properties are declared in a hash called _published_ within a call
to _enyo.kind_. Getter and setter methods are automatically generated for
properties declared in this manner. Also, by convention, the setter for a
published property will trigger an optional _&lt;propertyName&gt;Changed_ method
when called.

For more information, see the [documentation on Published
Properties](https://github.com/enyojs/enyo/wiki/Published-Properties) in the
Enyo Developer Guide.
*/
enyo.kind({
	name: "enyo.Object",
	//* @protected
	// has no base kind
	kind: null,
	//* @public
	// concatenated properties (default)
	concat: enyo.concat,
	//*@public
	/**
	  An array of strings that represent a mixin to be applied
	  to this class at the end of the construction routine.
	*/
	mixins: null,
	constructor: function() {
		enyo._objectCount++;

    this._bindings = [];

    // setup observers, bindings and computed properties
    this._setup();
    this.initMixins();
	},
	/**
		Sets property named 'n' with value 'v' and then invokes callback
		function 'cf' (if specified), passing in the original value of 'n'.
		All property setting should bottleneck here so that objects can
		observe changes wlog.
	*/
	setPropertyValue: function(n, v, cf) {
	  this.set(n, v);
	  //  var old = this[n];
		//if (this[cf]) {
		//	this[n] = v;
		//	this[cf](old);
		//} else {
		//	this[n] = v;
		//}
    //    //console.log("setProperty: ", n, old, v, this);
    //    if (old !== v) this.notifyObservers(n, old, v);
	},
	_setProperty: function(n, v, cf) {
		this.setPropertyValue(n, v, (this.getProperty(n) !== v) && cf);
	},
	//* @public
	//* Destroys object with passed-in name.
	destroyObject: function(inName) {
		if (this[inName] && this[inName].destroy) {
			this[inName].destroy();
		}
		this[inName] = null;
	},
	//* Gets value of property with passed-in name.
	getProperty: function(n) {
		var getter = "get" + enyo.cap(n);
		if (this[getter]) {
			return this[getter]();
		}
		return this[n];
	},
	//* Sets value of property named 'n' to 'v'.
	setProperty: function(n, v) {
	  this.set(n, v);
		//var setter = "set" + enyo.cap(n);
		//if (this[setter]) {
		//	this[setter](v);
		//} else {
		//	this._setProperty(n, v, n + "Changed");
		//}
	},
	/**
		Sends a log message to the console, prepended with the name of the kind
		and method from which _log_ was invoked.  Multiple arguments are coerced
		to String and joined with spaces.

			enyo.kind({
				name: "MyObject",
				kind: enyo.Object,
				hello: function() {
					this.log("says", "hi");
					// shows in the console: MyObject.hello: says hi
				}
			});
	*/
	log: function() {
		var acc = arguments.callee.caller;
		var nom = ((acc ? acc.nom : "") || "(instance method)") + ":";
		enyo.logging.log("log", [nom].concat(enyo.cloneArray(arguments)));
	},
	//* Same as _log_, except uses the console's warn method (if it exists).
	warn: function() {
		this._log("warn", arguments);
	},
	//* Same as _log_, except uses the console's error method (if it exists).
	error: function() {
		this._log("error", arguments);
	},
	//* @protected
	_log: function(inMethod, inArgs) {
		if (enyo.logging.shouldLog(inMethod)) {
			try {
				throw new Error();
			} catch(x) {
				enyo.logging._log(inMethod, [inArgs.callee.caller.nom + ": "].concat(enyo.cloneArray(inArgs)));
				enyo.log(x.stack);
			}
		}
	},

    //*@protected
    /**
        For any property on the given object this method will offload
        the work of determining the property from its string path,
        whether or not it can find an instance or constructor for the
        given kind and pass what it finds back to the callback. The
        callback can expect to receive two parameters the first being the
        constructor if it could be determined and the second being an
        instance of the requested kind if the constructor was found.
        Most often if the constructor could be determined the instance's
        owner property will be set to this object (in the callback).
    */
    findAndInstance: function (property, fn) {
        // if we have a callback bind it to the given object so that
        // it will be called under the correct context, if it has
        // already been bound this is pretty harmless
        fn = enyo.exists(fn) && "function" === typeof fn? enyo.bind(this, fn): null;
        // go ahead and call the enyo scoped version of this method
        return enyo.findAndInstance.call(this, property, fn);
    },

  //*@protected
  _bindings: null,
  _computed: null,
  _observers: null,
  _appliedMixins: null,

  //*@protected
  initMixins: function () {
    var exts = this.mixins, fn;
    this._appliedMixins = [];
    if (!exts) return;
    enyo.forEach(exts, this.prepareMixin, this);
  },
  //*@protected
  prepareMixin: function (mixin) {
    this.extend(enyo.isString(mixin)? enyo.getPath(mixin): mixin);
  },
  _setupBindings: function () {
    var prop, i = 0, b;
    this.clearBindings();
    b = this._bindings = [];
    if ((prop = this["bindings"])) {
      for (; i < prop.length; ++i) {
        b.push(new enyo.Binding({owner: this, autoConnect: true}, prop[i]));
      }
    }
  },

  _setupComputed: function () {
    var p, prop, i, c;
    c = this._computed = {};
    for (p in this) {
      if (!(prop = this[p])) continue;
      if (enyo.isFunction(prop)) {
        if (prop.isProperty) {
          c[p] = prop;
          for (i = 0; i < prop.properties.length; ++i) {
            this.addObserver(prop.properties[i],
              enyo.bind(this, function (prop) {
                this.notifyObservers(prop, null, this.get(prop), true);
              }, p));
          }
        }
      }
    }
  },
  
  _setupObservers: function () {
    var p, prop, i, e;
    this._observers = this._observers || {};
    for (p in this) {
      if (!(prop = this[p])) continue;
      if (enyo.isFunction(prop)) {
        if (prop.isObserver && prop.events && prop.events.length) {
          for (i = 0; i < prop.events.length; ++i) {
            e = prop.events[i];
            this.addObserver(e, prop);
          }
        }
      }
    }
  },

  _setup: function () {
    this._setupObservers();
    this._setupComputed();
    this._setupBindings();
  },
  
    
    addObserver: function (inProp, inFunc, inContext) {
      var o = this._observers, t, f;

      //console.log("enyo.Object.addObserver: ", inProp);

      f = inContext? enyo.bind(inContext, inFunc): inFunc;
      
      // TODO: this should be handled differently, maybe throw a fatal?
      if (!enyo.isFunction(f)) {
        enyo.warn("enyo.Object.addObserver: must supply a valid function if no " +
          "context is set for the callback, a default `empty` handler has been " + 
          "used instead (property " + inProp + ")");
        f = enyo.nop; // can only be released if removeAllObservers is called
                            // or is manually removed
      }

      if (!(t = o[inProp])) t = o[inProp] = [];
      if (t.indexOf(f) === -1) t.push(f);

      // allow chaining
      return this; 
    },

    removeObserver: function (inProp, inFunc) {
      var o = this._observers, t, i;

      //console.log("enyo.Object.removeObserver: ", inProp);

      if (!(t = o[inProp])) return this; // nothing to do
      i = t.indexOf(inFunc);
      if (i < 0) {
        //enyo.warn("enyo.Object.removeObserver: could not remove observer " +
        //  inProp + " because the listener supplied did not exist");
        return this;
      }

      // remove it from the listeners array
      t.splice(i, 1);

      // allow chaining
      return this;
    },

    removeAllObservers: function () {
      var o = this._observers, p;

      //console.log("enyo.Object.removeAllObservers");

      for (p in o) {
        if (!o.hasOwnProperty(p)) continue;
        o[p] = null;
      }
      this._observers = {};
      return this;
    },

    notifyObservers: function (inProp, oldVal, newVal, force) {
      
      var o = this._observers, c = this._computed, t = o[inProp], i = 0, fn,
          ch_name = inProp[0].toLowerCase() + inProp.slice(1) + "Changed";

      if (t) {
        for (; i < t.length; ++i) {
          fn = t[i];
          if (!fn || !enyo.isFunction(fn)) continue;

          // TODO: for now this cannot be asynchronous without destroying
          // two-way bindings
          if (!this._allowNotifications) {
            this.addNotificationToQueue(inProp, fn, [inProp, oldVal, newVal]);
          } else {
            //enyo.asyncMethod(this, fn, inProp, oldVal, newVal);
            fn.call(this, inProp, oldVal, newVal);
          }
        }
      }
      
      if (this[ch_name] && enyo.isFunction(this[ch_name])) {
        if (!this._allowNotifications) {
          this.addNotificationToQueue(inProp, this[ch_name], [oldVal, newVal]);
        //} else { enyo.asyncMethod(this, ch_name, oldVal, newVal); }
        // TODO: apparently these are required to be executed as synchronous?
        } else { this[ch_name].call(this, oldVal, newVal); }
      }
      
    },
    
    _notificationQueue: null,
    _allowNotifications: true,
    
    addNotificationToQueue: function (prop, fn, params) {
      var q = this._notificationQueue || (this._notificationQueue = {}), e = q[prop];
      if (!e) {
        e = (q[prop] = [params || [], fn]);
      } else {
        // we update the params to whatever is most current in case
        // they have been updated more than once while notifications
        // are off...
        if (params) e.splice(0, 1, params);
        if (e.indexOf(fn) === -1) e.push(fn);
      }
    },
    
    stopNotifications: function () {
      // TODO: this may not be desirable to assume a reset of the
      // queue EVERY time this is called...
      this._notificationQueue = {};
      this._allowNotifications = false;
    },
    
    startNotifications: function () {
      this._allowNotifications = true;
      this.flushNotifications();
    },
    
    flushNotifications: function () {
      var q = this._notificationQueue || {}, fn, p, n, params, t;
      for (p in q) {
        n = q[p];
        if (n && enyo.isArray(n)) {
          params = n.length > 1? n.shift(): [];
          while (n.length) {
            fn = n.shift();
            if (fn && enyo.isFunction(fn)) {
              // async?
              //fn.apply(this, params);
              t = enyo.bind(this, function () {fn.apply(this, params)});
              // FIXME: for the {propName}Changed function pattern it needs
              // to be execued synchronously?
              //enyo.asyncMethod(this, t);
              t.call(this);
            }
          }
        }
      }
    },

    binding: function () {
      var args = enyo.toArray(arguments), props = {}, i = 0, b;
      for (; i < args.length; ++i) enyo.mixin(props, args[i]);
      b = new enyo.Binding({owner: this, autoConnect: true}, props);
      this._bindings.push(b);
      return b;
    },

    clearBindings: function (inBindings) {
      var b = inBindings || this._bindings, i, bnd;
      if (b && b.length > 0) {
        while (b.length) {
          bnd = b.shift();
          bnd.destroy();
        }
      }
    },
    //*@public
    refreshBindings: function (inBindings) {
      var b = inBindings || this._bindings, bnd, i = 0;
      for (; i < b.length; ++i) {
        bnd = b[i];
        bnd.refresh();
      }
    },
    //*@public
    removeBinding: function (inBinding) {
      var b, i = (b = this._bindings || []).indexOf(inBinding);
      if (i !== -1) b.splice(i, 1);
    },
    //*@public
    get: function () {
      var get_n = "get" + enyo.cap(arguments[0]);
      if (this[get_n] && this[get_n].overloaded === true) return this[get_n]();
      return enyo.getPath.apply(this, arguments);
    },
    //*@public
    set: function () {
      return enyo.setPath.apply(this, arguments);
    },
    
    
    //*@public
    /**
    */
    extend: function () {
        var args = enyo.toArray(arguments);
        var ext;
        var key;
        var prop;
        while (args.length && (ext = args.shift())) {
            if (ext.isMixin || "function" === typeof ext) {
                this._extendMixin(ext);
            } else {
                for (key in ext) {
                    if (!ext.hasOwnProperty(key)) continue;
                    prop = ext[key];
                    if ("string" === typeof prop) {
                        this[key] = prop;
                    } else if ("function" === typeof prop) {
                        this._extendMethod(key, prop, ext);
                    }
                }
            }
        }
    },
    
    //*@protected
    _extendMethod: function (name, fn, ext) {
      var s = this.stored || (this.stored = {}), base;
      
      var computed = !!fn.isProperty;
      if (ext.name && ext.preserve && (this[name] || ext.preserveAll)) {
        // store the method and do not insert into inheritance
        enyo.setPath.call(s, enyo.format("%..%.", ext.name, name), enyo.bind(this, fn));
      } else {
        if (this[name]) {
          // at the very least the new method can call inherited
          base = this[name];
          fn = this[name] = (function (fn, context) {
              return function () {
                  return fn.apply(context, arguments);
              }
          }(fn, this));
          fn._inherited = base;
        } else {
          // there was no known method of this name so
          // simply add it
          //this[name] = enyo.bind(this, fn);
          fn = this[name] = (function (fn, context) {
              return function () {
                  return fn.apply(context, arguments);
              }
          }(fn, this));
          // but just in case there's an extra inherited call
          fn._inherited = enyo.nop;
        }
        if (true === computed) {
            fn.isProperty = true;
            fn.properties = base? base.properties: [];
        }
      }
    },
    //*@protected
    _extendMixin: function (mixin) {
      // allow the mixin to register itself the way it should
      mixin.apply(this);
    }
    
});

//* @protected

enyo._objectCount = 0;

enyo.Object.subclass = function(ctor, props) {
	this.publish(ctor, props);
};

enyo.Object.publish = function(ctor, props) {
	var pp = props.published;
	if (pp) {
		var cp = ctor.prototype;
		for (var n in pp) {
      // need to make sure that even though a property is "published"
      // it does not overwrite any computed properties
      if (props[n] && enyo.isFunction(props[n]) && props[n].isProperty) continue;
			enyo.Object.addGetterSetter(n, pp[n], cp);
		}
	}
};

enyo.Object.addGetterSetter = function(inName, inValue, inProto) {
	var priv_n = inName;
	inProto[priv_n] = inValue;
	//
	var cap_n = enyo.cap(priv_n); 
	var get_n = "get" + cap_n;
	if (!inProto[get_n]) {
	  
	  inProto[get_n] = function () {
	    return this.get(priv_n);
	  };
	  inProto[get_n].overloaded = false;
  } else if (inProto[get_n].overloaded !== false){
    inProto[get_n].overloaded = true;
  }
	//
	var set_n = "set" + cap_n;
	if (!inProto[set_n]) {
	  inProto[set_n] = function () {
	    return this.set(priv_n, arguments[0]);
	  }
	  inProto[set_n].overloaded = false;
	} else if (inProto[set_n].overloaded !== false) {
	  inProto[set_n].overloaded = true;
	}
};
