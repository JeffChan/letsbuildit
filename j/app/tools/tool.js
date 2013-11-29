define([
  'three',
  'three.CSG',
  'app/settings/constants'
], function (THREE, ThreeBSP, Constants) {
  function Tool(options) {
    options = options || {};
    this.scene = options.scene;
  }

  Tool.prototype = {
    constructor: Tool,

    op: function (raw, cut, op) {
      var rawBSP = new ThreeBSP(raw),
        cutBSP = new ThreeBSP(cut);

      var bsp = rawBSP[op](cutBSP);
      var result = bsp.toMesh(raw.material);
      result.geometry.computeVertexNormals();
      return result;
    },

    subtract: function (raw, cut) {
      return this.op(raw, cut, 'subtract');
    },

    union: function () {
      var result = arguments[0];
      for (var i = 1; i < arguments.length; i++) {
        result = this.op(result, arguments[i], 'union');
      }
      return result;
    },

    intersect: function (raw, cut) {
      return this.op(raw, cut, 'intersect');
    },

    /* Abstract functions */
    show: function (position, normal) {},
    hide: function () {},
    unintersect: function () {},

    click: function (piece, position, normal) {
      return null;
    },

    getTime: function () {
      return 0;
    }

  };

  THREE.EventDispatcher.prototype.apply(Tool.prototype);

  return Tool;
});
