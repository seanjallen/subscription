function Handler(f, options) {
  if(!options) {
    options = {}
  }
  this.f = f
  this.once = options.once || false
  this.priority = options.priority || 0
  if(options.context !== undefined) {
    this.context = options.context
  }
}

Handler.prototype.dispatch = function() {
  return this.f.apply(this.context || null, arguments)
}

function Subscription() {
  this.handlers = []
}
exports.Subscription = Subscription

function insert(s, handler) {
  var pos = 0
  for (; pos < s.handlers.length; pos++)
    if (s.handlers[pos].priority < handler.priority) break
  s.handlers = s.handlers.slice(0, pos).concat(handler).concat(s.handlers.slice(pos))
}

Subscription.prototype.handlersForDispatch = function() {
  var handlers = this.handlers, updated = null
  for (var i = handlers.length - 1; i >= 0; i--) if (handlers[i].once) {
    if (!updated) updated = handlers.slice()
    updated.splice(i, 1)
  }
  if (updated) this.handlers = updated
  return handlers
}

Subscription.prototype.add = function(f, options) {
  insert(this, new Handler(f, options))
}

Subscription.prototype.remove = function(f, context) {
  for (var i = 0; i < this.handlers.length; i++) {
    if (this.handlers[i].f == f && (context === undefined || context === this.handlers[i].context)) {
      this.handlers = this.handlers.slice(0, i).concat(this.handlers.slice(i + 1))
      return
    }
  }
}

Subscription.prototype.hasHandler = function() {
  return this.handlers.length > 0
}

Subscription.prototype.dispatch = function() {
  var handlers = this.handlersForDispatch()
  for (var i = 0; i < handlers.length; i++)
    handlers[i].dispatch.apply(handlers[i], arguments)
}

function PipelineSubscription() {
  Subscription.call(this)
}
exports.PipelineSubscription = PipelineSubscription

PipelineSubscription.prototype = new Subscription

PipelineSubscription.prototype.dispatch = function(value) {
  var handlers = this.handlersForDispatch()
  for (var i = 0; i < handlers.length; i++)
    value = handlers[i].dispatch(value)
  return value
}

function StoppableSubscription() {
  Subscription.call(this)
}
exports.StoppableSubscription = StoppableSubscription

StoppableSubscription.prototype = new Subscription

StoppableSubscription.prototype.dispatch = function() {
  var handlers = this.handlersForDispatch()
  for (var i = 0; i < handlers.length; i++) {
    var result = handlers[i].dispatch.apply(handlers[i], arguments)
    if (result) return result
  }
}

function DOMSubscription() {
  Subscription.call(this)
}
exports.DOMSubscription = DOMSubscription

DOMSubscription.prototype = new Subscription

DOMSubscription.prototype.dispatch = function(event) {
  var handlers = this.handlersForDispatch()
  for (var i = 0; i < handlers.length; i++)
    if (handlers[i].dispatch(event) || event.defaultPrevented) return true
  return false
}
