define([
  'three',
  'app/settings/constants',
  'app/tools/tool',
  'app/shapes',
  'app/utils'
], function (THREE, Constants, Tool, Shapes, Utils) {

  function Saw(options) {
    Tool.call(this, options);
    this.radius = options.radius || 0;
    this.size = options.size || 100;
    this.cutInverse = options.cutInverse || false;

    this.plane = null;
  }

  Saw.prototype = Object.create(Tool.prototype);

  Saw.prototype.show = function (position, normal) {
    var plane = this.plane = Shapes.plane({
      segments: 5,
      size: 200,
      normal: normal,
      material: new THREE.MeshBasicMaterial({
        color: 'red',
        wireframe: true,
        wireframeLinewidth: 2
      })
    });
    plane.position = position.clone().sub(normal.clone().multiplyScalar(this.size / 2));
    var rotation = normal.clone().applyMatrix3(Utils.ZYXMatrix()).multiplyScalar(Math.PI / 2);
    plane.rotation.fromArray(rotation.toArray());
    this.scene.add(plane);

    var sign = this.cutInverse ? 1 : -1;
    var dir = normal.clone().applyMatrix3(Utils.ZXYMatrix());
    var line = this.scene.getObjectByName(Constants.LASER_NAME);
    line.visible = true;
    line.geometry.verticesNeedUpdate = true;
    line.geometry.vertices = [
      position.clone().add(dir.clone().multiplyScalar(Constants.OFFSET)),
      position.clone().add(dir.clone().multiplyScalar(sign * this.size * 2))
    ];
  };

  Saw.prototype.hide = function () {
    var line = this.scene.getObjectByName(Constants.LASER_NAME);
    line.visible = false;

    if (this.plane) {
      this.scene.remove(this.plane);
      this.plane = null;
    }
  };

  Saw.prototype.click = function (piece, position, normal) {
    if (!this.plane) {
      return null;
    }

    var dir = normal.clone().applyMatrix3(Utils.ZXYMatrix());
    var length = this.size;
    var pos = this.plane.position.clone();
    var shift = dir.multiplyScalar(length / 2);

    if (this.cutInverse) {
      shift = Utils.map(shift, function (a) {return -1 * a; });
    }

    var saw = this._saw({
      normal: normal,
      position: pos.sub(shift),
      length: length
    });
    var rotation = (new THREE.Vector3()).fromArray(this.plane.rotation.toArray()).applyMatrix3(Utils.YZXMatrix());
    saw.rotation.fromArray(rotation.toArray());
    var output = this.subtract(piece, saw);
    return output;
  };

  Saw.prototype.getTime = function () {
    return 240;
  };

  Saw.prototype._saw = function (options) {
    options = options || {};

    var normal = options.normal;
    var position = options.position;
    var length = options.length;

    var cubeGeometry = new THREE.CubeGeometry(this.size * 2, length, this.size * 2);
    var cube = new THREE.Mesh(cubeGeometry, this.material);
    var rotation = Utils.map(normal, Math.abs).applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI / 2);
    cube.rotation.fromArray(rotation.toArray());
    cube.position = position;

    return cube;
  };

  return Saw;

});
