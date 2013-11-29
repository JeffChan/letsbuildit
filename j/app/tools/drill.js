define([
  'app/settings/constants',
  'app/tools/tool',
  'app/shapes',
  'app/utils'
], function (Constants, Tool, Shapes, Utils) {

  function Drill(options) {
    Tool.call(this, options);
    this.radius = options.radius || 0;
    this.size = options.size || 200;
    this.circle = null;
  }

  Drill.prototype = Object.create(Tool.prototype);

  Drill.prototype.show = function (position, normal) {
    var line = this.scene.getObjectByName(Constants.LASER_NAME);
    line.visible = true;
    line.geometry.verticesNeedUpdate = true;
    line.geometry.vertices = [
      position.clone().add(normal.clone().multiplyScalar(-500)),
      position.clone().add(normal.clone().multiplyScalar(500))
    ];

    var circle = this.circle = Shapes.circle({
      radius: this.radius
    });
    circle.position = position.clone().add(normal.clone().multiplyScalar(Constants.OFFSET));
    var rotation = normal.clone().applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI / 2);
    circle.rotation.fromArray(rotation.toArray());
    this.scene.add(circle);
  };

  Drill.prototype.hide = function () {
    var line = this.scene.getObjectByName(Constants.LASER_NAME);
    line.visible = false;

    if (this.circle) {
      this.scene.remove(this.circle);
      this.circle = null;
    }
  };

  Drill.prototype.click = function (piece, position, normal) {
    var output = this.subtract(piece, Shapes.cylinder({
      radius: this.radius,
      depth: this.size,
      position: position,
      normal: normal
    }));
    return output;
  };

  Drill.prototype.getTime = function () {
    return 0.013 * Math.PI * this.radius * this.radius * 100;
  };

  return Drill;

});
