/* globals requirejs */

requirejs.config({
  baseUrl: 'j',
  paths: {
    'leap': 'lib/leap',
    'jquery': 'lib/jquery-2.0.3',
    'underscore': 'lib/underscore',
    'filesaver': 'lib/FileSaver',
    'bootstrap': 'lib/bootstrap.min',
    'bootstrap-slider': 'lib/bootstrap-slider',
    'three': 'three/three',
    'three.CSG': 'three/ThreeCSG',
    'three.GeometryExporter': 'three/GeometryExporter',
    'three.TrackballControls': 'three/TrackballControls',
  },
  shim: {
    'leap': { exports: 'Leap' },
    'underscore': { exports: '_' },
    'three': { exports: 'THREE' },
    'three.CSG': { deps: ['three'], exports: 'ThreeBSP' },
    'three.GeometryExporter': { deps: ['three'] },
    'three.TrackballControls': { deps: ['three'] },
    'bootstrap': { deps: ['jquery'] },
    'bootstrap-slider': { deps: ['jquery', 'bootstrap'] }
  }
});

requirejs(['app/ui']);
