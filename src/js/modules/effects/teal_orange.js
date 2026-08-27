import app from './../../app.js';
import config from './../../config.js';
import Dialog_class from './../../libs/popup.js';
import Base_layers_class from './../../core/base-layers.js';
import alertify from './../../../../node_modules/alertifyjs/build/alertify.min.js';

class Effects_teal_orange_class {

	constructor() {
		this.POP = new Dialog_class();
		this.Base_layers = new Base_layers_class();
	}

	teal_orange() {
		var _this = this;

		if (config.layer.type != 'image') {
			alertify.error('This layer must contain an image. Please convert it to raster to apply this tool.');
			return;
		}

		var settings = {
			title: 'Teal & Orange',
			preview: true,
			effects: true,
			params: [
				{name: "shadow", title: "Teal (shadow):", value: "0.75", range: [0, 1], step: 0.01},
				{name: "highlight", title: "Orange (highlight):", value: "0.75", range: [0, 1], step: 0.01},
				{name: "balance", title: "Balance:", value: "0", range: [-1, 1], step: 0.01},
				{name: "saturation", title: "Saturation:", value: "0.15", range: [0, 1], step: 0.01},
			],
			on_change: function (params, canvas_preview, w, h) {
				var img = canvas_preview.getImageData(0, 0, w, h);
				var data = _this.change(img, params);
				canvas_preview.putImageData(data, 0, 0);
			},
			on_finish: function (params) {
				_this.save(params);
			},
		};
		this.POP.show(settings);
	}

	save(params) {
		//get canvas from layer
		var canvas = this.Base_layers.convert_layer_to_canvas(null, true);
		var ctx = canvas.getContext("2d");

		//change data
		var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
		var data = this.change(img, params);
		ctx.putImageData(data, 0, 0);

		//save
		return app.State.do_action(
			new app.Actions.Update_layer_image_action(canvas)
		);
	}

	change(data, params) {
		var imgData = data.data;

		//teal applies to shadows
		var teal = [0, 128, 128];
		//orange applies to highlights
		var orange = [255, 107, 74];

		var shadow_strength = parseFloat(params.shadow);
		var highlight_strength = parseFloat(params.highlight);
		var balance = parseFloat(params.balance);
		var saturation = parseFloat(params.saturation);

		for (var i = 0; i < imgData.length; i += 4) {
			if (imgData[i + 3] == 0)
				continue;	//transparent

			var r = imgData[i];
			var g = imgData[i + 1];
			var b = imgData[i + 2];

			//relative luminance 0..1
			var lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

			//split toning weight: balance shifts the neutral point
			var t = lum + balance * 0.5;
			t = t < 0 ? 0 : (t > 1 ? 1 : t);

			//shadow weight (high at low luminance), highlight weight (high at high luminance)
			var w_shadow = (1 - t) * shadow_strength;
			var w_highlight = t * highlight_strength;

			//blend toward teal for shadows and orange for highlights
			var r2 = r + (teal[0] - r) * w_shadow + (orange[0] - r) * w_highlight;
			var g2 = g + (teal[1] - g) * w_shadow + (orange[1] - g) * w_highlight;
			var b2 = b + (teal[2] - b) * w_shadow + (orange[2] - b) * w_highlight;

			//boost saturation
			if (saturation > 0) {
				var grey = (r2 + g2 + b2) / 3;
				r2 = grey + (r2 - grey) * (1 + saturation);
				g2 = grey + (g2 - grey) * (1 + saturation);
				b2 = grey + (b2 - grey) * (1 + saturation);
			}

			imgData[i] = r2 < 0 ? 0 : (r2 > 255 ? 255 : Math.round(r2));
			imgData[i + 1] = g2 < 0 ? 0 : (g2 > 255 ? 255 : Math.round(g2));
			imgData[i + 2] = b2 < 0 ? 0 : (b2 > 255 ? 255 : Math.round(b2));
		}

		return data;
	}

	demo(canvas_id, canvas_thumb){
		var canvas = document.getElementById(canvas_id);
		var ctx = canvas.getContext("2d");
		ctx.drawImage(canvas_thumb, 0, 0);

		//now update
		var img = ctx.getImageData(0, 0, canvas_thumb.width, canvas_thumb.height);
		var params = {
			shadow: 0.75,
			highlight: 0.75,
			balance: 0,
			saturation: 0.15,
		};
		var data = this.change(img, params);
		ctx.putImageData(data, 0, 0);
	}

}

export default Effects_teal_orange_class;
