/* globals requestAnimationFrame, prompt, saveAs */

define([
	'jquery',
	'underscore',
	'three',
	'app/settings/constants',
	'app/utils',
	'app/shapes',
	'app/tools/tool',
	'app/tools/drill',
	'app/tools/mill',
	'app/tools/saw',
	'three.GeometryExporter',
	'three.TrackballControls',
	'filesaver'
], function ($, _, THREE, Constants, Utils, Shapes, Tool, Drill, Mill, Saw) {

	function Bench(options) {
		_.bindAll(this, '_onClick', '_onMousemove', 'render');

		// Instance variables
		this.$container = null;
		this.renderer = null;
		this.camera = null;
		this.scene = null;

		this.curTool = null;
		this.mode = '';
		this.radius = 5;
		this.depth = 10;
		this.cutInverse = false;

		this.resetCount = 0;

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

		var cube = this.reset(-1);
		this.addFakePiece(cube);
		this.addGrid();
		this.addLaser();
		this.setupTools();

		this.animate(); // Begin animation loop

		this.$canvas.on('click', this._onClick);
		this.$canvas.on('mousemove', this._onMousemove);
	}

	Bench.prototype = {

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

		mouseIntersects: function (event) {
			var target = event.target;
			var x = event.clientX;
			var y = event.clientY;

			var ray = Utils.clickToRay(x - target.offsetLeft, y - target.offsetTop, this.WIDTH, this.HEIGHT, this.camera);
			var intersections = ray.intersectObjects(this.intersectsMode());

			if (intersections.length === 0) {
				return null;
			}

			var intersection = intersections[0];
			var normal = intersection.face.normal;

			if (!Utils.isXYZ(normal)) {
				return null;
			}

			return intersection;
		},

		_onClick: function (event) {
			event.preventDefault();

			if (this.locked) {
				return;
			}

			var tool = this.curTool;
			var intersection = this.mouseIntersects(event);

			if (!intersection) {
				if (tool) {
					tool.unintersect();
				}
				return;
			}

			if (tool) {
				var normal = intersection.face.normal;
				var draw = tool.click(this.piece, intersection.point, normal);
				if (draw) {
					this.redrawPiece(draw);
					this.dispatchEvent({
						type: 'action',
						mode: this.mode,
						time: tool.getTime()
					});
				}
			}
		},

		_onMousemove: function (event) {
			event.preventDefault();

			if (this.locked) {
				return;
			}

			var intersection = this.mouseIntersects(event);

			if (!intersection) {
				this.laser.visible = false;
				return;
			}

			_.each(this.tools, function (tool) {
				tool.hide();
			});

			var normal = intersection.face.normal;

			var tool = this.curTool;
			if (tool) {
				tool.show(intersection.point, normal);
			}

			this.render();
		},

		render: function () {
			this.renderer.render(this.scene, this.camera);
		},

		animate: function () {
			requestAnimationFrame(_.bind(this.animate, this));
			if (this.controls) {
				this.controls.update();
			}
			this.pointLight.position = this.camera.position;
		},

		redrawPiece: function (newPiece) {
			if (this.piece) {
				this.scene.remove(this.piece);
				this.oldPiece = this.piece;
			}

			this.piece = newPiece;
			this.piece.name = Constants.PIECE_NAME;
			this.scene.add(this.piece);
			this.render();
		},

		undo: function () {
			if (this.oldPiece) {
				this.redrawPiece(this.oldPiece);
			}
		},

		showGrid: function (show) {
			_.each(this.grid.children, function (mesh) {
				mesh.visible = show;
			});
			this.render();
		},

		export: function (download) {
			var obj = (new THREE.GeometryExporter()).parse(this.piece.geometry);
			var json = JSON.stringify(obj);
			if (download === true) {
				var blob = new Blob([json], {type: "text/plain;charset=utf-8"});
				var name = prompt('What would you like to name this file?');
				if (name) {
					saveAs(blob, name + '.json');
				}
			}
			return json;
		},

		import: function (json) {
			var parsed;
			if (typeof json === 'string') {
				parsed = (new THREE.JSONLoader()).parse(JSON.parse(json));
			} else {
				parsed = json;
			}
			var mesh = new THREE.Mesh(parsed.geometry, this.material);
			return mesh;
		},

		reset: function (countDelta) {
			countDelta = countDelta || 0; // default to no change

			var size = this.size;
			var cube = new THREE.Mesh(new THREE.CubeGeometry(size, size, size), this.material);
			this.redrawPiece(cube);
			if (countDelta === -1) {
				this.resetCount = 0;
			} else if (countDelta >= 1) {
				this.resetCount += countDelta;
			}

			return cube;
		},

		setMode: function (mode) {
			this.mode = mode;
			this.curTool = this.tools[mode];
		},

		setView: function (view) {
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

		intersectsMode: function () {
			switch (this.mode) {
			case 'drill' :
			case 'saw' :
				return [this.piece];
			case 'mill' :
				return [this.fake];
			default :
				return [];
			}
		}
	};

	THREE.EventDispatcher.prototype.apply(Bench.prototype);

	return Bench;

});
