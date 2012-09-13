/**
 * Backbone localStorage Adapter
 * https://github.com/jeromegn/Backbone.localStorage
 */

(function() {
// A simple module to replace `Backbone.sync` with *localStorage*-based
// persistence. Models are given GUIDS, and saved into a JSON object. Simple
// as that.

// Generate four random hex digits.
function S4() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};

// Generate a pseudo-GUID by concatenating random hexadecimal.
function guid() {
   return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

// Our Store is represented by a single JS object in *localStorage*. Create it
// with a meaningful name, like the name you'd give a table.
// window.Store is deprectated, use Backbone.LocalStorage instead
Backbone.LocalStorage = window.Store = function(name) {
  this.name = name;
  var store = this.localStorage().getItem(this.name);
  this.records = (store && store.split(",")) || [];
};

_.extend(Backbone.LocalStorage.prototype, {

  // Save the current state of the **Store** to *localStorage*.
  save: function() {
    this.localStorage().setItem(this.name, this.records.join(","));
  },

  // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
  // have an id of it's own.
  create: function(model) {
    if (!model.id) {
        model.id = guid();
        model.set(model.idAttribute, model.id);
    }
    this.localStorage().setItem(this.name+"_"+model.id, JSON.stringify(model));
    this.records.push(model.id.toString());
    this.save();
    return model;
  },

  // Update a model by replacing its copy in `this.data`.
  update: function(model) {
    this.localStorage().setItem(this.name+"_"+model.id, JSON.stringify(model));
    if (!_.include(this.records, model.id.toString())) this.records.push(model.id.toString()); this.save();
    return model;
  },

  // Retrieve a model from `this.data` by id.
  find: function(model) {
    return JSON.parse(this.localStorage().getItem(this.name+"_"+model.id));
  },

  // Return the array of all models currently in storage.
  findAll: function() {
    return _(this.records).chain()
        .map(function(id){return JSON.parse(this.localStorage().getItem(this.name+"_"+id));}, this)
        .compact()
        .value();
  },

  // Delete a model from `this.data`, returning it.
  destroy: function(model) {
    // this.localStorage().clear();
    log(this,model);
    this.localStorage().removeItem(this.name+"_"+model.id);
    this.records = _.reject(this.records, function(record_id){return record_id == model.id.toString();});
    this.save();
    return model;
  },

  localStorage: function() {
      return localStorage;
  }

});

// localSync delegate to the model or collection's
// *localStorage* property, which should be an instance of `Store`.
// window.Store.sync and Backbone.localSync is deprectated, use Backbone.LocalStorage.sync instead
Backbone.LocalStorage.sync = window.Store.sync = Backbone.localSync = function(method, model, options, error) {
  var store = model.localStorage || model.collection.localStorage;
  // console.log('  • local sync');
  // console.log(method);
  // console.log(model);
  // console.log(options);
  // console.log(this);
  // Backwards compatibility with Backbone <= 0.3.3
  if (typeof options == 'function') {
    options = {
      success: options,
      error: error
    };
  }

  var resp;

  switch (method) {
    case "read":    resp = model.id != undefined ? store.find(model) : store.findAll(); break;
    case "create":  resp = store.create(model);                            break;
    case "update":  resp = store.update(model);                            break;
    case "delete":  resp = store.destroy(model);                           break;
  }
  if (resp) {
    options.success(resp);
  } else {
    options.error("Record not found");
  }
};

// Backbone.ajaxSync = Backbone.sync;

Backbone.ajaxSync = function(method, model, options) {
    // console.log('------ ajax options------');
    // console.log(method);
    // console.log(model);
    // console.log(options);
    // console.log('------this------');
    // console.log(this);
    // var list_campaign_string = '&oid=' + options.oid + '&aaid=' + options.aaid;

    if (method === 'read') {
      switch(options.dataModel) {
        // case 'advertiser': model.reset(); jq.getJSON(options.url_string, options.success); break; // this
        // case 'campaign': model.reset(); jq.getJSON(options.url_string, options.success); break; // this
        // case 'article': model.reset(); jq.getJSON(options.url_string, options.success); break; // this
        case 'user': jq.getJSON(options.url_string, options.success); break;
        // case 'creative': jq.getJSON(options.url_string, options.success); break; // this
        // case 'adgroup': jq.getJSON(options.url_string, options.success); break; // this
      }
    }
    if (method === 'create') {
      switch(options.dataModel) {
        case 'ricochet': jq.post(options.url_string, options.success); break;
      }
    }
    if (method === 'update') {
      switch(options.dataModel) {
        case 'user': jq.post(options.url_string, options.success); break; // login call!!!
        default: console.log('default ' + options.dataModel);
      }
    }

  };

Backbone.getSyncMethod = function(model, options) {
  // console.log('get sync method ... ');
  // console.log(options.dataModel + ", " + options.use_local);
  if (options.use_local === false) { 
    return Backbone.ajaxSync 

  } else if(model.localStorage || (model.collection && model.collection.localStorage)) {
		return Backbone.localSync;

	} else {
  	return Backbone.ajaxSync;

  }
};

// Override 'Backbone.sync' to default to localSync,
// the original 'Backbone.sync' is still available in 'Backbone.ajaxSync'
Backbone.sync = function(method, model, options, error) {
	return Backbone.getSyncMethod(model, options).apply(this, [method, model, options, error]);
};

})();