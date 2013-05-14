var VIEW_ANGLE = 45,
	NEAR = 0.1,
	FAR = 10000,
	OFFSET = 0.1;

var NO_STAR = "&#9734;&#9734;&#9734;",
	ONE_STAR = "&#9733;&#9734;&#9734;",
	TWO_STAR = "&#9733;&#9733;&#9734;",
	THREE_STAR = "&#9733;&#9733;&#9733;";

var Utils = {

	clickToRay: function(x, y, width, height, camera) {
		var projector = new THREE.Projector();
		var mouseX = (x / width) * 2 - 1,
			mouseY = - (y / height) * 2 + 1;
		var vector = new THREE.Vector3(mouseX, mouseY, 0.5);
		projector.unprojectVector(vector, camera);
		return new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
	},

	deg2rad: function(degree) { return degree*(Math.PI/180); },

	getPMatrix: function(v) {
		var a = v.x, b = v.y, c = v.z;
		return new THREE.Matrix3(b*b+c*c, -a*b, -a*c, -b*a, a*a+c*c, -b*c, -c*a, -c*b, a*a+b*b);
	},

	getProjection: function(v, normal) {
		return v.clone().applyMatrix3(Utils.getPMatrix(normal));
	},

	getAngle: function(v1, v2) {
		return Math.acos(v1.dot(v2)/(v1.length()*v2.length()));
	},

	getMidpoint: function(v1, v2) {
		return v1.clone().add(v2).divideScalar(2);
	},

	map: function(v, f) {
		return new THREE.Vector3(f(v.x), f(v.y), f(v.z));
	},

	isXYZ: function(v) {
		v = Utils.map(v, Math.abs);
		return (v.x == 0 && v.y == 0 && v.z == 1) ||
				(v.x == 0 && v.y == 1 && v.z == 0) ||
				(v.x == 1 && v.y == 0 && v.z == 0);
	},

	iNormal: function(v) {
		v = Utils.map(v, Math.abs);
		return (new THREE.Vector3(1,1,1)).sub(v);
	},

	XYZMatrix: function() {
		return new THREE.Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1);
	},

	XZYMatrix: function() {
		return new THREE.Matrix3(1, 0, 0, 0, 0, 1, 0, 1, 0);
	},

	YXZMatrix: function() {
		return new THREE.Matrix3(0, 1, 0, 1, 0, 0, 0, 0, 1);
	},

	YZXMatrix: function() {
		return new THREE.Matrix3(0, 0, 1, 1, 0, 0, 0, 1, 0);
	},

	ZYXMatrix: function() {
		return new THREE.Matrix3(0, 0, 1, 0, 1, 0, 1, 0, 0);
	},

	ZXYMatrix: function() {
		return new THREE.Matrix3(0, 1, 0, 0, 0, 1, 1, 0, 0);
	},

	XYZNormals: function() {
		return [ new THREE.Vector3(1,0,0), new THREE.Vector3(0,1,0), new THREE.Vector3(0,0,1) ];
	},

	unitVector: function() {
		return new THREE.Vector3(1,1,1);
	}
};

var Timer = function(options) {

	var that = {

	timeLeft: 0,
	totalTime: 0,
	ticks: [],
	lastTick: 0,

	initialize: function(options) {
		this.$container = $(options.barContainer);
		this.$bar = this.$container.find('.bar');
		this.$text = $(options.textContainer);
		this.reset(options.startTime);
	},

	reset: function(seconds) {
		this.timeLeft = this.totalTime = this.lastTick = seconds * 1000;
		this.updateTime();
		this.ticks = [];
	},

	tick: function() {
		var tick =  this.lastTick - this.timeLeft;
		this.ticks.push(tick);
		this.lastTick = this.timeLeft;
	},

	subtractTime: function(seconds) {
		this.timeLeft -= seconds * 1000;
		if (this.timeLeft < 0) {
			this.timeLeft = 0;
		}
		this.updateTime();
	},

	updateTime: function() {
		var percentage = Math.round(this.timeLeft * 100 / this.totalTime);
		this.$bar.css('width', percentage+'%');
		this.$text.text(Math.round(this.timeLeft / 1000) + " s");

		if (percentage < 20) {
			this.$container.removeClass('progress-warning').addClass('progress-danger');
		} else if (percentage < 50) {
			this.$container.addClass('progress-warning').removeClass('progress-danger');
		} else {
			this.$container.removeClass('progress-warning progress-danger');
		}
	}

	};

	that.initialize(options);
	return that;
};

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

	initialize: function(options) {
		options = options || {};

		this.HEIGHT = options.height;
		this.WIDTH = options.width;
		this.locked = options.locked || false;

		this.$container = $(options.htmlContainer);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(this.WIDTH, this.HEIGHT);
		this.$canvas = $(this.renderer.domElement);
		this.$container.children('h4').after(this.renderer.domElement);

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, this.WIDTH/this.HEIGHT, NEAR, FAR);

		// The camera starts at 0,0,0 so pull it back
		this.camera.position.z = 200;

		// create a point light
		this.pointLight = new THREE.PointLight(0xffffff);
		this.scene.add(this.pointLight);

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

		this.material = new THREE.MeshPhongMaterial({
			color: 'silver'
		});

		this.size = size = 100;
		var cube = this.reset(false);

		this.fake = cube.clone();
		this.fake.visible = false;
		this.scene.add(this.fake);

		this.grid = this.generateGrid(size);
		this.scene.add(this.grid);

		this.setView('isometric');

		this.animate(); // Begin animation loop

		var highlighted = null;
		var line = this.line();
		line.visible = false;
		this.scene.add(line);
		var circle = this.circle();

		var plane = null;

		this.$canvas.on('click', function(event) {
			event.preventDefault();

			if (that.locked) {
				return;
			}

			var target = event.target;

			var ray = Utils.clickToRay(event.clientX-target.offsetLeft, event.clientY-target.offsetTop, that.WIDTH, that.HEIGHT, that.camera);

			var intersects = ray.intersectObjects(that.intersectsMode());

			if (intersects.length == 0) {
				if (highlighted) {
					that.scene.remove(highlighted);
					highlighted = null;
				}

				return;
			}

			var i = intersects[0];
			var pt = i.point;
			var normal = i.face.normal;

			if (!Utils.isXYZ(normal)) {
				return;
			}

			switch (that.mode) {
			case 'drill':

				var output = that.subtract(that.piece, that.drill({
					radius: that.radius,
					position: pt,
					depth: that.size * 2,
					normal: normal
				}));
				that.redrawPiece(output);

				window.timer.subtractTime(0.013 * Math.PI * that.radius * that.radius * 100);

				break;

			case 'mill':

				if (highlighted) {
					var startPt = highlighted.position.sub(normal.clone().multiplyScalar(OFFSET)); // reverse the offset

					that.scene.remove(highlighted);
					highlighted = null;

					if (!highlightedNormal.equals(normal)) {
						break;
					}

					var mill = that.mill({
						start: startPt,
						end: pt,
						length: that.radius*2,
						depth: that.depth*2,
						normal: normal
					});

					if (mill) {
						var output = that.subtract(that.piece, mill);
						that.redrawPiece(output);

						window.timer.subtractTime(0.020 * (Math.PI*that.radius*that.radius + 2*that.radius*startPt.distanceTo(pt)) * that.depth);
					}

				} else {
					// var x = that.cross({color: 0xff0000});
					var x = that.circle({
						radius: that.radius
					});
					x.position = pt.clone().add(normal.clone().multiplyScalar(OFFSET)); // offset so the cross shows up
					x.rotation = normal.clone().applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI/2);
					that.scene.add(x);
					that.render();
					highlighted = x;
					highlightedNormal = normal;
				}

				break;
			case 'saw':

				if (plane) {
					var dir = normal.clone().applyMatrix3(Utils.ZXYMatrix());
					var length = that.size
					var position = plane.position.clone();
					var shift = dir.multiplyScalar(length/2);

					if (that.cutInverse) {
						shift = Utils.map(shift, function(a) {return -1*a;});
					}

					var saw = that.saw({
						normal: normal,
						position: position.sub(shift),
						length: length
					});
					saw.rotation = plane.rotation.clone().applyMatrix3(Utils.YZXMatrix());
					var output = that.subtract(that.piece, saw);
					that.redrawPiece(output);

					window.timer.subtractTime(240);
				}

				break;
			}

			if (window.timer.timeLeft == 0) {
				$('#outoftime').modal();
				that.resetLevel();
			}

		});

		this.$canvas.on('mousemove', function(event) {
			event.preventDefault();

			if (that.locked) {
				return;
			}

			var target = event.target;

			var ray = Utils.clickToRay(event.clientX-target.offsetLeft, event.clientY-target.offsetTop, that.WIDTH, that.HEIGHT, that.camera);

			var intersects = ray.intersectObjects(that.intersectsMode());

			that.scene.remove(circle);
			circle = null;

			that.scene.remove(plane);
			plane = null;

			if (intersects.length == 0) {
				line.visible = false;
				that.render();
				// that.$canvas.css('cursor', '');
				return;
			}

			// that.$canvas.css('cursor', 'crosshair');

			var i = intersects[0];
			var pt = i.point;
			var normal = i.face.normal;

			if (!Utils.isXYZ(normal)) {
				line.visible = false;
				return;
			}

			switch (that.mode) {
			case 'drill':
				line.visible = true;
				line.geometry.verticesNeedUpdate = true;
				line.geometry.vertices = [
					pt.clone().add(normal.clone().multiplyScalar(-500)),
					pt.clone().add(normal.clone().multiplyScalar(500))
				];

				circle = that.circle({
					radius: that.radius
				});
				circle.position = pt.clone().add(normal.clone().multiplyScalar(OFFSET));
				circle.rotation = normal.clone().applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI/2);
				that.scene.add(circle);
				break;

			case 'mill':
				if (highlighted) {
					var startPt = highlighted.position;
					line.visible = true;
					line.geometry.verticesNeedUpdate = true;
					line.geometry.vertices = [
						startPt.clone().add(normal.clone().multiplyScalar(OFFSET)),
						pt.clone().add(normal.clone().multiplyScalar(OFFSET))
					];
				}

				break;

			case 'saw':
				plane = that.plane({
					segments: 5,
					size: 200,
					normal: normal,
					material: new THREE.MeshBasicMaterial({
						color:'red',
						wireframe: true,
						wireframeLinewidth: 2
					})
				});
				plane.position = pt.clone().sub(normal.clone().multiplyScalar(that.size/2));
				plane.rotation = normal.clone().applyMatrix3(Utils.ZYXMatrix()).multiplyScalar(Math.PI/2);
				that.scene.add(plane);

				var sign = that.cutInverse ? 1 : -1;
				var dir = normal.clone().applyMatrix3(Utils.ZXYMatrix());
				line.visible = true;
				line.geometry.verticesNeedUpdate = true;
				line.geometry.vertices = [
					pt.clone().add(dir.clone().multiplyScalar(OFFSET)),
					pt.clone().add(dir.clone().multiplyScalar(sign*that.size*2))
				];
				break;
			}

			that.render();

		});
	},

	op: function(raw, cut, op) {
		var rawBSP = new ThreeBSP(raw),
			cutBSP = new ThreeBSP(cut);

		var bsp = rawBSP[op](cutBSP);
		var result = bsp.toMesh(raw.material);
		result.geometry.computeVertexNormals();
		return result;
	},

	subtract: function(raw, cut) {
		return this.op(raw, cut, 'subtract');
	},

	union: function() {
		var result = arguments[0];
		for (var i=1; i < arguments.length; i++) {
			result = this.op(result, arguments[i], 'union');
		}
		return result;
	},

	intersect: function(raw, cut) {
		return this.op(raw, cut, 'intersect');
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
		if (this.piece)
			this.scene.remove(this.piece);
		this.oldPiece = this.piece;
		this.piece = newPiece;
		this.scene.add(this.piece);
		this.render();
	},

	undo: function() {
		if (this.oldPiece) {
			this.redrawPiece(this.oldPiece);
		}
	},

	line: function(options) {
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

	cross: function(options) {
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

	circle: function(options) {
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
		    geometry.vertices.push(new THREE.Vector3(Math.cos(segment)*radius, Math.sin(segment)*radius, 0));
		}

		return new THREE.Line( geometry, material);
	},

	plane: function(options) {
		options = options || {};

		var size = options.size;
		var material = options.material || new THREE.MeshBasicMaterial({
			color: options.color
		});
		var segments = options.segments || 10;
		var plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size, segments, segments), material);

		return plane;
	},

	drill: function(options) {
		var size = options.radius,
			depth = options.depth,
			normal = options.normal.clone();
		var cylinderGeometry = new THREE.CylinderGeometry(size, size, depth, 16, 16, false);
		var cylinder = new THREE.Mesh(cylinderGeometry, this.material);
		cylinder.rotation = normal.applyMatrix3(Utils.ZYXMatrix()).multiplyScalar(Math.PI/2);
		cylinder.position = options.position;
		return cylinder;
	},

	mill: function(options) {
		var start = options.start,
			end = options.end,
			normal = options.normal;

		if (start.equals(end)) {
			end = start.clone().add(Utils.iNormal(normal).multiplyScalar(0.05));
		}

		var l1 = Utils.getProjection(start, normal);
		var l2 = Utils.getProjection(end, normal);
		var l = l1.clone().sub(l2);
		var dist = l1.distanceTo(l2);

		var mRot, angle;
		if (l.z == 0) {
			angle = Math.PI/2+Math.atan2(l.y, l.x);
			mRot = Utils.XYZMatrix();
		} else if (l.y == 0) {
			angle = Math.atan2(l.z, l.x);
			mRot = Utils.XZYMatrix();
		} else if (l.x == 0) {
			angle = Math.PI-Math.atan2(l.y, l.z);
			mRot = Utils.ZYXMatrix();
		} else {
			return null; // not valid
		}

		var rotation = Utils.map(normal, Math.abs).applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI/2);
		rotation.add(Utils.map(normal, Math.abs).applyMatrix3(mRot).multiplyScalar(angle));

		var cubeGeometry = new THREE.CubeGeometry(dist, options.length, options.depth);
		var cube = new THREE.Mesh(cubeGeometry, this.material);
		cube.rotation = rotation;
		cube.position = Utils.getMidpoint(start, end);

		var round1 = this.drill({
			radius: options.length/2,
			depth: options.depth,
			normal: normal,
			position: start.clone()
		});

		var round2 = this.drill({
			radius: options.length/2,
			depth: options.depth,
			normal: normal,
			position: end.clone()
		});

		return this.union(round1, round2, cube);
	},

	saw: function(options) {
		options = options || {};

		var normal = options.normal;
		var position = options.position;
		var length = options.length;

		var cubeGeometry = new THREE.CubeGeometry(this.size*2, length, this.size*2);
		var cube = new THREE.Mesh(cubeGeometry, this.material);
		cube.rotation = Utils.map(normal, Math.abs).applyMatrix3(Utils.YXZMatrix()).multiplyScalar(Math.PI/2);
		cube.position = position;

		return cube;
	},

	sander: function(options) {

	},

	generateGrid: function(size) {
		var plane = this.plane({
			size: size,
			segments: 10,
			material: new THREE.MeshBasicMaterial({
				color:'greenyellow',
				wireframe: true,
				wireframeLinewidth: 2
			})
		});

		var group = new THREE.Object3D();

		_.each(Utils.XYZNormals(), function(normal) {
			var face,
				rot = normal.clone().multiplyScalar(Math.PI/2),
				pos = normal.clone().applyMatrix3(Utils.YXZMatrix()).multiplyScalar(size/2);

			face = plane.clone();
			face.rotation = rot;
			face.position = pos;
			group.add(face);

			face = face.clone();
			face.position.multiplyScalar(-1);
			group.add(face);
		});

		return group;
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
				this.camera.position.set(0, 200, 0);
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
		window.timer.reset(window.levels[this.curLevel].time);

		this.reset(false);
		this.resetCount = 0;

		this.setView('isometric');
	},

	next: function() {
		if (this.curSample == window.levels[this.curLevel].series.length-1) {
			if (this.curLevel == Object.keys(window.levels).length-1) {
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
			var target = window.levels[this.curLevel].series[i].time;
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
			$('.rating').html(NO_STAR);
		} else if (stars < 1) {
			$('.rating').html(ONE_STAR);
		} else if (stars < 3) {
			$('.rating').html(TWO_STAR);
		} else if (stars <= 5) {
			$('.rating').html(THREE_STAR);
		}

		$('#levelComplete').modal();
		console.log('Advance level');

		this.curLevel++;
		this.curSample = 0;
		this.loadSample();
		window.timer.reset(window.levels[this.curLevel].time);

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
		var sample = window.levels[this.curLevel].series[this.curSample];
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