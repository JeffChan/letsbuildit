define(['three'], function (THREE) {

  var Utils = {
    clickToRay: function (x, y, width, height, camera) {
      var projector = new THREE.Projector();
      var mouseX = (x / width) * 2 - 1,
        mouseY = - (y / height) * 2 + 1;
      var vector = new THREE.Vector3(mouseX, mouseY, 0.5);
      projector.unprojectVector(vector, camera);
      return new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
    },

    deg2rad: function (degree) { return degree * (Math.PI / 180); },

    getPMatrix: function (v) {
      var a = v.x, b = v.y, c = v.z;
      return new THREE.Matrix3(b*b+c*c, -a*b, -a*c, -b*a, a*a+c*c, -b*c, -c*a, -c*b, a*a+b*b);
    },

    getProjection: function (v, normal) {
      return v.clone().applyMatrix3(Utils.getPMatrix(normal));
    },

    getAngle: function (v1, v2) {
      return Math.acos(v1.dot(v2) / (v1.length() * v2.length()));
    },

    getMidpoint: function (v1, v2) {
      return v1.clone().add(v2).divideScalar(2);
    },

    map: function (v, f) {
      return new THREE.Vector3(f(v.x), f(v.y), f(v.z));
    },

    isXYZ: function (v) {
      v = Utils.map(v, Math.abs);
      return (v.x === 0 && v.y === 0 && v.z === 1) ||
          (v.x === 0 && v.y === 1 && v.z === 0) ||
          (v.x === 1 && v.y === 0 && v.z === 0);
    },

    iNormal: function (v) {
      v = Utils.map(v, Math.abs);
      return (new THREE.Vector3(1, 1, 1)).sub(v);
    },

    XYZMatrix: function () {
      return new THREE.Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1);
    },

    XZYMatrix: function () {
      return new THREE.Matrix3(1, 0, 0, 0, 0, 1, 0, 1, 0);
    },

    YXZMatrix: function () {
      return new THREE.Matrix3(0, 1, 0, 1, 0, 0, 0, 0, 1);
    },

    YZXMatrix: function () {
      return new THREE.Matrix3(0, 0, 1, 1, 0, 0, 0, 1, 0);
    },

    ZYXMatrix: function () {
      return new THREE.Matrix3(0, 0, 1, 0, 1, 0, 1, 0, 0);
    },

    ZXYMatrix: function () {
      return new THREE.Matrix3(0, 1, 0, 0, 0, 1, 1, 0, 0);
    },

    XYZNormals: function () {
      return [ new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1) ];
    },

    unitVector: function () {
      return new THREE.Vector3(1, 1, 1);
    },

    roughlyEquals: function (v1, v2) {
      var t = 1;
      return Math.abs(v1.x - v2.x) < t && Math.abs(v1.y - v2.y) < t && Math.abs(v1.z - v2.z) < t;
    }
  };

  return Utils;

});
