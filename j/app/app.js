define([
	'jquery',
	'underscore',
	'app/settings/levels',
	'app/settings/constants',
	'app/utils',
	'app/shapes',
	'app/tools/tool',
	'app/tools/drill',
	'app/tools/mill',
	'app/tools/saw',
	'app/timer',
	'bootstrap',
	'bootstrap-slider',
	'filesaver',
	'three',
	'three.GeometryExporter',
	'three.TrackballControls'
], function ($, _, Levels, Constants, Utils, Shapes, Tool, Drill, Mill, Saw, Timer) {

var App = function(options) {

	var that = {
	// Instance variables
	$container: null,
	renderer: null,
	camera: null,
	scene: null,
	mode: '',

	radius: 5,
	depth: 10,
	cutInverse: false,

	resetCount: 0,

	curSample: 0,
	curLevel: 0,

	initialize: function (options) {
		_.bindAll(this, '_onClick', '_onMousemove', 'render');

		options = options || {};
		this.HEIGHT = options.height;
		this.WIDTH = options.width;
		this.locked = options.locked || false;
		this.size = options.size || 100;

		this.$container = $(options.htmlContainer);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(this.WIDTH, this.HEIGHT);
		this.renderer.setClearColor(0x29333c);
		this.$canvas = $(this.renderer.domElement);
		this.$container.children('h4').after(this.renderer.domElement);

		this.scene = new THREE.Scene();

		this.addCamera();
		this.addLight();
		this.addControls();
		this.setView('isometric');

		this.material = new THREE.MeshLambertMaterial({
			color: 'silver',
			shading: THREE.NoShading
		});

		var cube = this.reset(false);
		this.addFakePiece(cube);
		this.addGrid();
		this.addLaser();
		this.setupTools();

		this.animate(); // Begin animation loop

		this.$canvas.on('click', this._onClick);
		this.$canvas.on('mousemove', this._onMousemove);
	},

	addCamera: function () {
		this.camera = new THREE.PerspectiveCamera(Constants.VIEW_ANGLE, this.WIDTH / this.HEIGHT, Constants.NEAR, Constants.FAR);
		// The camera starts at 0,0,0 so pull it back
		this.camera.position.z = 200;
	},

	addLight: function () {
		this.pointLight = new THREE.PointLight(0xffffff);
		this.scene.add(this.pointLight);
	},

	addControls: function () {
		this.controls = new THREE.TrackballControls(this.camera, $('.belly')[0]);
		var controls = this.controls;
		// controls.enabled = false;
		controls.rotateSpeed = 2.0;
		controls.zoomSpeed = 1.2;
		controls.panSpeed = 0.8;
		// controls.noZoom = true;
		// controls.noPan = true;
		controls.staticMoving = true;
		controls.dynamicDampingFactor = 0.3;
		controls.keys = [ 65, 83, 68 ];
		this.controls.addEventListener('change', _.bind(this.render, this));
	},

	addFakePiece: function (cube) {
		this.fake = cube.clone();
		this.fake.visible = false;
		this.scene.add(this.fake);
	},

	addGrid: function () {
		this.grid = Shapes.grid({size: this.size});
		this.scene.add(this.grid);
	},

	addLaser: function () {
		var line = this.laser = Shapes.line();
		line.visible = false;
		line.name = Constants.LASER_NAME;
		this.scene.add(line);
	},

	setupTools: function () {
		this.tools = {
			drill: new Drill({
				scene: this.scene,
				radius: this.radius,
				size: this.size * 2
			}),
			mill: new Mill({
				scene: this.scene,
				radius: this.radius,
				depth: this.depth
			}),
			saw: new Saw({
				scene: this.scene,
				size: this.size
			})
		};
		this.tools.mill.addEventListener('change', this.render);
	},

	_onClick: function (event) {
		event.preventDefault();

		if (this.locked) {
			return;
		}

		var target = event.target;

		var ray = Utils.clickToRay(event.clientX-target.offsetLeft, event.clientY-target.offsetTop, this.WIDTH, this.HEIGHT, this.camera);

		var intersects = ray.intersectObjects(this.intersectsMode());

		if (intersects.length === 0) {
			var tool = this.curTool;
			if (tool) {
				tool.unintersect();
			}
			return;
		}

		var i = intersects[0];
		var normal = i.face.normal;

		if (!Utils.isXYZ(normal)) {
			return;
		}

		var tool = this.curTool;
		if (tool) {
			var draw = tool.click(this.piece, i.point, normal);
			if (draw) {
				this.redrawPiece(draw);
				window.timer.subtractTime(tool.getTime());
			}
		}

		if (window.timer.timeLeft == 0) {
			$('#outoftime').modal();
			this.resetLevel();
		}
	},

	_onMousemove: function (event) {
		event.preventDefault();

		if (this.locked) {
			return;
		}

		var target = event.target;

		var ray = Utils.clickToRay(event.clientX-target.offsetLeft, event.clientY-target.offsetTop, this.WIDTH, this.HEIGHT, this.camera);

		var intersects = ray.intersectObjects(this.intersectsMode());

		_.each(this.tools, function (tool) {
			tool.hide();
		});

		if (intersects.length == 0) {
			this.laser.visible = false;
			this.render();
			// this.$canvas.css('cursor', '');
			return;
		}

		// this.$canvas.css('cursor', 'crosshair');

		var i = intersects[0];
		var normal = i.face.normal;

		if (!Utils.isXYZ(normal)) {
			this.laser.visible = false;
			return;
		}

		var tool = this.curTool;
		if (tool) {
			tool.show(i.point, normal);
		}

		this.render();

	},

	render: function() {
		this.renderer.render(this.scene, this.camera);
	},

	animate: function() {
		requestAnimationFrame(_.bind(this.animate, this));
		if (this.controls)
			this.controls.update();
		this.pointLight.position = this.camera.position;
	},

	redrawPiece: function(newPiece) {
		if (this.piece) {
			this.scene.remove(this.piece);
			this.oldPiece = this.piece;
		}

		this.piece = newPiece;
		this.piece.name = Constants.PIECE_NAME;
		this.scene.add(this.piece);
		this.render();
	},

	undo: function() {
		if (this.oldPiece) {
			this.redrawPiece(this.oldPiece);
		}
	},

	showGrid: function(show) {
		_.each(this.grid.children, function(mesh) {
			mesh.visible = show;
		});
		this.render();
	},

	export: function(download) {
		var obj = (new THREE.GeometryExporter()).parse(this.piece.geometry);
		var json = JSON.stringify(obj);
		if (download === true) {
			var blob = new Blob([json], {type: "text/plain;charset=utf-8"});
			var name = prompt('What would you like to name this file?');
			if (name) {
				saveAs(blob, name+'.json');
			}
		}
		return json;
	},

	import: function(json) {
		var parsed;
		if (typeof json === 'string') {
			parsed = (new THREE.JSONLoader()).parse(JSON.parse(json));
		} else {
			parsed = json;
		}
		var mesh = new THREE.Mesh(parsed.geometry, this.material);
		return mesh;
	},

	reset: function(count) {
		var size = this.size;
		var cube = new THREE.Mesh(new THREE.CubeGeometry(size,size,size), this.material);
		this.redrawPiece(cube);
		if (count !== false)
			this.resetCount++;
		return cube;
	},

	setMode: function(mode) {
		this.mode = mode;
		this.curTool = this.tools[mode];
	},

	setView: function(view) {
		this.controls.reset();
		switch (view) {
			case 'isometric' :
				this.camera.position.set(150, 150, 150);
				break;
			case 'front' :
				this.camera.position.set(0, 0, 200);
				break;
			case 'right' :
				this.camera.position.set(200, 0, 0);
				break;
			case 'top' :
				this.camera.position.set(0, 200, 0.01); // HACK
				break;
		}
	},

	intersectsMode: function() {
		switch (this.mode) {
		case 'drill' :
		case 'saw' :
			return [this.piece];
		case 'mill' :
			return [this.fake];
		default :
			return [];
		}
	},

	resetLevel: function() {
		console.log('Reset level');
		this.curSample = 0;
		this.loadSample();
		window.timer.reset(Levels[this.curLevel].time);

		this.reset(false);
		this.resetCount = 0;

		this.setView('isometric');
	},

	next: function() {
		if (this.curSample == Levels[this.curLevel].series.length-1) {
			if (this.curLevel == Object.keys(Levels).length-1) {
				console.log('No more levels');
				return;
			}
			this.advanceLevel();
		} else {
			this.advanceSample();
		}
	},

	advanceLevel: function() {
		window.timer.tick();

		var correct = 0, incorrect = 0;
		$('#breakdown td.yours').each(_.bind(function(i, el) {
			var $el = $(el);
			var yours = Math.round(window.timer.ticks[i] / 1000);
			var target = Levels[this.curLevel].series[i].time;
			$el.text(yours);
			$el.next().text(target);
			if (Math.abs(yours-target)/target >= 0.25) {
				incorrect += 1;
			} else {
				correct += 1;
			}
		}, this));

		var stars = correct - 0.5 * incorrect - 0.5 * this.resetCount;

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
		console.log('Advance level');

		this.curLevel++;
		this.curSample = 0;
		this.loadSample();
		window.timer.reset(Levels[this.curLevel].time);

		this.reset(false);
		this.resetCount = 0;
		setViewAll('isometric');
	},

	advanceSample: function() {
		console.log('Advance sample');
		this.curSample++;
		this.loadSample();
		window.timer.tick();
		this.reset(false);

		setViewAll('isometric');
	},

	loadSample: function() {
		var sample = Levels[this.curLevel].series[this.curSample];
		$.ajax({
			url: sample.url,
			success: function(data) {
				window.demo.redrawPiece(window.demo.import(data));
			},
			dataType: 'html'
		});
		$('#curLevel').text(this.curLevel+1);
		$('#curSample').text(this.curSample+1);
	}

	};

	that.initialize(options);
	return that;
};

function setViewAll(view) {
	window.app.setView(view);
	window.demo.setView(view);
}

$(function() {

	// $('#help').modal();

	window.timer = new Timer({
		barContainer: '#timerBar',
		textContainer: '#timerText',
		startTime: Levels[0].time // in seconds
	});

	window.app = new App({
		htmlContainer: '#sandbox',
		width: 460,
		height: 345
	});

	window.demo = new App({
		htmlContainer: '#exhibit',
		width: 300,
		height: 225,
		locked: true
	});

	app.loadSample();

	$('#done').on('click', function(e) {
		e.preventDefault();
		app.next();
	});
	$('#reset').on('click', function(e) {
		e.preventDefault();
		app.reset();
	});
	$('#undo').on('click', function(e) {
		e.preventDefault();
		app.undo();
	});
	$('#export').on('click', function(e) {
		e.preventDefault();
		app.export(true);
	});
	$('#file').on('change', function(e) {
		var file = e.target.files[0];
		var reader = new FileReader();
		reader.onload = (function(theFile) {
			return function(e) {
				demo.redrawPiece(demo.import(e.target.result));
			}
		})(file);
		reader.readAsText(file);
	});

	$('a.tool').on('click', function(e) {
		e.preventDefault();
		var $tool = $(e.target);
		var id = $tool.attr('id');
		$('#currentTool').text($tool.text());
		app.setMode(id);

		$('body').removeClass('selected-mill selected-drill selected-saw').addClass('selected-'+id);

		$('a.tool').each(function(i, el) {
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

	$('#gridToggle').on('click', function(e) {
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
	}).on('slideStop', function(e) {
		app.radius = e.value;
	});

	$("#depth").slider({
		value: 10,
		min: 2,
		max: 100,
		step: 4
	}).on('slideStop', function(e) {
		app.depth = e.value;
	});

	$('#cutInverse').on('change', function(e) {
		if (this.checked) {
			app.cutInverse = true;
		} else {
			app.cutInverse = false;
		}
	});

	$('.change-view').on('click', function(e) {
		var $el = $(this);
		var view = $el.attr('id');
		setViewAll(view);
	});
});

});
