define(['three', 'app/utils'], function (THREE, Utils) {
  var Shapes = {

    cylinder: function (options) {
      var size = options.radius,
        depth = options.depth,
        normal = options.normal.clone();
      var cylinderGeometry = new THREE.CylinderGeometry(size, size, depth, 16, 16, false);
      var cylinder = new THREE.Mesh(cylinderGeometry, this.material);
      var rotation = normal.applyMatrix3(Utils.ZYXMatrix()).multiplyScalar(Math.PI / 2);
      cylinder.rotation.fromArray(rotation.toArray());
      cylinder.position = options.position;
      return cylinder;
    },

    line: function (options) {
      options = options || {};
      var vertices = options.vertices || [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)];

      var geometry = new THREE.Geometry();
      geometry.vertices = vertices;

      var redLineMaterial = new THREE.LineBasicMaterial({
        color: options.color || 0xff0000,
        linewidth: options.width || 2
      });
      return new THREE.Line(geometry, redLineMaterial);
    },

    cross: function () {
      var lineMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000
      });
      var cross = new THREE.Object3D();
      var crossGeometry, crossLine;

      crossGeometry = new THREE.Geometry();
      crossGeometry.vertices = [new THREE.Vector3(1, 1, 0), new THREE.Vector3(-1, -1, 0)];
      crossLine = new THREE.Line(crossGeometry, lineMaterial);
      cross.add(crossLine);

      crossGeometry = new THREE.Geometry();
      crossGeometry.vertices = [new THREE.Vector3(1, -1, 0), new THREE.Vector3(-1, 1, 0)];
      crossLine = new THREE.Line(crossGeometry, lineMaterial);
      cross.add(crossLine);

      return cross;
    },

    circle: function (options) {
      options = options || {};

      var resolution = options.segments || 32;
      var radius = options.radius || 4;
      var size = 360 / resolution;

      var geometry = new THREE.Geometry();
      var material = new THREE.LineBasicMaterial({
        color: options.color || 0xff0000,
        opacity: 1.0,
        linewidth: 2.0
      });

      for (var i = 0; i <= resolution; i++) {
        var segment = (i * size) * Math.PI / 180;
        geometry.vertices.push(new THREE.Vector3(Math.cos(segment) * radius, Math.sin(segment) * radius, 0));
      }

      return new THREE.Line(geometry, material);
    },

    plane: function (options) {
      options = options || {};

      var size = options.size;
      var material = options.material || new THREE.MeshBasicMaterial({
        color: options.color
      });
      var segments = options.segments || 10;
      var plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size, segments, segments), material);

      return plane;
    }

  };

  return Shapes;

});
