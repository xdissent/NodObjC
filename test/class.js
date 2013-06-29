
/**
 * Module dependencies.
 */

var $ = require('../');
var assert = require('assert');

describe('Objective-C Classes', function () {

  $.framework('Foundation');
  var NSObject = $.NSObject;

  it('should return the class\' name as a String for `getName()`', function () {
    assert.equal('NSObject', NSObject.getName());
  });

  it('should return a boolean for `isMetaClass()`', function () {
    assert.equal(false, NSObject.isMetaClass());
  });

  it('should return >0 for `getInstanceSize()`', function () {
    assert(NSObject.getInstanceSize() > 0);
  });

  describe('Runtime-defined Classes', function () {
    var RTDClass = $.NSObject.extend('RTDClass');
    RTDClass.addMethod('testTrue', 'c@:', function() { return true; });
    RTDClass.addMethod('testFalse', 'c@:', function() { return false; });
    RTDClass.addMethod('testIvar', '@@:', function(self) {
      return self.ivar('test');
    });
    RTDClass.addIvar('test', '@')
    RTDClass.register();

    it('should send messages', function () {
      var r = RTDClass('alloc')('init');
      assert.equal(r('testTrue'), 1);
      assert.equal(r('testFalse'), 0);
      assert.equal(r('testIvar'), null);
    });

    it('should support ivars', function () {
      var r = RTDClass('alloc')('init');
      r.ivar('test', $('something'));
      assert.equal(r.ivar('test').toString(), 'something');
      assert.equal(r('testIvar').toString(), 'something');
    });
  });

  describe('Subclasses', function () {

  });

  describe('Superclasses', function () {

  });

  describe('Metaclasses', function () {

    it('should return the "metaclass" Class for `getClass()`', function () {
      var meta = NSObject.getClass();
      assert(meta.isMetaClass());
    });

    it('should contain a ◆ char in the `toString()` output', function () {
      var meta = NSObject.getClass();
      assert.notEqual(-1, meta.toString().indexOf('◆'));
    });

  });

});
