/* globals requirejs */

requirejs.config({
  baseUrl: 'j',
  paths: {
    'jquery': [
      '//ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min',
      'lib/jquery-2.0.3'
    ],
    'underscore': 'lib/underscore',
    'filesaver': 'lib/FileSaver',
    'bootstrap': 'lib/bootstrap.min',
    'bootstrap-slider': 'lib/bootstrap-slider'
  },
  shim: {
    'bootstrap': { deps: ['jquery'] },
    'bootstrap-slider': { deps: ['jquery', 'bootstrap'] }
  }
});

requirejs(['app']);
