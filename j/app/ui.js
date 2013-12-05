define([
  'jquery',
  'underscore',
  'app/bench',
  'app/timer',
  'app/settings/levels',
  'app/settings/constants',
  'bootstrap',
  'bootstrap-slider'
], function ($, _, Bench, Timer, Levels, Constants) {

  function Game(options) {
    _.bindAll(this, '_onLoad', '_onAction');
    this.bench = options.bench;
    this.sample = options.sample;
    this.timer = new Timer({
      barContainer: '#timerBar',
      textContainer: '#timerText',
      startTime: Levels[0].time // in seconds
    });

    this.bench.addEventListener('action', this._onAction);

    this.curSample = 0;
    this.curLevel = 0;
  }

  Game.prototype = {

    setViewAll: function (view) {
      this.bench.setView(view);
      this.sample.setView(view);
    },

    resetLevel: function () {
      this.curSample = 0;
      this.loadSample();
      this.timer.reset(Levels[this.curLevel].time);

      this.bench.reset(-1);

      this.setViewAll('isometric');
    },

    next: function () {
      if (this.curSample === Levels[this.curLevel].series.length - 1) {
        if (this.curLevel === Object.keys(Levels).length - 1) {
          return;
        }
        this.advanceLevel();
      } else {
        this.advanceSample();
      }
    },

    advanceLevel: function () {
      this.timer.tick();

      var correct = 0, incorrect = 0;
      $('#breakdown td.yours').each(_.bind(function (i, el) {
        var $el = $(el);
        var yours = Math.round(this.timer.ticks[i] / 1000);
        var target = Levels[this.curLevel].series[i].time;
        $el.text(yours);
        $el.next().text(target);
        if (Math.abs(yours - target) / target >= 0.25) {
          incorrect += 1;
        } else {
          correct += 1;
        }
      }, this));

      var stars = correct - 0.5 * incorrect - 0.5 * this.bench.resetCount;

      if (stars < 0) {
        $('.rating').html(Constants.NO_STAR);
      } else if (stars < 1) {
        $('.rating').html(Constants.ONE_STAR);
      } else if (stars < 3) {
        $('.rating').html(Constants.TWO_STAR);
      } else if (stars <= 5) {
        $('.rating').html(Constants.THREE_STAR);
      }

      $('#levelComplete').modal();

      this.curLevel++;
      this.curSample = 0;
      this.loadSample();
      this.timer.reset(Levels[this.curLevel].time);

      this.bench.reset(-1);

      this.setViewAll('isometric');
    },

    advanceSample: function () {
      this.curSample++;
      this.loadSample();
      this.timer.tick();
      this.bench.reset(0);

      this.setViewAll('isometric');
    },

    loadSample: function () {
      var sample = Levels[this.curLevel].series[this.curSample];
      $.ajax({
        url: sample.url,
        success: _.bind(this._onLoad, this),
        dataType: 'html'
      });
      $('#curLevel').text(this.curLevel + 1);
      $('#curSample').text(this.curSample + 1);
    },

    _onLoad: function (data) {
      this.sample.redrawPiece(this.sample.import(data));
    },

    _onAction: function (data) {
      var time = data.time;
      this.timer.subtractTime(time);
      if (this.timer.timeLeft === 0) {
        $('#outoftime').modal();
        this.resetLevel();
      }
    }
  };

  $(function () {
    // $('#help').modal();

    var game = window.game = new Game({
      bench: new Bench({
        htmlContainer: '#sandbox',
        width: 620,
        height: 465
      }),
      sample: new Bench({
        htmlContainer: '#exhibit',
        width: 300,
        height: 225,
        locked: true
      })
    });

    game.loadSample();

    $('#done').on('click', function () {
      game.next();
    });
    $('#reset').on('click', function () {
      game.bench.reset(1);
    });
    $('#undo').on('click', function () {
      game.bench.undo();
    });
    $('#export').on('click', function () {
      game.bench.export(true);
    });
    $('#file').on('change', function (e) {
      var file = e.target.files[0];
      var reader = new FileReader();
      reader.onload = (function () {
        return function (e) {
          game.sample.redrawPiece(game.sample.import(e.target.result));
          game.bench.redrawPiece(game.bench.import(e.target.result));
        };
      })(file);
      reader.readAsText(file);
    });

    $('button.tool').on('click', function (e) {
      var $tool = $(e.target);
      var id = $tool.attr('id');
      $('#currentTool').text($tool.text());
      game.bench.setMode(id);

      $('body').removeClass('selected-mill selected-drill selected-saw').addClass('selected-' + id);

      $('button.tool').each(function (i, el) {
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
    $('button.tool').each(function(i, el) {
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
        game.bench.showGrid(true);
        game.sample.showGrid(true);
        el.data('state', 'hide');
        el.find('span').text('Hide Grid');
        break;
      case 'hide' :
        game.bench.showGrid(false);
        game.sample.showGrid(false);
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
      // HACK
      game.bench.curTool.radius = e.value;
    });

    $("#depth").slider({
      value: 10,
      min: 2,
      max: 100,
      step: 4
    }).on('slideStop', function (e) {
      // HACK
      game.bench.curTool.depth = e.value;
    });

    $('#cutInverse').on('change', function () {
      // HACK
      game.bench.curTool.cutInverse = this.checked;
    });

    $('.change-view button').on('click', function () {
      var view = $(this).attr('id');
      game.setViewAll(view);
    });
  });
});
