
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


  describe('Subclasses', function () {

  });

  describe('Superclasses', function () {

  });

  describe('Metaclasses', function () {

    it('should return the "metaclass" Class for `getClass()`', function () {
      var meta = NSObject.getClass();
      assert(meta.isMetaClass());
      console.log(meta);
    });

  });

});
