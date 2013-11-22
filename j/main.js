/* globals requirejs */

requirejs.config({
  baseUrl: 'j',
  paths: {
    'jquery': '//ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min',
    'bootstrap': 'lib/bootstrap.min',
    'bootstrap-slider': 'lib/bootstrap-slider'
  },
  shim: {
    'bootstrap': { deps: ['jquery'] },
    'bootstrap-slider': { deps: ['jquery', 'bootstrap'] }
  }
});

requirejs(['app']);
