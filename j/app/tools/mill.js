define([
  'three',
  'app/settings/constants',
  'app/tools/tool',
  'app/shapes',
  'app/utils'
], function (THREE, Constants, Tool, Shapes, Utils) {

  function Mill(options) {
    Tool.call(this, options);
    this.radius = options.radius || 0;
    this.depth = options.depth || 200;
    this.circle = null;

    this.highlighted = null;
    this.highlightedNormal = null;
    this.prevLength = 0;
  }

  Mill.prototype = Object.create(Tool.prototype);

  Mill.prototype.show = function (position, normal) {
    if (this.highlighted) {
      var startPt = this.highlighted.position;
      var line = this.scene.getObjectByName(Constants.LASER_NAME);
      line.visible = true;
      line.geometry.verticesNeedUpdate = true;
      line.geometry.vertices = [
        startPt.clone().add(normal.clone().multiplyScalar(Constants.OFFSET)),
        position.clone().add(normal.clone().multiplyScalar(Constants.OFFSET))
      ];
    } else {
      this.circle = Shapes.circle({
        radius: this.radius
      });
      this.circle.position = position.clone().add(normal.clone().multiplyScalar(Constants.OFFSET));
      var rotation = normal.clone().applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI / 2);
      this.circle.rotation.fromArray(rotation.toArray());
      this.scene.add(this.circle);
    }
  };

  Mill.prototype.hide = function () {
    var line = this.scene.getObjectByName(Constants.LASER_NAME);
    line.visible = false;

    if (this.circle) {
      this.scene.remove(this.circle);
      this.circle = null;
    }
  };

  Mill.prototype.unintersect = function () {
    if (this.highlighted) {
      this.scene.remove(this.highlighted);
      this.highlighted = null;
    }
  };

  Mill.prototype.click = function (piece, position, normal) {
    if (this.highlighted) {
      var startPt = this.highlighted.position.sub(normal.clone().multiplyScalar(Constants.OFFSET)); // reverse the offset

      this.scene.remove(this.highlighted);
      this.highlighted = null;

      if (!this.highlightedNormal.equals(normal)) {
        return null;
      }

      var mill = this._mill({
        start: startPt,
        end: position,
        length: this.radius * 2,
        depth: this.depth * 2,
        normal: normal
      });

      if (mill) {
        this.prevLength = startPt.distanceTo(position);
        return this.subtract(piece, mill);
      } else {
        return null;
      }

    } else {
      // var x = Shapes.cross({color: 0xff0000});
      var x = Shapes.circle({
        radius: this.radius
      });
      x.position = position.clone().add(normal.clone().multiplyScalar(Constants.OFFSET)); // offset so the cross shows up
      var rotation = normal.clone().applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI / 2);
      x.rotation.fromArray(rotation.toArray());
      this.scene.add(x);
      this.dispatchEvent({type: 'change'});

      this.highlighted = x;
      this.highlightedNormal = normal;
    }
  };

  Mill.prototype.getTime = function () {
    return 0.020 * (Math.PI * Math.pow(this.radius, 2) + 2 * this.radius * this.prevLength) * this.depth;
  };

  Mill.prototype._mill = function (options) {
    var start = options.start,
      end = options.end,
      normal = options.normal;

    if (Utils.roughlyEquals(start, end)) {
      end = start.clone().add(Utils.iNormal(normal).multiplyScalar(0.05));
    }

    var l1 = Utils.getProjection(start, normal);
    var l2 = Utils.getProjection(end, normal);
    var l = l1.clone().sub(l2);
    var dist = l1.distanceTo(l2);

    var mRot, angle;
    if (l.z === 0) {
      angle = Math.PI / 2 + Math.atan2(l.y, l.x);
      mRot = Utils.XYZMatrix();
    } else if (l.y === 0) {
      angle = Math.atan2(l.z, l.x);
      mRot = Utils.XZYMatrix();
    } else if (l.x === 0) {
      angle = Math.PI - Math.atan2(l.y, l.z);
      mRot = Utils.ZYXMatrix();
    } else {
      return null; // not valid
    }

    var rotation = Utils.map(normal, Math.abs).applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI / 2);
    rotation.add(Utils.map(normal, Math.abs).applyMatrix3(mRot).multiplyScalar(angle));

    var cubeGeometry = new THREE.CubeGeometry(dist, options.length, options.depth);
    var cube = new THREE.Mesh(cubeGeometry, this.material);
    cube.rotation.fromArray(rotation.toArray());
    cube.position = Utils.getMidpoint(start, end);

    var round1 = Shapes.cylinder({
      radius: options.length / 2,
      depth: options.depth,
      normal: normal,
      position: start.clone()
    });

    var round2 = Shapes.cylinder({
      radius: options.length / 2,
      depth: options.depth,
      normal: normal,
      position: end.clone()
    });

    return this.union(round1, round2, cube);
  };

  return Mill;

});
