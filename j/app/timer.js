define(function () {
  return function (options) {

    var that = {

      timeLeft: 0,
      totalTime: 0,
      ticks: [],
      lastTick: 0,

      classes: {
        warning: 'progress-warning',
        danger: 'progress-danger'
      },

      initialize: function (options) {
        this.$container = $(options.barContainer);
        this.$bar = this.$container.find('.bar');
        this.$text = $(options.textContainer);
        this.reset(options.startTime);
      },

      reset: function (seconds) {
        this.timeLeft = this.totalTime = this.lastTick = seconds * 1000;
        this.updateTime();
        this.ticks = [];
      },

      tick: function () {
        var tick =  this.lastTick - this.timeLeft;
        this.ticks.push(tick);
        this.lastTick = this.timeLeft;
      },

      subtractTime: function (seconds) {
        this.timeLeft -= seconds * 1000;
        if (this.timeLeft < 0) {
          this.timeLeft = 0;
        }
        this.updateTime();
      },

      updateTime: function () {
        var percentage = Math.round(this.timeLeft * 100 / this.totalTime);
        this.$bar.css('width', percentage + '%');
        this.$text.text(Math.round(this.timeLeft / 1000) + " s");

        if (percentage < 20) {
          this.$container.removeClass(this.classes.warning).addClass(this.classes.danger);
        } else if (percentage < 50) {
          this.$container.addClass(this.classes.warning).removeClass(this.classes.danger);
        } else {
          this.$container.removeClass(this.classes.warning).removeClass(this.classes.danger);
        }
      }
    };

    that.initialize(options);
    return that;
  };
});
