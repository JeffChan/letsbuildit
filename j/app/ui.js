define([
  'jquery',
  'app/app',
  'app/timer',
  'app/settings/levels',
  'bootstrap',
  'bootstrap-slider'
], function ($, App, Timer, Levels) {
  function setViewAll(view) {
    window.app.setView(view);
    window.demo.setView(view);
  }

  $(function () {
    // $('#help').modal();

    window.timer = new Timer({
      barContainer: '#timerBar',
      textContainer: '#timerText',
      startTime: Levels[0].time // in seconds
    });

    var app = window.app = new App({
      htmlContainer: '#sandbox',
      width: 460,
      height: 345
    });

    var demo = window.demo = new App({
      htmlContainer: '#exhibit',
      width: 300,
      height: 225,
      locked: true
    });

    app.loadSample();

    $('#done').on('click', function (e) {
      e.preventDefault();
      app.next();
    });
    $('#reset').on('click', function (e) {
      e.preventDefault();
      app.reset();
    });
    $('#undo').on('click', function (e) {
      e.preventDefault();
      app.undo();
    });
    $('#export').on('click', function (e) {
      e.preventDefault();
      app.export(true);
    });
    $('#file').on('change', function (e) {
      var file = e.target.files[0];
      var reader = new FileReader();
      reader.onload = (function () {
        return function (e) {
          demo.redrawPiece(demo.import(e.target.result));
        };
      })(file);
      reader.readAsText(file);
    });

    $('a.tool').on('click', function (e) {
      e.preventDefault();
      var $tool = $(e.target);
      var id = $tool.attr('id');
      $('#currentTool').text($tool.text());
      app.setMode(id);

      $('body').removeClass('selected-mill selected-drill selected-saw').addClass('selected-' + id);

      $('a.tool').each(function (i, el) {
        $(el).removeClass('btn-info');
      });
      $tool.addClass('btn-info');
    });

    /* disable descriptions
    var descriptions = {
      mill: 'A rotary tool used for shaping and cutting grooves <a href="http://www.youtube.com/watch?v=j0vRYe9uvnI">YouTube Video</a>',
      saw: 'A power saw used for cutting materials <a href="http://www.youtube.com/watch?v=ZYlLIp5urJQ">YouTube Video</a>',
      drill: 'An upright drilling machine for producing holes <a href="http://www.youtube.com/watch?v=ul20R32HJ3E">YouTube Video</a>'
    };
    $('a.tool').each(function(i, el) {
      var $tool = $(el);
      var i = $tool.attr('id');
      $tool.popover({
        trigger: 'hover',
        container: $tool[0],
        html: true,
        title: $tool.text(),
        content: descriptions[i]
      });
    }); */

    $('.disabled-tool').popover({
      trigger: 'hover',
      title: 'Not Available',
      content: 'This tool is not available for noobs!'
    });

    $('#gridToggle').on('click', function (e) {
      e.preventDefault();
      var el = $(this);
      var state = el.data('state');
      switch (state) {
      case 'show' :
        app.showGrid(true);
        demo.showGrid(true);
        el.data('state', 'hide');
        el.find('span').text('Hide Grid');
        break;
      case 'hide' :
        app.showGrid(false);
        demo.showGrid(false);
        el.data('state', 'show');
        el.find('span').text('Show Grid');
        break;
      }
    });

    $("#radius").slider({
      value: 6,
      min: 2,
      max: 12,
      step: 2
    }).on('slideStop', function (e) {
      app.radius = e.value;
    });

    $("#depth").slider({
      value: 10,
      min: 2,
      max: 100,
      step: 4
    }).on('slideStop', function (e) {
      app.depth = e.value;
    });

    $('#cutInverse').on('change', function () {
      if (this.checked) {
        app.cutInverse = true;
      } else {
        app.cutInverse = false;
      }
    });

    $('.change-view').on('click', function () {
      var $el = $(this);
      var view = $el.attr('id');
      setViewAll(view);
    });
  });
});
