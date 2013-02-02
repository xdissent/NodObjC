
/**
 * Module dependencies.
 */

var $ = require('../');
var assert = require('assert');

describe('Objective-C Objects', function () {

  $.framework('Foundation');

  var NSObject = $.NSObject;
  var NSArray = $.NSArray;

  it('should be a `function`', function () {
    assert.equal('function', typeof NSObject);
  });

  it('should invoke an Objective-C method when invoked', function () {
    var version = NSObject('version');
    assert.equal('number', typeof version);
  });

  it('should return identical Function instances for [NSObject self]', function () {
    var self = NSObject('self');
    assert.strictEqual(self, NSObject);
  });

  it('should create an instance with [[NSObject alloc] init]', function () {
    var o = NSObject('alloc')('init');
    assert.equal('function', typeof o);
  });

  describe('getClass()', function () {
    var o = NSObject('alloc')('init');

    it('return the Class instance for the object', function () {
      assert.strictEqual(o.getClass(), NSObject);
    });

  });

  describe('getClassName()', function () {
    var o = NSObject('alloc')('init');

    it('should return the class name as a String', function () {
      assert.equal('NSObject', o.getClassName());
      assert.equal('NSObject', NSObject.getClassName());
    });

  });

  describe('setClass()', function () {
    var o = NSObject('alloc')('init');

    it('should dynamically change the object\'s Class', function () {
      assert.strictEqual(o.getClass(), NSObject);
      o.setClass(NSArray);
      assert.strictEqual(o.getClass(), NSArray);
    });

  });

  describe('ancestors()', function () {

    it('should return an Array of Strings', function () {
      var ancestors = NSObject.ancestors();
      assert(Array.isArray(ancestors));
      assert(ancestors.length > 0);
      ancestors.forEach(function (ancestor) {
        assert.equal('string', typeof ancestor);
      });
    });

  });

  describe('methods()', function () {

    it('should return an Array of Strings', function () {
      var methods = NSObject.methods();
      assert(Array.isArray(methods));
      assert(methods.length > 0);
      methods.forEach(function (method) {
        assert.equal('string', typeof method);
      });
    });

  });

  describe('ivars()', function () {
    var o = NSObject('alloc')('init');

    it('should return an Array of Strings', function () {
      var ivars = o.ivars();
      assert(Array.isArray(ivars));
      assert(ivars.length > 0);
      ivars.forEach(function (ivar) {
        assert.equal('string', typeof ivar);
      });
    });

    it('should return [] for the NSObject Class', function () {
      assert.deepEqual([], NSObject.ivars());
    });

    it('should return ["isa"] for an NSObject instance', function () {
      assert.deepEqual([ 'isa' ], o.ivars());
    });

  });

  describe('instance variables', function () {

    it('should get the "isa" variable with 1 argument', function () {
      var o = NSObject('alloc')('init');
      var isa = o.ivar('isa');
      assert.strictEqual(NSObject, isa);
    });

    it('should set the "isa" variable with 2 arguments', function () {
      var o = NSObject('alloc')('init');
      assert.strictEqual(NSObject, o.getClass());
      o.ivar('isa', NSArray);
      assert.strictEqual(NSArray, o.getClass());
    });

  });

});
