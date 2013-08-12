/**
 * Drawing Application
 *
 * Copyright 2013, Tim Strother
 *
 */

function startSketchTool(STATIC_URL, logged_in, csrf_token, project_id, imgs_array) {
	var canvas = document.querySelector('#paint');
	var ctx = canvas.getContext('2d');

        // Make setting canvas and tmp_canvas size a function that runs on window resize
        // Then redraw the current image (the last image from undo_arr), means resizing all undo_arr images
        // Hmm, how can I keep this way simpler and not do too much premature optimization.

        // Setup Background
        var canvasBack = document.querySelector('#canvasBackground');
	var ctxBack = canvasBack.getContext('2d');

        canvasBack.width = 830;//parseInt(sketch_style.getPropertyValue('width'));
        canvasBack.height = 600;//parseInt(sketch_style.getPropertyValue('height'));
        ctxBack.fillStyle = '#ffffff';

        function drawBgImage(img_src) {
	  // Fill the background of the canvas
          ctxBack.fillRect(0,0,830,600);

          var imageBgObj = new Image();
	  imageBgObj.crossOrigin = 'Anonymous';
	  imageBgObj.src = img_src;
	  imageBgObj.onload = function() {
	    var h = imageBgObj.height;
	    var w = imageBgObj.width;
	    if(w > h) {
		h = (h/w)*830;
		w = 830;
		if(h > 600) {
		    w = (w/h)*600;
		    h = 600;
		}
	    } else {
		w = (w/h)*600;
		h = 600;
	    }
	    
	    ctxBack.drawImage(imageBgObj, 0, 0, w, h);
	  };
	};
    
        var imgs_array_index = 0;
        drawBgImage(imgs_array[imgs_array_index]);

	var sketch = document.querySelector('#sketch');
	//var sketch_style = getComputedStyle(sketch);
        canvas.width = 830;//parseInt(sketch_style.getPropertyValue('width'));
        canvas.height = 600;//parseInt(sketch_style.getPropertyValue('height'));

        // draw image
	// var img = new Image();
	// img.src = 'http://cssdeck.com/uploads/media/items/3/3yiC6Yq.jpg';
	// ctx.drawImage(img, 20, 20);

        // Creating a tmp canvas
	var tmp_canvas = document.createElement('canvas');
	var tmp_ctx = tmp_canvas.getContext('2d');
	tmp_canvas.id = 'tmp_canvas';
	tmp_canvas.width = canvas.width;
	tmp_canvas.height = canvas.height;
	
	sketch.appendChild(tmp_canvas);

        /* Text Tool */
        var textarea = document.createElement('textarea');
	textarea.id = 'text_tool';
	sketch.appendChild(textarea);
        // Text tool's text container for calculating
	// lines/chars
	var tmp_txt_ctn = document.createElement('div');
	tmp_txt_ctn.style.display = 'none';
	sketch.appendChild(tmp_txt_ctn);

        // Allows automatic select for textarea
        $.fn.selectRange = function(start, end) {
	    return this.each(function() {
		if (this.setSelectionRange) {
		    this.focus();
		    this.setSelectionRange(start, end);
		} else if (this.createTextRange) {
		    var range = this.createTextRange();
		    range.collapse(true);
		    range.moveEnd('character', end);
		    range.moveStart('character', start);
		    range.select();
		}
	    });
	};

        textarea.addEventListener('mouseup', function(e) {
	    tmp_canvas.removeEventListener('mousemove', onPaint, false);
	}, false);
        textarea.addEventListener('keydown', keyDown, false);

        /* Sketch App Defaults */
	tmp_ctx.lineWidth = 10;
	tmp_ctx.lineJoin = 'round';
	tmp_ctx.lineCap = 'round';
	tmp_ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
	tmp_ctx.fillStyle = 'rgba(0, 0, 0, 1)';

        // Eraser defaults
        ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.lineWidth = 10;
    
        var tool = "marker";
        var undo_arr = [];

	var mouse = {x: 0, y: 0};
	var last_mouse = {x: 0, y: 0};
        var start_mouse = {x: 0, y: 0};
        var end_mouse = {x: 0, y: 0};

	// Pencil Points
	var ppts = [];
    
        /* Mouse Capturing Work */
	tmp_canvas.addEventListener('mousemove', mouseMove, false);
	tmp_canvas.addEventListener('mousedown', mouseDown, false);
	tmp_canvas.addEventListener('mouseup', mouseUp, false);

        // Touch events!
        tmp_canvas.addEventListener("touchmove", mouseMove, true);
        tmp_canvas.addEventListener("touchstart", touchDown, false);
        tmp_canvas.addEventListener("touchend", touchUp, false);

        // Need to add touch events for eraser as well
        canvas.addEventListener('mousemove', mouseMove, false);
        canvas.addEventListener('mousedown', mouseDownEraser, false);
	canvas.addEventListener('mouseup', mouseUpEraser, false);

        // Touch events for Eraser
        canvas.addEventListener('touchmove', mouseMove, false);
        canvas.addEventListener('touchstart', touchDownEraser, false);
	canvas.addEventListener('touchend', touchUpEraser, false);
    
        /* Mouse Events */
        function mouseMove(e) {
	        mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
	        e.preventDefault();
        };

        function mouseDown(e) {
	        // For Line, Rectangle, Circle
	        if(tool == "arc_control") {
		    return;
		} else {
		    start_mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		    start_mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
		}

	        // Store undoImg
	        storeUndo();

	        tmp_canvas.addEventListener('mousemove', onPaint, false);

	        // For Marker
		ppts.push({x: mouse.x, y: mouse.y});
		
	        onPaint();
        };

        function mouseUp(e) {
	        tmp_canvas.removeEventListener('mousemove', onPaint, false);

	        if(tool == "arc") {
		    tool = "arc_control";
		    end_mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		    end_mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;

		    tmp_canvas.addEventListener('mousemove', onPaint, false);
		    return;
		}
	        if(tool == "arc_control") {
		    tool = "arc";
		}

		// For eraser
		ctx.globalCompositeOperation = 'source-over';

		// Writing down to real canvas now
		ctx.drawImage(tmp_canvas, 0, 0);
		// Clearing tmp canvas
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		
		// Emptying up Pencil Points
		ppts = [];
        };

        function touchDown(e) {
	        // For Line, Rectangle, Circle
	        if(tool == "arc_control") {
		    return;
		} else {
		    start_mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		    start_mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
		}

	        storeUndo();

	        tmp_canvas.addEventListener('touchmove', onPaint, false);

	        // For Marker
		ppts.push({x: mouse.x, y: mouse.y});
		
	        onPaint();
        };

        function touchUp(e) {
	        tmp_canvas.removeEventListener('touchmove', onPaint, false);

	        if(tool == "arc") {
		    tool = "arc_control";
		    end_mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		    end_mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;

		    tmp_canvas.addEventListener('touchmove', onPaint, false);
		    return;
		}
	        if(tool == "arc_control") {
		    tool = "arc";
		}

		// For eraser
		ctx.globalCompositeOperation = 'source-over';

		// Writing down to real canvas now
		ctx.drawImage(tmp_canvas, 0, 0);
		// Clearing tmp canvas
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		
		// Emptying up Pencil Points
		ppts = [];
        };

        function touchDownEraser(e) {
	        // Store undoImg
	        storeUndo();

		canvas.addEventListener('touchmove', onErase, false);
		
		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
		
		ppts.push({x: mouse.x, y: mouse.y});
		
		onErase();
        };

        function touchUpEraser(e) {
	        canvas.removeEventListener('touchmove', onErase, false);
		
		// Emptying up Pencil Points
		ppts = [];
        };

        function keyDown(e) {
	    if (e.keyCode == 13 && !e.shiftKey) {
		closeTextArea();
	    }
        };
    
    function trim (str) {
	return str.replace(/^\s\s*/, ''); //.replace(/\s\s*$/, ''); replaces spaces at end
    }
    function ApplyLineBreaks(strTextAreaId) {
	var oTextarea = document.getElementById(strTextAreaId);
	
	/* Had to modify this code to get it working */
	oTextarea.setAttribute("wrap", "off");

	var strRawValue = oTextarea.value;
	oTextarea.value = "";
	var nEmptyWidth = oTextarea.scrollWidth;
	var nLastWrappingIndex = -1;
	for (var i = 0; i < strRawValue.length; i++) {
            var curChar = strRawValue.charAt(i);
            if (curChar == ' ' || curChar == '-' || curChar == '+')
		nLastWrappingIndex = i;
            oTextarea.value += curChar;
            if (oTextarea.scrollWidth > nEmptyWidth) {
		var buffer = "";
		if (nLastWrappingIndex >= 0) {
                    for (var j = nLastWrappingIndex + 1; j < i; j++)
			buffer += strRawValue.charAt(j);
                    nLastWrappingIndex = -1;
		}
		buffer += curChar;
		oTextarea.value = oTextarea.value.substr(0, oTextarea.value.length - buffer.length);
		// added trim to remove space on next line if it's present
		oTextarea.value += "\n" + trim(buffer);
            }
	}
	oTextarea.removeAttribute("wrap");
	return oTextarea.value;
	//$("textarea").removeAttribute("white-space");
    }

        function closeTextArea() {
	        // Had to add these two to make it remove the mouse move event
		tmp_canvas.removeEventListener('mousemove', onPaint, false);
		// For eraser
		ctx.globalCompositeOperation = 'source-over';

	        var textWithBreaks = ApplyLineBreaks(textarea.id);
	        //alert(textWithBreaks);
		var lines = textWithBreaks.split('\n'); //textarea.value.split('\n');
		var processed_lines = [];
		
		for (var i = 0; i < lines.length; i++) {
		    var chars = lines[i].length;
		    
		    for (var j = 0; j < chars; j++) {
			var text_node = document.createTextNode(lines[i][j]);
			tmp_txt_ctn.appendChild(text_node);
			
			// Since tmp_txt_ctn is not taking any space
			// in layout due to display: none, we gotta
			// make it take some space, while keeping it
			// hidden/invisible and then get dimensions
			tmp_txt_ctn.style.position   = 'absolute';
			tmp_txt_ctn.style.visibility = 'hidden';
			tmp_txt_ctn.style.display    = 'block';
			
			var width = tmp_txt_ctn.offsetWidth;
			var height = tmp_txt_ctn.offsetHeight;
			
			tmp_txt_ctn.style.position   = '';
			tmp_txt_ctn.style.visibility = '';
			tmp_txt_ctn.style.display    = 'none';
			
			// Logix
			// console.log(width, parseInt(textarea.style.width));
			if (width > parseInt(textarea.style.width)) {
			    break;
			}
		    }
		    
		    processed_lines.push(tmp_txt_ctn.textContent);
		    tmp_txt_ctn.innerHTML = '';
		}
		
		var ta_comp_style = getComputedStyle(textarea);
		var fs = ta_comp_style.getPropertyValue('font-size');
		var ff = ta_comp_style.getPropertyValue('font-family');
		var fw = ta_comp_style.getPropertyValue('font-weight');
		
		tmp_ctx.font = fw + ' ' + fs + ' ' + ff;
		tmp_ctx.textBaseline = 'top';
		
		// Accounting for Top and Left added + 4 to both

		for (var n = 0; n < processed_lines.length; n++) {
		    var processed_line = processed_lines[n];
		    
		    tmp_ctx.fillText(
			processed_line.toUpperCase(),
			parseInt(textarea.style.left) + 3,
			parseInt(textarea.style.top) + n*parseInt(fs),
			1024 // max width
		    );
		}
		
		// Writing down to real canvas now
		ctx.drawImage(tmp_canvas, 0, 0);
		// Clearing tmp canvas
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

		textarea.style.display = 'none';
		textarea.value = '';

		// Add mouseUp Func
		tmp_canvas.removeEventListener('mousemove', onPaint, false);

		// For eraser
		ctx.globalCompositeOperation = 'source-over';

		// Writing down to real canvas now
		ctx.drawImage(tmp_canvas, 0, 0);
		// Clearing tmp canvas
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		
		// Emptying up Pencil Points
		ppts = [];
	}

        function mouseDownEraser(e) {
	        // Store undoImg
	        storeUndo();

		canvas.addEventListener('mousemove', onErase, false);
		
		mouse.x = typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX;
		mouse.y = typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY;
		
		ppts.push({x: mouse.x, y: mouse.y});
		
		onErase();
        };

        function mouseUpEraser(e) {
		canvas.removeEventListener('mousemove', onErase, false);
		
		// Emptying up Pencil Points
		ppts = [];
        };

        function storeUndo() {
	    undo_arr.push(canvas.toDataURL());
	    // limit the array to 10 items
	    if (undo_arr.length>10) {
		undo_arr.shift();
	    }
	};

        function undo() {
	    var img_data = undo_arr.pop();
	    if (img_data) {
		//fixing bug with eraser
		ctx.globalCompositeOperation = 'source-over';
		
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		var imageObj = new Image();
		imageObj.src = img_data.toString();
		imageObj.onload = function() {
		    ctx.drawImage(imageObj, 0, 0);
		};
	    }
	};

        /* onPaint Functions */
	function onPaint() {
	    switch (tool) {
	        case "marker":
		    onPaintMarker();
		    break;
	        case "line":
		    onPaintLine();
		    break;
		case "arc":
		    onPaintLine();
		    break;
		case "arc_control":
		    onPaintArcControl();
		    break;
	        case "rectangle":
		    onPaintRect();
		    break;
	        case "circle":
		    onPaintCircle();
		    break;
	        case "ellipse":
		    if (shifted) {
		        onPaintCircle();
		        break;
		    }
		    onPaintEllipse();
		    break;
	        case "text":
		    onPaintText();
		    break;
	        case "eraser":
		    onErase();
		    break;
	        default:
		    // default to marker
		    onPaintMarker();
	    }
	};

        function onPaintMarker() {
	        // Saving all the points in an array
		ppts.push({x: mouse.x, y: mouse.y});
		
		if (ppts.length < 3) {
			var b = ppts[0];
			tmp_ctx.beginPath();
			//ctx.moveTo(b.x, b.y);
			//ctx.lineTo(b.x+50, b.y+50);
			tmp_ctx.arc(b.x, b.y, tmp_ctx.lineWidth / 2, 0, Math.PI * 2, !0);
			tmp_ctx.fill();
			tmp_ctx.closePath();
			
			return;
		}
		
		// Tmp canvas is always cleared up before drawing.
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		
		tmp_ctx.beginPath();
		tmp_ctx.moveTo(ppts[0].x, ppts[0].y);
		
		for (var i = 1; i < ppts.length - 2; i++) {
			var c = (ppts[i].x + ppts[i + 1].x) / 2;
			var d = (ppts[i].y + ppts[i + 1].y) / 2;
			
			tmp_ctx.quadraticCurveTo(ppts[i].x, ppts[i].y, c, d);
		}
		
		// For the last 2 points
		tmp_ctx.quadraticCurveTo(
			ppts[i].x,
			ppts[i].y,
			ppts[i + 1].x,
			ppts[i + 1].y
		);
		tmp_ctx.stroke();
	}

        function onPaintLine() {
		// Tmp canvas is always cleared up before drawing.
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		
		tmp_ctx.beginPath();
		tmp_ctx.moveTo(start_mouse.x, start_mouse.y);
		tmp_ctx.lineTo(mouse.x, mouse.y);
		tmp_ctx.stroke();
		tmp_ctx.closePath();
	};

        function onPaintArcControl() {
	    tmp_ctx.clearRect(0, 0, canvas.width, canvas.height);
	    
	    var x1 = start_mouse.x,
	    y1 = start_mouse.y,
	    x2 = end_mouse.x,
	    y2 = end_mouse.y;

	    // Position of the mouse relative to the canvas
	    cpx = mouse.x;
	    cpy = mouse.y;
	    
	    // changing the control point with the simple
	    // yet awesome formula to control the curve's
	    // hitting point (the mouse, in our case).
	    cpx = cpx * 2 - (x1+x2)/2;
	    cpy = cpy * 2 - (y1+y2)/2;
	    
	    tmp_ctx.beginPath();
	    tmp_ctx.moveTo(x1, y1);
	    tmp_ctx.quadraticCurveTo(cpx, cpy, x2, y2);
	    tmp_ctx.stroke();
	    tmp_ctx.closePath();
	};

        function onPaintRect() {
	        // Tmp canvas is always cleared up before drawing.
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
		
		var x = Math.min(mouse.x, start_mouse.x);
		var y = Math.min(mouse.y, start_mouse.y);
		var width = Math.abs(mouse.x - start_mouse.x);
		var height = Math.abs(mouse.y - start_mouse.y);
		tmp_ctx.strokeRect(x, y, width, height);
	};

        function onPaintCircle() {
	    // Tmp canvas is always cleared up before drawing.
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

		var x = Math.min(mouse.x, start_mouse.x);
		var y = Math.min(mouse.y, start_mouse.y);
		
		var radius = Math.max(
		    Math.abs(mouse.x - start_mouse.x),
		    Math.abs(mouse.y - start_mouse.y)
		) / 2;
		
		drawEllipse(tmp_ctx, x, y, radius*2, radius*2);
	};
        
        function onPaintEllipse () {
		// Tmp canvas is always cleared up before drawing.
		tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);

		var x = Math.min(mouse.x, start_mouse.x);
		var y = Math.min(mouse.y, start_mouse.y);
		
		var w = Math.abs(mouse.x - start_mouse.x);
		var h = Math.abs(mouse.y - start_mouse.y);
		
		drawEllipse(tmp_ctx, x, y, w, h);
	};
        // onPaintEllipse needs drawEllipse function
	function drawEllipse(ctx, x, y, w, h) {
		var kappa = .5522848,
		ox = (w / 2) * kappa, // control point offset horizontal
	        oy = (h / 2) * kappa, // control point offset vertical
	        xe = x + w,           // x-end
	        ye = y + h,           // y-end
	        xm = x + w / 2,       // x-middle
	        ym = y + h / 2;       // y-middle
		
		ctx.beginPath();
		ctx.moveTo(x, ym);
		ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
		ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
		ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
		ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
		ctx.closePath();
		ctx.stroke();
	};

        function onPaintText() {
	    // Tmp canvas is always cleared up before drawing.
	    tmp_ctx.clearRect(0, 0, tmp_canvas.width, tmp_canvas.height);
	    
	    var x = Math.min(mouse.x, start_mouse.x);
	    var y = Math.min(mouse.y, start_mouse.y);
	    var width = Math.abs(mouse.x - start_mouse.x);
	    var height = Math.abs(mouse.y - start_mouse.y);
	    
	    textarea.style.left = x + 'px';
	    textarea.style.top = y + 'px';
	    textarea.style.width = width + 'px';
	    textarea.style.height = height + 'px';
	    
	    textarea.style.display = 'block';

	    // Select the textbox
	    $('#text_tool').selectRange(1);
	};

        function onErase() {	
		// Saving all the points in an array
		ppts.push({x: mouse.x, y: mouse.y});
		
		ctx.globalCompositeOperation = 'destination-out';
	        ctx.fillStyle = 'rgba(0,0,0,1)';
	        ctx.strokeStyle = 'rgba(0,0,0,1)';
		
		if (ppts.length < 3) {
			var b = ppts[0];
			ctx.beginPath();
			//ctx.moveTo(b.x, b.y);
			//ctx.lineTo(b.x+50, b.y+50);
			ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
			ctx.fill();
			ctx.closePath();
			
			return;
		}
		
		ctx.beginPath();
		ctx.moveTo(ppts[0].x, ppts[0].y);
		
		for (var i = 1; i < ppts.length - 2; i++) {
			var c = (ppts[i].x + ppts[i + 1].x) / 2;
			var d = (ppts[i].y + ppts[i + 1].y) / 2;
			
			ctx.quadraticCurveTo(ppts[i].x, ppts[i].y, c, d);
		}
		
		// For the last 2 points
		ctx.quadraticCurveTo(
			ppts[i].x,
			ppts[i].y,
			ppts[i + 1].x,
			ppts[i + 1].y
		);
		ctx.stroke();
	};

    /* Begin UI Options */

    // Disabling Default Cursor
    $("#paint").mousedown(function(event){
	event.preventDefault();
	// hide all expanded tools on click
	$("#sizeAndColorOptions").hide();
	$("#toolSelectionOptions").hide();
    });
    $("#tmp_canvas").mousedown(function(event){
	event.preventDefault();
	// hide all expanded tools on click
	$("#sizeAndColorOptions").hide();
	$("#toolSelectionOptions").hide();
    });

    // Toolbox Expanding
    // animate hovering
    function animateHover(tagId) {
	$(tagId).hover(function(){
	    $(this).stop().animate({"opacity": 0.8}, 50);
        },function(){
	    $(this).stop().animate({"opacity": 1}, 500);
	});
    };
    animateHover("#sizeAndColor");
    animateHover("#toolSelection");
    animateHover("#undo");
    animateHover("#saveImage");

    // Size and Color Options
    $("#sizeAndColor").click(function() {
	$("#sizeAndColorOptions").show();
	$("#toolSelectionOptions").hide();
    });
    $("#sizeAndColorOptions").click(function() {
	$(this).hide();
    });
    // Tool Selection Options
    $("#toolSelection").click(function() {
	$("#toolSelectionOptions").show();
	$("#sizeAndColorOptions").hide();
    });
    $("#toolSelectionOptions").click(function() {
	    $(this).hide();
    });
    // Undo Options
    $("#undo").click(function() {
	$("#sizeAndColorOptions").hide();
	$("#toolSelectionOptions").hide();
    });
    // Save Options
    $("#saveImage").click(function() {
	$("#sizeAndColorOptions").hide();
	$("#toolSelectionOptions").hide();
    });
    
    function setColor() {
	currentBrushColor = 'rgba(' + currentBrushRed + ',' + currentBrushGreen + ',' + currentBrushBlue + ',' + currentBrushOpacity + ')';
	tmp_ctx.strokeStyle = currentBrushColor;
	tmp_ctx.fillStyle = currentBrushColor;
	circle_ctx.strokeStyle = currentBrushColor;
	circle_ctx.fillStyle = currentBrushColor;
    };

    // Setup Circle Canvas
    var circle_canvas = document.querySelector('#circleTool');
    var circle_ctx = circle_canvas.getContext('2d');
    circle_canvas.width = 146;
    circle_canvas.height = 146;
    var currentBrushValue = 10;
    var currentBrushRed = 0;
    var currentBrushGreen = 0;
    var currentBrushBlue = 0;
    var currentBrushOpacity = 1.0;
    var currentBrushColor;
    setColor();

    function drawCircle(radius) {
	// clear circle context
	circle_ctx.clearRect(0, 0, circle_canvas.width, circle_canvas.height);
	// draw circle
	circle_ctx.beginPath();
	circle_ctx.arc(73, 73, radius, 0, Math.PI*2, true); 
	circle_ctx.closePath();
	circle_ctx.fill();
    };
    drawCircle(5);

    // resizing
    $("#sliderSize").slider({
      value: 10,
      min: 2,
      max: 80,
      slide: function( event, ui ) {
	  currentBrushValue = ui.value;
	  tmp_ctx.lineWidth = currentBrushValue;
	  ctx.lineWidth = currentBrushValue;
	  // Change font size
	  $("#text_tool").css("font-size", currentBrushValue);
	  drawCircle(currentBrushValue/2);
      }
    });

    // opacity control
    $("#sliderOpacity").slider({
      value: 100,
      min: 1,
      max: 100,
      animate: true,
      slide: function( event, ui ) {
	  currentBrushOpacity = ui.value/100;
	  setColor();
	  drawCircle(currentBrushValue/2);
      }
    });

    // Color Picker
      function getMousePos(canvas, e) {
        return {
          x: typeof e.offsetX !== 'undefined' ? e.offsetX : e.layerX,
          y: typeof e.offsetY !== 'undefined' ? e.offsetY : e.layerY
        };
      };

    function getColorAt(evt, padding, canvas, context, mouseDown) {
	  evt.preventDefault();
          var mousePos = getMousePos(canvas, evt);
          var color = undefined;

          if(mouseDown && mousePos !== null
	     && mousePos.x > padding
	     && mousePos.x < padding + imageObj.width
	     && mousePos.y > padding
	     && mousePos.y < padding + imageObj.height) {

            // color picker image is 256x256 and is offset by 10px
            // from top and bottom
            var data = context.getImageData(padding, padding, imageObj.width, imageObj.width).data;
            var x = mousePos.x - padding;
            var y = mousePos.y - padding;
            currentBrushRed = data[((imageObj.width * y) + x) * 4];
            currentBrushGreen = data[((imageObj.width * y) + x) * 4 + 1];
            currentBrushBlue = data[((imageObj.width * y) + x) * 4 + 2];
	    setColor();
	    drawCircle(currentBrushValue/2);
          }
      };

      function init(imageObj) {
        var padding = 10;
        var canvas = document.getElementById('colorCanvas');
        var context = canvas.getContext('2d');
        var mouseDown = false;

	// touch events
        canvas.addEventListener("touchstart", function(e) {
	    mouseDown = true;
        }, false);
	canvas.addEventListener("touchend", function(e) {
          mouseDown = false;
        }, false);
	canvas.addEventListener("touchmove", function(e) {
	    getColorAt(e, padding, canvas, context, mouseDown);
	}, false);

	// mouse events
        canvas.addEventListener('mousedown', function(e) {
          mouseDown = true;
        }, false);
        canvas.addEventListener('mouseup', function(e) {
          mouseDown = false;
        }, false);
        canvas.addEventListener('mousemove', function(e) {
	    getColorAt(e, padding, canvas, context, mouseDown);
	}, false);

        context.drawImage(imageObj, padding, padding);
      };

      // Initializing the Color Picker
      var imageObj = new Image();
      imageObj.crossOrigin = 'Anonymous';
      imageObj.src = STATIC_URL + 'images/symbols/sketchTools/color-picker.png';
      imageObj.onload = function() {
        init(this);
      };

    // functions to run with every tool except eraser
    function allButEraser() {
	// Show Tmp Canvas
	tmp_canvas.style.display = 'block';
	// Check if text editing is open, if not close it
	if(textarea.style.display != 'none') {
            closeTextArea();
	}
    };

    function switchBG(thisTool) {
	var bg = $(thisTool).css("background-image");
	$("#toolSelection").css("background-image", bg);
    };
    
    // tools
    $("#marker").click(function() {
	tool = "marker";
	switchBG(this);
	allButEraser();
    });

    $("#line").click(function() {
	tool = "line";
	switchBG(this);
	allButEraser();
    });

    $("#arc").click(function() {
	tool = "arc";
	switchBG(this);
	allButEraser();
    });

    $("#rectangle").click(function() {
	tool = "rectangle";
	switchBG(this);
	allButEraser();
    });

    $("#circle").click(function() {
	tool = "circle";
	switchBG(this);
	allButEraser();
    });
    
    $("#ellipse").click(function() {
	tool = "ellipse";
	switchBG(this);
	allButEraser();
    });

    $("#text").click(function() {
	tool = "text";
	switchBG(this);
	allButEraser();
    });
    
    $("#eraser").click(function() {
	tool = "eraser";
	switchBG(this);
	
	// Hide Tmp Canvas
	tmp_canvas.style.display = 'none';
	// Check if text editing is open, if not close it
	if(textarea.style.display != 'none') {
            closeTextArea();
	}
    });

    //$("#zoom").click(function() {
	//ctx.scale(2, 2);
    //});
    
    $("#clearCanvas").click(function() {
	// Store undoImg
	storeUndo();
	allButEraser();
	ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    $("#undo").click(function() {
	undo();
    });

    // Testing for command keys
    var shifted = false;
    $(document).bind('keyup keydown', function(e){
	// Testing for shift key
	shifted = e.shiftKey;
	// control-z will also undo for you
	if (e.keyCode == 90 && (e.ctrlKey || e.metaKey)) {
	    undo();
        }
    });
    
    // Steps
    // x 1) Add lightbox for create account and log them in.
    // x 2) Add prompt for title and description.
    // x 2.5) Automatically create thumbnail (we already know the image size)
    // x 3) Put project images behind sketch and let users cycle through them (figure out how to get them to save with image)
    // x 4) Make the entire toolbox "Start Sketching" hidden to start Add Color to it! (so you can see the other submissions). Make sure it updates cache async!
    // x 5) Before going live, make sure CORS is enabled for production S3 bucket on our domain.
    // Also, make sure to clear cache for any images loaded the old way.

  // A few notes on getting CORS working.
  // 1) The .crossOrigin header must be with the image the FIRST time it is loaded from the server
  // otherwise, it will use the version from the cache and fail. This
  // means we need a more clever way to load bxslider (also wtf to do about pinterest).
  // 2) The images with apostrophies in titles have 403 Forbidden when trying to load as strings.
  // Either fix the naming structure once and for all to get rid of titles saved in the url,
  // or fix the string so it loads properly or don't let people use special characters in titles.

	// Build a new canvas underneath where the images and background will live. when switching to a new image, draw white rect, then image.
	// Also build transparency layer as a canvas. And toggle transparency will now either clear this or draw an opacity rectangle. 
	// Have 2 buttons, blank canvas or next image, along with toggle transparency on top.
	// Right before postSketchAjax, merge all of these layers onto the background and save that canvas.toDataURL()

    $("#nextImage").click(function() {
	if(imgs_array_index >= imgs_array.length-1) {
	    imgs_array_index = 0;
	} else {
	    imgs_array_index++;
	}
	drawBgImage(imgs_array[imgs_array_index]);
    });

    $("#blankCanvas").click(function() {
        ctxBack.fillRect(0,0,830,600);
    });

    function validateTitle(title) { 
	var re = /^[A-Za-z0-9\x27\s_-]*$/;
	return re.test(title);
    }; 

    function postSketchAjax() {
	  // This is where to combine the layers
	  ctxBack.drawImage(canvas, 0, 0);

	  $.post(
            "/save-sketch/",
            {
                csrfmiddlewaretoken: csrf_token,
                project_id: project_id,
		data_url: canvasBack.toDataURL().toString(),
		title: document.getElementById('id_title').value,
		description: document.getElementById('id_description').value
            },
            function (result) {
		// Redirect to crop a thumbnail
		// window.location.replace("../.." + result);
		// Crop Thumbnail Automatically
		window.location.reload();
            }
          );
    }; 

    $("#saveImage").click(function() {
	$("#title_desc_popup").click();
	$("#submit_button2").click(function() {
	    document.getElementById('submit_button2').disabled = 1;
	    $('#loading_gif2').html("<img src='" + STATIC_URL + "images/bx_loader.gif' />");
	    // Make sure there's a title and description
	    var title = document.getElementById('id_title').value;
	    var description = document.getElementById('id_description').value;
	    if(!validateTitle(title)){
		$('#title_desc_error').html("Please use only letters, numbers, apostrophes, hyphens, underscores, or spaces.");
		$('#loading_gif2').html("");
		document.getElementById('submit_button2').disabled = 0;
		return false;
	    }
	    if(title === '' || description === '') {
		$('#title_desc_error').html("Please enter a title and description.");
		$('#loading_gif2').html("");
		document.getElementById('submit_button2').disabled = 0;
		return false;
	    }
	    //Check For Login
	    if(logged_in != "True") {
		$("#login_popup").click();
            } else {
		postSketchAjax();
            }
	});
    });

  // Login-Popup
  $('#signup_form').submit(function() { // catch the form's submit event
            document.getElementById('signup_form').disabled = 1;
            $.ajax({ // create an AJAX call...
                data: $(this).serialize(), // get the form data
                type: $(this).attr('method'), // GET or POST
                url: $(this).attr('action'), // the file to call
                beforeSend: function() {
                    $('#loading_gif').html("<img src='" + STATIC_URL + "images/bx_loader.gif' />");
                },
                success: function(response) { // on success..
                    $('#loading_gif').html("");
                    if(response=="success"){
                        postSketchAjax();
                    }else{
                        $('#signup_form').html(response);
			document.getElementById('signup_form').disabled = 0;
                    }
                }
            });
            return false;
   });

   $('#login_form').submit(function() { // catch the form's submit event
            document.getElementById('login_form').disabled = 1;
            $.ajax({ // create an AJAX call...
                data: $(this).serialize(), // get the form data
                type: $(this).attr('method'), // GET or POST
                url: $(this).attr('action'), // the file to call
                beforeSend: function() {
                    $('#loading_gif').html("<img src='" + STATIC_URL + "images/bx_loader.gif' />");
                },
                success: function(response) { // on success..
                    $('#loading_gif').html("");
                    if(response=="success"){
                        postSketchAjax();
                    }else{
                        $('#login_error').html(response);
			document.getElementById('signup_form').disabled = 0;
                    }
                }
            });
            return false;
   });

   // Functions to switch between login and create account
   $("#login_link").click(function() {
	$("#login_form").show();
	$("#signup_form").hide();
        $(".createOrLost1").hide();
	$(".createOrLost2").show();
   });
   $("#create_account_link").click(function() {
        $("#login_form").hide();
	$("#signup_form").show();
	$(".createOrLost1").show();
        $(".createOrLost2").hide();
   });

};